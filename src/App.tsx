import { useState, useMemo } from 'react';
import {
  LayoutDashboard, Users, Cpu,
  GraduationCap, ToggleLeft, LogOut,
} from 'lucide-react';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import StudentDashboard from './components/student/StudentDashboard';

interface PortalUser {
  username: string;
  role: 'teacher' | 'student' | 'admin';
  nickname: string;
  avatar_path: string;
}

/** 从 localStorage 读取门户登录的用户信息 */
function readPortalUser(): PortalUser | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (user && user.username && user.role) return user;
    return null;
  } catch {
    return null;
  }
}

export default function App() {
  // 优先从门户登录态读取，没有则给调试默认值
  const portalUser = useMemo(() => readPortalUser(), []);
  const [userRole, setUserRole] = useState<'teacher' | 'student'>(
    !portalUser ? 'student' : (portalUser.role === 'student' ? 'student' : 'teacher'),
  );
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const isDevMode = !portalUser; // 没有门户登录态 = 本地开发调试

  const displayName = portalUser?.nickname || portalUser?.username || (userRole === 'teacher' ? 'Arin 老师' : '超级小极客');

  return (
    <div className="flex h-screen bg-cyber-bg text-slate-100 font-sans selection:bg-geek-green selection:text-black">

      {/* ── 侧边栏导航（仅老师/管理员显示，学生用底部 Dock）── */}
      {userRole !== 'student' && (
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
                {userRole === 'teacher' ? '数字化教师后台' : '学生个人中心'}
              </span>
            </div>
          </div>

          {/* 调试开关 — 仅本地开发时显示 */}
          {isDevMode && (
            <div className="mb-4 px-2">
              <button
                onClick={() => {
                  setUserRole(prev => prev === 'teacher' ? 'student' : 'teacher');
                  setActiveTab('dashboard');
                }}
                className="w-full flex items-center justify-between text-xs bg-slate-950 p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <span>🛠️ 调试：切换到 {userRole === 'teacher' ? '学生' : '老师'}</span>
                <ToggleLeft size={16} className={userRole === 'teacher' ? 'text-brand-orange' : 'text-geek-green'} />
              </button>
            </div>
          )}

          {/* 导航菜单 — 根据角色显示不同菜单 */}
          {userRole === 'teacher' ? (
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
            </nav>
          ) : (
            <nav className="space-y-1 animate-fadeIn">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-orange text-black font-bold shadow-[0_0_20px_rgba(249,115,22,0.2)]">
                <GraduationCap size={18} /> 我的成长画卷
              </button>
            </nav>
          )}
        </div>

        {/* 底部登录状态 */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-orange">{displayName}</p>
            <p className="text-xs text-slate-600 font-mono">
              {portalUser ? `role: ${portalUser.role}` : `dev: '${userRole}_mode'`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* 返回门户首页 */}
            <a
              href="/"
              title="返回首页"
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <LogOut size={14} />
            </a>
            <span className={`w-2 h-2 rounded-full animate-ping ${userRole === 'teacher' ? 'bg-geek-green' : 'bg-brand-orange'}`} />
          </div>
        </div>
      </div>
      )}

      {/* ── 主体内容 — 根据角色渲染对应 Dashboard ── */}
      <main className={`flex-1 overflow-hidden ${userRole === 'student' ? '' : 'overflow-y-auto p-8'}`}>
        {userRole === 'teacher' ? (
          <TeacherDashboard activeTab={activeTab} />
        ) : (
          <StudentDashboard portalUser={portalUser} />
        )}
      </main>
    </div>
  );
}