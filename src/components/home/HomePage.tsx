import { useCallback, useEffect, useMemo, useState } from 'react';
import SideBar, { NAV } from './SideBar';
import type { HomeSection } from './SideBar';
import Overview from './Overview';
import DocsFrame from './DocsFrame';
import CourseCatalog from './CourseCatalog';
import CourseDetail from './CourseDetail';
import Downloads from './Downloads';
import HtmlSandbox from './HtmlSandbox';
import CodePlayground from './CodePlayground';
import Resources from './Resources';

import LoginPanel from './LoginPanel';
import AvatarPicker, { AVATARS } from '../ui/AvatarPicker';
import { fetchAllCourses, fetchUserSettings, logoutRequest, recordRecentOpen, updateAvatar } from '../../lib/api';
import type { RecentOpen } from '../../lib/api';
import type { PortalUser } from '../../lib/useAuth';
import type { Course } from '../../types/course';
import { startHomePageTour } from '../../lib/guidedTour';

interface Props {
  onLogin: (user: PortalUser, token?: string) => void;
}

/** 与旧版一致：登录态直接读 localStorage（token 校验由 App 的 useAuth 负责） */
function readStoredUser(): PortalUser | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

const ROLE_LABEL: Record<string, string> = { teacher: '教师', student: '学生', admin: '管理员' };

/**
 * 主页 — 控制台式布局（类 ChatGPT）：
 * 左侧固定导航栏（概览 / 书架 / 课程 / 资源 / 学习文档 / 在线编程 + 底部账号区），
 * 右侧全部为内容区，按 section 切换。
 */
export default function HomePage({ onLogin }: Props) {
  // 当前板块；保留旧版 ?view=courses 直达课程广场的语义
  const [section, setSection] = useState<HomeSection>(() =>
    new URLSearchParams(window.location.search).get('view') === 'courses' ? 'courses' : 'overview',
  );
  const [showLogin, setShowLogin] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  // 全量课程：侧边栏精选列表派生 + 最近打开回跳按 id 查课
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const featuredCourses = useMemo(() => allCourses.filter(c => c.featured === true), [allCourses]);
  const [openCourse, setOpenCourse] = useState<Course | null>(null);

  // ── 最近打开：账号级存后端 settings.json（游客不记录、不显示） ──
  const [recentOpens, setRecentOpens] = useState<RecentOpen[]>([]);

  /** 记一次打开：游客直接跳过；本地乐观更新置顶，服务端去重持久化 */
  const recordOpen = useCallback((entry: { kind: 'section' | 'course'; id: string; label: string; teacher?: string | null; type?: string | null }) => {
    if (!readStoredUser()) return;
    setRecentOpens(prev => [
      { ...entry, ts: Date.now() },
      ...prev.filter(x => !(x.kind === entry.kind && x.id === entry.id)),
    ].slice(0, 6));
    recordRecentOpen(entry).catch(() => {});
  }, []);

  // 首屏拉一次全量课程
  useEffect(() => {
    fetchAllCourses().then(setAllCourses).catch(() => {});
  }, []);

  const handleSection = (s: HomeSection) => {
    if (s === 'scratch') {
      // scratch 是外链：新开窗口，不切板块；同样计入最近打开
      window.open('/Scratch/index.html', '_blank');
      recordOpen({ kind: 'section', id: 'scratch', label: 'Scratch 4.0e' });
      return;
    }
    setOpenCourse(null);
    setSection(s);
    if (s !== 'overview') {
      recordOpen({ kind: 'section', id: s, label: NAV.find(n => n.id === s)?.label ?? s });
    }
  };

  /** 引导 Tour 专用：只切页不记录（7 步导航不能刷成「最近打开」） */
  const navOnly = (s: HomeSection) => {
    if (s === 'scratch') return;
    setOpenCourse(null);
    setSection(s);
  };

  /** 侧边栏在学课程点击：打开详情 + 记录 */
  const handleOpenCourse = (c: Course) => {
    setOpenCourse(c);
    recordOpen({ kind: 'course', id: c.id, label: c.name, teacher: c.teacher, type: c.type });
  };

  /** 书架/课程目录内部点击：详情由目录自己渲染，这里只记账 */
  const handleCatalogOpen = (c: Course) => {
    recordOpen({ kind: 'course', id: c.id, label: c.name, teacher: c.teacher, type: c.type });
  };

  /** 最近打开回跳：板块直接切；课程先查全量列表，已删除则本地剔除 */
  const openRecent = (r: RecentOpen) => {
    if (r.kind === 'section') { handleSection(r.id as HomeSection); return; }
    const c = allCourses.find(x => x.id === r.id);
    if (!c) { setRecentOpens(prev => prev.filter(x => !(x.kind === r.kind && x.id === r.id))); return; }
    setSection(c.featured === true ? 'featured' : 'courses');
    setOpenCourse(c);
    recordOpen({ kind: 'course', id: c.id, label: c.name, teacher: c.teacher, type: c.type });
  };

  // 每次渲染重读 localStorage——头像更新后无需手动刷新状态
  const storedUser = readStoredUser();
  const username = storedUser?.username ?? '';
  const roleLabel = storedUser ? ROLE_LABEL[storedUser.role] ?? '' : '';
  const avatarIdx = (() => {
    const n = parseInt((storedUser?.avatar_path || '').replace('avatar_', ''), 10);
    return isNaN(n) ? 0 : Math.abs(n) % AVATARS.length;
  })();

  // 账号级最近打开：登录后拉取；与本地乐观记录合并（防慢网下覆盖刚记的条目）
  useEffect(() => {
    if (!username) { setRecentOpens([]); return; }
    fetchUserSettings().then(s => {
      const server = s.recentOpens ?? [];
      setRecentOpens(prev => {
        if (prev.length === 0) return server.slice(0, 6);
        const serverIds = new Set(server.map(x => `${x.kind}:${x.id}`));
        return [...prev.filter(x => !serverIds.has(`${x.kind}:${x.id}`)), ...server].slice(0, 6);
      });
    }).catch(() => {});
  }, [username]);

  const handleLogout = () => {
    logoutRequest();
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('codenova-theme');
    localStorage.removeItem('codenova-custom-hue-value');
    window.location.reload();
  };

  const handleAvatarSelect = async (avatarId: string) => {
    if (!storedUser) return;
    try {
      storedUser.avatar_path = `avatar_${avatarId}`;
      localStorage.setItem('user', JSON.stringify(storedUser));
      await updateAvatar(username, `avatar_${avatarId}`);
    } catch {}
    setShowAvatarPicker(false); // 触发重渲染，头像立即生效
  };

  return (
    <div className="ed-root h-screen flex overflow-hidden text-ed-body cursor-default" style={{ background: 'var(--page-bg)' }}>
      {/* ── 左侧控制台 ── */}
      <SideBar
        section={section}
        onSection={handleSection}
        featuredCourses={featuredCourses}
        activeCourseId={openCourse?.id}
        onOpenCourse={handleOpenCourse}
        onClearCourse={() => setOpenCourse(null)}
        user={storedUser}
        username={username}
        roleLabel={roleLabel}
        avatarIdx={avatarIdx}
        onAvatarClick={() => setShowAvatarPicker(true)}
        onLoginClick={() => setShowLogin(true)}
        onLogout={handleLogout}
        onStartTour={() => startHomePageTour(navOnly)}
      />

      {/* ── 右侧内容区 ── */}
      <main
        key={openCourse ? `course-${openCourse.id}` : section}
        className="flex-1 min-w-0 min-h-0 flex flex-col animate-fadeIn"
      >
        {openCourse ? (
          <CourseDetail course={openCourse} onBack={() => { const back = openCourse.featured === true ? 'featured' : 'courses'; setOpenCourse(null); setSection(back); }} />
        ) : (
          <>
            {section === 'courses' && <CourseCatalog onOpenCourse={handleCatalogOpen} />}
            {section === 'featured' && <CourseCatalog mode="featured" onOpenCourse={handleCatalogOpen} />}
            {section === 'resources' && <Resources />}
            {section === 'docs' && <DocsFrame />}
            {section === 'downloads' && <Downloads />}
            {section === 'html-sandbox' && <HtmlSandbox />}
            {section === 'compiler' && <CodePlayground />}
            {section === 'overview' && (
              <Overview
                onGoSection={handleSection}
                recentOpens={recentOpens}
                onOpenRecent={openRecent}
                featuredCourses={featuredCourses}
                onOpenCourse={handleOpenCourse}
              />
            )}
          </>
        )}
      </main>

      {section === 'overview' && (
        <footer className="fixed bottom-1.5 right-4 z-10 text-right text-[0.65rem] leading-relaxed text-ed-muted/70 select-none pointer-events-none">
          <div>Copyright © 2025-present Arin</div>
          <div>粤ICP备2026057743号-1</div>
        </footer>
      )}

      {/* 登录面板 / 头像选择器 */}
      <LoginPanel open={showLogin} onClose={() => setShowLogin(false)} onLogin={onLogin} />
      {showAvatarPicker && storedUser && (
        <AvatarPicker
          currentAvatar={String(avatarIdx)}
          onSelect={handleAvatarSelect}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
    </div>
  );
}
