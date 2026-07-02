import { useCallback } from 'react';
import { useAuth } from './lib/useAuth';
import HomePage from './components/HomePage';
import CourseSquare from './components/CourseSquare';
import TeacherDashboardWithSidebar from './components/teacher/TeacherDashboardWithSidebar';
import AdminDashboardWithSidebar from './components/admin/AdminDashboardWithSidebar';
import StudentDashboard from './components/student/StudentDashboard';

export default function App() {
  const { user, username, role, isLoggedIn, login, logout } = useAuth();

  const getViewParam = useCallback(() => {
    return new URLSearchParams(window.location.search).get('view');
  }, []);

  const view = getViewParam();

  // 课程广场（不需登录）
  if (view === 'courses') {
    return (
      <CourseSquare
        onBack={() => {
          const url = new URL(window.location.href);
          url.searchParams.delete('view');
          window.location.href = url.toString();
        }}
      />
    );
  }

  // 看板（需登录）
  if (view === 'dashboard' && isLoggedIn) {
    if (role === 'student') {
      return (
        <div className="h-screen flex flex-col overflow-hidden bg-cyber-bg">
          <StudentDashboard portalUser={user} />
        </div>
      );
    }
    if (role === 'admin') {
      return (
        <AdminDashboardWithSidebar
          username={username} role={role}
          logout={logout}
        />
      );
    }
    return (
      <TeacherDashboardWithSidebar
        username={username} role={role}
        logout={logout}
      />
    );
  }

  // 默认：主页
  return <HomePage onLogin={login} />;
}