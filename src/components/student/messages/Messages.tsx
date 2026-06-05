import { useState, useEffect, useCallback } from 'react';
import { Mail, FolderPlus, Trash2, Copy, Check, ChevronRight, ChevronDown, ArrowLeft } from 'lucide-react';

interface Message {
  id: string;
  sender: string;
  subject: string;
  body: string;
  folder: string;
  created_at: string;
  is_read: boolean;
}

interface MsgFolder {
  name: string;
  count: number;
  unread: number;
}

interface MessagesProps {
  username: string;
  onMsgRead?: () => void;
}

export default function Messages({ username, onMsgRead }: MessagesProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [folders, setFolders] = useState<MsgFolder[]>([]);
  const [activeFolder, setActiveFolder] = useState('');
  const [expandedFolder, setExpandedFolder] = useState('');
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const loadFolders = useCallback(() => {
    fetch(`/api/messages/folders?username=${username}`)
      .then(r => r.json()).then(d => { if (d.status === 'success') setFolders(d.folders); });
  }, [username]);
  useEffect(() => { loadFolders(); }, [loadFolders]);

  const loadMessages = (folder: string) => {
    setExpandedFolder(folder);
    setLoading(true);
    fetch(`/api/messages/inbox?username=${username}&folder=${encodeURIComponent(folder)}`)
      .then(r => r.json())
      .then(d => { if (d.status === 'success') setMessages(d.messages); })
      .finally(() => setLoading(false));
  };

  const markRead = async (msgId: string, folder: string) => {
    await fetch(`/api/messages/${encodeURIComponent(msgId)}/read?username=${username}&folder=${encodeURIComponent(folder)}`, { method: 'POST' });
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_read: true } : m));
    loadFolders();
    onMsgRead?.();
  };

  const openMessage = (msg: Message) => {
    setSelectedMsg(msg);
    if (!msg.is_read) markRead(msg.id, msg.folder);
  };

  const copySource = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const createFolder = async () => {
    const n = newFolderName.trim(); if (!n) { setShowNewFolder(false); return; }
    const res = await fetch(`/api/messages/folders?username=${username}&folder=${encodeURIComponent(n)}`, { method: 'POST' });
    const data = await res.json();
    if (data.status === 'success') { setNewFolderName(''); setShowNewFolder(false); loadFolders(); }
    else alert(data.detail || '创建失败');
  };

  const deleteFolder = async (name: string) => {
    if (!confirm(`确定删除文件夹「${name}」及其所有消息？`)) return;
    await fetch(`/api/messages/folders/${encodeURIComponent(name)}?username=${username}`, { method: 'DELETE' });
    if (activeFolder === name) { setActiveFolder(''); setSelectedMsg(null); }
    if (expandedFolder === name) setExpandedFolder('');
    loadFolders();
  };

  const moveToFolder = async (msgId: string, toFolder: string) => {
    await fetch(`/api/messages/${encodeURIComponent(msgId)}/move?folder=${encodeURIComponent(toFolder)}&username=${username}`, { method: 'POST' });
    setMessages(prev => prev.filter(m => m.id !== msgId));
    loadFolders();
  };

  function renderBody(text: string) {
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const withCodeBlocks = escaped.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, _lang, code) => {
      return `<pre class="bg-slate-950 border border-slate-700 rounded-xl p-4 my-3 overflow-x-auto text-sm font-mono leading-relaxed"><code style="color:var(--accent)">${code.trim()}</code></pre>`;
    });
    return withCodeBlocks
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-4 mb-2" style="color:var(--accent)">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-5 mb-2" style="color:var(--accent)">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-black mt-6 mb-3" style="color:var(--accent)">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--accent)">$1</strong>')
      .replace(/`(.+?)`/g, '<code class="bg-slate-700 px-1.5 py-0.5 rounded text-sm font-mono" style="color:var(--accent)">$1</code>')
      .replace(/^- (.+)$/gm, '<li class="text-slate-300 ml-4 list-disc">$1</li>')
      .replace(/\n/g, '<br>');
  }

  return (
    <div className="flex h-full">
      {/* 左侧：文件夹列表（一直显示，和 Notebook 一样） */}
      <div className="w-72 bg-slate-900/80 border-r border-slate-800 flex flex-col flex-shrink-0">
        <div className="h-12 border-b border-slate-800 flex items-center justify-between px-3">
          <span className="text-sm text-slate-300 font-mono tracking-wider flex items-center gap-1.5">
            <Mail size={16} className="text-slate-400" /> 邮件</span>
          <button onClick={() => { setShowNewFolder(true); setNewFolderName(''); }}
            className="text-slate-400 hover:text-[var(--accent)] p-1 rounded hover:bg-slate-800" title="新建文件夹">
            <FolderPlus size={16} />
          </button>
        </div>
        {showNewFolder && (
          <div className="px-3 py-2 border-b border-slate-800 flex gap-1">
            <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
              placeholder="文件夹名，如 Scratch课堂"
              className="flex-1 bg-slate-800 text-sm text-slate-200 px-2 py-1.5 rounded outline-none border border-slate-700" style={{ borderColor: 'var(--accent)' }} />
            <button onClick={createFolder}
              className="text-sm text-black px-2 py-1.5 rounded font-bold" style={{ backgroundColor: 'var(--accent)' }}>确定</button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto py-1">
          {folders.length === 0 || (folders.length === 1 && folders[0].name === '收件箱' && folders[0].count === 0) ? (
            <div className="p-4 text-sm text-slate-300 text-center">
              还没有消息<br />
              <button onClick={() => { setShowNewFolder(true); setNewFolderName(''); }}
                className="text-[var(--accent)] hover:underline mt-1">创建文件夹</button>
            </div>
          ) : (
            folders.map(f => (
              <div key={f.name}>
                <div onClick={() => { setActiveFolder(f.name); setSelectedMsg(null); loadMessages(f.name); }}
                  className={`group flex items-center justify-between px-3 py-2 cursor-pointer ${
                    activeFolder === f.name
                      ? 'bg-[var(--accent)]/10 border-l-2 border-[var(--accent)] text-white'
                      : 'border-l-2 border-transparent text-slate-400 hover:bg-slate-800/60'
                  }`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">{expandedFolder === f.name ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</span>
                    <Mail size={17} className="text-[var(--accent)]/60 flex-shrink-0" />
                    <span className="text-sm truncate">{f.name}</span>
                    <span className="text-xs text-slate-400">{f.count}</span>
                  </div>
                  {f.name !== '收件箱' && (
                    <button onClick={(e) => { e.stopPropagation(); deleteFolder(f.name); }}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 p-0.5" title="删除">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                {expandedFolder === f.name && (
                  <div className="bg-slate-950/50">
                    {loading ? (
                      <div className="pl-8 pr-3 py-2 text-xs text-slate-500 animate-pulse">加载中...</div>
                    ) : messages.length === 0 ? (
                      <div className="pl-8 pr-3 py-2 text-xs text-slate-500">暂无消息</div>
                    ) : (
                      messages.map(msg => (
                        <div key={msg.id}
                          onClick={(e) => { e.stopPropagation(); openMessage(msg); }}
                          className={`group flex items-center justify-between pl-9 pr-3 py-1.5 cursor-pointer ${
                            selectedMsg?.id === msg.id
                              ? 'bg-[var(--accent)]/10 border-l-2 border-[var(--accent)] text-white'
                              : 'border-l-2 border-transparent text-slate-500 hover:bg-slate-800/40 hover:text-slate-300'
                          }`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={!msg.is_read ? { backgroundColor: 'var(--accent)', boxShadow: '0 0 4px var(--accent)' } : { backgroundColor: 'transparent' }} />
                            <span className="text-sm truncate">{msg.subject}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-400">{msg.created_at?.slice(5, 16)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右侧：消息详情（侧边栏始终可见） */}
      <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
        {selectedMsg ? (
          <>
            <div className="h-12 border-b border-slate-800 flex items-center justify-between px-4 flex-shrink-0">
              <div className="flex items-center gap-2">
              <button onClick={() => setSelectedMsg(null)} className="flex items-center text-xs text-slate-400 hover:text-white transition-colors" title="返回">
                <ArrowLeft size={14} />
              </button>
              <span className="text-xs text-slate-600">|</span>
              <span className="text-xs text-slate-500">来自 <span style={{ color: 'var(--accent)' }}>{selectedMsg.sender}</span></span>
              </div>
              <span className="text-xs text-slate-600 ml-auto">{selectedMsg.created_at}</span>
              <select
                onChange={e => { if (e.target.value) moveToFolder(selectedMsg.id, e.target.value); e.target.value = ''; }}
                className="text-[10px] bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 outline-none ml-2"
                defaultValue=""
              >
                <option value="" disabled>移动到...</option>
                {folders.filter(f => f.name !== selectedMsg.folder).map(f => (
                  <option key={f.name} value={f.name}>{f.name}</option>
                ))}
              </select>
              <button onClick={() => copySource(selectedMsg.body)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors ml-1" title="复制 Markdown 源码">
                {copied ? <Check size={12} className="text-geek-green" /> : <Copy size={12} />}
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <h2 className="text-base font-bold text-white mb-1">{selectedMsg.subject}</h2>
              <div className="text-xs text-slate-500 mb-4 border-b border-slate-800 pb-3">
                {selectedMsg.folder !== '收件箱' && <span className="mr-3">文件夹：<span style={{ color: 'var(--accent)' }}>{selectedMsg.folder}</span></span>}
              </div>
              <div className="text-slate-300 leading-relaxed text-sm" dangerouslySetInnerHTML={{ __html: renderBody(selectedMsg.body) }} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center space-y-2">
              <Mail size={48} className="mx-auto opacity-30" />
              <p className="text-sm">选择左侧消息查看内容</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
