import { useState, useRef, useEffect } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen, ExternalLink, GraduationCap, Home, LayoutDashboard,
  LogIn, LogOut, Minus, PanelLeftClose, Plus, Terminal, Star,
} from 'lucide-react';
import LogoMark from './LogoMark';
import { AVATARS } from '../ui/AvatarPicker';
import type { PortalUser } from '../../lib/useAuth';
import type { Course } from '../../types/course';

export type HomeSection = 'overview' | 'courses' | 'featured' | 'docs';

interface Props {
  section: HomeSection;
  onSection: (s: HomeSection) => void;
  /** 精选课程（在学课程）——直接列在侧边栏，点击直达内容 */
  featuredCourses: Course[];
  activeCourseId?: string;
  onOpenCourse: (c: Course) => void;
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
  { id: 'courses', label: '我的书架', icon: GraduationCap },
  { id: 'featured', label: '在线课程', icon: Star },
  { id: 'docs', label: '学习文档', icon: BookOpen },
  { id: 'scratch', label: '在线编程', icon: Terminal },
];

// ── 二级目录行样式：在学课程与在线编程子列表共用；字号/缩进/间距微调只改这里 ──
const SUB_ITEM = 'w-full flex items-center gap-2 pl-9 pr-3 py-1.5 rounded-lg text-[0.86rem]';
/** 在线编程语言子项：url 留空 = 占位（点击无反应）；后续接入只需补 url */
const PROG_LANGS: { name: string; url?: string }[] = [
  { name: 'Scratch', url: '/Scratch/index.html' },
  { name: 'Python' },
  { name: 'C++' },
];

/**
 * 左侧控制台 — ChatGPT 式布局：
 * 右上角开关可把整条侧边栏收窄为「图标栏」：只显示图标，鼠标悬停有文字提示；
 * 导航 + 在学课程子目录（可折叠）+ 底部账号区。
 */
export default function SideBar({
  section, onSection, featuredCourses, activeCourseId, onOpenCourse,
  user, username, roleLabel, avatarIdx,
  onAvatarClick, onLoginClick, onLogout,
}: Props) {
  const [folded, setFolded] = useState(false); // 在学课程子目录折叠状态
  const [progOpen, setProgOpen] = useState(true); // 在线编程分组展开状态
  // 图标栏模式：收窄为单图标宽度；localStorage 记忆，下次进入保持
  const [rail, setRail] = useState(() => localStorage.getItem('sidebarRail') === '1');

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
    `flex-shrink-0 ${active ? 'text-brand-orange' : 'text-ed-muted'}`;

  return (
    <>
      <aside
        onMouseOver={handleOver}
        onMouseOut={handleOut}
      className={`${rail ? 'w-14' : 'w-60'} flex-shrink-0 flex flex-col bg-ed-paper border-r border-ed-line overflow-hidden transition-[width] duration-300 ease-in-out`}
    >
      {/* 顶部：图标栏仅 Logo（点击展开）；展开态为字标 + 收起开关 */}
      <div className={`flex-shrink-0 flex items-center py-4 ${rail ? 'justify-center px-2' : 'justify-between px-5'}`}>
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
              <LogoMark className="w-[22px] h-[22px] flex-shrink-0" />
              <span className="text-[1.05rem] font-bold tracking-tight text-ed-ink">CodeNova</span>
            </div>
            <button
              onClick={toggleRail}
              data-tip="收起侧边栏"
              className="p-1.5 rounded-md text-ed-muted hover:text-brand-orange hover:bg-black/[0.06] transition-colors cursor-pointer"
            >
              <PanelLeftClose size={16} strokeWidth={1.8} />
            </button>
          </>
        )}
      </div>

      {/* 导航 —— 外链与页内项统一由 NAV 数据驱动渲染 */}
      <nav className={`space-y-0.5 ${rail ? 'px-2' : 'px-3'}`}>
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
                  if (id === 'featured') setFolded(false);
                  onSection(id as HomeSection);
                }}
                data-tip={rail ? (id === 'scratch' ? '在线编程 · Scratch' : label) : undefined}
                className={rowCls(active)}
              >
                <Icon size={16} strokeWidth={1.8} className={iconCls(active)} />
                {!rail && label}
                {!rail && id === 'featured' && featuredCourses.length > 0 && (
                  <span
                    onClick={(e) => { e.stopPropagation(); setFolded(v => !v); }}
                    data-tip={folded ? '展开课程列表' : '折叠课程列表'}
                    className="ml-auto flex items-center justify-center w-5 h-5 rounded text-ed-muted hover:text-brand-orange hover:bg-black/[0.06] transition-colors cursor-pointer"
                  >
                    {folded ? <Plus size={13} /> : <Minus size={13} />}
                  </span>
                )}
                {!rail && id === 'scratch' && (
                  <span
                    onClick={(e) => { e.stopPropagation(); setProgOpen(v => !v); }}
                    data-tip={progOpen ? '收起编程语言' : '展开编程语言'}
                    className="ml-auto flex items-center justify-center w-5 h-5 rounded text-ed-muted hover:text-brand-orange hover:bg-black/[0.06] transition-colors cursor-pointer"
                  >
                    {progOpen ? <Minus size={13} /> : <Plus size={13} />}
                  </span>
                )}
              </button>
              {!rail && id === 'featured' && !folded && featuredCourses.length > 0 && (
                <div className="mt-0.5 mb-1 space-y-0.5">
                  {featuredCourses.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onOpenCourse(c)}
                      className={`${SUB_ITEM} cursor-pointer transition-colors ${
                        activeCourseId === c.id
                          ? 'bg-black/[0.06] text-brand-orange font-semibold'
                          : 'text-ed-muted hover:bg-black/[0.04] hover:text-ed-body'
                      }`}
                    >
                      <span className="w-1 h-1 rounded-full bg-brand-orange/50 flex-shrink-0" />
                      <span className="truncate">{c.name}</span>
                    </button>
                  ))}
                </div>
              )}
{/* 在线编程子目录 —— 接入新语言：在 PROG_LANGS 里补一行即可 */}
              {!rail && id === 'scratch' && progOpen && (
                <div className="mt-0.5 mb-1 space-y-0.5">
                  {PROG_LANGS.map(({ name, url }) => (
                    <a
                      key={name}
                      href={url}
                      target={url ? '_blank' : undefined}
                      rel={url ? 'noreferrer' : undefined}
                      className={`${SUB_ITEM} transition-colors no-underline cursor-pointer text-ed-muted hover:bg-black/[0.04] hover:text-ed-body`}
                    >
                      <span className="w-1 h-1 rounded-full bg-brand-orange/50 flex-shrink-0" />
                      <span className="truncate">{name}</span>
                      {url && <ExternalLink size={11} className="ml-auto opacity-60" />}
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* 底部：账号区 */}
      <div className={`mt-auto border-t border-ed-line ${rail ? 'p-2' : 'p-3'}`}>
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
                className="p-1.5 rounded-md text-ed-muted hover:text-brand-orange hover:bg-black/[0.04] transition-colors no-underline"
              >
                <LayoutDashboard size={15} />
              </a>
              <button
                onClick={onLogout}
                data-tip="退出登录"
                className="p-1.5 rounded-md text-ed-muted hover:text-brand-orange hover:bg-black/[0.04] transition-colors cursor-pointer"
              >
                <LogOut size={15} />
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
                className="p-1.5 rounded-md text-ed-muted hover:text-brand-orange hover:bg-black/[0.04] transition-colors no-underline"
              >
                <LayoutDashboard size={15} />
              </a>
              <button
                onClick={onLogout}
                data-tip="退出登录"
                className="p-1.5 rounded-md text-ed-muted hover:text-brand-orange hover:bg-black/[0.04] transition-colors cursor-pointer"
              >
                <LogOut size={15} />
              </button>
            </div>
          )
        ) : rail ? (
          <button
            onClick={onLoginClick}
            data-tip="登录"
            className="w-full flex items-center justify-center py-2.5 rounded-lg bg-ed-ink text-white hover:bg-brand-orange transition-colors cursor-pointer"
          >
            <LogIn size={15} />
          </button>
        ) : (
          <button
            onClick={onLoginClick}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-ed-ink text-white text-sm tracking-[0.2em] hover:bg-brand-orange transition-colors cursor-pointer"
          >
            <LogIn size={15} /> 登录
          </button>
        )}
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