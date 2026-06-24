import { useState } from 'react';
import {
  LayoutDashboard, Users, Cpu, LogOut, Mail, Calendar, BookOpen, Home,
} from 'lucide-react';
import { AVATARS } from '../ui/AvatarPicker';
import TeacherDashboard from './TeacherDashboard';

interface Props {
  username: string;
  role: string;
  nickname: string;
  logout: () => void;
}

function getAvatarCfg() {
  try {
    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;
    const idx = parseInt((user?.avatar_path || '').replace('avatar_', ''), 10);
    return AVATARS[isNaN(idx) ? 0 : idx % AVATARS.length];
  } catch { return AVATARS[0]; }
}

export default function TeacherDashboardWithSidebar({ username, role, nickname, logout }: Props) {
  const [activeTab, setActiveTab] = useState('dashboard');
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
                  ? 'bg-geek-green text-black font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Mail size={18} /> 发送消息
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'attendance'
                  ? 'bg-geek-green text-black font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Calendar size={18} /> 课堂记录
            </button>
            <button
              onClick={() => setActiveTab('courses')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'courses'
                  ? 'bg-geek-green text-black font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <BookOpen size={18} /> 课件管理
            </button>
            <div className="border-t border-slate-800 pt-3 mt-3">
              <a
                href="/"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              >
                <Home size={16} /> 返回主页
              </a>
            </div>
          </nav>
        </div>

        {/* 底部用户信息 + 登出 */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarCfg().bg} flex items-center justify-center text-sm shrink-0`}>
            {getAvatarCfg().icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-brand-orange truncate">{displayName}</p>
            <p className="text-xs text-slate-600 font-mono">{role}</p>
          </div>
          <button
            onClick={logout}
            className="text-slate-500 hover:text-rose-400 transition-colors shrink-0"
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
