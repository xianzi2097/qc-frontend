import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/useAuth';
import StarHomePage from './components/star-home/StarHomePage';
import HomePage from './components/HomePage';
import CourseSquare from './components/CourseSquare';
import TeacherDashboardWithSidebar from './components/teacher/TeacherDashboardWithSidebar';
import AdminDashboardWithSidebar from './components/admin/AdminDashboardWithSidebar';
import StudentDashboard from './components/student/StudentDashboard';

import Loader from './components/ui/Loader';

/** 看板页面 — 需登录，按角色分流 */
function DashboardPage() {
  const { user, username, role, isLoggedIn, logout, validating } = useAuth();

  if (validating) {
    return (
      <div className="h-screen flex items-center justify-center bg-cyber-bg">
        <Loader text="验证登录状态..." />
      </div>
    );
  }

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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePageSwitch />} />
        <Route path="/courses" element={<CourseSquare />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}