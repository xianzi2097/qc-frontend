import { useEffect } from 'react';
import { Users, Award, Terminal, GraduationCap, Calendar, Mail } from 'lucide-react';
import { useAuth } from '../../lib/useAuth';
import { useTeacherData } from '../../lib/useTeacherData';
import ErrorBoundary from '../ui/ErrorBoundary';
import AttendancePanel from './AttendancePanel';
import SendMessagePanel from './SendMessagePanel';
import ClassManager from './ClassManager';
import CourseManager from './CourseManager';
import ResourcesManager from './ResourcesManager';

interface TeacherDashboardProps {
  activeTab: string;
}

export default function TeacherDashboard({ activeTab }: TeacherDashboardProps) {
  const { username } = useAuth();
  const { classes, loading, error, refresh } = useTeacherData();

  // ── 切 tab 自动刷新数据 ──
  useEffect(() => { refresh(); }, [activeTab, refresh]);

  const allStudents = classes.flatMap(c => c.students);
  const attrKeys = [...new Set(allStudents.flatMap(s => Object.keys(s.descriptors || {})))];

  // ── 课堂记录 ──
  if (activeTab === 'attendance') {
    return (
      <div className="h-full flex flex-col space-y-3 animate-fadeIn">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Calendar className="text-geek-green" size={20} /> 课堂记录
          </h2>
          <span className="text-xs bg-white border border-slate-300 px-3 py-1 rounded-full text-slate-600 font-mono">
            班级 {classes.length} 个
          </span>
        </div>
        <ErrorBoundary label="课堂记录">
          <AttendancePanel username={username} />
        </ErrorBoundary>
      </div>
    );
  }

  // ── 文件管理：独立页面 ──
  if (activeTab === 'courses') {
    return (
      <div className="h-full flex flex-col space-y-3 animate-fadeIn">
        <ErrorBoundary label="文件管理">
          <CourseManager />
        </ErrorBoundary>
      </div>
    );
  }

  // ── 资料管理：固定 reference 类别 ──
  if (activeTab === 'references') {
    return (
      <div className="h-full flex flex-col space-y-3 animate-fadeIn">
        <ErrorBoundary label="资料管理">
          <ResourcesManager category="reference" label="资料" />
        </ErrorBoundary>
      </div>
    );
  }

  // ── 软件管理：同一组件，download 类别 ──
  if (activeTab === 'software') {
    return (
      <div className="h-full flex flex-col space-y-3 animate-fadeIn">
        <ErrorBoundary label="软件管理">
          <ResourcesManager category="download" label="软件" />
        </ErrorBoundary>
      </div>
    );
  }

  // ── 仪表盘：独立页面 ──
  if (activeTab === 'dashboard') {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Terminal className="text-geek-green" size={20} /> 数据看板
          </h2>
          <span className="text-xs bg-white border border-slate-300 px-3 py-1 rounded-full text-slate-600 font-mono">
            后端：{error ? '离线' : '在线'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-300 hover:border-geek-green/30 p-6 rounded-2xl flex flex-col items-center justify-center min-h-[200px] transition-all duration-300 group hover:translate-y-[-4px]">
            <span className="text-xs text-slate-500 tracking-wider mb-4">学生总数</span>
            <div className="text-geek-green group-hover:scale-110 transition-transform duration-300 mb-4">
              <Users size={44} />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {loading ? '...' : allStudents.length}<span className="text-xs text-slate-500 font-normal"> 人</span>
            </div>
          </div>

          <div className="bg-white border border-slate-300 hover:border-brand-orange/30 p-6 rounded-2xl flex flex-col items-center justify-center min-h-[200px] transition-all duration-300 group hover:translate-y-[-4px]">
            <span className="text-xs text-slate-500 tracking-wider mb-4">班级数量</span>
            <div className="text-brand-orange group-hover:scale-110 transition-transform duration-300 mb-4">
              <GraduationCap size={44} />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {loading ? '...' : classes.length}<span className="text-xs text-slate-500 font-normal"> 个班</span>
            </div>
          </div>

          <div className="bg-white border border-slate-300 hover:border-amber-500/30 p-6 rounded-2xl flex flex-col items-center justify-center min-h-[200px] transition-all duration-300 group hover:translate-y-[-4px]">
            <span className="text-xs text-slate-500 tracking-wider mb-4">属性维度</span>
            <div className="text-amber-400 group-hover:scale-110 transition-transform duration-300 mb-4">
              <Award size={44} />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {loading ? '...' : attrKeys.length}<span className="text-xs text-slate-500 font-normal"> 项</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 消息 ──
  if (activeTab === 'messages') {
    return (
      <div className="space-y-3 animate-fadeIn">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Mail className="text-brand-orange" size={20} /> 消息中心
          </h2>
        </div>
        <ErrorBoundary label="消息">
          <SendMessagePanel />
        </ErrorBoundary>
      </div>
    );
  }

  // ── 班级管理（2026-10-11 重设计：原「学生管理」更名重做，见 ClassManager）──
  if (activeTab === 'students') {
    return (
      <div className="space-y-3 animate-fadeIn">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="text-cyan-400" size={20} /> 班级管理
          </h2>
          <span className="text-xs bg-white border border-slate-300 px-3 py-1 rounded-full text-slate-600 font-mono">
            班级 {classes.length} 个 · 学生 {allStudents.length} 人
          </span>
        </div>
        <ErrorBoundary label="班级管理">
          <ClassManager />
        </ErrorBoundary>
      </div>
    );
  }

  // fallback
  return null;
}
