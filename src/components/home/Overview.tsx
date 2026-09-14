import { useState, useCallback, useEffect } from 'react';
import { ArrowRight, GraduationCap, Palette, SquareLibrary, Star, Terminal } from 'lucide-react';

interface Props {
  onGoCourses: () => void;
  onGoFeatured: () => void;
}

/** 主题色定义 */
const THEMES = [
  { id: '', label: '橙色', color: 'oklch(0.65 0.19 95)' },
  { id: 'green', label: '绿色', color: 'oklch(0.65 0.19 155)' },
  { id: 'blue', label: '蓝色', color: 'oklch(0.65 0.19 220)' },
];

/** 控制台 — 问候 + 主题配色 + 快捷入口 */
export default function Overview({ onGoCourses, onGoFeatured }: Props) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(true); }, []);

  // 用户信息
  const storedUser = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();
  const username = storedUser?.username || '游客';
  const role = storedUser?.role || '';
  const hour = new Date().getHours();
  const timeGreet = hour < 6 ? '夜深了' : hour < 12 ? '上午好' : hour < 18 ? '下午好' : '晚上好';

  // ── 主题色（从侧边栏迁移过来） ──
  const [theme, setTheme] = useState(() => localStorage.getItem('codenova-theme') || '');
  const [customHue, setCustomHue] = useState(() => localStorage.getItem('codenova-custom-hue-value') || '');

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

  // ── 快捷入口 ──
  const quickActions = [
    { icon: GraduationCap, label: '去上课', desc: '老师主讲的主线课程', onClick: onGoCourses, href: '' },
    { icon: Star, label: '逛精选', desc: '老师挑选的选读内容', onClick: onGoFeatured, href: '' },
    { icon: Terminal, label: '在线编程', desc: '打开 Scratch 编辑器', onClick: undefined, href: '/Scratch/index.html' },
    { icon: SquareLibrary, label: '书架', desc: '浏览所有课程', onClick: onGoCourses, href: '' },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <header className="flex-shrink-0 flex items-center gap-4 px-6 h-14 border-b border-ed-line"
        style={{ background: 'var(--bookshelf-header-bg)' }}>
        <span className="text-ed-title font-semibold text-ed-ink flex-shrink-0">开始</span>
      </header>

      <div className={`flex-1 overflow-y-auto px-10 py-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* ── 问候（原版） ── */}
        <div className="mb-8">
          <p className="text-lg text-ed-muted mb-2">{timeGreet}，{username}{role === 'teacher' ? ' 老师' : ''}</p>
          <h3 className="ed-serif text-[2.1rem] leading-snug font-bold text-ed-ink mb-3">
            现在想创作点什么？
          </h3>
          <p className="text-sm text-ed-muted">
            从下面选一个开始，或者用左侧控制台进入任意板块。
          </p>
        </div>

        {/* ── 两列布局：主题配色（2×2） + 快捷入口 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6 max-w-[64rem]">

          {/* 主题配色 — 2×2 色块 */}
          <div className="bg-card border border-ed-line rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Palette size={18} className="text-ed-muted" />
              <h3 className="text-sm font-semibold text-ed-ink">主题配色</h3>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {THEMES.map(t => (
                <button
                  key={t.label}
                  onClick={() => switchTheme(t.id)}
                  className={`h-10 rounded-lg transition-all cursor-pointer border text-sm font-medium ${
                    theme === t.id && !customHue
                      ? 'border-ed-ink/30 ring-2 ring-inset ring-ed-ink/10 shadow-sm text-ed-ink'
                      : 'border-transparent hover:border-ed-line opacity-70 hover:opacity-100 text-ed-muted'
                  }`}
                  style={{ background: t.color }}
                  title={t.label}
                >
                  {t.label}
                </button>
              ))}
              <button
                onClick={() => {
                  if (theme === 'custom' && customHue) {
                    switchTheme('');
                  } else {
                    setTheme('custom');
                    document.documentElement.setAttribute('data-theme', 'custom');
                    document.documentElement.style.setProperty('--custom-hue', customHue || '95');
                    localStorage.setItem('codenova-theme', 'custom');
                    if (customHue) localStorage.setItem('codenova-custom-hue-value', customHue);
                  }
                }}
                className={`h-10 rounded-lg transition-all cursor-pointer border text-sm font-medium ${
                  theme === 'custom'
                    ? 'border-ed-ink/30 ring-2 ring-inset ring-ed-ink/10 shadow-sm text-white'
                    : 'border-transparent hover:border-ed-line opacity-70 hover:opacity-100 text-white'
                }`}
                style={{ background: customHue ? `hsl(${customHue}, 70%, 55%)` : 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
                title="自定义"
              >
                自定义
              </button>
            </div>

            {/* 色相滑块（仅自定义模式展开） */}
            {theme === 'custom' && (
              <div className="mt-2 animate-fadeIn">
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={customHue || '95'}
                  onInput={handleHueInput}
                  onChange={handleHueCommit}
                  className="w-full h-1.5 rounded-full cursor-pointer appearance-none"
                  style={{
                    background: 'linear-gradient(to right, hsl(0,80%,60%), hsl(60,80%,60%), hsl(120,80%,60%), hsl(180,80%,60%), hsl(240,80%,60%), hsl(300,80%,60%), hsl(360,80%,60%))',
                  }}
                  title={`色相 ${customHue || 95}°`}
                />
                <p className="text-[0.7rem] text-ed-muted mt-1.5 text-center">
                  拖动滑块选择你喜欢的颜色
                </p>
              </div>
            )}
          </div>

          {/* 快捷入口 */}
          <div className="bg-card border border-ed-line rounded-xl p-5">
            <h3 className="text-sm font-semibold text-ed-ink mb-4">快捷入口</h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map(t => {
                const inner = (
                  <>
                    <t.icon size={20} strokeWidth={1.6} className="text-brand" />
                    <div className="text-sm font-semibold text-ed-ink">{t.label}</div>
                    <div className="text-[0.7rem] text-ed-muted">{t.desc}</div>
                    <ArrowRight size={13} className="mt-2 ml-auto text-ed-muted group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                  </>
                );
                const cls = 'group flex flex-col p-3.5 rounded-lg border border-ed-line hover:border-brand hover:shadow-sm transition-all cursor-pointer text-left';
                return t.href ? (
                  <a key={t.label} href={t.href} target="_blank" rel="noreferrer" className={`${cls} no-underline`}>
                    {inner}
                  </a>
                ) : (
                  <button key={t.label} onClick={t.onClick} className={cls}>
                    {inner}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
