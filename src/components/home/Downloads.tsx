import { useEffect, useState } from 'react';
import { ArrowRight, Code2, Cog, Download, Folder, Puzzle } from 'lucide-react';

import ResourceFileTree from './ResourceFileTree';
import { fetchResources, zipHref } from '../../lib/api';
import { FORMAT_LABEL } from '../../types/course';
import type { Course } from '../../types/course';



const TYPE_ICON = { scratch: Puzzle, python: Code2, cpp: Cog } as const;
const TYPE_COLOR: Record<string, string> = { scratch: 'var(--color-brand)', python: '#22c55e', cpp: '#94a3b8' };

/** 软件下载 — 内容区视图：编号条目 + hairline 分隔；点击条目进入 ResourceFileTree 内容视图 */
export default function Downloads() {

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Course | null>(null);

  // 进入目录页一次全量拉取（V2 /assets?bucket=download）
  useEffect(() => {
    let stale = false;
    setLoading(true);
    fetchResources('download')
      .then(list => { if (!stale) setCourses(list); })
      .catch(() => { if (!stale) setCourses([]); })
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, []);



  // 选中软件 → 整个内容区切换为内容视图（文件树）
  if (selected) {
    return <ResourceFileTree resource={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ── 头部：只保留标题 ── */}
      <header className="flex-shrink-0 flex items-center gap-4 px-6 h-14 border-b border-ed-line"
        style={{ background: 'var(--bookshelf-header-bg)' }}>
        <span className="text-ed-title font-semibold text-ed-ink flex-shrink-0">软件下载</span>
      </header>

      {/* ── 软件列表 ── */}
      <div className="flex-1 overflow-y-auto min-h-0 px-8 pb-8" style={{ scrollbarWidth: 'thin' }}>
        {loading ? (
          <CenterNote text="加载中…" />
        ) : courses.length === 0 ? (
          <CenterNote text="暂无软件" />
        ) : (
          <div>
            {courses.map((c, i) => {
              const Icon = TYPE_ICON[c.type as keyof typeof TYPE_ICON];
              return (
                <div
                  key={c.id}
                  className="group flex items-center gap-5 py-5 px-2 -mx-2 border-b border-ed-line hover:bg-black/[0.02] transition-colors"
                >
                  <button
                    onClick={() => setSelected(c)}
                    className="flex items-center gap-5 flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <span className="ed-serif text-sm text-ed-muted w-7 flex-shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {Icon ? (
                      <Icon size={20} strokeWidth={1.5} style={{ color: TYPE_COLOR[c.type] ?? '#8a8f98' }} className="flex-shrink-0" />
                    ) : (
                      <Folder size={20} strokeWidth={1.5} className="text-ed-muted flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-ed-ink truncate group-hover:text-brand transition-colors">
                        {c.name}
                      </h3>
                      <p className="text-xs text-ed-muted mt-0.5">
                        {c.format && FORMAT_LABEL[c.format] ? FORMAT_LABEL[c.format] : ''}
                      </p>
                    </div>
                  </button>
                  {/* 直接下载整个资源，不用点进去 */}
                  <a
                    href={zipHref(c.id)}
                    title={`下载「${c.name}」`}
                    className="p-1.5 text-ed-muted opacity-0 group-hover:opacity-100 hover:text-brand transition-all no-underline flex-shrink-0"
                  >
                    <Download size={15} />
                  </a>
                  <ArrowRight
                    size={16}
                    className="flex-shrink-0 text-ed-muted group-hover:text-brand group-hover:translate-x-1 transition-all"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** 居中占位文案 */
function CenterNote({ text }: { text: string }) {
  return (
    <div className="h-full min-h-40 flex items-center justify-center text-sm text-ed-muted">
      {text}
    </div>
  );
}
