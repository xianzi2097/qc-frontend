import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Plus, Trash2, Save,
  BookOpen, ChevronRight, ChevronDown, FolderPlus,
} from 'lucide-react';
import hljs from 'highlight.js';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import 'highlight.js/styles/github-dark.css';

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

interface NotebookItem { name: string; note_count: number; }
interface NoteItem { filename: string; size: number; modified: number; }
interface NotebookProps { username: string; }

export default function Notebook({ username }: NotebookProps) {
  const [notebooks, setNotebooks] = useState<NotebookItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [activeNotebook, setActiveNotebook] = useState('');
  const [activeNote, setActiveNote] = useState('');
  const [expandedNb, setExpandedNb] = useState('');
  const [content, setContent] = useState('');
  const [dirty, setDirty] = useState(false);
  const [newName, setNewName] = useState('');
  const [showNewNb, setShowNewNb] = useState(false);
  const [showNewNote, setShowNewNote] = useState(false);

  const loadNotebooks = useCallback(() => {
    fetch(`/api/notebooks?username=${username}`)
      .then(r => r.json()).then(d => { if (d.status === 'success') setNotebooks(d.notebooks); });
  }, [username]);
  useEffect(() => { loadNotebooks(); }, [loadNotebooks]);

  const loadNotes = (nb: string) => {
    setExpandedNb(nb);
    fetch(`/api/notes?username=${username}&notebook=${encodeURIComponent(nb)}`)
      .then(r => r.json()).then(d => { if (d.status === 'success') setNotes(d.notes); });
  };

  useEffect(() => {
    if (!activeNote || !activeNotebook) { setContent(''); return; }
    fetch(`/api/notes/${encodeURIComponent(activeNotebook)}/${encodeURIComponent(activeNote)}?username=${username}`)
      .then(r => r.json()).then(d => { if (d.status === 'success') { setContent(d.content); setDirty(false); } });
  }, [activeNote, activeNotebook, username]);

  const createNotebook = (name: string) => {
    const n = name.trim(); if (!n) { setShowNewNb(false); return; }
    fetch(`/api/notebooks?username=${username}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: n }),
    }).then(r => r.json()).then(() => { setNewName(''); setShowNewNb(false); loadNotebooks(); });
  };

  const deleteNotebook = (name: string) => {
    if (!confirm(`确定删除笔记本「${name}」及其所有笔记？`)) return;
    fetch(`/api/notebooks/${encodeURIComponent(name)}?username=${username}`, { method: 'DELETE' })
      .then(r => r.json()).then(() => {
        if (activeNotebook === name) { setActiveNotebook(''); setActiveNote(''); }
        if (expandedNb === name) setExpandedNb(''); loadNotebooks();
      });
  };

  const createNote = (name: string) => {
    const n = name.trim(); if (!n || !activeNotebook) { setShowNewNote(false); return; }
    const filename = n.endsWith('.md') ? n : n + '.md';
    fetch(`/api/notes?username=${username}&notebook=${encodeURIComponent(activeNotebook)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, content: `# ${n}\n\n` }),
    }).then(r => r.json()).then(() => {
      setActiveNote(filename); setContent(`# ${n}\n\n`); setDirty(false);
      setNewName(''); setShowNewNote(false); loadNotes(activeNotebook);
    });
  };

  const saveNote = () => {
    if (!activeNote || !activeNotebook) return;
    fetch(`/api/notes?username=${username}&notebook=${encodeURIComponent(activeNotebook)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: activeNote, content }),
    }).then(r => r.json()).then(() => { setDirty(false); loadNotes(activeNotebook); });
  };

  const deleteNote = (filename: string) => {
    if (!confirm(`确定删除「${filename}」？`)) return;
    fetch(`/api/notes/${encodeURIComponent(activeNotebook)}/${encodeURIComponent(filename)}?username=${username}`, { method: 'DELETE' })
      .then(r => r.json()).then(() => {
        if (activeNote === filename) { setActiveNote(''); setContent(''); }
        loadNotes(activeNotebook);
      });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); if (dirty) saveNote(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, content, activeNotebook, activeNote]);

  const fmtTime = (ts: number) => {
    const d = new Date(ts * 1000);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="flex h-full animate-fadeIn">
      {/* ── 左侧：笔记本列表 ── */}
      <div className="w-72 bg-slate-900/80 border-r border-slate-800 flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-sm text-slate-300 font-mono tracking-wider flex items-center gap-1.5">
            <BookOpen size={16} className="text-slate-400" /> 笔记本</span>
          <button onClick={() => { setShowNewNb(true); setNewName(''); }}
            className="text-slate-400 hover:text-geek-green p-1 rounded hover:bg-slate-800" title="新建笔记本">
            <FolderPlus size={16} />
          </button>
        </div>
        {showNewNb && (
          <div className="px-3 py-2 border-b border-slate-800 flex gap-1">
            <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createNotebook(newName); if (e.key === 'Escape') setShowNewNb(false); }}
              placeholder="笔记本名，如 Python学习"
              className="flex-1 bg-slate-800 text-sm text-slate-200 px-2 py-1.5 rounded outline-none border border-slate-700 focus:border-geek-green" />
            <button onClick={() => createNotebook(newName)}
              className="text-sm bg-geek-green text-black px-2 py-1.5 rounded font-bold hover:bg-geek-green/80">确定</button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto py-1">
          {notebooks.length === 0 ? (
            <div className="p-4 text-sm text-slate-300 text-center">
              还没有笔记本<br />
              <button onClick={() => { setShowNewNb(true); setNewName(''); }}
                className="text-geek-green hover:underline mt-1">创建第一个</button>
            </div>
          ) : (
            notebooks.map(nb => (
              <div key={nb.name}>
                <div onClick={() => { setActiveNotebook(nb.name); setActiveNote(''); loadNotes(nb.name); }}
                  className={`group flex items-center justify-between px-3 py-2 cursor-pointer ${
                    activeNotebook === nb.name
                      ? 'bg-brand-orange/10 border-l-2 border-brand-orange text-white'
                      : 'border-l-2 border-transparent text-slate-400 hover:bg-slate-800/60'
                  }`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">{expandedNb === nb.name ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</span>
                    <BookOpen size={17} className="text-brand-orange/60 flex-shrink-0" />
                    <span className="text-sm truncate">{nb.name}</span>
                    <span className="text-xs text-slate-400">{nb.note_count}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteNotebook(nb.name); }}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 p-0.5" title="删除">
                    <Trash2 size={15} />
                  </button>
                </div>
                {expandedNb === nb.name && (
                  <div className="bg-slate-950/50">
                    {notes.map(n => (
                      <div key={n.filename}
                        onClick={(e) => { e.stopPropagation(); setActiveNote(n.filename); }}
                        className={`group flex items-center justify-between pl-9 pr-3 py-1.5 cursor-pointer ${
                          activeNote === n.filename
                            ? 'bg-geek-green/10 border-l-2 border-geek-green text-white'
                            : 'border-l-2 border-transparent text-slate-500 hover:bg-slate-800/40 hover:text-slate-300'
                        }`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={15} className="flex-shrink-0" />
                          <span className="text-sm truncate">{n.filename.replace('.md', '')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400">{fmtTime(n.modified)}</span>
                          <button onClick={(e) => { e.stopPropagation(); deleteNote(n.filename); }}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {showNewNote ? (
                      <div className="pl-9 pr-3 py-1.5 flex gap-1">
                        <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') createNote(newName); if (e.key === 'Escape') setShowNewNote(false); }}
                          placeholder="笔记名"
                          className="flex-1 bg-slate-800 text-sm text-slate-200 px-2 py-1 rounded outline-none border border-slate-700 focus:border-geek-green" />
                        <button onClick={() => createNote(newName)}
                          className="text-xs bg-geek-green text-black px-1.5 py-1 rounded font-bold">确定</button>
                      </div>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setShowNewNote(true); setNewName(''); }}
                        className="w-full flex items-center gap-1 pl-9 pr-3 py-1.5 text-xs text-slate-400 hover:text-geek-green">
                        <Plus size={13} /> 新建笔记
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── 右侧：分屏编辑 + 实时预览 ── */}
      <div className="flex-1 flex flex-col bg-slate-950">
        {activeNote && activeNotebook ? (
          <>
            <div className="h-12 border-b border-slate-800 flex items-center justify-between px-4 flex-shrink-0">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <BookOpen size={17} className="text-brand-orange/60" />
                <span className="text-slate-400">{activeNotebook}</span>
                <span className="text-slate-600">/</span>
                <FileText size={17} className="text-geek-green" />
                <span className="text-slate-200 font-mono">{activeNote}</span>
                {dirty && <span className="text-amber-400 text-xs font-medium">● 未保存</span>}
              </div>
              <button onClick={saveNote}
                className="flex items-center gap-1.5 text-sm bg-geek-green text-black px-4 py-2 rounded-lg font-bold hover:bg-geek-green/80">
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
              <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">先创建笔记本，再在里面写笔记</p>
              <button onClick={() => { setShowNewNb(true); setNewName(''); }}
                className="mt-3 text-xs text-geek-green hover:underline flex items-center gap-1 mx-auto">
                <FolderPlus size={14} /> 新建笔记本
              </button>
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
