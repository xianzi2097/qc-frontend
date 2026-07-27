import { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/useAuth';
import { LoadingProvider, useLoading } from './lib/useLoading';
import LoadingOverlay from './components/ui/LoadingOverlay';
import StarHomePage from './components/star-home/StarHomePage';
import HomePage from './components/HomePage';
import TeacherDashboardWithSidebar from './components/teacher/TeacherDashboardWithSidebar';
import AdminDashboardWithSidebar from './components/admin/AdminDashboardWithSidebar';
import StudentDashboard from './components/student/StudentDashboard';

/** 看板页面 — 需登录，按角色分流 */
function DashboardPage() {
  const { user, username, role, isLoggedIn, logout, validating } = useAuth();
  const { show: showLoading, hide: hideLoading } = useLoading();

  useEffect(() => {
    if (validating) showLoading('验证登录状态...');
    else hideLoading();
  }, [validating]);

  if (validating) return null;

  if (!isLoggedIn) return <Navigate to="/" replace />;

  if (role === 'student') {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-cyber-bg">
        <StudentDashboard portalUser={user} />
      </div>
    );
  }
  if (role === 'admin') {
    return <AdminDashboardWithSidebar username={username} role={role} logout={logout} />;
  }
  return <TeacherDashboardWithSidebar username={username} role={role} logout={logout} />;
}

/** 主页切换：默认卡片模式 */
function HomePageSwitch() {
  const [mode, setMode] = useState(() => localStorage.getItem('homeMode') || 'cards');
  const { login } = useAuth();

  const toggleMode = useCallback(() => {
    setMode(prev => {
      const next = prev === 'cards' ? 'stars' : 'cards';
      localStorage.setItem('homeMode', next);
      return next;
    });
  }, []);

  if (mode === 'stars') {
    return <StarHomePage onSwitchHome={toggleMode} />;
  }
  return <HomePage onLogin={login} onSwitchHome={toggleMode} />;
}

export default function App() {
  return (
    <LoadingProvider>
      <BrowserRouter>
        <LoadingOverlay />
        <Routes>
          <Route path="/" element={<HomePageSwitch />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </BrowserRouter>
    </LoadingProvider>
  );
}