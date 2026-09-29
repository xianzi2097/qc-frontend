import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Clock, ExternalLink, Palette } from 'lucide-react';
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
  /** 「课程」栏：老师标星的课（shelf=courses），空 → 本区隐藏 */
  courses: Course[];
  /** 点课程行 → 直接进课程详情 */
  onOpenCourse: (c: Course) => void;
}

/* ── 主题色 ── */
const THEMES = [
  { id: '', label: '橙色', color: 'oklch(0.65 0.19 95)' },
  { id: 'green', label: '绿色', color: 'oklch(0.65 0.19 155)' },
  { id: 'blue', label: '蓝色', color: 'oklch(0.65 0.19 220)' },
];

/* ── 快速入口磁贴：分组覆盖侧边栏全部 9 个入口（「开始」即本页，不设磁贴） ── */
const TILE_GROUPS: { title: string; layout: string; items: { id: HomeSection; desc: string }[] }[] = [
  {
    title: '创作',
    layout: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    items: [
      { id: 'compiler', desc: '写代码，直接运行' },
      { id: 'scratch', desc: '积木编程，新窗口打开' },
      { id: 'html-sandbox', desc: '左边写代码，右边看效果' },
    ],
  },
  {
    title: '学习',
    layout: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    items: [
      { id: 'books', desc: '机构开放的全部课程' },
      { id: 'resources', desc: '练习题和课件素材' },
      { id: 'docs', desc: '编程教程，在线学习' },
    ],
  },
  {
    title: '工具',
    layout: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    items: [{ id: 'downloads', desc: '安装包和常用工具' }],
  },
];

/** 板块 → 图标/文案（复用侧边栏 NAV，保证两处永远一致） */
const NAV_MAP = new Map<HomeSection, (typeof NAV)[number]>(NAV.map(n => [n.id, n]));

/** 磁贴图标底色，按板块区分 */
const TILE_BG: Record<string, string> = {
  books: 'bg-emerald-50 text-emerald-600',
  courses: 'bg-brand-50 text-brand',
  resources: 'bg-amber-50 text-amber-600',
  docs: 'bg-indigo-50 text-indigo-600',
  scratch: 'bg-orange-50 text-orange-600',
  compiler: 'bg-cyan-50 text-cyan-600',
  'html-sandbox': 'bg-blue-50 text-blue-600',
  downloads: 'bg-purple-50 text-purple-600',
};

export default function Overview({ onGoSection, recentOpens, onOpenRecent, courses, onOpenCourse }: Props) {
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
  // 点第四个「自定义」圆点时展开色条
  const [showHue, setShowHue] = useState(false);

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

  // ── 主题配色：顶栏按钮点开后，在按钮左侧弹圆点选择器（第四个圆点展开色条） ──

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* ── 顶栏：配色按钮在右上角，点开后弹层贴在按钮左侧 ── */}
      <header className="relative flex-shrink-0 flex items-center gap-2 px-6 h-14 border-b border-ed-line" style={{ background: 'var(--bookshelf-header-bg)' }}>
        <span className="text-ed-title font-semibold text-ed-ink">开始</span>
        <div className="ml-auto relative">
          <button
            type="button"
            onClick={() => setShowThemePanel(v => !v)}
            title="主题配色"
            aria-label="主题配色"
            className={`p-2 rounded-lg transition-colors cursor-pointer ${showThemePanel ? 'text-brand bg-black/[0.06]' : 'text-ed-muted hover:text-brand hover:bg-black/[0.06]'}`}
          >
            <Palette className="w-5 h-5" strokeWidth={1.8} />
          </button>

          {showThemePanel && (
            <>
              {/* 点击别处关闭弹层 */}
              <div className="fixed inset-0 z-10" onClick={() => setShowThemePanel(false)} />
              <div className="absolute right-0 top-full mt-2 z-20 p-3 bg-card border border-ed-line rounded-xl shadow-lg animate-fadeIn">
                <div className="flex items-center gap-3">
                  {THEMES.map(t => (
                    <button
                      key={t.label}
                      type="button"
                      title={t.label}
                      onClick={() => { switchTheme(t.id); setShowHue(false); }}
                      className={`w-4 h-4 rounded-full cursor-pointer transition-transform hover:scale-110 ${
                        theme === t.id && !customHue ? 'ring-2 ring-offset-2 ring-ed-ink/50 ring-offset-card' : ''
                      }`}
                      style={{ background: t.color }}
                    />
                  ))}
                  {/* 第四个：自定义色，点开色条 */}
                  <button
                    type="button"
                    title="自定义"
                    onClick={() => {
                      const h = customHue || '95';
                      setTheme('custom');
                      document.documentElement.setAttribute('data-theme', 'custom');
                      document.documentElement.style.setProperty('--custom-hue', h);
                      localStorage.setItem('codenova-theme', 'custom');
                      localStorage.setItem('codenova-custom-hue-value', h);
                      updateUserSettings({ theme: 'custom', customHue: h }).catch(() => {});
                      setShowHue(true);
                    }}
                    className={`w-4 h-4 rounded-full cursor-pointer transition-transform hover:scale-110 ${
                      theme === 'custom' ? 'ring-2 ring-offset-2 ring-ed-ink/50 ring-offset-card' : ''
                    }`}
                    style={{ background: customHue ? `hsl(${customHue}, 70%, 55%)` : 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
                  />
                </div>
                {showHue && (
                  <div className="mt-3 w-56">
                    <input
                      type="range" min="0" max="360" value={customHue || '95'}
                      onInput={handleHueInput} onChange={handleHueCommit}
                      className="w-full h-2 rounded-full cursor-pointer appearance-none"
                      style={{ background: 'linear-gradient(to right, hsl(0,80%,60%), hsl(60,80%,60%), hsl(120,80%,60%), hsl(180,80%,60%), hsl(240,80%,60%), hsl(300,80%,60%), hsl(360,80%,60%))' }}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {/* 内容区只占 80% 宽，左右各留 10% 边距 */}
      <div className={`flex-1 overflow-y-auto py-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="w-4/5 mx-auto">

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

        {/* ═══ 最近：胶囊标签，置于最上（点一下直达） ═══ */}
        {recentOpens.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-4 h-4 text-brand" strokeWidth={1.8} />
              <span className="text-[0.82rem] font-semibold text-brand tracking-wide">最近</span>
              <div className="h-px flex-1 bg-ed-line/60" />
            </div>
            <div className="flex flex-wrap gap-2.5">
              {recentOpens.map(r => {
                const isCourse = r.kind === 'course';
                const typeOpt = isCourse && r.type ? TYPE_OPTIONS.find(o => o.value === r.type) : undefined;
                const Icon = isCourse
                  ? (r.type ? TYPE_LUCIDE[r.type] ?? BookOpen : BookOpen)
                  : NAV_MAP.get(r.id as HomeSection)?.icon ?? Clock;
                return (
                  <button
                    key={`${r.kind}:${r.id}`}
                    onClick={() => onOpenRecent(r)}
                    className="group flex items-center gap-2 h-9 px-3.5 rounded-full border border-ed-line bg-card text-[0.85rem] text-ed-body hover:border-brand hover:text-brand transition-all cursor-pointer"
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-colors ${isCourse ? '' : 'text-ed-muted group-hover:text-brand'}`}
                      style={isCourse ? { color: typeOpt?.color ?? '#94a3b8' } : undefined}
                      strokeWidth={1.8}
                    />
                    <span className="max-w-40 truncate">{r.label}</span>
                    {r.kind === 'section' && r.id === 'scratch' && (
                      <ExternalLink className="w-3 h-3 text-ed-muted opacity-40" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ 课程：与其他栏目同款（小标题+分割线+等宽短卡），点卡直达课程详情 ═══ */}
        {courses.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[0.82rem] font-semibold text-brand tracking-wide">课程</span>
              <div className="h-px flex-1 bg-ed-line/60" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {courses.map(c => {
                const CIcon = TYPE_LUCIDE[c.type] ?? BookOpen;
                const color = TYPE_OPTIONS.find(o => o.value === c.type)?.color ?? '#94a3b8';
                // 只显示类型，不显示老师（同一位老师带多门课，学生会困惑）
                const meta = TYPE_OPTIONS.find(o => o.value === c.type)?.label ?? c.type;
                return (
                  <button
                    key={c.id}
                    onClick={() => onOpenCourse(c)}
                    className="group flex items-center gap-3 p-4 rounded-xl border border-ed-line bg-card shadow-sm hover:border-brand hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer text-left"
                  >
                    <span className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}1a`, color }}>
                      <CIcon className="w-5 h-5" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[0.95rem] font-semibold text-ed-ink truncate">{c.name}</div>
                      <div className="text-[0.78rem] text-ed-muted truncate mt-0.5">{meta}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ 创作 / 学习 / 工具：分类磁贴（标题按侧边栏分组着色） ═══ */}
        {TILE_GROUPS.map(group => (
          <div key={group.title} className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[0.82rem] font-semibold text-brand tracking-wide">{group.title}</span>
              <div className="h-px flex-1 bg-ed-line/60" />
            </div>
            <div className={`grid gap-4 ${group.layout}`}>
              {group.items.map(({ id, desc }) => {
                const nav = NAV_MAP.get(id);
                if (!nav) return null;
                const Icon = nav.icon;

                return (
                  <button
                    key={id}
                    onClick={() => onGoSection(id)}
                    className="group flex items-center gap-3 p-4 rounded-xl border border-ed-line bg-card shadow-sm hover:border-brand hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer text-left"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${TILE_BG[id] ?? 'bg-brand-50 text-brand'}`}>
                      <Icon className="w-5 h-5" strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[0.95rem] font-semibold text-ed-ink group-hover:text-brand transition-colors truncate">{nav.label}</span>
                        {id === 'scratch' && <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 text-ed-muted opacity-40" />}
                      </div>
                      <div className="text-[0.78rem] text-ed-muted truncate mt-0.5">{desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
