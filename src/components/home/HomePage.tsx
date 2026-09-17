import { useEffect, useState } from 'react';
import SideBar from './SideBar';
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
import { fetchAllCourses, logoutRequest, updateAvatar } from '../../lib/api';
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
  // 在学课程（精选）：侧边栏直达列表 + 当前打开的课程
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
  const [openCourse, setOpenCourse] = useState<Course | null>(null);

  // 打开课程时记录最近访问
  const handleOpenCourse = (c: Course) => {
    setOpenCourse(c);
  };

  // 首屏拉一次全量课程，筛出精选挂到侧边栏
  useEffect(() => {
    fetchAllCourses()
      .then(list => setFeaturedCourses(list.filter(c => c.featured === true)))
      .catch(() => {});
  }, []);

  const handleSection = (s: HomeSection) => {
    setOpenCourse(null);
    setSection(s);
  };

  // 每次渲染重读 localStorage——头像更新后无需手动刷新状态
  const storedUser = readStoredUser();
  const username = storedUser?.username ?? '';
  const roleLabel = storedUser ? ROLE_LABEL[storedUser.role] ?? '' : '';
  const avatarIdx = (() => {
    const n = parseInt((storedUser?.avatar_path || '').replace('avatar_', ''), 10);
    return isNaN(n) ? 0 : Math.abs(n) % AVATARS.length;
  })();

  const handleLogout = () => {
    logoutRequest();
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
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
        onStartTour={() => startHomePageTour(handleSection)}
      />

      {/* ── 右侧内容区 ── */}
      <main
        key={openCourse ? `course-${openCourse.id}` : section}
        className="flex-1 min-w-0 min-h-0 flex flex-col animate-fadeIn"
      >
        {openCourse ? (
          <CourseDetail course={openCourse} onBack={() => { setOpenCourse(null); setSection('featured'); }} />
        ) : (
          <>
            {section === 'courses' && <CourseCatalog />}
            {section === 'featured' && <CourseCatalog mode="featured" />}
            {section === 'resources' && <Resources />}
            {section === 'docs' && <DocsFrame />}
            {section === 'downloads' && <Downloads />}
            {section === 'html-sandbox' && <HtmlSandbox />}
            {section === 'compiler' && <CodePlayground />}
            {section === 'overview' && (
              <Overview
                onGoCourses={() => setSection('courses')}
                onGoFeatured={() => setSection('featured')}
                onGoSection={handleSection}
                onGoCompiler={() => setSection('compiler')}
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
