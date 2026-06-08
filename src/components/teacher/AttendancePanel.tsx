import { useState, useEffect } from 'react';
import { Calendar, Users, Check, X, Plus, Trash2 } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  billing_rate: number;
  account?: string;
}

interface ClassData {
  name: string;
  schedule: string[];
  students: Student[];
}

interface AttendanceRecord {
  student_id: string;
  name: string;
  status: string;
}

interface AttendancePanelProps {
  username: string;
}

export default function AttendancePanel({ username }: AttendancePanelProps) {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<any[]>([]);
  const [showAddClass, setShowAddClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newSchedule] = useState(['周六 14:00']);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newBillingRate, setNewBillingRate] = useState(0);
  const [activeTab, setActiveTab] = useState<'attendance' | 'monthly'>('attendance');

  // 加载班级列表
  const loadClasses = async () => {
    const res = await fetch(`/api/classes?username=${username}`);
    const data = await res.json();
    if (data.status === 'success') setClasses(data.classes);
  };

  useEffect(() => { loadClasses(); }, []);

  // 选择班级时加载点名记录
  useEffect(() => {
    if (!selectedClass) return;
    loadAttendance();
    loadMonthlySummary();
  }, [selectedClass, selectedDate]);

  const loadAttendance = async () => {
    if (!selectedClass) return;
    const res = await fetch(`/api/attendance/${selectedClass.name}?username=${username}&date=${selectedDate}`);
    const data = await res.json();
    if (data.status === 'success') {
      if (data.records.length > 0) {
        setRecords(data.records);
      } else {
        // 没有记录则初始化（全部 present）
        setRecords(selectedClass.students.map(s => ({ student_id: s.id, name: s.name, status: 'present' })));
      }
    }
  };

  const loadMonthlySummary = async () => {
    if (!selectedClass) return;
    const month = selectedDate.substring(0, 7);
    const res = await fetch(`/api/attendance/${selectedClass.name}/monthly?username=${username}&month=${month}`);
    const data = await res.json();
    if (data.status === 'success') setMonthlySummary(data.summary);
  };

  // 创建班级
  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;
    await fetch(`/api/classes?username=${username}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClassName, schedule: newSchedule }),
    });
    setNewClassName('');
    setShowAddClass(false);
    loadClasses();
  };

  // 删除班级
  const handleDeleteClass = async (name: string) => {
    if (!confirm(`确定删除班级「${name}」及所有点名记录？`)) return;
    await fetch(`/api/classes/${name}?username=${username}`, { method: 'DELETE' });
    if (selectedClass?.name === name) setSelectedClass(null);
    loadClasses();
  };

  // 添加学生
  const handleAddStudent = async () => {
    if (!selectedClass || !newStudentName.trim()) return;
    await fetch(`/api/classes/${selectedClass.name}/students?username=${username}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newStudentName, billing_rate: newBillingRate }),
    });
    setNewStudentName('');
    setNewBillingRate(0);
    setShowAddStudent(false);
    // 重新加载班级列表，然后刷新选中的班级
    await loadClasses();
    const res = await fetch(`/api/classes?username=${username}`);
    const data = await res.json();
    if (data.status === 'success') {
      const updated = data.classes.find((c: ClassData) => c.name === selectedClass.name);
      if (updated) setSelectedClass(updated);
    }
  };

  // 删除学生
  const handleDeleteStudent = async (studentId: string) => {
    if (!selectedClass) return;
    await fetch(`/api/classes/${selectedClass.name}/students/${studentId}?username=${username}`, { method: 'DELETE' });
    loadClasses();
  };

  // 保存点名
  const handleSaveAttendance = async () => {
    if (!selectedClass) return;
    await fetch(`/api/attendance/${selectedClass.name}?username=${username}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: selectedDate, records }),
    });
    loadMonthlySummary();
  };

  // 切换状态
  const toggleStatus = (studentId: string) => {
    setRecords(prev => prev.map(r =>
      r.student_id === studentId
        ? { ...r, status: r.status === 'present' ? 'absent' : 'present' }
        : r
    ));
  };



  return (
    <div className="flex h-full animate-fadeIn">
      {/* 左侧：班级列表 */}
      <div className="w-72 bg-slate-900/80 border-r border-slate-800 flex flex-col flex-shrink-0">
        <div className="h-12 border-b border-slate-800 flex items-center justify-between px-3">
          <span className="text-sm text-slate-300 font-mono tracking-wider flex items-center gap-1.5">
            <Users size={16} className="text-cyan-400" /> 班级
          </span>
          <button onClick={() => { setShowAddClass(true); setNewClassName(''); }}
            className="text-slate-400 hover:text-cyan-400 p-1 rounded hover:bg-slate-800" title="新建班级">
            <Plus size={16} />
          </button>
        </div>

        {showAddClass && (
          <div className="px-3 py-2 border-b border-slate-800 space-y-1">
            <input autoFocus value={newClassName} onChange={e => setNewClassName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateClass(); if (e.key === 'Escape') setShowAddClass(false); }}
              placeholder="班级名称，如 三年级1班"
              className="w-full bg-slate-800 text-sm text-slate-200 px-2 py-1.5 rounded outline-none border border-slate-700" style={{ borderColor: 'var(--accent)' }} />
            <div className="flex gap-1">
              <button onClick={handleCreateClass}
                className="flex-1 text-xs text-black px-2 py-1 rounded font-bold" style={{ backgroundColor: 'var(--accent)' }}>确定</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-1">
          {classes.length === 0 ? (
            <div className="p-4 text-sm text-slate-300 text-center">
              还没有班级<br />
              <button onClick={() => { setShowAddClass(true); setNewClassName(''); }}
                className="text-cyan-400 hover:underline mt-1">创建第一个</button>
            </div>
          ) : classes.map(c => (
            <div key={c.name}
              onClick={() => setSelectedClass(c)}
              className={`group flex items-center justify-between px-3 py-2 cursor-pointer ${
                selectedClass?.name === c.name
                  ? 'bg-cyan-400/10 border-l-2 border-cyan-400 text-white'
                  : 'border-l-2 border-transparent text-slate-400 hover:bg-slate-800/60'
              }`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm truncate">{c.name}</span>
                <span className="text-xs text-slate-400">{c.students.length}人</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteClass(c.name); }}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 p-0.5">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧：点名/月度统计 */}
      <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
        {selectedClass ? (
          <>
            {/* 标题栏 */}
            <div className="h-12 border-b border-slate-800 flex items-center justify-between px-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-300 font-mono">{selectedClass.name}</span>
                <span className="text-xs text-slate-500">{selectedClass.students.length}名学生</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setActiveTab('attendance')}
                  className={`text-xs px-3 py-1 rounded ${activeTab === 'attendance' ? 'bg-cyan-400/20 text-cyan-400' : 'text-slate-400 hover:text-white'}`}>
                  点名
                </button>
                <button onClick={() => setActiveTab('monthly')}
                  className={`text-xs px-3 py-1 rounded ${activeTab === 'monthly' ? 'bg-amber-400/20 text-amber-400' : 'text-slate-400 hover:text-white'}`}>
                  月度统计
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {activeTab === 'attendance' ? (
                <div className="space-y-6">
                  {/* 日期选择 + 添加学生 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 outline-none" />
                      <span className="text-xs text-slate-500">{selectedClass.schedule.join(' / ')}</span>
                    </div>
                    <button onClick={() => { setShowAddStudent(true); setNewStudentName(''); setNewBillingRate(0); }}
                      className="text-xs text-cyan-400 hover:text-white flex items-center gap-1">
                      <Plus size={14} /> 添加学生
                    </button>
                  </div>

                  {showAddStudent && (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                      <input autoFocus value={newStudentName} onChange={e => setNewStudentName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddStudent(); if (e.key === 'Escape') setShowAddStudent(false); }}
                        placeholder="学生姓名"
                        className="flex-1 bg-slate-800 text-sm text-slate-200 px-3 py-2 rounded outline-none border border-slate-700" />
                      <input type="number" value={newBillingRate} onChange={e => setNewBillingRate(Number(e.target.value))}
                        placeholder="课时费"
                        className="w-24 bg-slate-800 text-sm text-slate-200 px-3 py-2 rounded outline-none border border-slate-700" />
                      <button onClick={handleAddStudent}
                        className="text-sm text-black px-4 py-2 rounded font-bold" style={{ backgroundColor: 'var(--accent)' }}>确定</button>
                    </div>
                  )}

                  {/* 学生列表 */}
                  {selectedClass.students.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <Users size={48} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm">还没有学生，点击上方添加</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {records.map(r => (
                        <div key={r.student_id}
                          className="flex items-center justify-between bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3">
                          <div className="flex items-center gap-3">
                            <button onClick={() => toggleStatus(r.student_id)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                r.status === 'present'
                                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                  : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                              }`}>
                              {r.status === 'present' ? <Check size={16} /> : <X size={16} />}
                            </button>
                            <span className="text-sm text-white font-medium">{r.name}</span>
                            <span className={`text-xs ${r.status === 'present' ? 'text-green-400' : 'text-rose-400'}`}>
                              {r.status === 'present' ? '出勤' : '请假'}
                            </span>
                          </div>
                          <button onClick={() => handleDeleteStudent(r.student_id)}
                            className="text-slate-400 hover:text-rose-400">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedClass.students.length > 0 && (
                    <div className="flex justify-end">
                      <button onClick={handleSaveAttendance}
                        className="text-sm text-black px-6 py-2 rounded-lg font-bold" style={{ backgroundColor: 'var(--accent)' }}>
                        保存点名
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* 月度统计 */
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">统计月份：</span>
                    <span className="text-sm text-white font-mono">{selectedDate.substring(0, 7)}</span>
                  </div>

                  {monthlySummary.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <Calendar size={48} className="mx-auto mb-3 opacity-30" />
                      <p className="text-sm">本月还没有点名记录</p>
                    </div>
                  ) : (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-950 text-slate-400 text-xs tracking-wider border-b border-slate-800">
                            <th className="p-4">学生</th>
                            <th className="p-4 text-center">出勤</th>
                            <th className="p-4 text-center">请假</th>
                            <th className="p-4 text-right">课时费</th>
                            <th className="p-4 text-right">本月费用</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-sm">
                          {monthlySummary.map((s, i) => (
                            <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                              <td className="p-4 font-medium text-white">{s.name}</td>
                              <td className="p-4 text-center text-green-400">{s.present}次</td>
                              <td className="p-4 text-center text-rose-400">{s.absent}次</td>
                              <td className="p-4 text-right text-slate-300">¥{s.billing_rate}/时</td>
                              <td className="p-4 text-right text-amber-400 font-bold">¥{s.total_fee}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <Users size={64} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg mb-2">选择左侧班级开始点名</p>
              <p className="text-sm text-slate-400">或者创建一个新班级</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
