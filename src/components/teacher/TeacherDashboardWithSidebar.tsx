import { useState } from 'react';
import {
  Terminal, Users, Cpu, LogOut, Mail, Calendar, BookOpen, Home, KeyRound, UserPlus,
} from 'lucide-react';
import { getAvatarCfg } from '../ui/AvatarPicker';
import ChangePasswordDialog from '../ui/ChangePassword';
import NewAccountCard from '../ui/NewAccountCard';
import TeacherDashboard from './TeacherDashboard';

interface Props {
  username: string;
  role: string;
  logout: () => void;
}

export default function TeacherDashboardWithSidebar({ username, role, logout }: Props) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showPwd, setShowPwd] = useState(false);
  const [showNewStudent, setShowNewStudent] = useState(false);   // 侧栏「新建学生」直达卡片（2026-10-12）

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900 font-sans selection:bg-geek-green selection:text-black">
      {/* 侧边栏导航 */}
      <div className="w-64 bg-white border-r border-slate-300 flex flex-col justify-between p-4">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 py-4 mb-6 border-b border-slate-300">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-orange via-purple-500 to-cyan-400 flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.3)]">
              <span className="text-3xl">🍊</span>
            </div>
            <div>
              <h1 className="font-bold text-base tracking-wider text-slate-900">CodeNova</h1>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Cpu size={12} className="text-emerald-600" />
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
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Terminal size={18} /> 数据看板
            </button>
            <button
              onClick={() => setShowNewStudent(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <UserPlus size={18} /> 新建学生
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'students'
                  ? 'bg-geek-green text-black font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Users size={18} /> 班级管理
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'messages'
                  ? 'bg-geek-green text-black font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Mail size={18} /> 发送消息
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'attendance'
                  ? 'bg-geek-green text-black font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Calendar size={18} /> 课堂记录
            </button>
            <button
              onClick={() => setActiveTab('assets')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'assets'
                  ? 'bg-geek-green text-black font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <BookOpen size={18} /> 资源管理
            </button>
            <div className="border-t border-slate-300 pt-3 mt-3">
              <a
                href="/"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <Home size={16} /> 返回主页
              </a>
            </div>
          </nav>
        </div>

        {/* 底部用户信息 + 登出 */}
        <div className="bg-white p-3 rounded-xl border border-slate-300 flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarCfg().bg} flex items-center justify-center text-sm shrink-0`}>
            {getAvatarCfg().icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-700 truncate">{username}</p>
            <p className="text-xs text-slate-500 font-mono">{role}</p>
          </div>
          <button
            onClick={() => setShowPwd(true)}
            className="text-slate-500 hover:text-cyan-600 transition-colors shrink-0"
            title="修改密码"
          >
            <KeyRound size={16} />
          </button>
          <button
            onClick={logout}
            className="text-slate-500 hover:text-rose-600 transition-colors shrink-0"
            title="退出登录"
          >
            <LogOut size={16} />
          </button>
        </div>

        <ChangePasswordDialog open={showPwd} onClose={() => setShowPwd(false)} />
      </div>

      {/* 主体内容 */}
      <main className="w-[95%] overflow-y-auto p-8">
        <TeacherDashboard activeTab={activeTab} />
      </main>

      {/* 侧栏「新建学生」直达卡片：成功后落回班级管理（新计数可见） */}
      {showNewStudent && (
        <NewAccountCard role="student"
          onClose={() => setShowNewStudent(false)}
          onCreated={() => setActiveTab('students')} />
      )}
    </div>
  );
}
