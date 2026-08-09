import { useState, useEffect } from 'react';
import { GraduationCap, ChevronLeft, Calendar, User } from 'lucide-react';
import type { ApiClass, ApiStudent } from './types';

interface Props {
  classes: ApiClass[];
  loading: boolean;
  error: string;
  attrKeys: string[];
  username?: string;
}

interface SessionRecord {
  date: string;
  teacher: string;
  class: string;
  status: string;
  content: string;
  remark: string;
  next_plan: string;
}

export default function StudentListPanel({ classes, loading, error, attrKeys, username }: Props) {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<ApiStudent | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  useEffect(() => {
    if (!selectedStudent) return;
    const name = selectedStudent.name || selectedStudent.username;
    if (!name) return;
    fetch(`/api/sessions/student/${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(data => {
        if (data.status === 'success') setSessions((data.sessions || []).slice(0, 10));
      })
      .catch(() => setSessions([]));
  }, [selectedStudent]);

  if (loading) {
    return <div className="bg-slate-900 border border-slate-600 rounded-2xl p-12 text-center text-slate-400">加载中…</div>;
  }

  if (error) {
    return <div className="bg-slate-900 border border-slate-600 rounded-2xl p-12 text-center text-rose-400">⚠ {error}</div>;
  }

  if (classes.length === 0) {
    return <div className="bg-slate-900 border border-slate-600 rounded-2xl p-12 text-center text-slate-500">暂无班级数据</div>;
  }

  const currentClass = classes.find(c => c.class_name === selectedClass);
  const studentSessions = selectedStudent ? sessions : [];

  return (
    <div className="flex gap-4 h-[70vh] animate-fadeIn">
      {/* 左侧：班级列表 */}
      <div className="w-56 shrink-0 bg-slate-900 border border-slate-600 rounded-2xl overflow-hidden flex flex-col">
        <div className="bg-slate-950 border-b border-slate-600 px-4 py-3">
          <span className="text-sm font-bold text-white">班级列表</span>
          <span className="text-xs text-slate-500 ml-2">{classes.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {classes.map(cls => (
            <button
              key={cls.class_name}
              onClick={() => { setSelectedClass(cls.class_name); setSelectedStudent(null); }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-2 ${
                selectedClass === cls.class_name
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-300 hover:bg-slate-800 border border-transparent'
              }`}
            >
              <GraduationCap size={14} className="shrink-0" />
              <span className="truncate flex-1">{cls.class_name}</span>
              <span className="text-xs text-slate-500">{cls.students.length}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 右侧：内容区 */}
      <div className="flex-1 bg-slate-900 border border-slate-600 rounded-2xl overflow-hidden flex flex-col">
        {!selectedClass ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            请从左侧选择一个班级
          </div>

        ) : selectedStudent ? (
          /* ── 学生详情 ── */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-slate-950 border-b border-slate-600 px-5 py-3 flex items-center gap-3 shrink-0">
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <User size={16} className="text-cyan-400" />
              <span className="font-bold text-white">{selectedStudent.name || selectedStudent.username}</span>
            </div>

            <div className="px-5 py-4 border-b border-slate-700/50">
              <div className="grid grid-cols-2 gap-3">
                {attrKeys.map(k => (
                  <div key={k} className="text-sm">
                    <span className="text-slate-500 text-xs">{k}</span>
                    <p className="text-white mt-0.5">{String(selectedStudent.descriptors?.[k] ?? '—')}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-3 flex-1 overflow-y-auto">
              <div className="flex items-center gap-2 mb-3 text-sm">
                <Calendar size={14} className="text-geek-green" />
                <span className="text-slate-400 font-bold">最近课堂记录</span>
              </div>
              {studentSessions.length === 0 ? (
                <p className="text-slate-600 text-sm">暂无课堂记录</p>
              ) : (
                <div className="space-y-2">
                  {studentSessions.map(s => {
                    const isOwn = s.teacher === username;
                    return (
                      <div key={s.date + s.teacher + s.class} className="bg-slate-800/50 rounded-lg p-3 text-sm border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-cyan-400 font-mono">{s.date}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            s.status === 'present' ? 'bg-green-500/20 text-green-400'
                            : s.status === 'off' || s.status === 'leave' ? 'bg-slate-500/20 text-slate-400'
                            : 'bg-red-500/20 text-red-400'
                          }`}>
                            {s.status === 'present' ? '出勤' : (s.status === 'off' || s.status === 'leave') ? '非上课日' : '缺勤'}
                          </span>
                          <span className="text-xs text-slate-500 ml-auto">
                            {s.class}{isOwn ? '' : <span className="text-amber-400">（{s.teacher}）</span>}
                          </span>
                        </div>
                        {s.content && <p className="text-slate-400 text-xs leading-relaxed">{s.content}</p>}
                        {s.remark && <p className="text-slate-500 text-xs mt-1">备注：{s.remark}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        ) : (
          /* ── 班级总览 ── */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-slate-950 border-b border-slate-600 px-5 py-3 flex items-center gap-2 shrink-0">
              <GraduationCap size={16} className="text-geek-green" />
              <span className="font-bold text-white">{currentClass?.class_name}</span>
              <span className="text-xs text-slate-500 ml-2">{currentClass?.students.length} 名学生</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-900 z-10">
                  <tr className="text-slate-400 text-xs tracking-wider border-b border-slate-600">
                    <th className="p-4">姓名</th>
                    {attrKeys.map(k => <th key={k} className="p-4">{k}</th>)}
                    <th className="p-4 w-16">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {currentClass?.students.map(stu => (
                    <tr
                      key={stu.id}
                      onClick={() => setSelectedStudent(stu)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <td className="p-4 font-bold text-white flex items-center gap-2">
                        <User size={14} className="text-slate-500" />
                        {stu.name || stu.username}
                      </td>
                      {attrKeys.map(k => (
                        <td key={k} className="p-4 text-slate-300">
                          {String(stu.descriptors?.[k] ?? '—')}
                        </td>
                      ))}
                      <td className="p-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedStudent(stu); }}
                          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          详情
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

