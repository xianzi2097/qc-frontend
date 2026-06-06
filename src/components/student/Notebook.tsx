import { useState, useEffect, useCallback } from 'react';
import { FileText, Save, Book, Plus } from 'lucide-react';
import hljs from 'highlight.js';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import 'highlight.js/styles/github-dark.css';
import FolderTreePanel, {
  type FolderTreeConfig,
  type FolderTreeCallbacks,
  type TreeFolder,
  type TreeItem,
} from '../ui/FolderTreePanel';

marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
}));
marked.use({ breaks: true, gfm: true });

// ─── 数据适配层 ───

interface NotebookItem extends TreeFolder { name: string; note_count: number; count: number; }
interface NoteItem extends TreeItem { id: string; filename: string; size: number; modified: number; }

const notebookConfig: FolderTreeConfig<NotebookItem, NoteItem> = {
  titleIcon: <Book size={16} className="text-slate-400" />,
  title: '笔记本',
  folderIcon: <Book size={17} />,
  folderLabel: '笔记本',
  itemLabel: '笔记',
  newFolderPlaceholder: '笔记本名，如 Python学习',
  emptyText: '还没有笔记本',
  emptyActionText: '创建第一个',
  renderItemLabel: (item) => item.filename.replace(/\.\w+$/, ''),
  formatItemTime: (item) => {
    const d = new Date(item.modified * 1000);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },
};

// ─── 组件 ───

interface NotebookProps { username: string; }

export default function Notebook({ username }: NotebookProps) {
  const [notebooks, setNotebooks] = useState<NotebookItem[]>([]);
  const [notesMap, setNotesMap] = useState<Map<string, NoteItem[]>>(new Map());
  const [activeNotebook, setActiveNotebook] = useState('');
  const [activeNote, setActiveNote] = useState('');
  const [expandedNbs, setExpandedNbs] = useState<Set<string>>(new Set());
  const [content, setContent] = useState('');
  const [dirty, setDirty] = useState(false);
  const [showNewNote, setShowNewNote] = useState(false);
  const [newNoteName, setNewNoteName] = useState('');

  // ── 数据加载 ──

  const loadNotebooks = useCallback(() => {
    fetch(`/api/notebooks?username=${username}`)
      .then(r => r.json()).then(d => { if (d.status === 'success') setNotebooks(d.notebooks.map((nb: any) => ({ ...nb, count: nb.note_count ?? nb.count }))); });
  }, [username]);
  useEffect(() => { loadNotebooks(); }, [loadNotebooks]);

  const loadNotes = (nb: string) => {
    fetch(`/api/notes?username=${username}&notebook=${encodeURIComponent(nb)}`)
      .then(r => r.json()).then(d => {
        if (d.status === 'success') setNotesMap(prev => new Map(prev).set(nb, d.notes.map((n: any) => ({ ...n, id: n.filename }))));
      });
  };

  useEffect(() => {
    if (!activeNote || !activeNotebook) { setContent(''); return; }
    fetch(`/api/notes/${encodeURIComponent(activeNotebook)}/${encodeURIComponent(activeNote)}?username=${username}`)
      .then(r => r.json()).then(d => { if (d.status === 'success') { setContent(d.content); setDirty(false); } });
  }, [activeNote, activeNotebook, username]);

  // ── 文件夹 + 条目回调（给基件用） ──

  const callbacks: FolderTreeCallbacks<NotebookItem> = {
    onSelectFolder: (name) => {
      setActiveNotebook(name); setActiveNote('');
      setExpandedNbs(prev => {
        const next = new Set(prev);
        if (next.has(name)) { next.delete(name); }
        else { next.add(name); loadNotes(name); }
        return next;
      });
    },
    onSelectItem: (id, folderName) => { setActiveNote(id); setActiveNotebook(folderName); },

    onCreateFolder: async (name) => {
      await fetch(`/api/notebooks?username=${username}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
      }).then(r => r.json());
      loadNotebooks();
    },

    onDeleteFolder: async (name) => {
      await fetch(`/api/notebooks/${encodeURIComponent(name)}?username=${username}`, { method: 'DELETE' }).then(r => r.json());
      if (activeNotebook === name) { setActiveNotebook(''); setActiveNote(''); }
      setExpandedNbs(prev => { const n = new Set(prev); n.delete(name); return n; });
      loadNotebooks();
    },

    onDeleteItem: async (filename) => {
      await fetch(`/api/notes/${encodeURIComponent(activeNotebook)}/${encodeURIComponent(filename)}?username=${username}`, { method: 'DELETE' }).then(r => r.json());
      if (activeNote === filename) { setActiveNote(''); setContent(''); }
      loadNotes(activeNotebook);
    },

    onRenameFolder: async (oldName, newName) => {
      await fetch(`/api/notebooks/${encodeURIComponent(oldName)}?username=${username}&new_name=${encodeURIComponent(newName)}`, { method: 'PUT' }).then(r => r.json());
      if (activeNotebook === oldName) setActiveNotebook(newName);
      setExpandedNbs(prev => { const n = new Set(prev); n.delete(oldName); n.add(newName); return n; });
      loadNotebooks();
    },

    onRenameItem: async (oldFilename, newName) => {
      const newFilename = newName.endsWith('.md') ? newName : newName + '.md';
      await fetch(`/api/notes/${encodeURIComponent(activeNotebook)}/${encodeURIComponent(oldFilename)}?username=${username}&new_name=${encodeURIComponent(newFilename)}`, { method: 'PUT' }).then(r => r.json());
      if (activeNote === oldFilename) { setActiveNote(newFilename); }
      loadNotes(activeNotebook);
    },
  };

  // ── 笔记操作（Notebook 自己管） ──

  const createNote = async () => {
    const n = newNoteName.trim();
    if (!n || !activeNotebook) { setShowNewNote(false); return; }
    const filename = n.endsWith('.md') ? n : n + '.md';
    await fetch(`/api/notes?username=${username}&notebook=${encodeURIComponent(activeNotebook)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, content: `# ${n}\n\n` }),
    }).then(r => r.json());
    setActiveNote(filename);
    setContent(`# ${n}\n\n`);
    setDirty(false);
    setNewNoteName('');
    setShowNewNote(false);
    loadNotes(activeNotebook);
  };

  const saveNote = () => {
    if (!activeNote || !activeNotebook) return;
    fetch(`/api/notes?username=${username}&notebook=${encodeURIComponent(activeNotebook)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: activeNote, content }),
    }).then(r => r.json()).then(() => { setDirty(false); loadNotes(activeNotebook); });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); if (dirty) saveNote(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, content, activeNotebook, activeNote]);

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

  return (
    <div className="flex h-full animate-fadeIn">
      <FolderTreePanel
        config={notebookConfig}
        callbacks={callbacks}
        folders={notebooks}
        itemsByFolder={notesMap}
        activeFolder={activeNotebook}
        activeItem={activeNote}
        expandedFolders={expandedNbs}
        renderItemsFooter={renderItemsFooter}
      />

      {/* ── 右侧：分屏编辑 + 实时预览 ── */}
      <div className="flex-1 flex flex-col bg-slate-950">
        {activeNote && activeNotebook ? (
          <>
            <div className="h-12 border-b border-slate-800 flex items-center justify-between px-4 flex-shrink-0">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Book size={17} className="text-[var(--accent)]/60" />
                <span className="text-slate-400">{activeNotebook}</span>
                <span className="text-slate-600">/</span>
                <FileText size={17} className="text-[var(--accent)]" />
                <span className="text-slate-200 font-mono">{activeNote}</span>
                {dirty && <span className="text-amber-400 text-xs font-medium">● 未保存</span>}
              </div>
              <button onClick={saveNote}
                className="flex items-center gap-1.5 text-sm text-black px-4 py-2 rounded-lg font-bold hover:opacity-80"
                style={{ backgroundColor: 'var(--accent)' }}>
                <Save size={16} /> 保存
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

function simpleMarkdown(md: string): string {
  return marked.parse(md) as string;
}
