import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Check, X, Users, Pencil, RotateCcw } from 'lucide-react';

// ── 类型 ──

interface Student {
  id: string;
  name: string;
  remark?: string;
}

interface ClassData {
  name: string;
  students: Student[];
}

interface SessionStudent {
  id: string;
  name: string;
  remark: string;
  status: string;
  content: string;
  next_plan: string;
}

interface SessionRecord {
  date: string;
  students: SessionStudent[];
}

// ── 工具 ──

function fmt(name: string, remark?: string): string {
  return remark ? `${name} (${remark})` : name;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getCurrentMonth(): string {
  return getToday().slice(0, 7);
}

function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const MONTH_NAMES: Record<string, string> = {
  '01': '一月', '02': '二月', '03': '三月', '04': '四月',
  '05': '五月', '06': '六月', '07': '七月', '08': '八月',
  '09': '九月', '10': '十月', '11': '十一月', '12': '十二月',
};

// ── 编辑弹窗 ──

function EditSessionModal({
  date, students, onSave, onClose, saving,
}: {
  date: string;
  students: SessionStudent[];
  onSave: (date: string, students: SessionStudent[]) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [editDate, setEditDate] = useState(date);
  const [editStudents, setEditStudents] = useState<SessionStudent[]>(students);
  const [tempStudentName, setTempStudentName] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [nextPlanContent, setNextPlanContent] = useState('');
  const [toast, setToast] = useState<{ msg: string; show: boolean }>({ msg: '', show: false });

  const showToast = (msg: string) => {
    setToast({ msg, show: true });
    setTimeout(() => setToast({ msg: '', show: false }), 3000);
  };

  const addTempStudent = () => {
    const name = tempStudentName.trim();
    if (!name) return;
    const tempId = 'temp_' + Date.now();
    setEditStudents(prev => [...prev, {
      id: tempId, name, remark: '临时',
      status: 'present', content: '', next_plan: '',
    }]);
    setTempStudentName('');
  };

  const removeTempStudent = (idx: number) => {
    setEditStudents(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleStatus = (idx: number) => {
    setEditStudents(prev => prev.map((s, i) =>
      i === idx ? {
        ...s,
        status: s.status === 'present' ? 'absent' : 'present',
        content: s.status === 'present' ? '' : s.content,
        next_plan: s.status === 'present' ? '' : s.next_plan,
      } : s
    ));
  };

  const updateField = (idx: number, field: 'content' | 'next_plan', val: string) => {
    setEditStudents(prev => prev.map((s, i) =>
      i === idx ? { ...s, [field]: val } : s
    ));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-[95vw] max-w-[1000px] min-w-0 max-h-[85vh] flex flex-col shadow-2xl relative"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-600">
          <span className="text-sm text-white font-bold">课堂记录</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-auto min-h-0 p-6 space-y-3">
          {/* 日期 + 本节课内容 + 下节课计划 */}
          <div className="flex items-center gap-2">
            <input type="date" value={editDate}
              onChange={e => setEditDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 outline-none [color-scheme:dark]" />
            <span className="text-xs text-slate-400 ml-2 shrink-0">本节课内容</span>
            <input type="text" value={lessonContent}
              onChange={e => setLessonContent(e.target.value)}
              placeholder="例如：循环结构"
              className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 outline-none placeholder-slate-500" />
            <span className="text-xs text-slate-400 ml-2 shrink-0">下节课计划</span>
            <input type="text" value={nextPlanContent}
              onChange={e => setNextPlanContent(e.target.value)}
              placeholder="例如：函数"
              className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 outline-none placeholder-slate-500" />
          </div>

          {/* 全部正常推进 + 保存 */}
          <div className="flex items-center gap-2">
            <div className="flex-1"></div>
            <button onClick={() => {
              setEditStudents(prev => prev.map(s => ({
                ...s, status: 'present', content: lessonContent || s.content, next_plan: nextPlanContent || s.next_plan,
              })));
            }}
              className="text-xs text-slate-300 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 hover:bg-slate-700 flex items-center gap-1">
              <Check size={14} /> 全部正常推进
            </button>
            <button onClick={() => {
                const presentNoContent = editStudents.filter(
                  s => s.status === 'present' && !s.content.trim()
                );
                let filled = lessonContent
                  ? editStudents.map(s => ({ ...s, content: s.content || lessonContent }))
                  : editStudents;
                if (presentNoContent.length > 0) {
                  const names = presentNoContent.map(s => fmt(s.name, s.remark)).join('、');
                  showToast(`${names} 无自定义内容，已保存默认值`);
                  setTimeout(() => onSave(editDate, filled), 1500);
                } else {
                  onSave(editDate, filled);
                }
              }} disabled={saving}
              className="text-xs text-slate-300 bg-slate-800 border border-slate-700 rounded-lg px-4 py-1.5 hover:bg-slate-700 disabled:opacity-50">
              {saving ? '保存中…' : '保存'}
            </button>
          </div>
          {/* 学生表头 */}
          <div className="grid grid-cols-[auto_auto_1fr_1fr] gap-2 text-xs text-slate-500 px-1">
            <span className="w-28 xl:w-40">学生</span>
            <span className="w-10">出勤</span>
            <span>本节课内容</span>
            <span>下节课计划</span>
          </div>

          {/* 每学生一行 */}
          {editStudents.map((s, idx) => (
            <div key={s.id}
              className="grid grid-cols-[auto_auto_1fr_1fr] gap-2 items-start rounded px-2 py-1">
              {/* 名字 + 独立正常推进 */}
              <div className="flex items-center gap-1 w-28 xl:w-40">
                <span className="text-sm text-white font-medium truncate">{fmt(s.name, s.remark)}</span>
                <button onClick={() => {
                  setEditStudents(prev => prev.map((x, i) =>
                    i === idx ? { ...x, status: 'present', content: '正常推进', next_plan: '正常推进' } : x
                  ));
                }}
                  className="text-[10px] text-green-400/60 hover:text-green-400 ml-0.5 shrink-0" title="正常推进">
                  推
                </button>
              </div>
              {/* 出勤切换 */}
              <div className="w-10 flex items-center">
                <button onClick={() => toggleStatus(idx)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    s.status === 'present'
                      ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                  }`}>
                  {s.status === 'present' ? <Check size={14} /> : <X size={14} />}
                </button>
              </div>
              {/* 本节课内容 */}
              <textarea rows={1} value={s.content}
                onChange={e => updateField(idx, 'content', e.target.value)}
                onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }}
                placeholder="学了什么…"
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 outline-none resize-none placeholder-slate-500 overflow-hidden" />
              {/* 下节课计划 */}
              <textarea rows={1} value={s.next_plan}
                onChange={e => updateField(idx, 'next_plan', e.target.value)}
                onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }}
                placeholder="下节课计划…"
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 outline-none resize-none placeholder-slate-500 overflow-hidden" />
            </div>
          ))}

          {/* ── 临时学生 ── */}
          <div className="border-t border-slate-600 pt-3 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-slate-400">临时学生</span>
              <span className="text-[10px] text-slate-500">（不加入班级花名册，仅本次记录）</span>
            </div>
            <div className="flex items-center gap-2">
              <input value={tempStudentName}
                onChange={e => setTempStudentName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addTempStudent(); }}
                placeholder="输入临时学生姓名"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none placeholder-slate-500" />
              <button onClick={addTempStudent}
                className="text-xs text-black px-3 py-1.5 rounded-lg font-bold bg-cyan-400">
                <Plus size={14} />
              </button>
            </div>
            {editStudents.filter(s => s.remark === '临时').length > 0 && (
              <div className="mt-2 space-y-1">
                {editStudents.filter(s => s.remark === '临时').map((s, _i) => {
                  const origIdx = editStudents.findIndex(x => x.id === s.id);
                  return (
                    <div key={s.id} className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5">
                      <span className="text-xs text-amber-300 font-medium">{s.name}</span>
                      <span className="text-[10px] text-amber-500/60">临时</span>
                      <button onClick={() => removeTempStudent(origIdx)}
                        className="ml-auto text-rose-400 hover:text-rose-300 p-0.5">
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Toast 提示 */}
        {toast.show && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-700 border border-slate-500 rounded-lg px-4 py-2 text-xs text-slate-200 shadow-xl whitespace-nowrap animate-fadeIn">
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 主组件 ──

interface AttendancePanelProps {
  username: string;
}

export default function AttendancePanel({ username }: AttendancePanelProps) {
  // 班级
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [showAddClass, setShowAddClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  // 课堂记录
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [loadingSessions, setLoadingSessions] = useState(false);

  // 编辑弹窗
  const [editModal, setEditModal] = useState<{
    date: string;
    students: SessionStudent[];
  } | null>(null);
  const [saving, setSaving] = useState(false);

  // 添加学生
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [dupCheck, setDupCheck] = useState<{
    matches: { class_name: string; student_id: string; name: string; remark: string }[];
    showDialog: boolean;
  }>({ matches: [], showDialog: false });

  // ── 学生列表管理 ──
  const [showStudentList, setShowStudentList] = useState(false);

  const handleRemoveStudent = async (studentId: string) => {
    if (!selectedClass || !confirm('确定从班级中移除此学生？')) return;
    await fetch(`/api/classes/${encodeURIComponent(selectedClass.name)}/students/${studentId}?username=${username}`, { method: 'DELETE' });
    await loadClasses();
    const res = await fetch(`/api/classes?username=${username}`);
    const data = await res.json();
    if (data.status === 'success') {
      const updated = data.classes.find((c: ClassData) => c.name === selectedClass.name);
      if (updated) setSelectedClass(updated);
    }
  };

  // ── 垃圾桶 ──
  const [trashItems, setTrashItems] = useState<{ type: string; owner: string; original_path: string; deleted_at: string; _folder: string; _size: number }[]>([]);
  const [showTrash, setShowTrash] = useState(false);

  const loadTrash = useCallback(async () => {
    const res = await fetch(`/api/trash/items?username=${username}`);
    const data = await res.json();
    if (data.status === 'success') setTrashItems(data.items);
  }, [username]);

  const handleRestoreClass = async (folderName: string) => {
    await fetch(`/api/trash/items/${encodeURIComponent(folderName)}/restore?username=${username}`, { method: 'POST' });
    loadTrash();
    loadClasses();
  };

  const handlePermanentDelete = async (folderName: string) => {
    if (!confirm(`永久删除？此操作不可恢复！`)) return;
    await fetch(`/api/trash/items/${encodeURIComponent(folderName)}?username=${username}`, { method: 'DELETE' });
    loadTrash();
  };

  // ── 加载班级 ──
  const loadClasses = useCallback(async () => {
    const res = await fetch(`/api/classes?username=${username}`);
    const data = await res.json();
    if (data.status === 'success') {
      const transformed = data.classes.map((c: any) => ({
        name: c.name,
        schedule: c.schedule || [],
        students: (c.students || []).map((s: any) => ({
          id: String(s.user_id || ''),
          name: s.username || '',
          remark: '',
        })),
      }));
      setClasses(transformed);
    }
  }, [username]);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  // ── 选中班级时加载记录 ──
  useEffect(() => {
    if (!selectedClass) return;
    setLoadingSessions(true);
    fetch(`/api/sessions/${encodeURIComponent(selectedClass.name)}?username=${username}&month=${currentMonth}`)
      .then(r => r.json())
      .then(data => {
        if (data.status === 'success') setSessions(data.sessions);
      })
      .finally(() => setLoadingSessions(false));
  }, [selectedClass, currentMonth, username]);

  // ── 创建班级 ──
  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;
    await fetch(`/api/classes?username=${username}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClassName, schedule: [] }),
    });
    setNewClassName('');
    setShowAddClass(false);
    loadClasses();
  };

  // ── 删除班级 ──
  const handleDeleteClass = async (name: string) => {
    if (!confirm(`确定删除班级「${name}」？`)) return;
    await fetch(`/api/classes/${encodeURIComponent(name)}?username=${username}`, { method: 'DELETE' });
    if (selectedClass?.name === name) { setSelectedClass(null); setSessions([]); }
    loadClasses();
  };

  // ── 添加学生（含重名检测） ──
  const [addError, setAddError] = useState('');

  const startAddStudent = async () => {
    if (!newStudentName.trim() || !selectedClass) return;
    setAddError('');
    try {
      const res = await fetch(`/api/classes/find-student?username=${username}&name=${encodeURIComponent(newStudentName)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setAddError(err.detail || `查询失败 (${res.status})`);
        return;
      }
      const data = await res.json();
      if (data.status === 'success' && data.matches && data.matches.length > 0) {
        setDupCheck({ matches: data.matches, showDialog: true });
      } else {
        await addStudentDirect('');
      }
    } catch (e) {
      setAddError('网络错误，请检查连接');
    }
  };

  const addStudentDirect = async (existingId: string) => {
    if (!selectedClass) return;
    setAddError('');
    try {
      const res = await fetch(`/api/classes/${encodeURIComponent(selectedClass.name)}/students?username=${username}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newStudentName, existing_id: existingId, remark: '' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setAddError(err.detail || `添加失败 (${res.status})`);
        return;
      }
      setNewStudentName('');
      setShowAddStudent(false);
      setDupCheck({ matches: [], showDialog: false });
      await loadClasses();
      const res2 = await fetch(`/api/classes?username=${username}`);
      const data = await res2.json();
      if (data.status === 'success') {
        const updated = data.classes.find((c: ClassData) => c.name === selectedClass.name);
        if (updated) setSelectedClass(updated);
      }
    } catch (e) {
      setAddError('网络错误，请检查连接');
    }
  };

  const addStudentWithNew = async (_oldRemark: string, newRemark: string) => {
    if (!selectedClass) return;
    setAddError('');
    try {
      const res = await fetch(`/api/classes/${encodeURIComponent(selectedClass.name)}/students?username=${username}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newStudentName, existing_id: '', remark: newRemark }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setAddError(err.detail || `添加失败 (${res.status})`);
        return;
      }
      setNewStudentName('');
      setShowAddStudent(false);
      setDupCheck({ matches: [], showDialog: false });
      await loadClasses();
      const res2 = await fetch(`/api/classes?username=${username}`);
      const data = await res2.json();
      if (data.status === 'success') {
        const updated = data.classes.find((c: ClassData) => c.name === selectedClass.name);
        if (updated) setSelectedClass(updated);
      }
    } catch (e) {
      setAddError('网络错误，请检查连接');
    }
  };

  // ── 保存课堂记录 ──
  const handleSaveSession = async (date: string, students: SessionStudent[]) => {
    if (!selectedClass) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(selectedClass.name)}?username=${username}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, students }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setEditModal(null);
        const r = await fetch(`/api/sessions/${encodeURIComponent(selectedClass.name)}?username=${username}&month=${currentMonth}`);
        const d = await r.json();
        if (d.status === 'success') setSessions(d.sessions);
      }
    } finally {
      setSaving(false);
    }
  };

  // ── 删除课堂记录 ──
  const handleDeleteSession = async (date: string) => {
    if (!selectedClass || !confirm(`确定删除 ${date} 的记录？`)) return;
    await fetch(`/api/sessions/${encodeURIComponent(selectedClass.name)}/${date}?username=${username}`, { method: 'DELETE' });
    setSessions(prev => prev.filter(s => s.date !== date));
  };

  // ── 打开新建弹窗 ──
  const openNewSession = () => {
    if (!selectedClass) return;
    const students: SessionStudent[] = selectedClass.students.map(s => ({
      id: s.id,
      name: s.name,
      remark: s.remark || '',
      status: 'present',
      content: '',
      next_plan: '',
    }));
    setEditModal({ date: getToday(), students });
  };

  // ── 打开编辑弹窗 ──
  const openEditSession = (session: SessionRecord) => {
    setEditModal({ date: session.date, students: [...session.students] });
  };

  // ── 获取出席摘要 ──
  const attendanceSummary = (students: SessionStudent[]) => {
    return students.map(s => {
      const label = fmt(s.name, s.remark);
      return s.status === 'present'
        ? <span key={s.id} className="text-green-400">{label}✅ </span>
        : <span key={s.id} className="text-rose-400">{label}❌ </span>;
    });
  };

  // ── 渲染 ──
  return (
    <div className="flex h-full animate-fadeIn border border-slate-600 rounded-xl overflow-hidden">
      {/* 左侧：班级列表 */}
      <div className="w-56 xl:w-80 bg-slate-900/80 border-r border-slate-600 flex flex-col flex-shrink-0">
        <div className="h-12 border-b border-slate-600 flex items-center justify-between px-3">
          <span className="text-sm text-slate-300 font-mono tracking-wider flex items-center gap-1.5">
            <Users size={16} className="text-cyan-400" /> 班级
          </span>
          <button onClick={() => { setShowAddClass(true); setNewClassName(''); }}
            className="text-slate-400 hover:text-cyan-400 p-1 rounded hover:bg-slate-800" title="新建班级">
            <Plus size={16} />
          </button>
        </div>

        {showAddClass && (
          <div className="px-3 py-2 border-b border-slate-600 space-y-1">
            <input autoFocus value={newClassName} onChange={e => setNewClassName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateClass(); if (e.key === 'Escape') setShowAddClass(false); }}
              placeholder="班级名称"
              className="w-full bg-slate-800 text-sm text-slate-200 px-2 py-1.5 rounded outline-none border border-cyan-400" />
            <button onClick={handleCreateClass}
              className="w-full text-xs text-black px-2 py-1.5 rounded font-bold bg-cyan-400">确定</button>
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
              onClick={() => { setSelectedClass(c); setCurrentMonth(getCurrentMonth()); }}
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

        {/* 垃圾桶入口 */}
        <div className="border-t border-slate-600 p-2 mt-auto">
          <button onClick={() => { loadTrash(); setShowTrash(true); }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors">
            <Trash2 size={14} /> 垃圾桶
          </button>
        </div>
      </div>

      {/* 右侧：课堂记录 */}
      <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
        {selectedClass ? (
          <>
            {/* 标题栏 */}
            <div className="h-12 border-b border-slate-600 flex items-center justify-between px-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-300 font-mono">{selectedClass.name}</span>
                <button onClick={() => setShowStudentList(!showStudentList)}
                  className="text-xs text-slate-500 hover:text-cyan-400">
                  {selectedClass.students.length}名学生 ▾
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={openNewSession}
                  className="text-xs text-black px-4 py-1.5 rounded-lg font-bold flex items-center gap-1 bg-cyan-400">
                  <Check size={14} /> 点名
                </button>
                <button onClick={() => { setShowAddStudent(true); setNewStudentName(''); }}
                  className="text-xs text-cyan-400 hover:text-white flex items-center gap-1">
                  <Plus size={14} /> 添加学生
                </button>
              </div>
            </div>

            {/* 添加学生表单 */}
            {showAddStudent && (
              <div className="px-4 py-2 border-b border-slate-600 bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <input autoFocus value={newStudentName} onChange={e => setNewStudentName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') startAddStudent(); if (e.key === 'Escape') setShowAddStudent(false); }}
                    placeholder="学生姓名"
                    className="bg-slate-800 text-sm text-slate-200 px-3 py-1.5 rounded outline-none border border-slate-700 w-48" />
                  <button onClick={startAddStudent}
                    className="text-xs text-black px-3 py-1.5 rounded font-bold bg-cyan-400">添加</button>
                  <button onClick={() => { setShowAddStudent(false); setAddError(''); }}
                    className="text-xs text-slate-400 px-2 py-1.5 rounded hover:bg-slate-800">取消</button>
                </div>
                {addError && (
                  <div className="text-xs text-rose-400 mt-1">{addError}</div>
                )}
              </div>
            )}

            {/* 学生列表管理 */}
            {showStudentList && selectedClass && (
              <div className="px-4 py-2 border-b border-slate-600 bg-slate-900/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">班级学生名单</span>
                  <button onClick={() => setShowStudentList(false)}
                    className="text-xs text-slate-500 hover:text-white">关闭</button>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {selectedClass.students.map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-slate-800/40 rounded-lg px-3 py-1.5">
                      <span className="text-xs text-slate-300">{s.name}{s.remark ? ` (${s.remark})` : ''}</span>
                      <button onClick={() => handleRemoveStudent(s.id)}
                        className="text-rose-400/60 hover:text-rose-400 text-xs">移除</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 重名检测弹窗 */}
            {dupCheck.showDialog && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={e => { if (e.target === e.currentTarget) setDupCheck({ matches: [], showDialog: false }); }}>
                <div className="bg-slate-900 border border-slate-700 rounded-2xl w-[460px] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                  <h3 className="text-sm text-white font-bold mb-4">发现同名「{newStudentName}」</h3>
                  {dupCheck.matches.map(m => (
                    <div key={m.student_id} className="text-xs text-slate-400 mb-3">
                      在「{m.class_name}」{m.remark ? `(${m.remark})` : ''}
                    </div>
                  ))}
                  <div className="space-y-3 mt-4">
                    <button onClick={() => addStudentDirect(dupCheck.matches[0].student_id)}
                      className="w-full text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2.5 hover:bg-green-500/20 text-left">
                      是同一个学生，跨班共享
                    </button>
                    <div className="border-t border-slate-700 pt-3">
                      <p className="text-xs text-slate-400 mb-2">不是同一个人，请输入区分名：</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-300 w-20">原「{newStudentName}」</span>
                          <input id="oldRemark" defaultValue="大小明" placeholder="如大小明"
                            className="flex-1 bg-slate-800 text-sm text-slate-200 px-3 py-1.5 rounded outline-none border border-slate-700" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-300 w-20">新「{newStudentName}」</span>
                          <input id="newRemark" defaultValue="小小明" placeholder="如小小明"
                            className="flex-1 bg-slate-800 text-sm text-slate-200 px-3 py-1.5 rounded outline-none border border-slate-700" />
                        </div>
                      </div>
                      <button onClick={() => {
                        const oldR = (document.getElementById('oldRemark') as HTMLInputElement)?.value || '';
                        const newR = (document.getElementById('newRemark') as HTMLInputElement)?.value || '';
                        addStudentWithNew(oldR, newR);
                      }}
                        className="w-full text-xs text-black bg-amber-400 rounded-lg px-4 py-2.5 font-bold mt-3 hover:bg-amber-500">
                        确定，新建学生
                      </button>
                    </div>
                  </div>
                  <button onClick={() => setDupCheck({ matches: [], showDialog: false })}
                    className="w-full text-xs text-slate-400 mt-2 py-2 hover:text-white">取消</button>
                </div>
              </div>
            )}

            {/* 主内容区 */}
            <div className="flex-1 overflow-auto p-6">
              {/* 月份切换 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentMonth(prevMonth(currentMonth))}
                    className="text-slate-400 hover:text-white p-1">
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-sm text-white font-mono">
                    {currentMonth} {MONTH_NAMES[currentMonth.slice(5, 7)]}
                  </span>
                  <button onClick={() => setCurrentMonth(nextMonth(currentMonth))}
                    className="text-slate-400 hover:text-white p-1">
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              {/* 本月统计 */}
              {sessions.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-slate-900/60 border border-slate-600 rounded-xl p-4 text-center transition-all duration-300 hover:border-cyan-400/30 hover:translate-y-[-2px]">
                    <div className="text-2xl text-cyan-400 font-bold font-mono">{sessions.length}</div>
                    <div className="text-xs text-slate-400 mt-1">本月课时</div>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-600 rounded-xl p-4 text-center transition-all duration-300 hover:border-geek-green/30 hover:translate-y-[-2px]">
                    {(() => {
                      const total = sessions.reduce((sum, s) => sum + s.students.length, 0);
                      const present = sessions.reduce((sum, s) => sum + s.students.filter(x => x.status === 'present').length, 0);
                      const rate = total > 0 ? Math.round(present / total * 100) : 0;
                      return (
                        <>
                          <div className="text-2xl text-green-400 font-bold font-mono">{rate}%</div>
                          <div className="text-xs text-slate-400 mt-1">平均出勤率</div>
                        </>
                      );
                    })()}
                  </div>
                  <div className="bg-slate-900/60 border border-slate-600 rounded-xl p-4 text-center transition-all duration-300 hover:border-rose-400/30 hover:translate-y-[-2px]">
                    {(() => {
                      const total = sessions.reduce((sum, s) => sum + s.students.length, 0);
                      const absent = sessions.reduce((sum, s) => sum + s.students.filter(x => x.status !== 'present').length, 0);
                      return (
                        <>
                          <div className="text-2xl text-rose-400 font-bold font-mono">{absent}/{total}</div>
                          <div className="text-xs text-slate-400 mt-1">缺勤人次</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* 记录列表 */}
              {loadingSessions ? (
                <div className="text-center py-12 text-slate-500 text-sm">加载中…</div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Users size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm mb-2">本月还没有课堂记录</p>
                  <button onClick={openNewSession}
                    className="text-xs text-cyan-400 hover:text-white">+ 新建第一条记录</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.map(s => (
                    <div key={s.date}
                      className="bg-slate-900/50 border border-slate-600 rounded-xl p-4 hover:border-cyan-400/30 transition-all duration-300 group cursor-pointer hover:translate-y-[-2px]"
                      onClick={() => openEditSession(s)}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-white font-mono">{s.date}</span>
                            <span className="text-xs text-cyan-400">
                              {s.students.filter(x => x.status === 'present').length}/{s.students.length} 出勤
                            </span>
                          </div>
                          <div className="text-xs text-slate-300 flex flex-wrap gap-x-3 gap-y-1">
                            {attendanceSummary(s.students)}
                          </div>
                          {s.students.filter(x => x.content).length > 0 && (
                            <div className="mt-2 text-xs text-slate-500 line-clamp-1">
                              {s.students.filter(x => x.content).map(x => `${fmt(x.name, x.remark)}: ${x.content}`).join('｜')}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-3 shrink-0 opacity-0 group-hover:opacity-100">
                          <button onClick={(e) => { e.stopPropagation(); openEditSession(s); }}
                            className="text-slate-400 hover:text-cyan-400 p-1"><Pencil size={14} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.date); }}
                            className="text-slate-400 hover:text-rose-400 p-1"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <Users size={64} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg mb-2">选择左侧班级查看课堂记录</p>
              <p className="text-sm text-slate-400">或者创建一个新班级</p>
            </div>
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      {editModal && (
        <EditSessionModal
          date={editModal.date}
          students={editModal.students}
          onSave={handleSaveSession}
          onClose={() => setEditModal(null)}
          saving={saving}
        />
      )}

      {/* 垃圾桶弹窗 */}
      {showTrash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowTrash(false); }}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-[70vw] max-w-[600px] min-w-[400px] max-h-[70vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-600">
              <span className="text-sm text-white font-bold flex items-center gap-2"><Trash2 size={16} /> 垃圾桶</span>
              <button onClick={() => setShowTrash(false)} className="text-slate-400 hover:text-white p-1"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-2">
              {trashItems.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">回收站为空</div>
              ) : trashItems.map(t => (
                <div key={t._folder} className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{t.type === 'class' ? '📋' : t.type === 'course' ? '📚' : '👤'}</span>
                        <span className="text-sm text-white">{t.original_path}</span>
                        <span className="text-xs text-slate-500">{t.type === 'class' ? '班级' : t.type === 'course' ? '课程' : '用户'}</span>
                      </div>
                      <span className="text-xs text-slate-500 ml-6">删除于 {t.deleted_at?.slice(0, 10)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleRestoreClass(t._folder)}
                        className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-1.5 hover:bg-green-500/20 flex items-center gap-1">
                        <RotateCcw size={12} /> 恢复
                      </button>
                      <button onClick={() => handlePermanentDelete(t._folder)}
                        className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-1.5 hover:bg-rose-500/20">
                        永久删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
