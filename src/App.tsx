import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/useAuth';
import StarHomePage from './components/star-home/StarHomePage';
import CourseSquare from './components/CourseSquare';
import TeacherDashboardWithSidebar from './components/teacher/TeacherDashboardWithSidebar';
import AdminDashboardWithSidebar from './components/admin/AdminDashboardWithSidebar';
import StudentDashboard from './components/student/StudentDashboard';

/** 看板页面 — 需登录，按角色分流 */
function DashboardPage() {
  const { user, username, role, isLoggedIn, logout } = useAuth();

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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StarHomePage />} />
        <Route path="/courses" element={<CourseSquare />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}