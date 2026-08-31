import { useState, useEffect } from 'react';
import { Download, HardDrive, Loader2 } from 'lucide-react';

interface Resource {
  name: string;
  size: number;
  teacher: string;
  url: string;
  category: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 软件下载 — 展示 category=download 的资源 */
export default function Downloads() {
  const [items, setItems] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/resources?category=download')
      .then(r => r.json())
      .then(d => setItems(d.resources || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
            {items.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noreferrer"
                 className="group flex items-start gap-4 p-5 border border-ed-line rounded-lg bg-card hover:border-brand hover:shadow-sm transition-all no-underline">
                <HardDrive size={22} className="text-ed-muted mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ed-ink truncate group-hover:text-brand transition-colors">{r.name}</p>
                  <p className="text-xs text-ed-muted mt-1">{formatSize(r.size)}</p>
                </div>
                <Download size={14} className="text-ed-muted opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
