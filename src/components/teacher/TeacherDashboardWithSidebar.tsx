import { useState } from 'react';
import {
  Terminal, Users, Cpu, LogOut, Mail, Calendar, BookOpen, Home, FolderOpen,
} from 'lucide-react';
import { getAvatarCfg } from '../ui/AvatarPicker';
import TeacherDashboard from './TeacherDashboard';

interface Props {
  username: string;
  role: string;
  logout: () => void;
}

export default function TeacherDashboardWithSidebar({ username, role, logout }: Props) {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="flex h-screen bg-cyber-bg text-slate-100 font-sans selection:bg-geek-green selection:text-black">
      {/* 侧边栏导航 */}
      <div className="w-64 bg-slate-900 border-r border-geek-green/10 flex flex-col justify-between p-4">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 py-4 mb-6 border-b border-slate-600">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-orange via-purple-500 to-cyan-400 flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.3)]">
              <span className="text-3xl">🍊</span>
            </div>
            <div>
              <h1 className="font-bold text-base tracking-wider text-white">CodeNova</h1>
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
              <Terminal size={18} /> 数据看板
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'students'
                  ? 'bg-geek-green text-black font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Users size={18} /> 学生管理
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
            <button
              onClick={() => setActiveTab('resources')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'resources'
                  ? 'bg-geek-green text-black font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <FolderOpen size={18} /> 资源管理
            </button>
            <div className="border-t border-slate-600 pt-3 mt-3">
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
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-600 flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarCfg().bg} flex items-center justify-center text-sm shrink-0`}>
            {getAvatarCfg().icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-brand-orange truncate">{username}</p>
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
      <main className="w-[95%] overflow-y-auto p-8">
        <TeacherDashboard activeTab={activeTab} />
      </main>
    </div>
  );
}
