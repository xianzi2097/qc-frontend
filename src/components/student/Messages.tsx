import { useState, useEffect, useCallback } from 'react';
import { Mail, Copy, Check, ArrowLeft } from 'lucide-react';
import { simpleMarkdown } from '../../lib/markdown';
import FolderTreePanel, {
  type FolderTreeConfig,
  type FolderTreeCallbacks,
  type TreeFolder,
  type TreeItem,
} from '../ui/FolderTreePanel';

// ─── 数据适配层 ───

interface Message {
  id: string;
  sender: string;
  subject: string;
  body: string;
  folder: string;
  created_at: string;
  is_read: boolean;
}

interface MsgFolder extends TreeFolder { name: string; count: number; unread: number; }
interface MsgItem extends TreeItem { id: string; subject: string; created_at: string; is_read: boolean; }

const messagesConfig: FolderTreeConfig<MsgFolder, MsgItem> = {
  titleIcon: <Mail size={16} className="text-slate-400" />,
  title: '邮件',
  folderIcon: <Mail size={17} />,
  folderLabel: '文件夹',
  itemLabel: '消息',
  newFolderPlaceholder: '文件夹名，如 Scratch课堂',
  emptyText: '还没有消息',
  emptyActionText: '创建文件夹',
  canDeleteFolder: (f) => f.name !== '收件箱',
  renderItemPrefix: (item) => (
    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={!item.is_read
        ? { backgroundColor: 'var(--accent)', boxShadow: '0 0 4px var(--accent)' }
        : { backgroundColor: 'transparent' }}
    />
  ),
  renderItemLabel: (item) => item.subject,
  formatItemTime: (item) => item.created_at?.slice(5, 16) ?? '',
};

// ─── 组件 ───

interface MessagesProps {
  username: string;
  onMsgRead?: () => void;
}

export default function Messages({ username, onMsgRead }: MessagesProps) {
  const [messagesMap, setMessagesMap] = useState<Map<string, Message[]>>(new Map());
  const [folders, setFolders] = useState<MsgFolder[]>([]);
  const [activeFolder, setActiveFolder] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  // ── 数据加载 ──

  const loadFolders = useCallback(() => {
    fetch(`/api/messages/folders?username=${username}`)
      .then(r => r.json()).then(d => { if (d.status === 'success') setFolders(d.folders); });
  }, [username]);
  useEffect(() => { loadFolders(); }, [loadFolders]);

  // ── 轮询：每5秒静默刷新消息 ──
  useEffect(() => {
    const timer = setInterval(() => {
      // 刷新文件夹列表（更新未读数）
      fetch(`/api/messages/folders?username=${username}`)
        .then(r => r.json()).then(d => { if (d.status === 'success') setFolders(d.folders); });
      // 后台刷新当前打开文件夹的消息，不干扰用户正在看的
      if (activeFolder) {
        fetch(`/api/messages/inbox?username=${username}&folder=${encodeURIComponent(activeFolder)}`)
          .then(r => r.json())
          .then(d => {
            if (d.status === 'success') {
              setMessagesMap(prev => new Map(prev).set(activeFolder, d.messages));
            }
          });
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [username, activeFolder]);

  const loadMessages = (folder: string) => {
    setLoadingFolders(prev => new Set(prev).add(folder));
    fetch(`/api/messages/inbox?username=${username}&folder=${encodeURIComponent(folder)}`)
      .then(r => r.json())
      .then(d => { if (d.status === 'success') setMessagesMap(prev => new Map(prev).set(folder, d.messages)); })
      .finally(() => setLoadingFolders(prev => { const n = new Set(prev); n.delete(folder); return n; }));
  };

  // ── 标记已读 ──

  const markRead = async (msgId: string, folder: string) => {
    await fetch(`/api/messages/${encodeURIComponent(msgId)}/read?username=${username}&folder=${encodeURIComponent(folder)}`, { method: 'POST' });
    setMessagesMap(prev => {
      const next = new Map(prev);
      const msgs = next.get(folder);
      if (msgs) next.set(folder, msgs.map(m => m.id === msgId ? { ...m, is_read: true } : m));
      return next;
    });
    loadFolders();
    onMsgRead?.();
  };

  // ── 消息操作 ──

  const moveToFolder = async (msgId: string, toFolder: string) => {
    await fetch(`/api/messages/${encodeURIComponent(msgId)}/move?folder=${encodeURIComponent(toFolder)}&username=${username}`, { method: 'POST' });
    setMessagesMap(prev => {
      const next = new Map(prev);
      const msgs = next.get(activeFolder);
      if (msgs) next.set(activeFolder, msgs.filter(m => m.id !== msgId));
      return next;
    });
    setSelectedMsg(null);
    loadFolders();
  };

  const copySource = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── 文件夹回调（给基件用） ──

  // ── 文件夹 + 条目回调（给基件用） ──

  const callbacks: FolderTreeCallbacks<MsgFolder> = {
    onSelectFolder: (name) => {
      setActiveFolder(name);
      setSelectedMsg(null);
      setExpandedFolders(prev => {
        const next = new Set(prev);
        if (next.has(name)) { next.delete(name); }
        else { next.add(name); }
        return next;
      });
      if (!expandedFolders.has(name)) loadMessages(name);
    },
    onSelectItem: (id, folderName) => {
      const msgs = messagesMap.get(folderName);
      const msg = msgs?.find(m => m.id === id);
      if (msg) {
        setActiveFolder(folderName);
        setSelectedMsg(msg);
        // 用 folderName 而不是 msg.folder（消息JSON里没有folder字段）
        if (!msg.is_read) markRead(msg.id, folderName);
      }
    },

    onCreateFolder: async (name) => {
      const res = await fetch(`/api/messages/folders?username=${username}&folder=${encodeURIComponent(name)}`, { method: 'POST' });
      const data = await res.json();
      if (data.status !== 'success') alert(data.detail || '创建失败');
      loadFolders();
    },

    onDeleteFolder: async (name) => {
      await fetch(`/api/messages/folders/${encodeURIComponent(name)}?username=${username}`, { method: 'DELETE' });
      if (activeFolder === name) { setActiveFolder(''); setSelectedMsg(null); }
      setExpandedFolders(prev => { const n = new Set(prev); n.delete(name); return n; });
      loadFolders();
    },

    onDeleteItem: async (msgId) => {
      await fetch(`/api/messages/${encodeURIComponent(msgId)}?username=${username}&folder=${encodeURIComponent(activeFolder)}`, { method: 'DELETE' });
      if (selectedMsg?.id === msgId) setSelectedMsg(null);
      setMessagesMap(prev => {
        const next = new Map(prev);
        const msgs = next.get(activeFolder);
        if (msgs) next.set(activeFolder, msgs.filter(m => m.id !== msgId));
        return next;
      });
      loadFolders();
    },

    onRenameFolder: async (oldName, newName) => {
      if (oldName === '收件箱') return;
      await fetch(`/api/messages/folders/${encodeURIComponent(oldName)}?username=${username}&new_name=${encodeURIComponent(newName)}`, { method: 'PUT' });
      if (activeFolder === oldName) setActiveFolder(newName);
      setExpandedFolders(prev => { const n = new Set(prev); n.delete(oldName); n.add(newName); return n; });
      loadFolders();
    },
  };

  // ── 数据转换 ──

  const treeItemsMap = new Map<string, MsgItem[]>();
  messagesMap.forEach((msgs, folder) => {
    treeItemsMap.set(folder, msgs.map(m => ({ id: m.id, subject: m.subject, created_at: m.created_at, is_read: m.is_read })));
  });

  const isEmptyMsg = (fs: MsgFolder[]) =>
    fs.length === 0 || (fs.length === 1 && fs[0].name === '收件箱' && fs[0].count === 0);

  // ── 渲染 ──

  return (
    <div className="flex h-full animate-fadeIn">
      <FolderTreePanel
        config={messagesConfig}
        callbacks={callbacks}
        folders={folders}
        itemsByFolder={treeItemsMap}
        activeFolder={activeFolder}
        activeItem={selectedMsg?.id ?? ''}
        expandedFolders={expandedFolders}
        loadingFolders={loadingFolders}
        isEmpty={isEmptyMsg}
      />

      {/* ── 右侧：消息详情 ── */}
      <div className="w-[70%] flex flex-col bg-slate-950 overflow-hidden">
        {selectedMsg ? (
          <>
            <div className="h-12 border-b border-slate-800 flex items-center justify-between px-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedMsg(null)}
                  className="flex items-center text-xs text-slate-400 hover:text-white transition-colors" title="返回">
                  <ArrowLeft size={14} />
                </button>
                <span className="text-xs text-slate-600">|</span>
                <span className="text-xs text-slate-500">
                  来自 <span style={{ color: 'var(--accent)' }}>{selectedMsg.sender}</span>
                </span>
              </div>
              <span className="text-xs text-slate-600 ml-auto">{selectedMsg.created_at}</span>
              <select
                onChange={e => { if (e.target.value) moveToFolder(selectedMsg.id, e.target.value); e.target.value = ''; }}
                className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-300 outline-none ml-2"
                defaultValue=""
              >
                <option value="" disabled>移动到...</option>
                {folders.filter(f => f.name !== activeFolder).map(f => (
                  <option key={f.name} value={f.name}>{f.name}</option>
                ))}
              </select>
              <button onClick={() => copySource(selectedMsg.body)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors ml-4"
                title="复制 Markdown 源码 -1">
                {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <h2 className="text-base font-bold text-white mb-1">{selectedMsg.subject}</h2>
              <div className="text-xs text-slate-500 mb-4 border-b border-slate-800 pb-3">
                {selectedMsg.created_at?.slice(0, 16) || ''}
              </div>
              <div
                className="text-slate-300 leading-relaxed text-sm marked-body"
                dangerouslySetInnerHTML={{ __html: simpleMarkdown(selectedMsg.body) }}
              />
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

