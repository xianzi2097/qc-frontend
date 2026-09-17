import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Clock, GraduationCap, MonitorPlay, Palette, SquareLibrary,
  Star, Terminal, FileText, Sparkles,
} from 'lucide-react';
import { fetchRecent, fetchAllCourses } from '../../lib/api';
import type { RecentItem } from '../../lib/api';
import type { Course } from '../../types/course';
import type { HomeSection } from './SideBar';
interface Props {
  onGoCourses: () => void;
  onGoFeatured: () => void;
  onOpenCourse: (c: Course) => void;
  onGoSection: (s: HomeSection) => void;
  onGoCompiler: () => void;
}

/* ── 相对时间 ── */
function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min}分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}小时前`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}天前`;
  return `${Math.floor(day / 7)}周前`;
}

/* ── 类型标签颜色映射 ── */
const TYPE_STYLES: Record<string, { label: string; cls: string }> = {
  course:   { label: '课程',   cls: 'bg-brand-50 text-brand' },
  section:  { label: '栏目',   cls: 'bg-blue-50 text-blue-600' },
  resource: { label: '资料',   cls: 'bg-emerald-50 text-emerald-600' },
};

/* ── section → 图标 + 跳转动作 ── */
function resolveRecentAction(item: RecentItem, props: Props) {
  if (item.type === 'course') {
    return { icon: BookOpen, onClick: () => props.onOpenCourse({ id: item.id, name: item.title } as Course) };
  }
  if (item.id === 'compiler-python') return { icon: Terminal, onClick: () => props.onGoCompiler() };
  if (item.id === 'compiler-cpp')    return { icon: Terminal, onClick: () => props.onGoCompiler() };
  if (item.id === 'compiler-html')   return { icon: Terminal, onClick: () => props.onGoCompiler() };
  if (item.id === 'courses')    return { icon: SquareLibrary, onClick: () => props.onGoSection('courses' as HomeSection) };
  if (item.id === 'featured')   return { icon: Star,          onClick: () => props.onGoSection('featured' as HomeSection) };
  if (item.id === 'resources')  return { icon: FileText,      onClick: () => props.onGoSection('resources' as HomeSection) };
  if (item.id === 'docs')       return { icon: GraduationCap, onClick: () => props.onGoSection('docs' as HomeSection) };
  if (item.id === 'compiler')   return { icon: Terminal,      onClick: () => props.onGoSection('compiler' as HomeSection) };
  if (item.id === 'downloads')  return { icon: MonitorPlay,   onClick: () => props.onGoSection('downloads' as HomeSection) };
  if (item.id === 'html-sandbox') return { icon: MonitorPlay, onClick: () => props.onGoSection('html-sandbox' as HomeSection) };
  return { icon: BookOpen, onClick: () => {} };
}

/* ── 主题色 ── */
const THEMES = [
  { id: '', label: '橙色', color: 'oklch(0.65 0.19 95)' },
  { id: 'green', label: '绿色', color: 'oklch(0.65 0.19 155)' },
  { id: 'blue', label: '蓝色', color: 'oklch(0.65 0.19 220)' },
];

export default function Overview({ onGoCourses, onGoFeatured, onOpenCourse, onGoSection, onGoCompiler }: Props) {
  const props = { onGoCourses, onGoFeatured, onOpenCourse, onGoSection, onGoCompiler };
  const [visible, setVisible] = useState(false);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);

  useEffect(() => { setVisible(true); }, []);

  // 拉取最近访问 + 精选课程
  useEffect(() => {
    fetchRecent().then(setRecentItems).catch(() => {});
    fetchAllCourses().then(list => setAllCourses(list.filter(c => c.featured))).catch(() => {});
  }, []);

  // 用户信息
  const storedUser = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const username = storedUser?.username || '游客';
  const role = storedUser?.role || '';

  // 时间问候
  const hour = new Date().getHours();
  const timeGreet = hour < 6 ? '夜深了' : hour < 12 ? '上午好' : hour < 18 ? '下午好' : '晚上好';

  // 日期
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()];

  // ── 主题色（精简版） ──
  const [theme, setTheme] = useState(() => localStorage.getItem('codenova-theme') || '');
  const [customHue, setCustomHue] = useState(() => localStorage.getItem('codenova-custom-hue-value') || '');
  const [showThemePanel, setShowThemePanel] = useState(false);

  const switchTheme = useCallback((id: string) => {
    setTheme(id);
    setCustomHue('');
    document.documentElement.style.removeProperty('--custom-hue');
    localStorage.removeItem('codenova-custom-hue-value');
    if (id) {
      document.documentElement.setAttribute('data-theme', id);
      localStorage.setItem('codenova-theme', id);
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('codenova-theme', '');
    }
  }, []);

  const handleHueInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    const hue = (e.target as HTMLInputElement).value;
    document.documentElement.setAttribute('data-theme', 'custom');
    document.documentElement.style.setProperty('--custom-hue', hue);
  }, []);

  const handleHueCommit = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    const hue = (e.target as HTMLInputElement).value;
    setCustomHue(hue);
    setTheme('custom');
    localStorage.setItem('codenova-theme', 'custom');
    localStorage.setItem('codenova-custom-hue-value', hue);
  }, []);

  // ── 快捷操作 ──
  const quickActions = [
    { icon: SquareLibrary, label: '书架', onClick: onGoCourses, color: 'green' },
    { icon: Star, label: '课程', onClick: onGoFeatured, color: 'accent' },
    { icon: Terminal, label: '在线编程', onClick: () => onGoCompiler(), color: 'blue' },
    { icon: FileText, label: '资料', onClick: () => onGoSection('resources'), color: 'amber' },
    { icon: Palette, label: '主题配色', onClick: () => setShowThemePanel(v => !v), color: 'blue' },
  ];

  const ICON_BG: Record<string, string> = {
    accent: 'bg-brand-50 text-brand',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* ── 顶栏 ── */}
      <header className="flex-shrink-0 flex items-center px-6 h-14 border-b border-ed-line" style={{ background: 'var(--bookshelf-header-bg)' }}>
        <span className="text-ed-title font-semibold text-ed-ink">开始</span>
      </header>

      <div className={`flex-1 overflow-y-auto px-10 py-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

        {/* ═══ 晨间简报头部 ═══ */}
        <div className="mb-8">
          <p className="text-[0.82rem] text-ed-muted mb-1.5 tracking-wide">
            {dateStr} · {weekDay}
          </p>
          <h3 className="ed-serif text-[2rem] leading-snug font-extrabold text-ed-ink mb-3 tracking-tight">
            {timeGreet}，{username}{role === 'teacher' ? ' 老师' : ''}
          </h3>
          {recentItems.length > 0 ? (
            <p className="text-[0.88rem] text-ed-body leading-relaxed max-w-[40rem]">
              上次你在看「{recentItems[0].title}」，要继续吗？
            </p>
          ) : (
            <p className="text-[0.88rem] text-ed-body leading-relaxed max-w-[40rem]">
              现在想创作点什么？
            </p>
          )}
        </div>

        {/* ═══ 主题配色面板（展开时显示） ═══ */}
        {showThemePanel && (
          <div className="mb-6 p-4 bg-card border border-ed-line rounded-xl animate-fadeIn">
            <div className="flex items-center gap-2 mb-3">
              <Palette size={14} className="text-ed-muted" />
              <span className="text-sm font-semibold text-ed-ink">主题配色</span>
            </div>
            <div className="flex gap-2 mb-2">
              {THEMES.map(t => (
                <button
                  key={t.label}
                  onClick={() => switchTheme(t.id)}
                  className={`h-9 px-4 rounded-lg transition-all cursor-pointer border text-sm font-medium ${
                    theme === t.id && !customHue
                      ? 'border-ed-ink/30 ring-2 ring-inset ring-ed-ink/10 shadow-sm text-ed-ink'
                      : 'border-transparent hover:border-ed-line opacity-70 hover:opacity-100 text-ed-muted'
                  }`}
                  style={{ background: t.color }}
                >
                  {t.label}
                </button>
              ))}
              <button
                onClick={() => {
                  if (theme === 'custom' && customHue) { switchTheme(''); }
                  else {
                    setTheme('custom');
                    document.documentElement.setAttribute('data-theme', 'custom');
                    document.documentElement.style.setProperty('--custom-hue', customHue || '95');
                    localStorage.setItem('codenova-theme', 'custom');
                    if (customHue) localStorage.setItem('codenova-custom-hue-value', customHue);
                  }
                }}
                className={`h-9 px-4 rounded-lg transition-all cursor-pointer border text-sm font-medium ${
                  theme === 'custom'
                    ? 'border-ed-ink/30 ring-2 ring-inset ring-ed-ink/10 shadow-sm text-white'
                    : 'border-transparent hover:border-ed-line opacity-70 hover:opacity-100 text-white'
                }`}
                style={{ background: customHue ? `hsl(${customHue}, 70%, 55%)` : 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
              >
                自定义
              </button>
            </div>
            {theme === 'custom' && (
              <input
                type="range" min="0" max="360" value={customHue || '95'}
                onInput={handleHueInput} onChange={handleHueCommit}
                className="w-full h-1.5 rounded-full cursor-pointer appearance-none mt-2"
                style={{ background: 'linear-gradient(to right, hsl(0,80%,60%), hsl(60,80%,60%), hsl(120,80%,60%), hsl(180,80%,60%), hsl(240,80%,60%), hsl(300,80%,60%), hsl(360,80%,60%))' }}
              />
            )}
          </div>
        )}

        {/* ═══ 两大卡片：最近访问 + 快捷操作 ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6 max-w-[64rem]">

          {/* ── 最近访问 ── */}
          <div className="bg-card border border-ed-line rounded-2xl p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand flex items-center justify-center">
                  <Clock size={16} />
                </div>
                <span className="text-[0.88rem] font-semibold text-ed-ink">最近访问</span>
              </div>
              {recentItems.length > 0 && (
                <span className="text-[0.62rem] text-ed-muted bg-brand-50 text-brand px-2 py-0.5 rounded-full font-medium">自动记录</span>
              )}
            </div>

            {recentItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                <div className="text-2xl mb-2 opacity-30">📂</div>
                <p className="text-[0.82rem] text-ed-muted leading-relaxed">
                  还没有访问记录<br />从下方快捷入口开始探索吧
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5 flex-1 min-h-0">
                {recentItems.slice(0, 6).map((item, i) => {
                  const action = resolveRecentAction(item, props);
                  const Icon = action.icon;
                  const style = TYPE_STYLES[item.type] || TYPE_STYLES.section;
                  return (
                    <button
                      key={`${item.type}-${item.id}-${i}`}
                      onClick={action.onClick}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/[0.03] transition-colors cursor-pointer text-left group"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />
                      <Icon size={14} className="text-ed-muted flex-shrink-0" strokeWidth={1.8} />
                      <span className="flex-1 text-[0.84rem] font-medium text-ed-ink truncate group-hover:text-brand transition-colors">
                        {item.title}
                      </span>
                      <span className={`text-[0.62rem] px-1.5 py-0.5 rounded ${style.cls} flex-shrink-0`}>
                        {style.label}
                      </span>
                      <span className="text-[0.7rem] text-ed-muted flex-shrink-0 w-14 text-right">
                        {relativeTime(item.ts)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── 快捷操作 ── */}
          <div className="bg-card border border-ed-line rounded-2xl p-5 flex flex-col">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Sparkles size={16} />
              </div>
              <span className="text-[0.88rem] font-semibold text-ed-ink">快捷操作</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 flex-1">
              {quickActions.map(a => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.label}
                    onClick={a.onClick}
                    className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-ed-line hover:border-brand hover:shadow-sm transition-all cursor-pointer text-left group"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ICON_BG[a.color]}`}>
                      <Icon size={15} strokeWidth={1.8} />
                    </div>
                    <span className="text-[0.84rem] font-medium text-ed-ink group-hover:text-brand transition-colors">
                      {a.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══ 推荐课程（横向滚动） ═══ */}
        {allCourses.length > 0 && (
          <>
            <div className="text-[0.72rem] font-semibold text-ed-muted tracking-widest uppercase mb-3">推荐课程</div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {allCourses.slice(0, 6).map(c => (
                <button
                  key={c.id}
                  onClick={() => onOpenCourse(c)}
                  className="flex-shrink-0 w-48 bg-card border border-ed-line rounded-xl p-4 cursor-pointer transition-all hover:border-brand hover:shadow-sm hover:-translate-y-0.5 text-left group"
                >
                  <div className="w-full h-16 rounded-lg bg-brand-50 mb-3 flex items-center justify-center">
                    <BookOpen size={24} className="text-brand opacity-40" />
                  </div>
                  <div className="text-[0.82rem] font-semibold text-ed-ink mb-0.5 truncate group-hover:text-brand transition-colors">
                    {c.name}
                  </div>
                  <div className="text-[0.7rem] text-ed-muted truncate">
                    {c.description || c.type}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
