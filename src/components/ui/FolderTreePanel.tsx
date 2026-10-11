import { useState } from 'react';
import { Trash2, ChevronRight, ChevronDown, FolderPlus, Pencil } from 'lucide-react';
import { confirmDelete } from './confirmDelete';

// ─── 类型定义 ───

export interface TreeFolder {
  name: string;
  count: number;
}

export interface TreeItem {
  id: string;
}

// ─── 配置项 ───

export interface FolderTreeConfig<TFolder extends TreeFolder, TItem extends TreeItem> {
  titleIcon: React.ReactNode;
  title: string;
  folderIcon: React.ReactNode;
  folderLabel: string;
  itemLabel: string;
  newFolderPlaceholder: string;
  emptyText: string;
  emptyActionText: string;
  canDeleteFolder?: (folder: TFolder) => boolean;
  /** 删文件夹的确认文案（spec §7 第三档：夹没了内容怎么办——邮件=退回、笔记=M5b-4 时传"含全部笔记"） */
  folderDeleteNote?: string;

  // ── 条目内容定制（子类填） ──
  /** 条目左侧前缀（如未读圆点），不填则不渲染 */
  renderItemPrefix?: (item: TItem) => React.ReactNode;
  /** 条目显示文字（必填） */
  renderItemLabel: (item: TItem) => string;
  /** 条目右侧时间（不填则不渲染） */
  formatItemTime?: (item: TItem) => string;
}

// ─── 回调 ───

export interface FolderTreeCallbacks<_TFolder extends TreeFolder> {
  onSelectFolder: (folderName: string) => void;
  onSelectItem: (itemId: string, folderName: string) => void;
  onCreateFolder: (name: string) => Promise<void>;
  onDeleteFolder: (name: string) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onRenameFolder: (oldName: string, newName: string) => Promise<void>;
  onRenameItem?: (oldId: string, newName: string) => Promise<void>;
}

// ─── Props ───

export interface FolderTreePanelProps<TFolder extends TreeFolder, TItem extends TreeItem> {
  config: FolderTreeConfig<TFolder, TItem>;
  callbacks: FolderTreeCallbacks<TFolder>;

  folders: TFolder[];
  itemsByFolder: Map<string, TItem[]>;
  activeFolder: string;
  activeItem: string;
  expandedFolders: Set<string>;
  loadingFolders?: Set<string>;
  isEmpty?: (folders: TFolder[]) => boolean;

  /** 条目列表底部区域（Notebook 的"新建笔记"按钮放这） */
  renderItemsFooter?: () => React.ReactNode;
}

// ─── 组件 ───

export default function FolderTreePanel<
  TFolder extends TreeFolder,
  TItem extends TreeItem,
>({
  config,
  callbacks,
  folders,
  itemsByFolder,
  activeFolder,
  activeItem,
  expandedFolders,
  loadingFolders,
  isEmpty,
  renderItemsFooter,
}: FolderTreePanelProps<TFolder, TItem>) {
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renamingItem, setRenamingItem] = useState<string | null>(null);
  const [renameItemValue, setRenameItemValue] = useState('');

  const isFolderEmpty = isEmpty ? isEmpty(folders) : folders.length === 0;

  const handleCreateFolder = async () => {
    const n = newFolderName.trim();
    if (!n) { setShowNewFolder(false); return; }
    await callbacks.onCreateFolder(n);
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const handleDeleteFolder = async (name: string) => {
    const ok = await confirmDelete({
      what: `${config.folderLabel}「${name}」`,
      recoverable: false,
      note: config.folderDeleteNote,
    });
    if (!ok) return;
    await callbacks.onDeleteFolder(name);
  };

  const handleDeleteItem = async (itemId: string, folderName: string) => {
    const folderItems = itemsByFolder.get(folderName) ?? [];
    const item = folderItems.find(i => i.id === itemId);
    if (!item) return;
    const ok = await confirmDelete({ what: config.renderItemLabel(item), recoverable: false });
    if (!ok) return;
    await callbacks.onDeleteItem(itemId);
  };

  const startRename = (name: string) => {
    setRenamingFolder(name);
    setRenameValue(name);
  };

  const handleRenameFolder = async () => {
    const n = renameValue.trim();
    if (!n || n === renamingFolder) { setRenamingFolder(null); return; }
    await callbacks.onRenameFolder(renamingFolder!, n);
    setRenamingFolder(null);
  };

  const startRenameItem = (item: TItem) => {
    setRenamingItem(item.id);
    setRenameItemValue(config.renderItemLabel(item));
  };

  const handleRenameItem = async () => {
    if (!callbacks.onRenameItem) return;
    const n = renameItemValue.trim();
    if (!n || !renamingItem) { setRenamingItem(null); return; }
    await callbacks.onRenameItem(renamingItem, n);
    setRenamingItem(null);
  };

  const canDelete = (f: TFolder) =>
    config.canDeleteFolder ? config.canDeleteFolder(f) : true;

  return (
    <div className="w-72 bg-slate-900/80 border-r border-slate-800 flex flex-col flex-shrink-0">
      {/* 标题栏 */}
      <div className="h-12 border-b border-slate-800 flex items-center justify-between px-3">
        <span className="text-sm text-slate-300 font-mono tracking-wider flex items-center gap-1.5">
          {config.titleIcon}
          {config.title}
        </span>
        <button
          onClick={() => { setShowNewFolder(true); setNewFolderName(''); }}
          className="text-slate-400 hover:text-[var(--accent)] p-1 rounded hover:bg-slate-800"
          title={`新建${config.folderLabel}`}
        >
          <FolderPlus size={16} />
        </button>
      </div>

      {/* 新建文件夹输入框 */}
      {showNewFolder && (
        <div className="px-3 py-2 border-b border-slate-800 flex gap-1">
          <input
            autoFocus
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreateFolder();
              if (e.key === 'Escape') setShowNewFolder(false);
            }}
            placeholder={config.newFolderPlaceholder}
            className="flex-1 bg-slate-800 text-sm text-slate-200 px-2 py-1.5 rounded outline-none border border-slate-700"
            style={{ borderColor: 'var(--accent)' }}
          />
          <button
            onClick={handleCreateFolder}
            className="text-sm text-black px-2 py-1.5 rounded font-bold"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            确定
          </button>
        </div>
      )}

      {/* 文件夹列表 */}
      <div className="flex-1 overflow-y-auto py-1">
        {isFolderEmpty ? (
          <div className="p-4 text-sm text-slate-300 text-center">
            {config.emptyText}<br />
            <button
              onClick={() => { setShowNewFolder(true); setNewFolderName(''); }}
              className="text-[var(--accent)] hover:underline mt-1"
            >
              {config.emptyActionText}
            </button>
          </div>
        ) : (
          folders.map(f => (
            <div key={f.name}>
              {/* 文件夹行 */}
              <div
                onClick={() => callbacks.onSelectFolder(f.name)}
                className={`group flex items-center justify-between px-3 py-2 cursor-pointer ${
                  activeFolder === f.name
                    ? 'bg-[var(--accent)]/10 border-l-2 border-[var(--accent)] text-white'
                    : 'border-l-2 border-transparent text-slate-400 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-sm flex-shrink-0">
                    {expandedFolders.has(f.name)
                      ? <ChevronDown size={15} />
                      : <ChevronRight size={15} />
                    }
                  </span>
                  <span className="text-[var(--accent)]/60 flex-shrink-0">
                    {config.folderIcon}
                  </span>
                  {renamingFolder === f.name ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRenameFolder();
                        if (e.key === 'Escape') setRenamingFolder(null);
                      }}
                      onBlur={() => setRenamingFolder(null)}
                      onClick={e => e.stopPropagation()}
                      className="flex-1 bg-slate-800 text-sm text-slate-200 px-1.5 py-0.5 rounded outline-none border border-slate-700"
                      style={{ borderColor: 'var(--accent)' }}
                    />
                  ) : (
                    <span className="text-sm truncate">{f.name}</span>
                  )}
                  <span className="text-xs text-slate-400 flex-shrink-0">{f.count}</span>
                </div>
                <div className="flex items-center gap-0.5 ml-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); startRename(f.name); }}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-[var(--accent)] p-0.5"
                    title="重命名"
                  >
                    <Pencil size={14} />
                  </button>
                  {canDelete(f) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f.name); }}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 p-0.5"
                      title="删除"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* 展开：条目列表（基件统一渲染壳，子类填内容） */}
              {expandedFolders.has(f.name) && (
                (() => {
                  const folderItems = itemsByFolder.get(f.name) ?? [];
                  return (
                <div className="bg-slate-950/50">
                  {loadingFolders?.has(f.name) ? (
                    <div className="pl-8 pr-3 py-2 text-xs text-slate-500 animate-pulse">
                      加载中...
                    </div>
                  ) : folderItems.length === 0 ? (
                    <div className="pl-8 pr-3 py-2 text-xs text-slate-500">
                      暂无内容
                    </div>
                  ) : (
                    folderItems.map(item => (
                      <div
                        key={item.id}
                        onClick={(e) => { e.stopPropagation(); callbacks.onSelectItem(item.id, f.name); }}
                        className={`group flex items-center justify-between pl-9 pr-3 py-1.5 cursor-pointer ${
                          activeItem === item.id
                            ? 'bg-[var(--accent)]/10 border-l-2 border-[var(--accent)] text-white'
                            : 'border-l-2 border-transparent text-slate-500 hover:bg-slate-800/40 hover:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {config.renderItemPrefix?.(item)}
                          {renamingItem === item.id ? (
                            <input
                              autoFocus
                              value={renameItemValue}
                              onChange={e => setRenameItemValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleRenameItem();
                                if (e.key === 'Escape') setRenamingItem(null);
                              }}
                              onBlur={() => setRenamingItem(null)}
                              onClick={e => e.stopPropagation()}
                              className="flex-1 bg-slate-800 text-sm text-slate-200 px-1.5 py-0.5 rounded outline-none border border-slate-700"
                              style={{ borderColor: 'var(--accent)' }}
                            />
                          ) : (
                            <span className="text-sm truncate">
                              {config.renderItemLabel(item)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {config.formatItemTime && (
                            <span className="text-xs text-slate-400">
                              {config.formatItemTime(item)}
                            </span>
                          )}
                          {callbacks.onRenameItem && (
                            <button
                              onClick={(e) => { e.stopPropagation(); startRenameItem(item); }}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-[var(--accent)]"
                              title="重命名"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItem(item.id, f.name);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}

                  {/* 尾部扩展区 — 只在激活的文件夹里渲染 */}
                  {activeFolder === f.name && renderItemsFooter?.()}
                </div>
                  );
                })()
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
