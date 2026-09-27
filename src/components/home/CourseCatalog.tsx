import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CourseDetail from './CourseDetail';
import { fetchCourses, fetchTeacherNames } from '../../lib/api';
import type { Course } from '../../types/course';

const FILTERS = [
  { value: '全部', label: '全部' },
  { value: 'scratch', label: 'Scratch' },
  { value: 'python', label: 'Python' },
  { value: 'cpp', label: 'C++' },
];

/** 几何装饰预设（形状 + 颜色），按 index % 长度循环。适配横向卡片 cover 区 */
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
  /** 目录内点击课程时通知父级（开始页记录最近打开）；详情仍由目录自行渲染 */
  onOpenCourse?: (c: Course) => void;
}

/** 课程目录 — 内容区视图：编号条目 + hairline 分隔；点击条目进入 CourseDetail 内容视图 */
export default function CourseCatalog({ mode = 'main', onOpenCourse }: Props) {
  const [courseType, setCourseType] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
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

  const visible = useMemo(() => {
    const kw = searchQuery.trim().toLowerCase();
    return courses.filter(c =>
      (mode === 'featured' ? c.featured === true : c.featured !== true) &&
      (courseType === '全部' || c.type === courseType) &&
      (!kw || c.name.toLowerCase().includes(kw)),
    );
  }, [courses, courseType, mode, searchQuery]);

  const title = mode === 'featured' ? '课程' : '书架';

  const railRef = useRef<HTMLDivElement>(null);
  const scroll = useCallback((dir: -1 | 1) => {
    railRef.current?.scrollBy({ left: dir * 280, behavior: 'smooth' });
  }, []);

  // 鼠标滚轮 → 左右滚动（依赖 visible 确保 rail 元素已渲染）
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollBy({ left: e.deltaY, behavior: 'auto' });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [visible]);

  // 选中课程 → 整个内容区切换为内容视图（电子书内嵌 / 文件列表）
  if (selected) {
    return <CourseDetail course={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ── Topbar：标题 + 筛选 pill + 数量 ── */}
      <header className="flex-shrink-0 flex items-center gap-4 px-6 h-14 border-b border-ed-line"
        style={{ background: 'var(--bookshelf-header-bg)' }}>
        <span className="text-ed-title font-semibold text-ed-ink flex-shrink-0">{title}</span>
        <div className="flex items-center gap-2">
          {FILTERS.map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => setCourseType(f.value)}
              className={`h-8 px-4 rounded-full text-sm transition-colors duration-150 ${
                courseType === f.value
                  ? 'bg-[var(--bookshelf-filter-on)] text-ed-ink font-semibold'
                  : 'text-ed-muted hover:text-ed-ink hover:bg-[var(--bookshelf-filter-bg)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── 居中内容区：Hero + 书架 ── */}
      <div className="flex-1 flex flex-col justify-center min-h-0 px-8">

      {/* ── Hero 标题区 ── */}
      <div className="pb-6">
        <div className="flex items-end justify-between gap-8">
          <div>
            <p className="mb-2 text-xs font-bold tracking-[0.13em] uppercase" style={{ color: 'var(--accent)' }}>
              COURSE LIBRARY
            </p>
            <h1 className="m-0 ed-serif text-[clamp(1.75rem,3vw,2.5rem)] font-medium tracking-tight">
              选择一本书，开始探索
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ed-muted">
              这里收录机构开放的教材与课程。无需登录，选择感兴趣的内容即可查看。
            </p>
          </div>
          <label className="hidden sm:flex items-center gap-2.5 h-11 w-72 shrink-0 px-4 rounded-xl border border-ed-line bg-white/72">
            <svg className="w-5 h-5 text-ed-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="m16.5 16.5 4 4" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索书名"
              className="min-w-0 w-full border-0 outline-none bg-transparent text-ed-ink text-sm placeholder:text-ed-muted"
            />
          </label>
        </div>
      </div>

      {/* ── 书架：横向滚动卡片 ── */}
      <div className="min-h-0 relative" style={{ height: '22rem' }}>
        {loading ? (
          <CenterNote text="加载中…" />
        ) : courses.length === 0 ? (
          <CenterNote text="暂无课程" />
        ) : visible.length === 0 ? (
          <CenterNote text="没有找到相关书籍，换一个关键词试试。" />
        ) : (
          <div className="shelf-frame h-full relative flex items-center">
            <button type="button" onClick={() => scroll(-1)}
              className="shelf-arrow left absolute left-0 z-10 w-10 h-10 grid place-items-center rounded-full
                         text-ed-muted border border-ed-line bg-[var(--bookshelf-card-bg)] hover:text-ed-ink hover:border-border-hover
                         transition-all duration-150 shadow-sm"
            >←</button>
            <div ref={railRef} className="books-rail flex-1 h-full flex items-start gap-5 overflow-x-auto px-12"
              style={{ scrollbarWidth: 'none' }}>
              {visible.map((c, i) => {
                const shape = SHAPES[i % SHAPES.length];
                return (
                  <article
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => { setSelected(c); onOpenCourse?.(c); }}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { setSelected(c); onOpenCourse?.(c); } }}
                    className="group shrink-0 w-64 flex flex-col p-3 gap-3 rounded-2xl cursor-pointer
                               transition-all duration-200 ease-out
                               hover:-translate-y-1 hover:border-border-hover
                               hover:shadow-[var(--bookshelf-shadow)]"
                    style={{
                      background: 'var(--bookshelf-card-bg)',
                      border: '1px solid var(--border-hover)',
                    }}
                  >
                    {/* Cover */}
                    <div className="relative w-full rounded-xl overflow-hidden" style={{ background: 'var(--bookshelf-cover-bg)', height: '10rem' }}>
                      <span className="absolute z-10 top-3 left-4 font-serif text-base" style={{ color: 'var(--accent)' }}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="absolute inset-0 pointer-events-none opacity-90
                                      transition-transform duration-500 ease-out group-hover:scale-105">
                        <div className={`absolute ${shape.a}`} style={{ background: shape.ca }} />
                        <div className={`absolute ${shape.b}`} style={{ background: shape.cb }} />
                      </div>
                    </div>
                    {/* Info */}
                    <div className="flex-1 flex flex-col">
                      <div className="flex gap-1.5 mb-2.5 overflow-hidden">
                        {[c.type, ...(c.tags || [])].map(t => (
                          <span key={t} className="inline-flex items-center h-6 px-2.5 rounded-full text-xs font-semibold bg-[var(--bookshelf-type-tag-bg)] text-[var(--bookshelf-type-tag-text)] shrink-0">
                            {t}
                          </span>
                        ))}
                      </div>
                      <h3
                        className="m-0 ed-serif text-sm font-medium leading-snug tracking-tight
                                   whitespace-nowrap overflow-hidden text-ellipsis text-ed-ink"
                        title={c.name}
                      >
                        {c.name}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-ed-muted line-clamp-2 h-10">
                        {c.description || '\u00A0'}
                      </p>
                      <div className="mt-auto pt-3 flex items-center justify-between">
                        <small className="text-xs text-ed-muted">{c.material_count} 个章节</small>
                        <span
                          className="grid place-items-center w-8 h-8 rounded-full text-white transition-all duration-200
                                     group-hover:bg-[var(--color-brand-orange)]"
                          style={{ background: 'var(--ed-ink)' }}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <button type="button" onClick={() => scroll(1)}
              className="shelf-arrow right absolute right-0 z-10 w-10 h-10 grid place-items-center rounded-full
                         text-ed-muted border border-ed-line bg-[var(--bookshelf-card-bg)] hover:text-ed-ink hover:border-border-hover
                         transition-all duration-150 shadow-sm"
            >→</button>
          </div>
        )}
      </div>

      </div>{/* /居中内容区 */}
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
