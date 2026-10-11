import { useState, useEffect, useCallback, useRef } from 'react';
import { FileText, Save, Book, Plus } from 'lucide-react';
import { simpleMarkdown } from '../../lib/markdown';
import FolderTreePanel, {
  type FolderTreeConfig,
  type FolderTreeCallbacks,
  type TreeFolder,
  type TreeItem,
} from '../ui/FolderTreePanel';

interface NotebookItem extends TreeFolder { id: string; name: string; note_count: number; count: number; }
interface NoteItem extends TreeItem { id: string; notebook_id: string; title: string; updated_at: string; }

const notebookConfig: FolderTreeConfig<NotebookItem, NoteItem> = {
  titleIcon: <Book size={16} className="text-slate-400" />,
  title: '笔记本',
  folderIcon: <Book size={17} />,
  folderLabel: '笔记本',
  itemLabel: '笔记',
  newFolderPlaceholder: '笔记本名，如 Python学习',
  emptyText: '还没有笔记本',
  emptyActionText: '创建第一个',
  folderDeleteNote: '此操作不可恢复，含全部笔记！',   // §7 删本级联语义（基件提示位，M5b-4 补）
  renderItemLabel: (item) => item.title,             // P3：标题纯文本，不带 .md
  formatItemTime: (item) => {
    // V2 updated_at 形如 '2026-10-11 15:03:01'（本地时间）
    const d = new Date(item.updated_at.replace(' ', 'T'));
    if (isNaN(d.getTime())) return '';
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },
};

// ─── 组件 ───

/**
 * 学生端笔记本（M5b-4 已切 V2 · 规范 §3.8，零文件两张表）
 * - 全走 V2 信封 {code,msg,data}；身份靠 useAuth 劫持全局 fetch 附带的 Bearer token，不再传 username
 * - id 制：activeNotebook/activeNote 存 id（P3：标题纯文本不拼 .md），显示时映射回 name/title
 * - 全量拉取（spec §455）：page_size=100 翻页拉尽，点笔记本零请求（防竞态的 OS 管理器模型）
 */
export default function Notebook() {
  const [notebooks, setNotebooks] = useState<NotebookItem[]>([]);
  const [notesMap, setNotesMap] = useState<Map<string, NoteItem[]>>(new Map());
  const [activeNotebook, setActiveNotebook] = useState('');   // 笔记本 id
  const [activeNote, setActiveNote] = useState('');           // 笔记 id
  const [expandedNbs, setExpandedNbs] = useState<Set<string>>(new Set());   // 键 = 笔记本名（面板按名渲染）
  const [content, setContent] = useState('');
  const [dirty, setDirty] = useState(false);
  const [showNewNote, setShowNewNote] = useState(false);
  const [newNoteName, setNewNoteName] = useState('');
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set());

  // ── id ↔ 名字互查：面板按键是名字，接口用 id（普通函数读 state，只在回调/渲染里用）
  const idOfNotebook = (name: string) => notebooks.find(n => n.name === name)?.id ?? '';
  const nameOfNotebook = (id: string) => notebooks.find(n => n.id === id)?.name ?? '';

  // ── 数据加载 ──

  const loadNotebooks = useCallback(() => {
    fetch('/api/notebooks')
      .then(r => r.json())
      .then(d => {
        if (d.code === 0) {
          setNotebooks((d.data.items as { id: string; name: string; note_count: number }[])
            .map(nb => ({ ...nb, count: nb.note_count ?? 0 })));
        } else console.error('加载笔记本失败', d.msg);
      })
      .catch(e => console.error('加载笔记本失败', e));
  }, []);
  useEffect(() => { loadNotebooks(); }, [loadNotebooks]);

  const loadNotes = useCallback(async (nbName: string) => {
    const nbId = notebooks.find(n => n.name === nbName)?.id ?? '';   // notebooks 进依赖：回调里拿到的永远是当前表
    if (!nbId) return;
    setLoadingFolders(prev => new Set(prev).add(nbName));
    try {
      const items: NoteItem[] = [];
      for (let page = 1; ; page++) {
        const res = await fetch(`/api/notes?notebook=${nbId}&page=${page}&page_size=100`);
        const d = await res.json();
        if (d.code !== 0) { console.error('加载笔记列表失败', d.msg); return; }
        items.push(...d.data.items);
        if (items.length >= d.data.total || d.data.items.length === 0) break;   // 翻页拉尽
      }
      setNotesMap(prev => new Map(prev).set(nbName, items));
    } catch (e) {
      console.error('加载笔记列表失败', e);
    } finally {
      setLoadingFolders(prev => { const next = new Set(prev); next.delete(nbName); return next; });
    }
  }, [notebooks]);

  useEffect(() => {
    if (!activeNote) { setContent(''); return; }
    fetch(`/api/notes/${activeNote}`)
      .then(r => r.json())
      .then(d => {
        if (d.code === 0) { setContent(d.data.content); setDirty(false); }
        else console.error('加载笔记内容失败', d.msg);
      })
      .catch(e => console.error('加载笔记内容失败', e));
  }, [activeNote]);

  // 用 ref 保存最新值，避免 callbacks 闭包过期
  const activeNotebookRef = useRef(activeNotebook);
  activeNotebookRef.current = activeNotebook;
  const activeNoteRef = useRef(activeNote);
  activeNoteRef.current = activeNote;
  const expandedNbsRef = useRef(expandedNbs);
  expandedNbsRef.current = expandedNbs;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const saveNoteRef = useRef<() => void>(() => {});

  // ── 文件夹 + 条目回调（给基件用） ──

  const callbacks: FolderTreeCallbacks<NotebookItem> = {
    onSelectFolder: (name) => {
      if (dirtyRef.current) saveNote();  // 自动保存：有未保存内容先存，再切走
      const id = idOfNotebook(name);
      setActiveNotebook(id); setActiveNote('');
      // 切换笔记本时关闭新建笔记输入框，防止笔记跑到错误的笔记本
      if (activeNotebookRef.current !== id) setShowNewNote(false);
      const wasExpanded = expandedNbsRef.current.has(name);
      setExpandedNbs(prev => {
        const next = new Set(prev);
        if (next.has(name)) { next.delete(name); }
        else { next.add(name); }
        return next;
      });
      // 展开时才加载（loadNotes 调用移到 setState 外面）
      if (!wasExpanded) loadNotes(name);
    },
    onSelectItem: (id, folderName) => {
      if (dirtyRef.current) saveNote();  // 自动保存：切换笔记前先把当前内容存好
      setActiveNote(id); setActiveNotebook(idOfNotebook(folderName));
    },

    onCreateFolder: async (name) => {
      const d = await fetch('/api/notebooks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
      }).then(r => r.json()).catch(e => { console.error('创建笔记本失败', e); return null; });
      if (d && d.code !== 0) console.error('创建笔记本失败', d.msg);   // 重名 → 409/8009
      loadNotebooks();
    },

    onDeleteFolder: async (name) => {
      const id = idOfNotebook(name);
      if (!id) return;
      await fetch(`/api/notebooks/${id}`, { method: 'DELETE' })
        .then(r => r.json()).catch(e => console.error('删除笔记本失败', e));
      if (activeNotebookRef.current === id) { setActiveNotebook(''); setActiveNote(''); }
      setExpandedNbs(prev => { const n = new Set(prev); n.delete(name); return n; });
      setNotesMap(prev => { const n = new Map(prev); n.delete(name); return n; });   // 连本带列表一起清
      loadNotebooks();
    },

    onDeleteItem: async (id) => {
      const nbName = nameOfNotebook(activeNotebookRef.current);
      await fetch(`/api/notes/${id}`, { method: 'DELETE' })
        .then(r => r.json()).catch(e => console.error('删除笔记失败', e));
      if (activeNoteRef.current === id) { setActiveNote(''); setContent(''); }
      loadNotes(nbName);
      loadNotebooks();   // 笔记计数 -1
    },

    onRenameFolder: async (oldName, newName) => {
      const id = idOfNotebook(oldName);
      if (!id) return;
      const d = await fetch(`/api/notebooks/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }),
      }).then(r => r.json()).catch(e => { console.error('重命名笔记本失败', e); return null; });
      if (d && d.code !== 0) { console.error('重命名笔记本失败', d.msg); return; }   // 重名 → 409
      // id 制红利：选中态/正在编辑的笔记都不用动，只把面板的名字键挪过去
      setExpandedNbs(prev => { const n = new Set(prev); if (n.delete(oldName)) n.add(newName); return n; });
      setNotesMap(prev => {
        const n = new Map(prev);
        const v = prev.get(oldName);
        if (v) { n.delete(oldName); n.set(newName, v); }
        return n;
      });
      loadNotebooks();
    },

    onRenameItem: async (id, newTitle) => {
      const nbName = nameOfNotebook(activeNotebookRef.current);
      // P3：title 纯文本，不再拼 .md（V2 零文件，D6）
      const d = await fetch(`/api/notes/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle }),
      }).then(r => r.json()).catch(e => { console.error('重命名笔记失败', e); return null; });
      if (d && d.code !== 0) { console.error('重命名笔记失败', d.msg); return; }
      loadNotes(nbName);
    },
  };

  // ── 笔记操作（Notebook 自己管） ──

  const createNote = async () => {
    if (dirtyRef.current) saveNote();  // 自动保存：新建笔记前先保存当前笔记
    const n = newNoteName.trim();
    const nbId = activeNotebookRef.current;
    if (!n || !nbId) { setShowNewNote(false); return; }
    const d = await fetch('/api/notes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notebook_id: nbId, title: n, content: `# ${n}\n\n` }),   // P3：title 不拼 .md
    }).then(r => r.json()).catch(e => { console.error('创建笔记失败', e); return null; });
    if (!d || d.code !== 0) { console.error('创建笔记失败', d?.msg); return; }
    setActiveNote(d.data.id);
    setContent(`# ${n}\n\n`);
    setDirty(false);
    setNewNoteName('');
    setShowNewNote(false);
    loadNotes(nameOfNotebook(nbId));
    loadNotebooks();   // 笔记计数 +1
  };

  const saveNote = useCallback(() => {
    if (!activeNote) return;
    fetch(`/api/notes/${activeNote}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }).then(r => r.json())
      .then(d => {
        if (d.code !== 0) { console.error('保存笔记失败', d.msg); return; }   // 失败保留「未保存」标记
        setDirty(false);
        // updated_at 变了 → 列表重排（按名字重拉，面板 Map 键是名字）
        const nbName = notebooks.find(n => n.id === activeNotebook)?.name ?? '';
        if (nbName) loadNotes(nbName);
      })
      .catch(e => console.error('保存笔记失败', e));
  }, [activeNote, activeNotebook, content, loadNotes, notebooks]);

  saveNoteRef.current = saveNote;

  // Ctrl+S 快捷键（saveNote 用 useCallback 包裹，加入依赖）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); if (dirty) saveNote(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, saveNote]);

  // 有未保存内容时，关闭/刷新页面弹出浏览器原生提示，提醒学生保存
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // 组件卸载时（切换模块/退出）若有未保存内容自动保存，防止丢失
  useEffect(() => {
    return () => {
      if (dirtyRef.current) saveNoteRef.current();
    };
  }, []);

  // ── 数据转换（NoteItem 已含 id，直接存入 Map） ──

  // ── 条目列表尾部："新建笔记"按钮 ──

  const renderItemsFooter = () => (
    showNewNote ? (
      <div className="pl-9 pr-3 py-1.5 flex gap-1">
        <input
          autoFocus
          value={newNoteName}
          onChange={e => setNewNoteName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') createNote(); if (e.key === 'Escape') setShowNewNote(false); }}
          placeholder="笔记名"
          className="flex-1 bg-slate-800 text-sm text-slate-200 px-2 py-1 rounded outline-none border border-slate-700"
          style={{ borderColor: 'var(--accent)' }}
        />
        <button onClick={createNote}
          className="text-xs text-black px-1.5 py-1 rounded font-bold"
          style={{ backgroundColor: 'var(--accent)' }}>
          确定
        </button>
      </div>
    ) : (
      <button
        onClick={(e) => { e.stopPropagation(); setShowNewNote(true); setNewNoteName(''); }}
        className="w-full flex items-center gap-1 pl-9 pr-3 py-1.5 text-xs text-slate-400 hover:text-[var(--accent)]"
      >
        <Plus size={13} /> 新建笔记
      </button>
    )
  );

  // ── 渲染 ──

  // id → 显示名（顶栏面包屑用；列表/面板按键仍是名字）
  const activeNotebookName = nameOfNotebook(activeNotebook);
  const activeNoteTitle = notesMap.get(activeNotebookName)?.find(n => n.id === activeNote)?.title ?? '';

  return (
    <div className="flex h-full animate-fadeIn">
      <FolderTreePanel
        config={notebookConfig}
        callbacks={callbacks}
        folders={notebooks}
        itemsByFolder={notesMap}
        activeFolder={activeNotebookName}
        activeItem={activeNote}
        expandedFolders={expandedNbs}
        loadingFolders={loadingFolders}
        renderItemsFooter={renderItemsFooter}
      />

      {/* ── 右侧：分屏编辑 + 实时预览（固定高度，flex布局撑满） ── */}
      <div className="flex-1 min-h-0 flex flex-col bg-slate-950">
        {activeNote && activeNotebook ? (
          <>
            <div className="h-12 border-b border-slate-800 flex items-center justify-between px-4 flex-shrink-0">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Book size={17} className="text-[var(--accent)]/60" />
                <span className="text-slate-400">{activeNotebookName}</span>
                <span className="text-slate-600">/</span>
                <FileText size={17} className="text-[var(--accent)]" />
                <span className="text-slate-200 font-mono">{activeNoteTitle}</span>
                {dirty && <span className="text-amber-400 text-xs font-medium">● 未保存</span>}
              </div>
            <button 
              onClick={saveNote}
              /* 1. 去掉了缩放，改用精确的 px-2(横向) 和 py-1(纵向) 来控制大小 */
              /* 2. 加上 ml-auto 保持右对齐 */
              className="flex items-center gap-1 text-xs text-black px-2 py-1 rounded-md font-bold hover:opacity-80"
              style={{ backgroundColor: 'var(--accent)' }} // 💡 只保留背景色
            >
              <Save size={14} /> 保存 {/* 💡 图标也等比例缩小一点到 14 */}
            </button>
            </div>
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 border-r border-slate-800">
                <textarea value={content} onChange={(e) => { setContent(e.target.value); setDirty(true); }}
                  className="w-full h-full bg-transparent text-slate-100 text-base font-mono resize-none outline-none leading-relaxed p-4"
                  placeholder="Markdown 内容…" spellCheck={false} />
              </div>
              <div className="flex-1 overflow-y-auto p-4 marked-body"
                dangerouslySetInnerHTML={{ __html: simpleMarkdown(content) }} />
            </div>
            <div className="h-7 border-t border-slate-800 flex items-center justify-between px-4 text-[10px] text-slate-600 flex-shrink-0">
              <span>Ctrl+S 保存</span>
              <span>Markdown 实时预览</span>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-600">
            <div className="text-center">
              <Book size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">选择左侧笔记本开始编辑</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

