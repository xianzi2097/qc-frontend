import { useState, useRef, useEffect } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  BookMarked, Code2, Download, ExternalLink, FileText, HelpCircle, Home, LayoutDashboard,
  Library, LogIn, LogOut, Minus, PanelLeftClose, Puzzle, Plus, SquareLibrary, Terminal,
} from 'lucide-react';
import LogoMark from './LogoMark';
import { AVATARS } from '../ui/AvatarPicker';
import { fetchUserSettings, updateUserSettings } from '../../lib/api';
import type { PortalUser } from '../../lib/useAuth';
import type { Course } from '../../types/course';

export type HomeSection = 'overview' | 'books' | 'courses' | 'resources' | 'docs' | 'downloads' | 'html-sandbox' | 'compiler' | 'scratch';

interface Props {
  section: HomeSection;
  onSection: (s: HomeSection) => void;
  /** 课程（老师标星、正在教的）——直接列在侧边栏，点击直达内容 */
  courses: Course[];
  activeCourseId?: string;
  onOpenCourse: (c: Course) => void;
  /** 清除课程选中态（切到其他板块时调用） */
  onClearCourse: () => void;
  /** 启动引导 Tour */
  onStartTour?: () => void;
  user: PortalUser | null;
  username: string;
  roleLabel: string;
  avatarIdx: number;
  onAvatarClick: () => void;
  onLoginClick: () => void;
  onLogout: () => void;
}

/** 导航定义：scratch 独立顶级项（外链），其余为页内板块。导出给开始页磁贴/最近打开复用图标与文案
 *  配色分组：核心导航=蓝 / 学习资源=翠绿 / 工具实践=紫 */
export const NAV: { id: HomeSection; label: string; icon: typeof Home; color: string }[] = [
  { id: 'overview', label: '开始', icon: Home, color: 'text-blue-600' },
  { id: 'books', label: '书架', icon: SquareLibrary, color: 'text-blue-600' },
  { id: 'courses', label: '课程', icon: Library, color: 'text-blue-600' },
  { id: 'resources', label: '资料', icon: FileText, color: 'text-emerald-600' },
  { id: 'docs', label: '站点维基', icon: BookMarked, color: 'text-emerald-600' },
  { id: 'scratch', label: 'Scratch 4.0-QC', icon: Puzzle, color: 'text-violet-600' },
  { id: 'compiler', label: '在线编程', icon: Terminal, color: 'text-violet-600' },
  { id: 'downloads', label: '软件下载', icon: Download, color: 'text-violet-600' },
  { id: 'html-sandbox', label: 'HTML 演示', icon: Code2, color: 'text-violet-600' },
];

// ── 二级目录行样式：在学课程子列表共用；字号/缩进/间距微调只改这里 ──
const SUB_ITEM = 'w-full flex items-center gap-2 pl-9 pr-3 py-1.5 rounded-lg text-[0.86rem]';

/**
 * 左侧控制台 — ChatGPT 式布局：
 * 右上角开关可把整条侧边栏收窄为「图标栏」：只显示图标，鼠标悬停有文字提示；
 * 导航 + 在学课程子目录（可折叠）+ 底部账号区。
 */
export default function SideBar({
  section, onSection, courses, activeCourseId, onOpenCourse, onClearCourse,
  user, username, roleLabel, avatarIdx,
  onAvatarClick, onLoginClick, onLogout, onStartTour,
}: Props) {
  const [folded, setFolded] = useState(false); // 在学课程子目录折叠状态
  // 图标栏模式：收窄为单图标宽度；localStorage 记忆，默认收起
  const [rail, setRail] = useState(() => localStorage.getItem('sidebarRail') !== '0');

  // 登录后从后端加载侧边栏设置（覆盖 localStorage 缓存）
  useEffect(() => {
    if (!user) return;
    fetchUserSettings().then(s => {
      const expanded = s.sidebarExpanded === true; // 默认收起，手动展开过才记住展开
      setRail(!expanded);
      localStorage.setItem('sidebarRail', expanded ? '0' : '1');
    }).catch(() => { /* 网络失败保持 localStorage 缓存 */ });
  }, [user]);

  const toggleRail = () =>
    setRail(v => {
      const next = !v;
      localStorage.setItem('sidebarRail', next ? '1' : '0');
      // 同步到后端：rail=true 表示收起，sidebarExpanded=true 表示展开，语义相反
      updateUserSettings({ sidebarExpanded: !next }).catch(() => {});
      return next;
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

  return (
    <>
      <aside
        onMouseOver={handleOver}
        onMouseOut={handleOut}
      data-tour="sidebar"
      className={`${rail ? 'w-14' : 'w-60'} flex-shrink-0 flex flex-col bg-ed-paper border-r-[1.5px] border-ed-line overflow-hidden transition-[width] duration-300 ease-in-out`}
    >
      {/* 顶部：图标栏仅 Logo（点击展开）；展开态为字标 + 收起开关 */}
      <div className={`flex-shrink-0 flex items-center pt-3 pb-2 ${rail ? 'justify-center px-2' : 'justify-between px-5'}`}>
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
        {NAV.filter(({ id }) => id !== 'docs').map(({ id, label, icon: Icon, color }) => {
          const active = section === id;
          return (
            <div key={id}>
              <button
                onClick={() => {
                  onClearCourse();
                  // scratch 外链也走 onSection：由 HomePage 统一 window.open + 记录最近打开
                  if (id === 'courses') setFolded(false);
                  onSection(id);
                }}
                data-tip={rail ? label : undefined}
                data-tour={
                  id === 'books' ? 'books' :
                  id === 'courses' ? 'courses' :
                  id === 'resources' ? 'resources' :
                  id === 'docs' ? 'docs' :
                  id === 'compiler' ? 'programming' :
                  id === 'downloads' ? 'downloads' :
                  id === 'html-sandbox' ? 'html-sandbox' :
                  undefined
                }
                className={rowCls(active)}
              >
                <Icon className={`w-5 h-5 shrink-0 ${color}`} strokeWidth={active ? 2.6 : 1.8} />
                {!rail && label}
                {!rail && (id === 'scratch' || id === 'docs') && <ExternalLink className="w-3 h-3 ml-auto opacity-40" />}
                {!rail && id === 'courses' && courses.length > 0 && (
                  <span
                    onClick={(e) => { e.stopPropagation(); setFolded(v => !v); }}
                    data-tip={folded ? '展开课程列表' : '折叠课程列表'}
                    className="ml-auto flex items-center justify-center w-5 h-5 rounded text-ed-muted hover:text-brand hover:bg-black/[0.06] transition-colors cursor-pointer"
                  >
                    {folded ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                  </span>
                )}
              </button>
              {!rail && id === 'courses' && !folded && courses.length > 0 && (
                <div className="mt-0.5 mb-1 space-y-0.5">
                  {courses.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { onSection('courses'); onOpenCourse(c); }}
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
            </div>
          );
        })}
        {/* ── 分割线 + 使用帮助（紧跟导航项） ── */}
        <div className="mt-1">
          <div className={`${rail ? 'mx-2 border-t border-ed-line/40' : 'mx-3 border-t border-ed-line'} my-1`} />
          {onStartTour && (
            <button
              onClick={onStartTour}
              data-tour="help"
              data-tip={rail ? '使用帮助' : undefined}
              className={rowCls(false)}
            >
              <HelpCircle className="w-5 h-5 shrink-0 text-fuchsia-500" strokeWidth={1.8} />
              {!rail && '使用帮助'}
            </button>
          )}
        </div>

        {/* ── 产品维基（使用帮助之下） ── */}
        {(() => {
          const item = NAV.find(n => n.id === 'docs')!;
          const Icon = item.icon;
          const active = section === 'docs';
          return (
            <button
              onClick={() => { onClearCourse(); onSection('docs'); }}
              data-tip={rail ? item.label : undefined}
              data-tour="docs"
              className={rowCls(active)}
            >
              <Icon className={`w-5 h-5 shrink-0 ${item.color}`} strokeWidth={active ? 2.6 : 1.8} />
              {!rail && item.label}
            </button>
          );
        })()}
      </nav>

      {/* 底部：账号区（整体推到底） */}
      <div className="mt-auto">
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