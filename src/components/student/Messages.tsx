import { useState, useEffect, useCallback } from 'react';
import { Mail, Copy, Check, ArrowLeft } from 'lucide-react';
import { simpleMarkdown } from '../../lib/markdown';
import { apiV2 } from '../../lib/api';
import FolderTreePanel, {
  type FolderTreeConfig,
  type FolderTreeCallbacks,
  type TreeFolder,
  type TreeItem,
} from '../ui/FolderTreePanel';

// ─── 数据适配层 ───
// 前端内部保持 V1 形状（sender/subject/body/folder=name），V2 差异在请求层翻译收口

interface Message {
  id: string;
  sender: string;
  subject: string;
  body: string;
  folder: string;
  created_at: string;
  is_read: boolean;
}

interface MsgFolder extends TreeFolder { id: string; builtin: boolean; unread: number; }
interface MsgItem extends TreeItem { id: string; subject: string; created_at: string; is_read: boolean; }

/** V2 列表项 → 前端 Message（列表无正文，content 在点开详情时取） */
const v2ToMessages = (
  items: { id: string; title: string; peer: string; is_read: boolean; created_at: string }[],
  folderName: string,
): Message[] => items.map(m => ({
  id: m.id, sender: m.peer, subject: m.title, body: '',
  folder: folderName, created_at: m.created_at, is_read: m.is_read,
}));

const messagesConfig: FolderTreeConfig<MsgFolder, MsgItem> = {
  titleIcon: <Mail size={16} className="text-slate-400" />,
  title: '邮件',
  folderIcon: <Mail size={17} />,
  folderLabel: '文件夹',
  itemLabel: '消息',
  newFolderPlaceholder: '文件夹名，如 Scratch课堂',
  emptyText: '还没有消息',
  emptyActionText: '创建文件夹',
  canDeleteFolder: (f) => !f.builtin,
  folderDeleteNote: '里面的邮件将退回收件箱，不会丢失',
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
  onMsgRead?: () => void;
}

export default function Messages({ onMsgRead }: MessagesProps) {
  const [messagesMap, setMessagesMap] = useState<Map<string, Message[]>>(new Map());
  const [folders, setFolders] = useState<MsgFolder[]>([]);
  const [activeFolder, setActiveFolder] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  // ── name 是组件内部主键，发请求时转成 V2 的 id ──
  const folderIdOf = useCallback(
    (name: string) => folders.find(f => f.name === name)?.id,
    [folders],
  );

  // ── 数据加载（V2：/api/message-folders，token 即身份）──

  const loadFolders = useCallback(() => {
    apiV2<{ items: MsgFolder[] }>('/api/message-folders')
      .then(d => setFolders(d.items))
      .catch(() => {});
  }, []);
  useEffect(() => { loadFolders(); }, [loadFolders]);

  const fetchInbox = useCallback((folderName: string) => {
    const fid = folders.find(f => f.name === folderName)?.id;
    if (!fid) return Promise.resolve();
    return apiV2<{ items: Parameters<typeof v2ToMessages>[0] }>(
      `/api/messages?box=inbox&folder=${encodeURIComponent(fid)}&page_size=100`,
    )
      .then(d => setMessagesMap(prev => new Map(prev).set(folderName, v2ToMessages(d.items, folderName))))
      .catch(() => {});
  }, [folders]);

  // ── 轮询：每5秒静默刷新（夹列表角标 + 当前夹消息）──
  useEffect(() => {
    const timer = setInterval(() => {
      loadFolders();
      if (activeFolder) fetchInbox(activeFolder);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeFolder, loadFolders, fetchInbox]);

  const loadMessages = (folder: string) => {
    setLoadingFolders(prev => new Set(prev).add(folder));
    fetchInbox(folder)
      .finally(() => setLoadingFolders(prev => { const n = new Set(prev); n.delete(folder); return n; }));
  };

  // ── 消息操作 ──

  const moveToFolder = async (msgId: string, toFolder: string) => {
    const fid = folderIdOf(toFolder);
    if (!fid) return;
    await apiV2(`/api/messages/${encodeURIComponent(msgId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ folder_id: fid }),
    }).catch(e => alert(e instanceof Error ? e.message : '移动失败'));
    setMessagesMap(prev => {
      const next = new Map(prev);
      const msgs = next.get(activeFolder);
      if (msgs) next.set(activeFolder, msgs.filter(m => m.id !== msgId));
      next.delete(toFolder);   // 目标夹缓存失效，避免"移过去却看不见"
      return next;
    });
    setSelectedMsg(null);
    loadFolders();
    loadMessages(toFolder);    // 目标夹正展开时立即看到移入的信
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
      if (!msg) return;
      setActiveFolder(folderName);
      // V2：详情单独取，读即已读（替代原 /read 调用）
      apiV2<{ sender_username: string; title: string; content: string }>(
        `/api/messages/${encodeURIComponent(id)}`,
      ).then(d => {
        setSelectedMsg({ ...msg, sender: d.sender_username, subject: d.title, body: d.content, is_read: true });
        if (!msg.is_read) {
          setMessagesMap(prev => {
            const next = new Map(prev);
            const list = next.get(folderName);
            if (list) next.set(folderName, list.map(m => m.id === id ? { ...m, is_read: true } : m));
            return next;
          });
          loadFolders();
          onMsgRead?.();
        }
      }).catch(e => alert(e instanceof Error ? e.message : '消息不存在'));
    },

    onCreateFolder: async (name) => {
      await apiV2('/api/message-folders', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }).catch(e => alert(e instanceof Error ? e.message : '创建失败'));
      loadFolders();
    },

    onDeleteFolder: async (name) => {
      const fid = folderIdOf(name);
      if (!fid) return;
      await apiV2(`/api/message-folders/${encodeURIComponent(fid)}`, { method: 'DELETE' })
        .catch(e => alert(e instanceof Error ? e.message : '删除失败'));
      const wasActive = activeFolder === name;
      // 失效被删夹与收件箱两份缓存（V2 删夹=信退回收件箱，旧缓存看不到回流）
      setMessagesMap(prev => {
        const n = new Map(prev);
        n.delete(name);
        n.delete('收件箱');
        return n;
      });
      setExpandedFolders(prev => {
        const s = new Set(prev);
        s.delete(name);
        if (wasActive) s.add('收件箱');
        return s;
      });
      if (wasActive) {
        setActiveFolder('收件箱');   // 正看着被删夹 → 自动跳回收件箱，直接看到信回流
        setSelectedMsg(null);
      }
      loadFolders();
      loadMessages('收件箱');
    },

    onDeleteItem: async (msgId) => {
      await apiV2(`/api/messages/${encodeURIComponent(msgId)}`, { method: 'DELETE' })
        .catch(e => alert(e instanceof Error ? e.message : '删除失败'));
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
      const fid = folderIdOf(oldName);
      if (!fid) return;
      await apiV2(`/api/message-folders/${encodeURIComponent(fid)}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: newName }),
      }).catch(e => alert(e instanceof Error ? e.message : '改名失败'));
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

      {/* ── 右侧：消息详情（左列固定宽，这里吃满剩余宽度） ── */}
      <div className="flex-1 min-w-0 flex flex-col bg-slate-950 overflow-hidden">
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

