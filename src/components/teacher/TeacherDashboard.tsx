import { useEffect } from 'react';
import { Users, Award, Terminal, GraduationCap } from 'lucide-react';
import { useAuth } from '../../lib/useAuth';
import { useTeacherData } from '../../lib/useTeacherData';
import ErrorBoundary from '../ui/ErrorBoundary';
import AttendancePanel from './AttendancePanel';
import SendMessagePanel from './SendMessagePanel';
import StudentListPanel from './StudentListPanel';
import CourseManager from './CourseManager';

interface TeacherDashboardProps {
  activeTab: string;
}

export default function TeacherDashboard({ activeTab }: TeacherDashboardProps) {
  const { username } = useAuth();
  const { classes, loading, error, refresh } = useTeacherData(username);

  // ── 切 tab 自动刷新数据 ──
  useEffect(() => { refresh(); }, [activeTab, refresh]);

  const allStudents = classes.flatMap(c => c.students);
  const attrKeys = [...new Set(allStudents.flatMap(s => Object.keys(s.descriptors || {})))];

  // ── 点名考勤：独立全屏页面 ──
  if (activeTab === 'attendance') {
    return (
      <div className="h-full flex flex-col">
        <ErrorBoundary label="点名考勤">
          <AttendancePanel username={username} />
        </ErrorBoundary>
      </div>
    );
  }

  // ── 课件管理：独立页面 ──
  if (activeTab === 'courses') {
    return (
      <div className="h-full flex flex-col">
        <ErrorBoundary label="课件管理">
          <CourseManager />
        </ErrorBoundary>
      </div>
    );
  }

  // ── 仪表盘：独立页面 ──
  if (activeTab === 'dashboard') {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Terminal className="text-geek-green" size={20} /> 极客数据看板
          </h2>
          <span className="text-xs bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-slate-400 font-mono">
            后端：{error ? '离线' : '在线'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 hover:border-geek-green/30 p-6 rounded-2xl flex flex-col items-center justify-center min-h-[200px] transition-all duration-300 group hover:translate-y-[-4px]">
            <span className="text-xs text-slate-500 tracking-wider mb-4">学生总数</span>
            <div className="text-geek-green group-hover:scale-110 transition-transform duration-300 mb-4">
              <Users size={44} />
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {loading ? '...' : allStudents.length}<span className="text-xs text-slate-500 font-normal"> 人</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 hover:border-brand-orange/30 p-6 rounded-2xl flex flex-col items-center justify-center min-h-[200px] transition-all duration-300 group hover:translate-y-[-4px]">
            <span className="text-xs text-slate-500 tracking-wider mb-4">班级数量</span>
            <div className="text-brand-orange group-hover:scale-110 transition-transform duration-300 mb-4">
              <GraduationCap size={44} />
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {loading ? '...' : classes.length}<span className="text-xs text-slate-500 font-normal"> 个班</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 hover:border-amber-500/30 p-6 rounded-2xl flex flex-col items-center justify-center min-h-[200px] transition-all duration-300 group hover:translate-y-[-4px]">
            <span className="text-xs text-slate-500 tracking-wider mb-4">属性维度</span>
            <div className="text-amber-400 group-hover:scale-110 transition-transform duration-300 mb-4">
              <Award size={44} />
            </div>
            <div className="text-2xl font-black text-white font-mono">
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
      <ErrorBoundary label="消息">
        <SendMessagePanel username={username} classes={classes} />
      </ErrorBoundary>
    );
  }

  // ── 学生管理 ──
  if (activeTab === 'students') {
    return (
      <ErrorBoundary label="学生管理">
        <StudentListPanel classes={classes} loading={loading} error={error} attrKeys={attrKeys} />
      </ErrorBoundary>
    );
  }

  // fallback
  return null;
}
