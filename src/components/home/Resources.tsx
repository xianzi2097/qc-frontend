import { useState, useEffect } from 'react';
import { FileText, Download, FolderOpen, Loader2 } from 'lucide-react';

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

/** 资料栏目 — 参考资料 */
export default function Resources() {
  const [items, setItems] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/resources?category=reference')
      .then(r => r.json())
      .then(d => setItems(d.resources || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <header className="flex-shrink-0 flex items-center justify-between gap-6 px-8 pt-2 pb-2 border-b border-ed-line">
        <h2 className="text-base font-semibold text-ed-ink">参考资料</h2>
        <span className="text-xs text-ed-muted">{items.length} 项</span>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-ed-muted">
            <Loader2 size={18} className="animate-spin mr-2" /> 加载中...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-ed-muted">
            <FolderOpen size={40} strokeWidth={1.2} className="mb-3 opacity-40" />
            <p className="text-sm">暂无参考资料</p>
            <p className="text-xs opacity-60 mt-1">老师上传后将显示在这里</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noreferrer"
                 className="group flex items-start gap-3 p-4 border border-ed-line rounded-lg bg-card hover:border-brand hover:shadow-sm transition-all no-underline">
                <FileText size={18} className="text-ed-muted mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ed-ink truncate group-hover:text-brand transition-colors">{r.name}</p>
                  <p className="text-xs text-ed-muted mt-1">{r.teacher} · {formatSize(r.size)}</p>
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
