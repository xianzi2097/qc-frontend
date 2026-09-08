import { useState, useRef, useEffect, useCallback } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  Code2, Download, ExternalLink, FileText, GraduationCap, Home, LayoutDashboard,
  Library, LogIn, LogOut, Minus, PanelLeftClose, Plus, SquareLibrary, Terminal,
} from 'lucide-react';
import LogoMark from './LogoMark';
import { AVATARS } from '../ui/AvatarPicker';
import type { PortalUser } from '../../lib/useAuth';
import type { Course } from '../../types/course';

export type HomeSection = 'overview' | 'courses' | 'featured' | 'resources' | 'docs' | 'downloads' | 'html-sandbox' | 'compiler';

interface Props {
  section: HomeSection;
  onSection: (s: HomeSection) => void;
  /** 精选课程（在学课程）——直接列在侧边栏，点击直达内容 */
  featuredCourses: Course[];
  activeCourseId?: string;
  onOpenCourse: (c: Course) => void;
  /** 点击在线编译器语言 */
  onCompilerClick: (lang: 'python' | 'cpp' | 'html') => void;
  /** 清除课程选中态（切到其他板块时调用） */
  onClearCourse: () => void;
  user: PortalUser | null;
  username: string;
  roleLabel: string;
  avatarIdx: number;
  onAvatarClick: () => void;
  onLoginClick: () => void;
  onLogout: () => void;
}

/** 导航定义：scratch 为可展开的「在线编程」分组，其余为页内板块 */
const NAV: { id: HomeSection | 'scratch'; label: string; icon: typeof Home }[] = [
  { id: 'overview', label: '开始', icon: Home },
  { id: 'courses', label: '书架', icon: SquareLibrary },
  { id: 'featured', label: '课程', icon: Library },
  { id: 'resources', label: '资料', icon: FileText },
  { id: 'docs', label: '学习文档', icon: GraduationCap },
  { id: 'scratch', label: '在线编程', icon: Terminal },
  { id: 'downloads', label: '软件下载', icon: Download },
  { id: 'html-sandbox', label: 'HTML 演示', icon: Code2 },
];

// ── 二级目录行样式：在学课程与在线编程子列表共用；字号/缩进/间距微调只改这里 ──
const SUB_ITEM = 'w-full flex items-center gap-2 pl-9 pr-3 py-1.5 rounded-lg text-[0.86rem]';
/** 在线编程语言子项 */
const PROG_LANGS: { name: string; url?: string; compiler?: 'python' | 'cpp' | 'html' }[] = [
  { name: 'Scratch', url: '/Scratch/index.html' },
  { name: 'Python', compiler: 'python' },
  { name: 'C++', compiler: 'cpp' },
  { name: 'HTML', compiler: 'html' },
];

/**
 * 左侧控制台 — ChatGPT 式布局：
 * 右上角开关可把整条侧边栏收窄为「图标栏」：只显示图标，鼠标悬停有文字提示；
 * 导航 + 在学课程子目录（可折叠）+ 底部账号区。
 */
export default function SideBar({
  section, onSection, featuredCourses, activeCourseId, onOpenCourse, onCompilerClick, onClearCourse,
  user, username, roleLabel, avatarIdx,
  onAvatarClick, onLoginClick, onLogout,
}: Props) {
  const [folded, setFolded] = useState(false); // 在学课程子目录折叠状态
  const [progOpen, setProgOpen] = useState(false); // 在线编程分组默认折叠
  const [selectedLang, setSelectedLang] = useState<string | null>(null); // 当前选中的编程语言
  // 图标栏模式：收窄为单图标宽度；localStorage 记忆，下次进入保持
  const [rail, setRail] = useState(() => localStorage.getItem('sidebarRail') === '1');

  // ── 主题切换 ──
  const THEMES = [
    { id: '', label: '橙色', color: 'oklch(0.65 0.19 95)' },
    { id: 'green', label: '绿色', color: 'oklch(0.65 0.19 155)' },
    { id: 'blue', label: '蓝色', color: 'oklch(0.65 0.19 220)' },
  ];
  const [theme, setTheme] = useState(() => localStorage.getItem('codenova-theme') || '');
  const [customHue, setCustomHue] = useState(() => localStorage.getItem('codenova-custom-hue-value') || '');
  const [sliderOpen, setSliderOpen] = useState(() => localStorage.getItem('codenova-theme') === 'custom');

  const switchTheme = useCallback((id: string) => {
    setTheme(id);
    setCustomHue('');
    setSliderOpen(false);
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

  const toggleCustom = useCallback(() => {
    setSliderOpen(v => {
      const next = !v;
      if (next && customHue) {
        // 重新打开时恢复上次的自定义色
        setTheme('custom');
        document.documentElement.setAttribute('data-theme', 'custom');
        document.documentElement.style.setProperty('--custom-hue', customHue);
        localStorage.setItem('codenova-theme', 'custom');
        localStorage.setItem('codenova-custom-hue-value', customHue);
      } else if (!next) {
        // 关闭时如果有自定义色就保留，没选过就回默认
        if (!customHue) {
          switchTheme('');
        }
      }
      return next;
    });
  }, [customHue, switchTheme]);

  /** 拖动中：只改 CSS 变量，零开销，不触发 React */
  const handleHueInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    const hue = (e.target as HTMLInputElement).value;
    document.documentElement.setAttribute('data-theme', 'custom');
    document.documentElement.style.setProperty('--custom-hue', hue);
  }, []);

  /** 松手：才存 React 状态 + localStorage */
  const handleHueCommit = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    const hue = (e.target as HTMLInputElement).value;
    setCustomHue(hue);
    setTheme('custom');
    localStorage.setItem('codenova-theme', 'custom');
    localStorage.setItem('codenova-custom-hue-value', hue);
  }, []);

  const toggleRail = () =>
    setRail(v => {
      localStorage.setItem('sidebarRail', v ? '0' : '1');
      return !v;
    });

  // ── 美化提示：悬停带 data-tip 的元素弹出统一气泡；移开即消失 ──
  const [tip, setTip] = useState<{ label: string; x: number; y: number } | null>(null);
  const tipElRef = useRef<HTMLElement | null>(null);
  const tipTimer = useRef<number | undefined>(undefined);

  const tipHide = () => {
    window.clearTimeout(tipTimer.current);
    tipElRef.current = null;
    setTip(null);
  };

  // mouseover 冒泡覆盖「进入 / 图标间移动」；真正的离开由下方 mouseout 判定
  const handleOver = (e: ReactMouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-tip]');
    if (!el) { tipHide(); return; }
    if (el === tipElRef.current) return;
    window.clearTimeout(tipTimer.current);
    tipElRef.current = el;
    const label = el.dataset.tip || '';
    tipTimer.current = window.setTimeout(() => {
      if (tipElRef.current !== el) return; // 定时器触发前已移开则放弃
      const r = el.getBoundingClientRect();
      setTip({
        x: r.right + 10,
        y: Math.min(Math.max(r.top + r.height / 2, 28), window.innerHeight - 28),
        label,
      });
    }, 350);
  };

  // relatedTarget 仍落在当前元素内部时不隐藏（子元素间移动也会触发 out）
  const handleOut = (e: ReactMouseEvent) => {
    const next = e.relatedTarget as HTMLElement | null;
    if (tipElRef.current && !(next && tipElRef.current.contains(next))) tipHide();
  };

  // 卸载清理
  useEffect(() => () => window.clearTimeout(tipTimer.current), []);

  // ── 行样式统一出口：外链与页内导航共用同一套外观，以后改样式只动这里 ──
  const rowCls = (active: boolean) =>
    `w-full flex items-center whitespace-nowrap rounded-lg text-sm transition-colors cursor-pointer ${
      rail ? 'justify-center py-2' : 'gap-3 px-3 py-2'
    } ${
      active
        ? 'bg-black/[0.06] text-ed-ink font-semibold'
        : 'text-ed-body hover:bg-black/[0.04]'
    }`;

  const iconCls = (active: boolean) =>
    `flex-shrink-0 ${active ? 'text-brand' : 'text-ed-muted'}`;

  return (
    <>
      <aside
        onMouseOver={handleOver}
        onMouseOut={handleOut}
      className={`${rail ? 'w-14' : 'w-60'} flex-shrink-0 flex flex-col bg-ed-paper border-r-[1.5px] border-ed-line overflow-hidden transition-[width] duration-300 ease-in-out`}
    >
      {/* 顶部：图标栏仅 Logo（点击展开）；展开态为字标 + 收起开关 */}
      <div className={`flex-shrink-0 flex items-center pt-2 pb-2 ${rail ? 'justify-center px-2' : 'justify-between px-5'}`}>
        {rail ? (
          // GPT/Gemini 式收起态：只留 Logo，点一下即展开
          <button
            onClick={toggleRail}
            data-tip="展开侧边栏"
            className="p-1 rounded-lg hover:bg-black/[0.06] transition-colors cursor-pointer"
          >
            <LogoMark className="w-6 h-6" />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <LogoMark className="w-6 h-6 flex-shrink-0" />
              <span className="text-[1.30rem] font-bold tracking-tight text-ed-ink" style={{ fontFamily: "Consolas" }}>CodeNova</span>
            </div>
            <button
              onClick={toggleRail}
              data-tip="收起侧边栏"
              className="p-1.5 rounded-md text-ed-muted hover:text-brand hover:bg-black/[0.06] transition-colors cursor-pointer"
            >
              <PanelLeftClose className="w-5 h-5" strokeWidth={1.8} />
            </button>
          </>
        )}
      </div>

      {/* 导航 —— 外链与页内项统一由 NAV 数据驱动渲染 */}
      <nav className={`flex-1 min-h-0 overflow-y-auto scrollbar-none space-y-0.5 ${rail ? 'px-2' : 'px-3'}`}>
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = id !== 'scratch' && section === (id as HomeSection);
          return (
            <div key={id}>
              <button
                onClick={() => {
                  if (id === 'scratch') {
                    if (rail) window.open('/Scratch/index.html', '_blank');
                    else setProgOpen(v => !v);
                    return;
                  }
                  // 统一规则：切到非编程页面时清除所有子选中
                  setSelectedLang(null);
                  onClearCourse();
                  if (id === 'downloads' || id === 'html-sandbox') {
                    onSection(id as HomeSection);
                    return;
                  }
                  if (id === 'featured') setFolded(false);
                  onSection(id as HomeSection);
                }}
                data-tip={rail ? (id === 'scratch' ? '在线编程 · Scratch' : label) : undefined}
                className={rowCls(active)}
              >
                <Icon className={`w-5 h-5 shrink-0 ${iconCls(active)}`} strokeWidth={1.8} />
                {!rail && label}
                {!rail && id === 'featured' && featuredCourses.length > 0 && (
                  <span
                    onClick={(e) => { e.stopPropagation(); setFolded(v => !v); }}
                    data-tip={folded ? '展开课程列表' : '折叠课程列表'}
                    className="ml-auto flex items-center justify-center w-5 h-5 rounded text-ed-muted hover:text-brand hover:bg-black/[0.06] transition-colors cursor-pointer"
                  >
                    {folded ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                  </span>
                )}
                {!rail && id === 'scratch' && (
                  <span
                    onClick={(e) => { e.stopPropagation(); setProgOpen(v => !v); }}
                    data-tip={progOpen ? '收起编程语言' : '展开编程语言'}
                    className="ml-auto flex items-center justify-center w-5 h-5 rounded text-ed-muted hover:text-brand hover:bg-black/[0.06] transition-colors cursor-pointer"
                  >
                    {progOpen ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </span>
                )}
                {/* 软件下载不显示 +/- */}
              </button>
              {!rail && id === 'featured' && !folded && featuredCourses.length > 0 && (
                <div className="mt-0.5 mb-1 space-y-0.5">
                  {featuredCourses.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedLang(null); onSection('featured'); onOpenCourse(c); }}
                      className={`${SUB_ITEM} cursor-pointer transition-colors ${
                        activeCourseId === c.id
                          ? 'bg-black/[0.06] text-brand font-semibold'
                          : 'text-ed-muted hover:bg-black/[0.04] hover:text-ed-body'
                      }`}
                    >
                      <span className="w-1 h-1 rounded-full bg-brand/50 flex-shrink-0" />
                      <span className="truncate">{c.name}</span>
                    </button>
                  ))}
                </div>
              )}
{/* 在线编程子目录 */}
              {!rail && id === 'scratch' && progOpen && (
                <div className="mt-0.5 mb-1 space-y-0.5">
                  {PROG_LANGS.map(({ name, url, compiler }) => {
                    const isSelected = compiler && selectedLang === name;
                    return compiler ? (
                      <button
                        key={name}
                        onClick={() => {
                          setSelectedLang(name);
                          onCompilerClick(compiler);
                        }}
                        className={`${SUB_ITEM} transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-black/[0.06] text-brand font-semibold'
                            : 'text-ed-muted hover:bg-black/[0.04] hover:text-ed-body'
                        }`}
                      >
                        <span className={`w-1 h-1 rounded-full flex-shrink-0 ${isSelected ? 'bg-brand' : 'bg-brand/50'}`} />
                        <span className="truncate">{name}</span>
                      </button>
                    ) : (
                      <a
                        key={name}
                        href={url}
                        target={url ? '_blank' : undefined}
                        rel={url ? 'noreferrer' : undefined}
                        onClick={() => { setSelectedLang(name); onClearCourse(); }}
                        className={`${SUB_ITEM} transition-colors no-underline cursor-pointer text-ed-muted hover:bg-black/[0.04] hover:text-ed-body`}
                      >
                        <span className="w-1 h-1 rounded-full bg-brand/50 flex-shrink-0" />
                        <span className="truncate">{name}</span>
                        {url && <ExternalLink className="w-3 h-3 ml-auto opacity-60" />}
                      </a>
                    );
                  })}
                </div>
              )} 
            </div>
          );
        })}
      </nav>

      {/* 底部：色条 + 账号区（整体推到底） */}
      <div className="mt-auto">
        {!rail && (
          <div className="flex h-1 cursor-pointer">
            {THEMES.map(t => (
              <button
                key={t.label}
                onClick={() => switchTheme(t.id)}
                className={`flex-1 border-r border-white/30 transition-all ${
                  theme === t.id && !customHue ? 'opacity-100 ring-1 ring-inset ring-black/20' : 'opacity-60 hover:opacity-80'
                }`}
                style={{ background: t.color }}
                title={t.label}
              />
            ))}
            <button
              onClick={toggleCustom}
              className={`flex-1 transition-all ${
                customHue ? 'opacity-100 ring-1 ring-inset ring-black/20' : 'opacity-60 hover:opacity-80'
              }`}
              style={{ background: customHue || 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
              title="自定义"
            />
          </div>
        )}
        {sliderOpen && (
          <div className="px-3 py-1.5 border-t border-ed-line animate-fadeIn">
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
              title={customHue ? `色相 ${customHue}°` : '拖动选择颜色'}
            />
          </div>
        )}
        <div className={`border-t border-ed-line ${rail ? 'p-1.5' : 'px-3 py-2'}`}>
        {user ? (
          rail ? (
            /* 图标栏：头像/后台/退出 纵向堆叠，均带悬停提示 */
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={onAvatarClick}
                data-tip={`${username} · ${roleLabel}（点击更换头像）`}
                className={`w-9 h-9 rounded-full bg-gradient-to-br ${AVATARS[avatarIdx].bg} flex items-center justify-center text-base flex-shrink-0 hover:scale-110 transition-transform cursor-pointer`}
              >
                {AVATARS[avatarIdx].icon}
              </button>
              <a
                href="/dashboard"
                data-tip="进入后台"
                className="p-1.5 rounded-md text-ed-muted hover:text-brand hover:bg-black/[0.04] transition-colors no-underline"
              >
                <LayoutDashboard className="w-[15px] h-[15px]" />
              </a>
              <button
                onClick={onLogout}
                data-tip="退出登录"
                className="p-1.5 rounded-md text-ed-muted hover:text-brand hover:bg-black/[0.04] transition-colors cursor-pointer"
              >
                <LogOut className="w-[15px] h-[15px]" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-1.5 py-1">
              <button
                onClick={onAvatarClick}
                data-tip="点击更换头像"
                className={`w-9 h-9 rounded-full bg-gradient-to-br ${AVATARS[avatarIdx].bg} flex items-center justify-center text-base flex-shrink-0 hover:scale-110 transition-transform cursor-pointer`}
              >
                {AVATARS[avatarIdx].icon}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-ed-ink truncate">{username}</div>
                <div className="text-[0.7rem] text-ed-muted">{roleLabel}</div>
              </div>
              <a
                href="/dashboard"
                data-tip="进入后台"
                className="p-1.5 rounded-md text-ed-muted hover:text-brand hover:bg-black/[0.04] transition-colors no-underline"
              >
                <LayoutDashboard className="w-[15px] h-[15px]" />
              </a>
              <button
                onClick={onLogout}
                data-tip="退出登录"
                className="p-1.5 rounded-md text-ed-muted hover:text-brand hover:bg-black/[0.04] transition-colors cursor-pointer"
              >
                <LogOut className="w-[15px] h-[15px]" />
              </button>
            </div>
          )
        ) : rail ? (
          <button
            onClick={onLoginClick}
            data-tip="登录"
            className="w-full flex items-center justify-center py-2.5 rounded-lg bg-ed-ink text-white hover:bg-brand transition-colors cursor-pointer"
          >
            <LogIn className="w-[15px] h-[15px]" />
          </button>
        ) : (
          <button
            onClick={onLoginClick}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-ed-ink text-white text-sm tracking-[0.2em] hover:bg-brand transition-colors cursor-pointer"
          >
            <LogIn className="w-[15px] h-[15px]" /> 登录
          </button>
        )}
      </div>
      </div>
    </aside>
      {tip &&
        createPortal(
          <div style={{ left: tip.x, top: tip.y }} className="fixed z-[9999] -translate-y-1/2 pointer-events-none">
            <div className="tip-bubble relative bg-ed-ink text-white text-[0.85rem] leading-none font-medium px-3 py-2 rounded-lg shadow-xl shadow-black/25 whitespace-nowrap">
              <span className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 w-1.5 h-1.5 bg-ed-ink" />
              {tip.label}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}