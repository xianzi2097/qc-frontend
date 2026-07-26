import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ExternalLink, Library, ArrowRight } from 'lucide-react';
import { useLoading } from '../lib/useLoading';

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

const EDITOR_URL = '/Scratch/index.html';

const TYPE_ICON: Record<string, string> = {
  scratch: '🧩',
  python: '🐍',
  cpp: '⚙️',
};

export default function CourseSquare() {
  const navigate = useNavigate();
  const { wrap } = useLoading();
  const [teachers, setTeachers] = useState<{ username: string }[]>([]);
  const [teacher, setTeacher] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('teacher') || '';
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);

  // ── 加载老师列表 ──
  useEffect(() => {
    wrap(
      fetch(`/api/users?t=${Date.now()}`)
        .then(r => r.json())
        .then(data => {
          if (data.status === 'success') {
            const ts = data.users.filter((u: any) => u.role === 'teacher');
            setTeachers(ts);
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
        }),
      '加载课程...'
    ).catch(() => {});
  }, []);

  // ── 加载课程列表 ──
  const loadCourses = useCallback(() => {
    if (!teacher) return;
    setSelectedCourse(null);
    setMaterials([]);

    wrap(
      fetch(`/api/courses?teacher=${teacher}&t=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') {
            setCourses(data.courses);
          } else {
            setCourses([]);
          }
        }),
      '加载课程...'
    ).catch(() => setCourses([]));
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
    wrap(
      fetch(`/api/courses/${encodeURIComponent(course.name)}/materials?teacher=${teacher}&t=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') {
            setMaterials(data.materials);
          } else {
            setMaterials([]);
          }
        }),
      '加载课件...'
    ).catch(() => setMaterials([]));
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
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#e8edf2' }}
    >
      <div className="neo-wrap w-full max-w-6xl">

        {/* ════ 顶部导航 ════ */}
        <div className="flex items-center justify-between px-2">
          <button
            onClick={() => navigate('/')}
            className="neo-btn"
          >
            <ChevronLeft className="w-4 h-4" /> 返回主页
          </button>
          <div className="flex items-center gap-2 neo-btn" style={{ cursor: 'default', padding: '0.5rem 1rem' }}>
            <Library className="w-4 h-4 ico-green" />
            <span>课程广场</span>
          </div>
        </div>

        {/* ════ 欢迎标题 ════ */}
        <div className="text-center">
          <h1
            className="text-[2.2rem] font-semibold tracking-tight"
            style={{
              color: '#2c3e50',
              textShadow: '0.15rem 0.15rem 0.3rem rgba(255,255,255,0.7), -0.15rem -0.15rem 0.3rem rgba(188,195,201,0.4)'
            }}
          >
            📚 课程广场
          </h1>
          <p className="text-sm mt-2" style={{ color: '#4a5b6b' }}>
            浏览老师们的课程，选择你喜欢的课件开始学习
          </p>
        </div>

        {/* ════ 教师筛选 ════ */}
        <div className="flex gap-3 justify-center flex-wrap">
          {teachers.map((t, i) => (
            <button
              key={t.username}
              onClick={() => switchTeacher(t.username)}
              className={`neo-btn ${teacher === t.username ? 'ico-green' : ''}`}
              style={teacher === t.username ? { color: '#2e8b57' } : {}}
            >
              {TEACHER_ICONS[i % TEACHER_ICONS.length]} {t.username}
            </button>
          ))}
        </div>

        {/* ════ 内容区域 ════ */}
        <div>
          {/* 返回按钮（课件视图） */}
          {selectedCourse && (
            <button onClick={backToCourses} className="neo-btn mb-4">
              <ChevronLeft className="w-4 h-4" /> 返回课程列表
            </button>
          )}

          {selectedCourse ? (
            /* ── 课件视图 ── */
            <div className="space-y-4">
              {materials.length === 0 ? (
                <div className="text-center py-16" style={{ color: '#5f6c7a' }}>
                  该课程暂无课件
                </div>
              ) : selectedCourse.type === 'scratch' ? (
                /* ── Scratch 课件 ── */
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {materials.map(m => (
                    <button
                      key={m.name}
                      onClick={() => openScratch(m.url)}
                      className="neo-card items-center text-center gap-2 cursor-pointer"
                    >
                      <span className="text-3xl block">📂</span>
                      <div className="font-bold text-sm truncate w-full" style={{ color: '#1e2b38' }}>
                        {m.name}
                      </div>
                      <div className="text-xs" style={{ color: '#5f6c7a' }}>
                        {m.has_main && m.has_student
                          ? '👥 师生版'
                          : m.has_main
                            ? '📘 教师版'
                            : `${m.sb3_count} 个 sb3`}
                      </div>
                      <div className="text-xs flex items-center justify-center gap-1" style={{ color: '#2e8b57' }}>
                        打开 <ExternalLink className="w-3 h-3" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                /* ── Python/C++ 课程 ── */
                materials.map(m => (
                  <div key={m.name} className="neo-card gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📁</span>
                      <span className="font-bold text-sm" style={{ color: '#1e2b38' }}>{m.name}</span>
                      <span className="text-xs" style={{ color: '#5f6c7a' }}>{m.file_count} 个文件</span>
                    </div>
                    {m.files && m.files.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {m.files.map(f => (
                          <a
                            key={f.name}
                            href={`${m.url}${f.name}`}
                            target="_blank"
                            className="neo-btn justify-between text-sm no-underline"
                          >
                            <span className="flex items-center gap-2 truncate">
                              <span>📄</span>
                              <span className="truncate">{f.name}</span>
                            </span>
                            <span className="text-xs" style={{ color: '#5f6c7a' }}>
                              {(f.size / 1024).toFixed(1)} KB
                            </span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-center py-2" style={{ color: '#5f6c7a' }}>空文件夹</div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            /* ── 课程网格 ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.length === 0 ? (
                <div className="col-span-full text-center py-16" style={{ color: '#5f6c7a' }}>
                  暂无课程
                </div>
              ) : (
                courses.map(course => (
                  <button
                    key={course.name}
                    onClick={() => loadMaterials(course)}
                    className="neo-card items-center text-center gap-3 cursor-pointer"
                  >
                    <span className="text-4xl block">{TYPE_ICON[course.type] || '📁'}</span>
                    <h3 className="font-bold text-base" style={{ color: '#1e2b38' }}>{course.name}</h3>
                    <p className="text-xs" style={{ color: '#5f6c7a' }}>
                      {course.material_count} 个课件
                    </p>
                    <ArrowRight className="w-4 h-4 ico-green" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* ════ 备案 ════ */}
        <hr className="neo-hr" />
        <p className="text-xs text-center" style={{ color: '#5f6c7a' }}>
          粤ICP备2026057743号-1 · Arin | 青橙
        </p>
      </div>
    </div>
  );
}
