import { useState, useEffect, useCallback } from 'react';
import { GraduationCap, ChevronLeft, ExternalLink } from 'lucide-react';
import { StarsBackground } from './ui/StarsBackground';

// ── 类型定义 ──
interface Course {
  name: string;
  type: string;
  description: string;
  material_count: number;
}

interface Material {
  name: string;
  has_main?: boolean;
  has_student?: boolean;
  sb3_count?: number;
  files?: { name: string; size: number }[];
  file_count?: number;
  url: string;
}

const TEACHER_ICONS = ['👨‍🏫', '👩‍💻', '👩‍🏫', '🧑‍🏫', '👨‍💻', '👩‍🔬'];

const TEACHER_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
];

const TEACHER_SHADOWS = [
  'rgba(79,172,254,0.4)',
  'rgba(66,184,131,0.4)',
  'rgba(168,85,247,0.4)',
  'rgba(245,158,11,0.4)',
  'rgba(244,63,94,0.4)',
  'rgba(6,182,212,0.4)',
];

const EDITOR_URL = '/Scratch/index.html';

const TYPE_ICON: Record<string, string> = {
  scratch: '🧩',
  python: '🐍',
  cpp: '⚙️',
};

interface Props {
  onBack: () => void;
}

export default function CourseSquare({ onBack }: Props) {
  const [teachers, setTeachers] = useState<{ username: string }[]>([]);
  const [teacher, setTeacher] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('teacher') || '';
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);

  // ── 加载老师列表 ──
  useEffect(() => {
    fetch(`/api/users?t=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        if (data.status === 'success') {
          const ts = data.users.filter((u: any) => u.role === 'teacher');
          setTeachers(ts);
          // 如果 URL 没指定老师或指定的老师不存在，默认第一个
          const params = new URLSearchParams(window.location.search);
          const t = params.get('teacher');
          if (!t || !ts.some((tc: any) => tc.username === t)) {
            if (ts.length > 0) {
              const first = ts[0].username;
              setTeacher(first);
              const url = new URL(window.location.href);
              url.searchParams.set('teacher', first);
              window.history.replaceState({}, '', url.toString());
            }
          }
        }
      })
      .catch(() => {});
  }, []);

  // ── 加载课程列表 ──
  const loadCourses = useCallback(() => {
    if (!teacher) return;
    setLoading(true);
    setSelectedCourse(null);
    setMaterials([]);

    fetch(`/api/courses?teacher=${teacher}&t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setCourses(data.courses);
        } else {
          setCourses([]);
        }
      })
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, [teacher]);

  useEffect(() => { if (teacher) loadCourses(); }, [loadCourses]);

  // ── 切换教师 ──
  const switchTeacher = (username: string) => {
    setTeacher(username);
    const url = new URL(window.location.href);
    url.searchParams.set('teacher', username);
    window.history.replaceState({}, '', url.toString());
  };

  // ── 加载课件列表 ──
  const loadMaterials = (course: Course) => {
    setSelectedCourse(course);
    setMaterialsLoading(true);
    fetch(`/api/courses/${encodeURIComponent(course.name)}/materials?teacher=${teacher}&t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setMaterials(data.materials);
        } else {
          setMaterials([]);
        }
      })
      .catch(() => setMaterials([]))
      .finally(() => setMaterialsLoading(false));
  };

  // ── 返回课程列表 ──
  const backToCourses = () => {
    setSelectedCourse(null);
    setMaterials([]);
  };

  // ── 打开 Scratch 编辑器 ──
  const openScratch = (url: string) => {
    window.open(`${EDITOR_URL}?folder=${encodeURIComponent(url)}`, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-cyber-bg">
      <StarsBackground />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-8 flex-1 flex flex-col">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl transition-all"
          >
            <ChevronLeft size={16} /> 返回主页
          </button>
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <GraduationCap size={18} className="text-green-400" />
            <span>课程广场</span>
          </div>
        </div>

        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-2">📚 课程广场</h1>
          <p className="text-slate-500 text-sm">浏览老师们的课程，选择你喜欢的课件开始学习</p>
        </div>

        {/* 教师筛选 */}
        <div className="flex gap-3 justify-center mb-8">
          {teachers.length === 0 ? (
            <span className="text-sm text-slate-500">正在加载...</span>
          ) : (
            teachers.map((t, i) => (
              <button
                key={t.username}
                onClick={() => switchTeacher(t.username)}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  teacher === t.username
                    ? `${TEACHER_COLORS[i % TEACHER_COLORS.length]} text-white shadow-[0_0_20px_${TEACHER_SHADOWS[i % TEACHER_SHADOWS.length]}]`
                    : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
                }`}
              >
                {TEACHER_ICONS[i % TEACHER_ICONS.length]} {t.username}
              </button>
            ))
          )}
        </div>

        {/* 当前教师提示 */}
        <div className="text-center mb-6">
          <span className="text-sm text-slate-500 bg-slate-800/40 px-4 py-1.5 rounded-full">
            📂 {teacher} 的课程
          </span>
        </div>

        {/* 内容区域 */}
        <div className="flex-1">
          {/* 返回按钮（课件视图） */}
          {selectedCourse && (
            <button
              onClick={backToCourses}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-4 transition-colors"
            >
              <ChevronLeft size={16} /> 返回「{selectedCourse.name}」课程列表
            </button>
          )}

          {loading || materialsLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-slate-500 text-sm animate-pulse">加载中...</div>
            </div>
          ) : selectedCourse ? (
            /* ── 课件视图 ── */
            <div className="space-y-4">
              <div className="text-sm text-slate-400 mb-2">
                {selectedCourse.type === 'scratch' ? '🧩 Scratch 课件' : '📁 课程资料'}
              </div>

              {materials.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-sm">
                  该课程暂无课件
                </div>
              ) : selectedCourse.type === 'scratch' ? (
                /* ── Scratch 课件：打开编辑器 ── */
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {materials.map(m => (
                    <button
                      key={m.name}
                      onClick={() => openScratch(m.url)}
                      className="bg-slate-900/60 border border-slate-800 hover:border-green-500/30 rounded-2xl p-5 text-center transition-all hover:translate-y-[-2px] group"
                    >
                      <span className="text-3xl block mb-3">📂</span>
                      <div className="font-bold text-white text-sm mb-1 truncate">{m.name}</div>
                      <div className="text-xs text-slate-500 mb-2">
                        {m.has_main && m.has_student
                          ? '👥 师生版'
                          : m.has_main
                            ? '📘 教师版'
                            : `${m.sb3_count} 个 sb3`}
                      </div>
                      <div className="text-xs text-green-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        打开 <ExternalLink size={12} />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                /* ── Python/C++ 课程：文件夹 + 文件列表 ── */
                materials.map(m => (
                  <div key={m.name} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">📁</span>
                      <span className="font-bold text-white text-sm">{m.name}</span>
                      <span className="text-xs text-slate-500">{m.file_count} 个文件</span>
                    </div>
                    {m.files && m.files.length > 0 ? (
                      <div className="space-y-1">
                        {m.files.map(f => (
                          <a
                            key={f.name}
                            href={`${m.url}${f.name}`}
                            target="_blank"
                            className="flex items-center justify-between text-sm text-slate-400 hover:text-green-400 bg-slate-800/40 rounded-lg px-4 py-2 transition-colors group"
                          >
                            <span className="flex items-center gap-2 truncate">
                              <span>📄</span>
                              <span className="truncate">{f.name}</span>
                            </span>
                            <span className="text-[10px] text-slate-600 group-hover:text-slate-400">
                              {(f.size / 1024).toFixed(1)} KB
                            </span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-600 text-center py-2">空文件夹</div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            /* ── 课程网格 ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {courses.length === 0 ? (
                <div className="col-span-full text-center py-16 text-slate-500 text-sm">
                  暂无课程
                </div>
              ) : (
                courses.map(course => (
                  <button
                    key={course.name}
                    onClick={() => loadMaterials(course)}
                    className="bg-slate-900/60 border border-slate-800 hover:border-brand-orange/30 rounded-2xl p-6 text-center transition-all hover:translate-y-[-2px] group"
                  >
                    <span className="text-4xl block mb-3">
                      {TYPE_ICON[course.type] || '📁'}
                    </span>
                    <h3 className="font-bold text-white text-base mb-1">{course.name}</h3>
                    <p className="text-xs text-slate-500">
                      {course.material_count} 个课件
                    </p>
                    <div className="mt-3 text-xs text-brand-orange opacity-0 group-hover:opacity-100 transition-opacity">
                      查看课件 →
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-xs text-slate-700 text-center mt-12 pb-5">
          粤ICP备2026057743号-1 · Arin | 青橙
        </p>
      </div>
    </div>
  );
}
