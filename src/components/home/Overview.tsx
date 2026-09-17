import { useState, useEffect, useCallback } from 'react';
import {
  Palette, SquareLibrary,
  Star, Terminal, FileText, Sparkles,
} from 'lucide-react';
import type { HomeSection } from './SideBar';

interface Props {
  onGoCourses: () => void;
  onGoFeatured: () => void;
  onGoSection: (s: HomeSection) => void;
  onGoCompiler: () => void;
}

/* ── 主题色 ── */
const THEMES = [
  { id: '', label: '橙色', color: 'oklch(0.65 0.19 95)' },
  { id: 'green', label: '绿色', color: 'oklch(0.65 0.19 155)' },
  { id: 'blue', label: '蓝色', color: 'oklch(0.65 0.19 220)' },
];

export default function Overview({ onGoCourses, onGoFeatured, onGoSection, onGoCompiler }: Props) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(true); }, []);

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

        {/* ═══ 快捷操作 ═══ */}
        <div className="max-w-[32rem]">
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
      </div>
    </div>
  );
}
