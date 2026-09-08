import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import TextTabs from './TextTabs';
import CourseDetail from './CourseDetail';
import { fetchCourses, fetchTeacherNames } from '../../lib/api';
import type { Course } from '../../types/course';

const TYPE_TABS = [
  { value: '全部', label: '全部' },
  { value: 'scratch', label: 'Scratch' },
  { value: 'python', label: 'Python' },
  { value: 'cpp', label: 'C++' },
];

/** 6 套几何装饰预设（形状 + 颜色），按 index % 6 循环。尺寸匹配参考设计 */
const SHAPES = [
  // 0: 圆 120px + 方 75px
  { a: 'w-[7.5rem] h-[7.5rem] rounded-full', b: 'w-[4.7rem] h-[4.7rem] right-3 top-[3.5rem] rotate-[17deg]', ca: '#e0d4c2', cb: '#bd7557' },
  // 1: 大圆 160px + 小圆 90px
  { a: 'w-[10rem] h-[10rem] rounded-full', b: 'w-[5.5rem] h-[5.5rem] rounded-full right-1 bottom-0', ca: '#d6ded6', cb: '#758378' },
  // 2: 长方 135×180 + 小方 70px
  { a: 'w-[8.5rem] h-[11rem] right-1 top-1 rotate-[8deg]', b: 'w-[4.5rem] h-[4.5rem] left-2 bottom-1 rotate-[14deg]', ca: '#e6d8c9', cb: '#f5574c' },
  // 3: 圆 140px + 长条 70×150
  { a: 'w-[8.75rem] h-[8.75rem] rounded-full', b: 'w-[4.5rem] h-[9.5rem] right-2 top-1 rotate-[22deg]', ca: '#c77e61', cb: '#e5ddd0' },
  // 4: 扁方 180×100 + 圆 85px
  { a: 'w-[11rem] h-[6.5rem] rotate-[-12deg]', b: 'w-[5.5rem] h-[5.5rem] rounded-full right-0 bottom-1', ca: '#d7d0c2', cb: '#a7b5aa' },
  // 5: 圆 140px + 菱形 80px
  { a: 'w-[8.75rem] h-[8.75rem] rounded-full', b: 'w-12 h-12 right-1 top-3 rotate-45', ca: '#ded4c7', cb: '#41403b' },
  // 6: 小圆 100px + 大方 130px
  { a:'w-[8rem] h-[8rem] right-0 top-0 rotate-[12deg]', b: 'w-[6rem] h-[6rem] rounded-full left-2 bottom-[2rem]' , ca: '#c8b8a8', cb: '#8b7355' },
  // 7: 双圆交叉
  { a: 'w-[9rem] h-[9rem] rounded-full left-1 top-[2rem]', b: 'w-[7rem] h-[7rem] rounded-full right-2 top-2', ca: '#b8c5b8', cb: '#d4a574' },
  // 8: 长条横放 + 小圆
  { a: 'w-[10rem] h-[5rem] bottom-[3rem] right-1 rotate-[-6deg]', b: 'w-[5rem] h-[5rem] rounded-full right-0 top-[1.5rem]', ca: '#e8ddd0', cb: '#6b7c6b' },
  // 9: 斜方 + 小圆 三角感
  { a: 'w-[7rem] h-[9rem] right-0 top-[2rem] rotate-[15deg]', b: 'w-[5rem] h-[5rem] rounded-full left-1 bottom-[3.5rem]', ca: '#c9b99a', cb: '#a0522d' },
];

interface Props {
  /** main=在线课程（未精选的主线课）；featured=精选课程（老师勾选的选读内容） */
  mode?: 'main' | 'featured';
}

/** 课程目录 — 内容区视图：编号条目 + hairline 分隔；点击条目进入 CourseDetail 内容视图 */
export default function CourseCatalog({ mode = 'main' }: Props) {
  const [courseType, setCourseType] = useState('全部');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Course | null>(null);

  // 进入目录页才加载所有老师的课程（不让学生筛选老师，系统自己记录归属）
  useEffect(() => {
    let stale = false;
    setLoading(true);
    fetchTeacherNames()
      .then(names => fetchCourses(names, '全部'))
      .then(list => { if (!stale) setCourses(list); })
      .catch(() => { if (!stale) setCourses([]); })
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, []);

  const visible = useMemo(
    () => courses.filter(c =>
      // 归属二选一：精选课程不在「在线课程」出现，普通课程不进「精选课程」
      (mode === 'featured' ? c.featured === true : c.featured !== true) &&
      (courseType === '全部' || c.type === courseType),
    ),
    [courses, courseType, mode],
  );

  // 选中课程 → 整个内容区切换为内容视图（电子书内嵌 / 文件列表）
  if (selected) {
    return <CourseDetail course={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ── 头部：标题 + 筛选 Tab ── */}
      <header className="ed-header flex-shrink-0 flex items-center justify-between gap-6 px-8 pt-2 pb-2 border-b border-ed-line">
        <TextTabs
          className="w-max"
          value={courseType}
          onChange={setCourseType}
          items={TYPE_TABS}
        />
        <h2 className="text-ed-title font-semibold text-ed-ink flex-shrink-0">
          {mode === 'featured' ? '课程' : '书架'}
        </h2>
      </header>

      {/* ── 卡片网格 ── */}
      <div className="flex-1 overflow-y-auto min-h-0 p-8" style={{ scrollbarWidth: 'thin' }}>
        {loading ? (
          <CenterNote text="加载中…" />
        ) : courses.length === 0 ? (
          <CenterNote text="暂无课程" />
        ) : visible.length === 0 ? (
          <CenterNote text="该类型暂无课程" />
        ) : (
          <div className="course-grid-ultrawide grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {visible.map((c, i) => {
              const shape = SHAPES[i % SHAPES.length];
              return (
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(c)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelected(c); }}
                  className="group relative min-h-[20rem] p-7 text-left cursor-pointer overflow-hidden
                             transition-all duration-300 ease-out
                             hover:-translate-y-[7px] hover:shadow-[0_1.25rem_3rem_rgba(60,52,43,0.1)]"
                  style={{
                    background: 'oklch(0.965 0.012 var(--seed-hue))',
                    border: '1px solid oklch(0.93 0.015 var(--seed-hue))',
                  }}
                >
                  <span className="relative z-10 font-serif text-2xl font-medium" style={{ color: 'var(--accent)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="absolute right-0 top-[3.25rem] w-[12rem] h-[13rem] pointer-events-none opacity-90
                                  transition-transform duration-500 ease-out group-hover:-translate-x-1.5 group-hover:-translate-y-1.5">
                    <div
                      className={`absolute ${shape.a}`}
                      style={{ background: shape.ca }}
                    />
                    <div
                      className={`absolute ${shape.b}`}
                      style={{ background: shape.cb }}
                    />
                  </div>
                  <div className="absolute bottom-6 left-6 right-6 z-10">
                    <h3 className="font-serif text-[1.2rem] font-medium leading-[1.05] tracking-tight line-clamp-2
                                   text-ed-ink group-hover:text-brand transition-colors">
                      {c.name}
                    </h3>
                    <HoverTip text={c.description || ''} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** hover 弹出完整描述：用 portal 渲染到 body，避免被卡片 transform 影响定位 */
function HoverTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);

  const show = () => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const tipW = Math.min(r.width, 320);
    const spaceBelow = window.innerHeight - r.bottom;
    const above = spaceBelow < 100;
    let x = r.left;
    if (x + tipW > window.innerWidth - 8) x = window.innerWidth - tipW - 8;
    if (x < 8) x = 8;
    setPos({ x, y: above ? r.top - 4 : r.bottom + 4 });
    setOpen(true);
  };

  return (
    <div ref={wrapRef} className="mt-2" onMouseEnter={show} onMouseLeave={() => setOpen(false)}>
      <p className="text-[0.8rem] leading-relaxed h-[2.4rem] line-clamp-2 text-ed-muted cursor-help">
        {text}
      </p>
      {open && createPortal(
        <div
          className="fixed px-3 py-2 text-[0.8rem] leading-relaxed text-ed-ink rounded-lg
                     shadow-lg z-[100] max-w-[20rem] pointer-events-none"
          style={{
            left: pos.x,
            top: pos.y,
            background: 'var(--sidebar-bg, #faf9f5)',
            border: '1px solid var(--border-default, #e5e5e5)',
          }}
        >
          {text}
        </div>,
        document.body,
      )}
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
