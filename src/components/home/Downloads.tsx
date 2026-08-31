import { useState, useEffect } from 'react';
import { Download, File, HardDrive, Loader2 } from 'lucide-react';

interface Resource {
  id: string;
  name: string;
  size: number;
  teacher: string;
  url: string;
  category: string;
}

interface TreeNode {
  name: string;
  type: 'file' | 'folder';
  size: number;
  path?: string;
  children?: TreeNode[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 收集文件树里所有文件 */
function collectFiles(nodes: TreeNode[]): { name: string; path: string; size: number }[] {
  const out: { name: string; path: string; size: number }[] = [];
  for (const n of nodes) {
    if (n.type === 'file') out.push({ name: n.name, path: n.path || n.name, size: n.size });
    else if (n.children) out.push(...collectFiles(n.children));
  }
  return out;
}

/** 软件下载 — 点击卡片展开文件列表，直接下载 */
export default function Downloads() {
  const [items, setItems] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, { name: string; path: string; size: number }[]>>({});
  const [loadingTree, setLoadingTree] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/resources?category=download')
      .then(r => r.json())
      .then(d => setItems(d.resources || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = async (r: Resource) => {
    if (expandedId === r.id) { setExpandedId(null); return; }
    setExpandedId(r.id);
    // 已加载过就不再拉
    if (files[r.id]) return;
    setLoadingTree(r.id);
    try {
      const res = await fetch(`/api/resources/${r.id}/tree`);
      const data = await res.json();
      setFiles(prev => ({ ...prev, [r.id]: collectFiles(data.tree || []) }));
    } catch { /* ignore */ }
    setLoadingTree(null);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <header className="flex items-center justify-between px-8 pt-2 pb-2 border-b border-ed-line">
        <h2 className="text-base font-semibold text-ed-ink">软件下载</h2>
        <span className="text-xs text-ed-muted">{items.length} 项</span>
      </header>
      <div className="flex-1 px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-ed-muted">
            <Loader2 size={18} className="animate-spin mr-2" /> 加载中...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-ed-muted">
            <HardDrive size={40} strokeWidth={1.2} className="mb-3 opacity-40" />
            <p className="text-sm">暂无软件下载</p>
            <p className="text-xs opacity-60 mt-1">管理员上传安装包后将显示在这里</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((r) => (
              <div key={r.id} className="border border-ed-line rounded-lg bg-card hover:border-brand transition-all">
                <button
                  onClick={() => toggleExpand(r)}
                  className="w-full flex items-start gap-4 p-5 text-left cursor-pointer"
                >
                  <HardDrive size={22} className="text-ed-muted mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ed-ink truncate">{r.name}</p>
                    <p className="text-xs text-ed-muted mt-1">{r.teacher}</p>
                  </div>
                  <Download size={14} className="text-ed-muted mt-1 shrink-0" />
                </button>
                {/* 展开文件列表 */}
                {expandedId === r.id && (
                  <div className="border-t border-ed-line px-5 py-2">
                    {loadingTree === r.id ? (
                      <div className="py-2 text-xs text-ed-muted flex items-center gap-1">
                        <Loader2 size={12} className="animate-spin" /> 加载中...
                      </div>
                    ) : (files[r.id] || []).length === 0 ? (
                      <div className="py-2 text-xs text-ed-muted">暂无文件</div>
                    ) : (
                      files[r.id].map((f, i) => (
                        <a key={i} href={`${r.url}${f.path}`} download
                           className="flex items-center gap-2 py-1.5 text-xs text-ed-ink hover:text-brand transition-colors no-underline group">
                          <File size={12} className="text-ed-muted shrink-0" />
                          <span className="truncate flex-1">{f.name}</span>
                          <span className="text-ed-muted">{formatSize(f.size)}</span>
                          <Download size={11} className="text-ed-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </a>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
