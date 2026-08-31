import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Code2, Cog, Folder, Puzzle } from 'lucide-react';
import TextTabs from './TextTabs';
import ResourceFileTree from './ResourceFileTree';
import { fetchResources, fetchTeacherNames } from '../../lib/api';
import { FORMAT_LABEL } from '../../types/course';
import type { Course } from '../../types/course';

const TYPE_TABS = [
  { value: '全部', label: '全部' },
  { value: 'scratch', label: 'Scratch' },
  { value: 'python', label: 'Python' },
  { value: 'cpp', label: 'C++' },
];

const TYPE_ICON = { scratch: Puzzle, python: Code2, cpp: Cog } as const;
const TYPE_COLOR: Record<string, string> = { scratch: 'var(--color-brand)', python: '#22c55e', cpp: '#94a3b8' };

/** 软件下载 — 内容区视图：编号条目 + hairline 分隔；点击条目进入 ResourceFileTree 内容视图 */
export default function Downloads() {
  const [courseType, setCourseType] = useState('全部');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Course | null>(null);

  // 进入目录页才加载所有老师的软件（不让学生筛选老师）
  useEffect(() => {
    let stale = false;
    setLoading(true);
    fetchTeacherNames()
      .then(names => fetchResources(names, '全部', 'download'))
      .then(list => { if (!stale) setCourses(list); })
      .catch(() => { if (!stale) setCourses([]); })
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, []);

  const visible = useMemo(
    () => courses.filter(c => courseType === '全部' || c.type === courseType),
    [courses, courseType],
  );

  // 选中软件 → 整个内容区切换为内容视图（文件树）
  if (selected) {
    return <ResourceFileTree resource={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ── 头部：只保留标题 ── */}
      <header className="flex-shrink-0 flex items-center justify-between gap-6 px-8 pt-2 pb-2 border-b border-ed-line">
        <h2 className="text-base font-semibold text-ed-ink">软件下载</h2>
      </header>

      {/* ── 类型筛选（原老师筛选位置） ── */}
      <div className="flex-shrink-0 overflow-x-auto border-b border-ed-line px-8" style={{ scrollbarWidth: 'none' }}>
        <TextTabs
          className="w-max"
          accent="#16181d"
          value={courseType}
          onChange={setCourseType}
          items={TYPE_TABS}
        />
      </div>

      {/* ── 软件列表 ── */}
      <div className="flex-1 overflow-y-auto min-h-0 px-8 pb-8" style={{ scrollbarWidth: 'thin' }}>
        {loading ? (
          <CenterNote text="加载中…" />
        ) : courses.length === 0 ? (
          <CenterNote text="暂无软件" />
        ) : visible.length === 0 ? (
          <CenterNote text="该类型暂无软件" />
        ) : (
          <div>
            {visible.map((c, i) => {
              const Icon = TYPE_ICON[c.type as keyof typeof TYPE_ICON];
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="group w-full flex items-center gap-5 py-5 px-2 -mx-2 border-b border-ed-line text-left cursor-pointer hover:bg-black/[0.02] transition-colors"
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
                      {c.material_count} 个课件{c.format && FORMAT_LABEL[c.format] ? ` · ${FORMAT_LABEL[c.format]}` : ''}
                    </p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="flex-shrink-0 text-ed-muted group-hover:text-brand group-hover:translate-x-1 transition-all"
                  />
                </button>
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
