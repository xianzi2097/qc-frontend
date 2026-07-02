import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Plus, Trash2, ExternalLink, RefreshCw, FolderOpen, RotateCcw } from 'lucide-react';
import { useAuth } from '../../lib/useAuth';

interface Course {
  name: string;
  type: string;
  description: string;
  material_count: number;
}

interface Material {
  name: string;
  has_main: boolean;
  has_student: boolean;
  sb3_count: number;
  url: string;
}

const TYPE_OPTIONS = [
  { value: 'scratch', label: '🧩 Scratch' },
  { value: 'python', label: '🍁 Python' },
  { value: 'cpp', label: '⚙️ C++' },
];

const TYPE_ICON: Record<string, string> = {
  scratch: '🧩',
  python: '🍁',
  cpp: '⚙️',
};

export default function CourseManager() {
  const { username } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('scratch');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);

  const loadCourses = useCallback(() => {
    setLoading(true);
    setError('');
    fetch(`/api/courses?teacher=${username}&t=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        if (data.status === 'success') {
          setCourses(data.courses);
        } else {
          setError(data.detail || '加载失败');
        }
      })
      .catch(() => setError('无法连接服务器'))
      .finally(() => setLoading(false));
  }, [username]);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher: username, name: newName.trim(), course_type: newType }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setShowCreate(false);
        setNewName('');
        loadCourses();
      } else {
        // FastAPI 422 验证错误：detail 可能是数组或字符串
        const msg = Array.isArray(data.detail)
          ? data.detail.map((e: any) => e.msg || JSON.stringify(e)).join('；')
          : (data.detail || '创建失败');
        setError(msg);
      }
    } catch {
      setError('无法连接服务器');
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`确定删除课程「${name}」？此操作不可恢复。`)) return;
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(name)}?teacher=${username}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.status === 'success') {
        if (selectedCourse?.name === name) {
          setSelectedCourse(null);
          setMaterials([]);
        }
        loadCourses();
      } else {
        alert(data.detail || '删除失败');
      }
    } catch {
      alert('无法连接服务器');
    }
  };

  const handleDeleteMaterial = async (name: string) => {
    if (!selectedCourse || !confirm(`确定删除课件「${name}」？`)) return;
    const courseName = selectedCourse.name;
    try {
      const res = await fetch(
        `/api/courses/${encodeURIComponent(courseName)}/materials/${encodeURIComponent(name)}?teacher=${username}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (data.status === 'success') {
        // 重新加载同一课程的课件列表
        const r2 = await fetch(`/api/courses/${encodeURIComponent(courseName)}/materials?teacher=${username}&t=${Date.now()}`);
        const d2 = await r2.json();
        if (d2.status === 'success') setMaterials(d2.materials);
        // 刷新课程列表
        loadCourses();
      } else {
        alert(data.detail || '删除失败');
      }
    } catch {
      alert('无法连接服务器');
    }
  };

  const loadMaterials = async (course: Course) => {
    setSelectedCourse(course);
    setMaterialsLoading(true);
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(course.name)}/materials?teacher=${username}&t=${Date.now()}`);
      const data = await res.json();
      if (data.status === 'success') {
        setMaterials(data.materials);
      }
    } catch {
      // ignore
    }
    setMaterialsLoading(false);
  };

  // ── 课程回收站 ──
  const [trashItems, setTrashItems] = useState<any[]>([]);
  const [showTrash, setShowTrash] = useState(false);

  const loadTrash = useCallback(async () => {
    const res = await fetch(`/api/trash/items?username=${username}`);
    const data = await res.json();
    if (data.status === 'success') setTrashItems(data.items.filter((i: any) => i.type === 'course'));
  }, [username]);

  const handleRestore = async (folder: string) => {
    await fetch(`/api/trash/items/${encodeURIComponent(folder)}/restore?username=${username}`, { method: 'POST' });
    loadTrash();
    loadCourses();
  };

  const handlePermanentDelete = async (folder: string) => {
    if (!confirm('永久删除此课程？不可恢复！')) return;
    await fetch(`/api/trash/items/${encodeURIComponent(folder)}?username=${username}`, { method: 'DELETE' });
    loadTrash();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <BookOpen className="text-brand-orange" size={20} /> 课件管理
        </h2>
        <div className="flex gap-2">
          <button
            onClick={loadCourses}
            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw size={14} /> 刷新
          </button>
          <button
            onClick={() => { loadTrash(); setShowTrash(true); }}
            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Trash2 size={14} /> 回收站
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-xs bg-brand-orange hover:bg-brand-orange/90 text-black font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus size={14} /> 新建课程
          </button>
        </div>
      </div>

      {/* 新建课程弹窗 */}
      {showCreate && (
        <div className="bg-slate-900 border border-slate-600 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-4">新建课程</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">课程名称</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="如：Scratch-周六早-初级班"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-orange"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">课程类型</label>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              >
                {TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                className="text-xs bg-brand-orange hover:bg-brand-orange/90 text-black font-bold px-4 py-2 rounded-lg"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="text-xs text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {/* 课程列表 */}
      {loading ? (
        <div className="text-sm text-slate-500">加载中...</div>
      ) : courses.length === 0 ? (
        <div className="text-sm text-slate-500 bg-slate-900/50 border border-slate-600 rounded-2xl p-8 text-center">
          暂无课程，点击「新建课程」开始创建
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.filter(c => TYPE_ICON[c.type] || c.type).map(course => (
            <div
              key={course.name}
              onClick={() => loadMaterials(course)}
              className={`bg-slate-900 border rounded-2xl p-5 cursor-pointer transition-all duration-300 group hover:translate-y-[-4px] ${
                selectedCourse?.name === course.name
                  ? 'border-brand-orange/50 ring-1 ring-brand-orange/20'
                  : 'border-slate-600 hover:border-brand-orange/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-2xl block mb-2">{TYPE_ICON[course.type] || '📁'}</span>
                  <h3 className="font-bold text-white text-sm mb-1">{course.name}</h3>
                  <p className="text-xs text-slate-500">
                    {course.material_count} 个课件
                  </p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(course.name); }}
                  className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                  title="删除课程"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 课件详情 */}
      {selectedCourse && (
        <div className="bg-slate-900/50 border border-slate-600 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderOpen size={16} className="text-brand-orange" />
              {selectedCourse.name} 的课件
            </h3>
            <button
              onClick={() => { setSelectedCourse(null); setMaterials([]); }}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              关闭
            </button>
          </div>

          {materialsLoading ? (
            <div className="text-sm text-slate-500">加载中...</div>
          ) : materials.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-8">
              暂无课件，请在 Scratch 编辑器中通过「保存到课件」上传
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {materials.map(m => (
                <div key={m.name} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center hover:border-brand-orange/30 transition-all duration-300 group hover:translate-y-[-2px] relative">
                  <a
                    href={`/Scratch/index.html?folder=${encodeURIComponent(m.url)}`}
                    target="_blank"
                    className="block"
                  >
                    <span className="text-2xl block mb-2">📂</span>
                    <div className="text-xs font-medium text-white mb-1 truncate">{m.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {m.has_main && m.has_student ? '👥 师生版' : m.has_main ? '📘 教师版' : `${m.sb3_count} sb3`}
                    </div>
                    <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-brand-orange flex items-center justify-center gap-1">
                        打开 <ExternalLink size={10} />
                      </span>
                    </div>
                  </a>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteMaterial(m.name); }}
                    className="absolute top-2 right-2 text-slate-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="删除课件"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 课程回收站弹窗 */}
      {showTrash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowTrash(false); }}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-[500px] max-h-[70vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-600">
              <span className="text-sm text-white font-bold flex items-center gap-2"><Trash2 size={16} /> 课程回收站</span>
              <button onClick={() => setShowTrash(false)} className="text-slate-400 hover:text-white p-1"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-2">
              {trashItems.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">回收站为空</div>
              ) : trashItems.map(t => (
                <div key={t._folder} className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-white">📚 {t.original_path?.split('/').pop()}</span>
                      <span className="text-xs text-slate-500 ml-2">删除于 {t.deleted_at?.slice(0, 10)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleRestore(t._folder)}
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
