import { useState } from 'react';
import {
  LayoutDashboard, Users, Cpu, LogOut, Mail, Calendar,
} from 'lucide-react';
import { useAuth } from './lib/useAuth';
import HomePage from './components/HomePage';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import StudentDashboard from './components/student/StudentDashboard';

export default function App() {
  const { user, username, role, nickname, isLoggedIn, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // ── 未登录 → 登录页 ──
  if (!isLoggedIn) {
    return <HomePage onLogin={login} />;
  }

  // ── 学生 → 学生看板（全屏） ──
  if (role === 'student') {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-cyber-bg">
        <StudentDashboard portalUser={user} />
      </div>
    );
  }

  // ── 老师 → 老师看板 ──
  const displayName = nickname || username;

  return (
    <div className="flex h-screen bg-cyber-bg text-slate-100 font-sans selection:bg-geek-green selection:text-black">

      {/* 侧边栏导航 */}
      <div className="w-64 bg-slate-900 border-r border-geek-green/10 flex flex-col justify-between p-4">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 py-4 mb-6 border-b border-slate-800">
            <div className="bg-brand-orange p-2 rounded-xl text-black font-black text-xl shadow-[0_0_15px_rgba(249,115,22,0.4)]">
              🍊
            </div>
            <div>
              <h1 className="font-bold text-base tracking-wider text-white">青橙 Studio</h1>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Cpu size={12} className="text-geek-green" />
                数字化教师后台
              </span>
            </div>
          </div>

          {/* 导航菜单 */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-geek-green text-black font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard size={18} /> 极客数据看板
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'students'
                  ? 'bg-geek-green text-black font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Users size={18} /> 班级学生管理
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'messages'
                  ? 'bg-brand-orange text-black font-bold shadow-[0_0_20px_rgba(249,115,22,0.3)]'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Mail size={18} /> 发送消息
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'attendance'
                  ? 'bg-cyan-500 text-black font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Calendar size={18} /> 点名考勤
            </button>
          </nav>
        </div>

        {/* 底部用户信息 + 登出 */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-orange">{displayName}</p>
            <p className="text-xs text-slate-600 font-mono">{role}</p>
          </div>
          <button
            onClick={logout}
            className="text-slate-500 hover:text-rose-400 transition-colors"
            title="退出登录"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* 主体内容 */}
      <main className="flex-1 overflow-y-auto p-8">
        <TeacherDashboard activeTab={activeTab} />
      </main>
    </div>
  );
}