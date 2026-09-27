import { useState, useEffect, useCallback } from 'react';
import { ArrowRight, BookOpen, Clock, ExternalLink, Palette, Sparkles } from 'lucide-react';
import { NAV } from './SideBar';
import type { HomeSection } from './SideBar';
import { fetchUserSettings, updateUserSettings } from '../../lib/api';
import type { RecentOpen } from '../../lib/api';
import { TYPE_LUCIDE, TYPE_OPTIONS } from '../../types/course';
import type { Course } from '../../types/course';

interface Props {
  /** 切换板块（scratch 由 HomePage 负责外链打开 + 记录） */
  onGoSection: (s: HomeSection) => void;
  /** 账号级「最近打开」；游客/新用户为空 → 整行隐藏 */
  recentOpens: RecentOpen[];
  onOpenRecent: (r: RecentOpen) => void;
  /** 课程（老师标星、正在教的；数据复用「课程」页；空 → 本区隐藏） */
  featuredCourses: Course[];
  onOpenCourse: (course: Course) => void;
}

/* ── 主题色 ── */
const THEMES = [
  { id: '', label: '橙色', color: 'oklch(0.65 0.19 95)' },
  { id: 'green', label: '绿色', color: 'oklch(0.65 0.19 155)' },
  { id: 'blue', label: '蓝色', color: 'oklch(0.65 0.19 220)' },
];

/* ── 快速入口磁贴：分组覆盖侧边栏全部 9 个入口（「开始」即本页，不设磁贴） ── */
const TILE_GROUPS: { title: string; items: { id: HomeSection; desc: string }[] }[] = [
  {
    title: '学习',
    items: [
      { id: 'courses', desc: '机构开放的全部课程' },
      { id: 'featured', desc: '老师正在教的课' },
      { id: 'resources', desc: '练习题和课件素材' },
      { id: 'docs', desc: '编程教程，在线学习' },
    ],
  },
  {
    title: '创作',
    items: [
      { id: 'scratch', desc: '积木编程，新窗口打开' },
      { id: 'compiler', desc: '写代码，直接运行' },
      { id: 'html-sandbox', desc: '左边写代码，右边看效果' },
    ],
  },
  {
    title: '工具',
    items: [{ id: 'downloads', desc: '安装包和常用工具' }],
  },
];

/** 板块 → 图标/文案（复用侧边栏 NAV，保证两处永远一致） */
const NAV_MAP = new Map<HomeSection, (typeof NAV)[number]>(NAV.map(n => [n.id, n]));

/** 磁贴图标底色，按板块区分 */
const TILE_BG: Record<string, string> = {
  courses: 'bg-emerald-50 text-emerald-600',
  featured: 'bg-brand-50 text-brand',
  resources: 'bg-amber-50 text-amber-600',
  docs: 'bg-indigo-50 text-indigo-600',
  scratch: 'bg-orange-50 text-orange-600',
  compiler: 'bg-cyan-50 text-cyan-600',
  'html-sandbox': 'bg-blue-50 text-blue-600',
  downloads: 'bg-purple-50 text-purple-600',
};

/** 分组拍平（「全部工具」紧凑入口用） */
const TILE_FLAT = TILE_GROUPS.flatMap(g => g.items);

export default function Overview({ onGoSection, recentOpens, onOpenRecent, featuredCourses, onOpenCourse }: Props) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(true); }, []);

  // 用户信息
  const storedUser = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const username = storedUser?.username || '游客';

  // 时间问候
  const hour = new Date().getHours();
  const timeGreet = hour < 6 ? '夜深了' : hour < 12 ? '上午好' : hour < 18 ? '下午好' : '晚上好';

  // 日期
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()];

  // ── 主题色（用户设置持久化到后端） ──
  const [theme, setTheme] = useState('');
  const [customHue, setCustomHue] = useState('');
  const [showThemePanel, setShowThemePanel] = useState(false);

  // 首次加载：从后端拉设置，同步到 DOM + state
  useEffect(() => {
    fetchUserSettings().then(s => {
      setTheme(s.theme);
      setCustomHue(s.customHue);
      if (s.theme) {
        document.documentElement.setAttribute('data-theme', s.theme);
      }
      if (s.customHue) {
        document.documentElement.style.setProperty('--custom-hue', s.customHue);
      }
    }).catch(() => {
      // 未登录或失败，回退 localStorage
      const t = localStorage.getItem('codenova-theme') || '';
      const h = localStorage.getItem('codenova-custom-hue-value') || '';
      setTheme(t);
      setCustomHue(h);
      if (t) document.documentElement.setAttribute('data-theme', t);
      if (h) document.documentElement.style.setProperty('--custom-hue', h);
    });
  }, []);

  const switchTheme = useCallback((id: string) => {
    setTheme(id);
    setCustomHue('');
    document.documentElement.style.removeProperty('--custom-hue');
    localStorage.setItem('codenova-theme', id);
    localStorage.removeItem('codenova-custom-hue-value');
    if (id) {
      document.documentElement.setAttribute('data-theme', id);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    // 持久化到后端
    updateUserSettings({ theme: id, customHue: '' }).catch(() => {});
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
    document.documentElement.setAttribute('data-theme', 'custom');
    localStorage.setItem('codenova-theme', 'custom');
    localStorage.setItem('codenova-custom-hue-value', hue);
    updateUserSettings({ theme: 'custom', customHue: hue }).catch(() => {});
  }, []);

  // ── 主题配色入口已降级到顶栏角落按钮（下方主题面板保留） ──

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* ── 顶栏 ── */}
      <header className="flex-shrink-0 flex items-center gap-2 px-6 h-14 border-b border-ed-line" style={{ background: 'var(--bookshelf-header-bg)' }}>
        <span className="text-ed-title font-semibold text-ed-ink">开始</span>
        <button
          type="button"
          onClick={() => setShowThemePanel(v => !v)}
          title="主题配色"
          aria-label="主题配色"
          className={`ml-auto p-2 rounded-lg transition-colors cursor-pointer ${showThemePanel ? 'text-brand bg-black/[0.06]' : 'text-ed-muted hover:text-brand hover:bg-black/[0.06]'}`}
        >
          <Palette className="w-5 h-5" strokeWidth={1.8} />
        </button>
      </header>

      <div className={`flex-1 overflow-y-auto px-10 py-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

        {/* ═══ 晨间简报头部 ═══ */}
        <div className="mb-8">
          <p className="text-[0.82rem] text-ed-muted mb-1.5 tracking-wide">
            {dateStr} · {weekDay}
          </p>
          <h3 className="ed-serif text-[2rem] leading-snug font-extrabold text-ed-ink mb-3 tracking-tight">
            {timeGreet}，{username}
          </h3>
          <p className="text-[0.88rem] text-ed-body leading-relaxed max-w-[40rem]">
            现在想创作点什么？
          </p>
        </div>

        {/* ═══ 主题配色面板（展开时显示） ═══ */}
        {showThemePanel && (
          <div className="mb-6 p-4 bg-card border border-ed-line rounded-xl animate-fadeIn">
            <div className="flex items-center gap-2 mb-3">
              <Palette size={14} className="text-ed-muted" />
              <span className="text-sm font-semibold text-ed-ink">主题配色</span>
            </div>
            <div className="flex gap-2">
              {THEMES.map(t => (
                <button
                  key={t.label}
                  onClick={() => switchTheme(t.id)}
                  className={`h-9 px-4 rounded-lg transition-all cursor-pointer border text-sm font-medium text-white ${
                    theme === t.id && !customHue
                      ? 'border-ed-ink/30 ring-2 ring-inset ring-ed-ink/10 shadow-sm'
                      : 'border-transparent hover:border-ed-line opacity-70 hover:opacity-100'
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
                    const h = customHue || '95';
                    setTheme('custom');
                    document.documentElement.setAttribute('data-theme', 'custom');
                    document.documentElement.style.setProperty('--custom-hue', h);
                    localStorage.setItem('codenova-theme', 'custom');
                    localStorage.setItem('codenova-custom-hue-value', h);
                    updateUserSettings({ theme: 'custom', customHue: h }).catch(() => {});
                  }
                }}
                className={`h-9 px-4 rounded-lg transition-all cursor-pointer border text-sm font-medium text-white ${
                  theme === 'custom'
                    ? 'border-ed-ink/30 ring-2 ring-inset ring-ed-ink/10 shadow-sm'
                    : 'border-transparent hover:border-ed-line opacity-70 hover:opacity-100'
                }`}
                style={{ background: customHue ? `hsl(${customHue}, 70%, 55%)` : 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
              >
                自定义
              </button>
            </div>
            {theme === 'custom' && (
              <div className="mt-3" style={{ width: 'calc(5 * 2.5rem + 4 * 0.5rem)' }}>
                <input
                  type="range" min="0" max="360" value={customHue || '95'}
                  onInput={handleHueInput} onChange={handleHueCommit}
                  className="w-full h-1.5 rounded-full cursor-pointer appearance-none"
                  style={{ background: 'linear-gradient(to right, hsl(0,80%,60%), hsl(60,80%,60%), hsl(120,80%,60%), hsl(180,80%,60%), hsl(240,80%,60%), hsl(300,80%,60%), hsl(360,80%,60%))' }}
                />
              </div>
            )}
          </div>
        )}

        {/* ═══ 继续上次：最近打开前 2 条升为大卡（含大按钮），其余收成小 chip ═══ */}
        {recentOpens.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-4 h-4 text-ed-muted" strokeWidth={1.8} />
              <span className="text-[0.82rem] font-semibold text-ed-muted tracking-wide">继续上次</span>
              <div className="h-px flex-1 bg-ed-line/60" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              {recentOpens.slice(0, 2).map(r => {
                const isCourse = r.kind === 'course';
                const typeOpt = isCourse && r.type ? TYPE_OPTIONS.find(o => o.value === r.type) : undefined;
                const Icon = isCourse
                  ? (r.type ? TYPE_LUCIDE[r.type] ?? BookOpen : BookOpen)
                  : NAV_MAP.get(r.id as HomeSection)?.icon ?? Clock;
                const desc = isCourse
                  ? [typeOpt?.label ?? r.type, r.teacher].filter(Boolean).join(' · ')
                  : TILE_FLAT.find(t => t.id === r.id)?.desc ?? '快速进入';
                return (
                  <button
                    key={`${r.kind}:${r.id}`}
                    onClick={() => onOpenRecent(r)}
                    className="group flex items-center gap-4 p-5 rounded-2xl border border-ed-line bg-card hover:border-brand hover:shadow-md transition-all cursor-pointer text-left"
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${isCourse ? '' : TILE_BG[r.id] ?? 'bg-brand-50 text-brand'}`}
                      style={isCourse ? { backgroundColor: `${typeOpt?.color ?? '#94a3b8'}1a`, color: typeOpt?.color ?? '#94a3b8' } : undefined}
                    >
                      <Icon className="w-7 h-7" strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[0.74rem] text-ed-muted">{isCourse ? '课程' : '板块'}</div>
                      <div className="text-[1.02rem] font-semibold text-ed-ink group-hover:text-brand transition-colors truncate">{r.label}</div>
                      <div className="text-[0.78rem] text-ed-muted truncate mt-0.5">{desc}</div>
                    </div>
                    <span className="flex-shrink-0 h-9 px-4 rounded-full bg-brand text-white text-[0.85rem] font-semibold flex items-center gap-1.5">
                      继续
                      <ArrowRight className="w-4 h-4" strokeWidth={2} />
                    </span>
                  </button>
                );
              })}
            </div>
            {recentOpens.length > 2 && (
              <div className="flex flex-wrap gap-2">
                {recentOpens.slice(2).map(r => {
                  const Icon = r.kind === 'course'
                    ? (r.type ? TYPE_LUCIDE[r.type] ?? BookOpen : BookOpen)
                    : NAV_MAP.get(r.id as HomeSection)?.icon ?? Clock;
                  return (
                    <button
                      key={`${r.kind}:${r.id}`}
                      onClick={() => onOpenRecent(r)}
                      className="group flex items-center gap-2 h-9 px-3.5 rounded-full border border-ed-line bg-card text-[0.82rem] text-ed-body hover:border-brand hover:text-brand transition-all cursor-pointer"
                    >
                      <Icon className="w-4 h-4 text-ed-muted group-hover:text-brand transition-colors" strokeWidth={1.8} />
                      <span className="max-w-40 truncate">{r.label}</span>
                      {r.kind === 'section' && r.id === 'scratch' && (
                        <ExternalLink className="w-3 h-3 text-ed-muted opacity-40 group-hover:opacity-80" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ 课程：内容卡横排，点击直接进入（自动记录最近打开） ═══ */}
        {featuredCourses.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <Sparkles className="w-4 h-4 text-ed-muted" strokeWidth={1.8} />
              <span className="text-[0.82rem] font-semibold text-ed-muted tracking-wide">课程</span>
              <div className="h-px flex-1 bg-ed-line/60" />
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              {featuredCourses.slice(0, 4).map(c => {
                const CIcon = TYPE_LUCIDE[c.type] ?? BookOpen;
                const color = TYPE_OPTIONS.find(o => o.value === c.type)?.color ?? '#94a3b8';
                return (
                  <button
                    key={c.id}
                    onClick={() => onOpenCourse(c)}
                    className="group flex flex-col gap-3 p-4 rounded-2xl border border-ed-line bg-card hover:border-brand hover:shadow-sm transition-all cursor-pointer text-left"
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}1a`, color }}>
                      <CIcon className="w-6 h-6" strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[0.9rem] font-semibold text-ed-ink group-hover:text-brand transition-colors truncate">{c.name}</div>
                      <div className="text-[0.76rem] text-ed-muted truncate mt-0.5">
                        {[TYPE_OPTIONS.find(o => o.value === c.type)?.label ?? c.type, c.teacher].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ 全部工具：磁贴降级为紧凑入口（分组拍平成一行胶囊） ═══ */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[0.82rem] font-semibold text-ed-muted tracking-wide">全部工具</span>
            <div className="h-px flex-1 bg-ed-line/60" />
          </div>
          <div className="flex flex-wrap gap-2.5">
            {TILE_FLAT.map(({ id }) => {
              const nav = NAV_MAP.get(id);
              if (!nav) return null;
              const Icon = nav.icon;
              return (
                <button
                  key={id}
                  onClick={() => onGoSection(id)}
                  className="group flex items-center gap-2 h-10 pl-3 pr-4 rounded-full border border-ed-line bg-card hover:border-brand transition-all cursor-pointer"
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${TILE_BG[id] ?? 'bg-brand-50 text-brand'}`}>
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
                  </div>
                  <span className="text-[0.85rem] font-medium text-ed-body group-hover:text-brand transition-colors">{nav.label}</span>
                  {id === 'scratch' && <ExternalLink className="w-3 h-3 text-ed-muted opacity-40 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
