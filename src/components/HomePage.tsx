import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BookOpen, Award, Puzzle, Code2,
  Star, LogIn, Play, X, HelpCircle,
  Library, ArrowRight, Search, LayoutGrid,
  Folder, FolderOpen, FileText, Braces, Terminal, Users, User
} from 'lucide-react';

import type { PortalUser } from '../lib/useAuth';
import type { Course, Material } from '../types/course';
import AvatarPicker, { AVATARS } from './ui/AvatarPicker';
// HomePage 使用图标组件版本的 TYPE_ICON
const TYPE_ICON: Record<string, (props: { className?: string }) => React.ReactNode> = {
  scratch: (cls) => <Puzzle className={cls?.className ? `${cls.className} ico-green` : 'w-6 h-6 ico-green'} />,
  python: (cls) => <Terminal className={cls?.className ? `${cls.className} ico-blue` : 'w-6 h-6 ico-blue'} />,
  cpp: (cls) => <Braces className={cls?.className ? `${cls.className} ico-orange` : 'w-6 h-6 ico-orange'} />,
};

interface Props {
  onLogin: (user: PortalUser, token?: string) => void;
  onSwitchHome?: () => void;
}

export default function HomePage({ onLogin, onSwitchHome: _onSwitchHome }: Props) {
  const [flipped, setFlipped] = useState(false);
  const [showLoginFlip, setShowLoginFlip] = useState(false);
  const [showDocFlip, setShowDocFlip] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // ── 课程广场状态 ──
  const [teachers, setTeachers] = useState<{ username: string }[]>([]);
  const [courseTeacher, setCourseTeacher] = useState('');
  const [courseType, setCourseType] = useState('全部');
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);

  // ── 老师胶囊滑动指示器 ──
  const teacherWrapRef = useRef<HTMLDivElement>(null);
  const [teacherInd, setTeacherInd] = useState({ left: 0, width: 0 });
  const [plazaReady, setPlazaReady] = useState(false); // 翻转过渡结束后才允许测量

  const updateTeacherInd = useCallback(() => {
    const wrap = teacherWrapRef.current;
    if (!wrap) return;
    const wrapRect = wrap.getBoundingClientRect();
    const active = wrap.querySelector<HTMLElement>(`[data-teacher="${courseTeacher}"]`);
    if (!active) return;
    const r = active.getBoundingClientRect();
    setTeacherInd({ left: r.left - wrapRect.left, width: r.width });
  }, [courseTeacher]);

  // ── 类型胶囊滑动指示器 ──
  const typeWrapRef = useRef<HTMLDivElement>(null);
  const [typeInd, setTypeInd] = useState({ left: 0, width: 0 });

  const updateTypeInd = useCallback(() => {
    const wrap = typeWrapRef.current;
    if (!wrap) return;
    const wrapRect = wrap.getBoundingClientRect();
    const active = wrap.querySelector<HTMLElement>(`[data-type="${courseType}"]`);
    if (!active) return;
    const r = active.getBoundingClientRect();
    setTypeInd({ left: r.left - wrapRect.left, width: r.width });
  }, [courseType]);

  // 翻转后等过渡结束再测量（避免拿到过渡中的坐标），并监听窗口缩放
  useEffect(() => {
    if (!flipped) { setPlazaReady(false); return; }
    const t = setTimeout(() => {
      requestAnimationFrame(() => {
        updateTeacherInd();
        updateTypeInd();
        setPlazaReady(true);
      });
    }, 900);
    const onResize = () => { updateTeacherInd(); updateTypeInd(); };
    window.addEventListener('resize', onResize);
    return () => { clearTimeout(t); window.removeEventListener('resize', onResize); };
  }, [flipped, updateTeacherInd, updateTypeInd]);

  // 老师列表变化（按钮出现/布局变化）时重新测量
  useEffect(() => {
    if (!flipped || !plazaReady) return;
    updateTeacherInd();
  }, [teachers, plazaReady]);

  // 切换老师时立即测量，让胶囊平滑滑动
  useEffect(() => {
    if (!flipped || !plazaReady) return;
    updateTeacherInd();
  }, [courseTeacher, plazaReady, flipped]);

  // 切换类型时立即测量，让胶囊平滑滑动
  useEffect(() => {
    if (!flipped || !plazaReady) return;
    updateTypeInd();
  }, [courseType, plazaReady, flipped]);

  const loadMaterials = (course: Course) => {
    setSelectedCourse(course);
    const teacher = course.teacher || courseTeacher;
    setMaterialsLoading(true);
    fetch(`/api/courses/${encodeURIComponent(course.name)}/materials?teacher=${teacher}&t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        setMaterials(data.status === 'success' ? data.materials : []);
      })
      .catch(() => setMaterials([]))
      .finally(() => setMaterialsLoading(false));
  };

  const backToCourses = () => {
    setSelectedCourse(null);
    setMaterials([]);
  };

  const selectTeacher = (name: string) => {
    setCourseTeacher(name);
    backToCourses();
  };

  // ── 加载老师列表 ──
  useEffect(() => {
    if (!flipped) return;
    fetch(`/api/users?t=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        if (data.status === 'success') {
          const ts = data.users.filter((u: any) => u.role === 'teacher');
          setTeachers(ts);
          if (ts.length > 0 && !courseTeacher) setCourseTeacher('全部');
        }
      })
      .catch(() => {});
  }, [flipped]);

  // ── 加载课程列表 ──
  const loadCourses = useCallback(() => {
    if (!courseTeacher) return;
    setCoursesLoading(true);
    if (courseTeacher === '全部') {
      Promise.all(
        teachers.map(t => fetch(`/api/courses?teacher=${t.username}&t=${Date.now()}`).then(r => r.json()))
      ).then(results => {
        const all: Course[] = [];
        results.forEach((r, idx) => {
          if (r.status === 'success') {
            r.courses.forEach((c: any) => all.push({ ...c, teacher: teachers[idx].username }));
          }
        });
        setCourses(all);
      }).catch(() => setCourses([]))
        .finally(() => setCoursesLoading(false));
    } else {
      fetch(`/api/courses?teacher=${courseTeacher}&t=${Date.now()}`)
        .then(res => res.json())
        .then(data => setCourses(data.status === 'success' ? data.courses : []))
        .catch(() => setCourses([]))
        .finally(() => setCoursesLoading(false));
    }
  }, [courseTeacher, teachers]);

  useEffect(() => { if (courseTeacher) loadCourses(); }, [loadCourses]);

  const storedUser = (() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();
  const loggedInUsername = storedUser?.username || '';
  const loggedInRole = storedUser?.role || '';

  const currentAvatarIdx = (() => {
    try {
      const idx = parseInt((storedUser?.avatar_path || '').replace('avatar_', ''), 10);
      return isNaN(idx) ? 0 : idx % AVATARS.length;
    } catch { return 0; }
  })();

  const handleAvatarSelect = async (avatarId: string) => {
    const avatarPath = `avatar_${avatarId}`;
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        u.avatar_path = avatarPath;
        localStorage.setItem('user', JSON.stringify(u));
      }
      await fetch('/api/update-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loggedInUsername, avatar_path: avatarPath }),
      });
    } catch {}
    setShowAvatarPicker(false);
  };

  const handleLogout = () => {
    fetch('/api/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
    }).catch(() => {});
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    window.location.reload();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError('请输入账号和密码'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.trim(), password }) });
      const data = await res.json();
      if (data.status === 'success') {
        onLogin(data.user as PortalUser, data.token);
        window.location.href = '/dashboard';
      } else setError(data.detail || '登录失败');
    } catch { setError('无法连接服务器'); }
    finally { setLoading(false); }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center pt-6 px-6 pb-[3.8rem] overflow-hidden cursor-default relative"
      style={{ background: '#e8edf2' }}
    >
      {/* ════ CodeNova 卡片 — 背景层左上角，翻转联动：正面 CodeNova / 背面 课程广场 ════ */}
      <div className="absolute top-1 left-1 z-10">
        <div className="relative" style={{ perspective: '1200px' }}>
          <div
            className="relative"
            style={{
              transformStyle: 'preserve-3d',
              transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              willChange: 'transform',
            }}
          >
            {/* 正面：CodeNova + 副标题 */}
            <div
              className="neo-card flat"
              style={{ backfaceVisibility: 'hidden', minHeight: 0, padding: '0.9rem 1.5rem', borderRadius: '1.4rem' }}
            >
              <h1
                className="text-[2.2rem] font-semibold tracking-tight flex items-center gap-2"
                style={{
                  color: '#2c3e50',
                  textShadow: '0.15rem 0.15rem 0.3rem rgba(255,255,255,0.7), -0.15rem -0.15rem 0.3rem rgba(188,195,201,0.4)'
                }}
              >
                <Star className="w-8 h-8" style={{ color: '#2c3e50' }} /> CodeNova
              </h1>
              <div
                className="flex items-center gap-1.5 mt-1"
                style={{ color: '#5f6c7a', fontWeight: 500, whiteSpace: 'nowrap' }}
              >
                开源的少儿编程学习平台
              </div>
            </div>
            {/* 背面：课程广场 + 图标 */}
            <div
              className="neo-card flat"
              style={{
                backfaceVisibility: 'hidden',
                position: 'absolute',
                inset: 0,
                transform: 'rotateY(180deg)',
                minHeight: 0,
                padding: '0.9rem 1.5rem',
                borderRadius: '1.4rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div className="flex items-center gap-2" style={{ color: '#2c3e50', fontWeight: 600, fontSize: '1.5rem', whiteSpace: 'nowrap', textShadow: '0.15rem 0.15rem 0.3rem rgba(255,255,255,0.7), -0.15rem -0.15rem 0.3rem rgba(188,195,201,0.4)' }}>
                <Library className="w-8 h-8 ico-green" /> 课程广场
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flip-container max-w-6xl">
        <div className={`flip-inner ${flipped ? 'flipped' : ''}`}>

        {/* ════ 正面：主页 ════ */}
        <div className="flip-front">
        <div className="neo-wrap flat w-full">

        {/* ? 帮助按钮 — 母卡右上角（原位置） */}
        <div className="flex justify-end">
          <a href="/docs/guide/" className="neo-btn no-underline w-10 h-10 rounded-full" style={{ justifyContent: 'center', padding: 0 }}>
            <HelpCircle className="w-5 h-5" style={{ color: '#4a5c6c' }} />
          </a>
        </div>

        {/* ════ 4 等分卡片网格 ════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-2">

          {/* ─── 在线课程 ─── */}
          <div className="neo-card">
            <div className="mb-5">
              <Library className="w-11 h-11 ico-green" />
            </div>
            <h2
              className="text-[1.7rem] font-[650] mb-2"
              style={{ color: '#1e2b38', letterSpacing: '-0.2px' }}
            >
              在线课程
            </h2>
            <p
              className="text-sm mb-10 flex-1"
              style={{ color: '#4a5b6b', fontWeight: 500, lineHeight: 1.5 }}
            >
              进入课堂，获取素材与案例
            </p>
            <div className="flex justify-end">
              <button onClick={() => setFlipped(true)} className="neo-btn">
                <ArrowRight className="w-4 h-4 ico-green" /> 学习
              </button>
            </div>
          </div>

          {/* ─── 学习文档 ─── */} 
          <div className="neo-card">
            <div className="mb-5">
              <BookOpen className="w-11 h-11 ico-purple" />
            </div>
            <h2 className="text-[1.7rem] font-[650] mb-2" style={{ color: '#1e2b38', letterSpacing: '-0.2px' }}>
              学习文档
            </h2>
            {/* 翻转区，替换原来的副标题+空白 */}
            <div className="flip-container" style={{ flex: 1 }}>
              <div className={`flip-inner ${showDocFlip ? 'flipped' : ''}`} style={{ height: '100%' }}>
                <div className="flip-front" style={{ background: 'transparent', width: '100%', height: '100%' }}>
                  <p className="text-sm" style={{ color: '#4a5b6b', fontWeight: 500, lineHeight: 1.5 }}>
                    Python / C++ / Scratch
                  </p>
                </div>
                <div className="flip-back" onClick={() => setShowDocFlip(false)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'transparent', width: '100%', height: '100%', cursor: 'pointer' }}>
                  <a href="/docs/scratch_course/" className="neo-btn no-underline" style={{ minWidth: '5.5rem', justifyContent: 'center', padding: '0.3rem 0.6rem', fontSize: '0.75rem', boxShadow: '2px 2px 4px var(--neo-shadow-dark), -2px -2px 4px var(--neo-shadow-light)' }}>
                    <Puzzle className="w-3.5 h-3.5 ico-green" /> Scratch
                  </a>
                  <a href="/docs/python_course/" className="neo-btn no-underline" style={{ minWidth: '5.5rem', justifyContent: 'center', padding: '0.3rem 0.6rem', fontSize: '0.75rem', boxShadow: '2px 2px 4px var(--neo-shadow-dark), -2px -2px 4px var(--neo-shadow-light)' }}>
                    <Code2 className="w-3.5 h-3.5 ico-blue" /> Python
                  </a>
                  <a href="/docs/cpp_course/" className="neo-btn no-underline" style={{ minWidth: '5.5rem', justifyContent: 'center', padding: '0.3rem 0.6rem', fontSize: '0.75rem', boxShadow: '2px 2px 4px var(--neo-shadow-dark), -2px -2px 4px var(--neo-shadow-light)' }}>
                    <Code2 className="w-3.5 h-3.5 ico-orange" /> C++
                  </a>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowDocFlip(!showDocFlip)} className="neo-btn">
                {showDocFlip ? (
                  <><ArrowRight className="w-4 h-4" style={{ transform: 'rotate(180deg)' }} /> 返回</>
                ) : (
                  <><Search className="w-4 h-4 ico-purple" /> 浏览</>
                )}
              </button>
            </div>
          </div>

          {/* ─── 自由创作 ─── */}
          <div className="neo-card">
            <div className="mb-5">
              <Puzzle className="w-11 h-11 ico-blue" />
            </div>
            <h2
              className="text-[1.7rem] font-[650] mb-2"
              style={{ color: '#1e2b38', letterSpacing: '-0.2px' }}
            >
              自由创作
            </h2>
            <p
              className="text-sm mb-10 flex-1"
              style={{ color: '#4a5b6b', fontWeight: 500, lineHeight: 1.5 }}
            >
              Scratch 4.0 引擎
            </p>
            <div className="flex justify-end">
              <a href="/Scratch/index.html" className="neo-btn">
                <Play className="w-4 h-4 ico-blue" /> 创作
              </a>
            </div>
          </div>

          {/* ─── 个人中心 ─── */}
          <div className="col-span-1">
            <div className="flip-container" style={{ height: '100%' }}>
              <div className={`flip-inner ${showLoginFlip ? 'flipped' : ''}`}>
                <div className="flip-front neo-card h-full min-h-[22rem] relative">
                  <div className="mb-5">
                    <Award className="w-11 h-11 ico-orange" />
                  </div>
                  <h2 className="text-[1.7rem] font-[650] mb-2" style={{ color: '#1e2b38', letterSpacing: '-0.2px' }}>
                    {storedUser ? loggedInUsername : '个人中心'}
                  </h2>
                  <p className="text-sm flex-1" style={{ color: '#4a5b6b', fontWeight: 500, lineHeight: 1.5 }}>
                    {storedUser
                      ? (loggedInRole === 'teacher' ? '教师' : loggedInRole === 'student' ? '学生' : '')
                      : '记录你的成长路线'}
                  </p>
                  {storedUser ? (
                    <div
                      className={`absolute left-1/2 top-29/50 -translate-x-1/2 -translate-y-1/2 w-[4.2rem] h-[4.2rem] rounded-full bg-gradient-to-br ${AVATARS[currentAvatarIdx].bg} flex items-center justify-center text-[1.65rem] cursor-pointer select-none transition-transform hover:scale-110 z-10`}
                      onClick={() => setShowAvatarPicker(true)}
                      title="点击更换头像"
                    >
                      {AVATARS[currentAvatarIdx].icon}
                    </div>
                  ) : null}
                  <div className='flex gap-2 mt-4' style={{ justifyContent: storedUser ? 'center' : 'flex-end' }}>
                    {storedUser ? (
                      <>
                        <a href="/dashboard" className="neo-btn">
                          <LogIn className="w-4 h-4 ico-orange" /> 后台
                        </a>
                        <button onClick={handleLogout} className="neo-btn">
                          <X className="w-4 h-4" /> 退出
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setShowLoginFlip(true)} className="neo-btn">
                        <LogIn className="w-4 h-4 ico-orange" /> 登录
                      </button>
                    )}
                  </div>
                </div>
                <div className="flip-back neo-card" style={{ minHeight: '22rem' }}>
                  <h3 className="text-[1.5rem] font-bold text-center mt-6" style={{ color: '#1e2b38' }}>登录</h3>
                  {error && (
                    <p className="text-sm text-center py-2 rounded-lg" style={{ color: '#c96a2c', background: 'rgba(201,106,44,0.1)' }}>
                      {error}
                    </p>
                  )}
                  <form onSubmit={handleLogin} className="flex flex-col gap-3 flex-1 mt-8">{/* 表单垂直排列，间距0.75rem，撑满剩余空间 */}
                    <div className="neo-input-wrap">{/* 输入框外壳（内凹新拟态） */}
                      <input value={username} onChange={e => setUsername(e.target.value)} placeholder="用户名" />
                    </div>
                    <div className="neo-input-wrap">{/* 输入框外壳 */}
                      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="密码" />
                    </div>
                    <div className="flex justify-end gap-2 mt-auto">{/* 按钮右对齐，间距0.5rem，顶部自动撑开 */}
                      <button type="submit" disabled={loading} className="neo-btn">
                        <LogIn className="w-4 h-4" /> {loading ? '登录中...' : '登录'}
                      </button>
                      <button type="button" onClick={() => setShowLoginFlip(false)} className="neo-btn">
                        <X className="w-4 h-4" /> 取消
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
      </div>{/* flip-front end */}

      {showAvatarPicker && (
        <AvatarPicker
          currentAvatar={String(currentAvatarIdx)}
          onSelect={handleAvatarSelect}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}

      {/* ════ 背面：课程广场 ════ */}
      <div className="flip-back">
        <div className="neo-wrap flat w-full h-full" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: '0.75rem' }}>
          {/* 顶部导航 + 课程类型筛选 */}
          <div className="flex justify-between items-center px-2 flex-shrink-0">
            {/* 类型筛选 — 凹陷胶囊滑动切换（课程广场标题已移到左上角小卡背面） */}
            <div ref={typeWrapRef} className="relative flex items-center gap-0 flex-shrink-0" style={{ paddingTop: '0.25rem', paddingBottom: '0.25rem' }}>
                {/* 滑动凹陷胶囊 */}
                <div
                  className="absolute rounded-full transition-all duration-300 pointer-events-none"
                  style={{
                    left: typeInd.left,
                    width: typeInd.width,
                    top: '0.25rem',
                    bottom: '0.25rem',
                    background: 'var(--neo-bg)',
                    boxShadow: 'inset 3px 3px 6px var(--neo-shadow-dark), inset -3px -3px 6px var(--neo-shadow-light)',
                    zIndex: 0,
                  }}
                />
                {([
                  ['全部', '全部'],
                  ['scratch', 'Scratch'],
                  ['python', 'Python'],
                  ['cpp', 'C++'],
                ] as [string, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    data-type={val}
                    onClick={() => { setCourseType(val); backToCourses(); }}
                    className="flex-shrink-0 flex items-center gap-1"
                    style={{
                      border: 'none', cursor: 'pointer',
                      padding: '0.15rem 0.7rem', fontSize: '0.85rem',
                      fontWeight: courseType === val ? 700 : 600,
                      borderRadius: '1rem', whiteSpace: 'nowrap',
                      color: courseType === val ? '#1e2b38' : '#5f6c7a',
                      background: 'transparent',
                      transition: 'color 0.15s',
                      zIndex: 1,
                    }}
                  >
                    {val === '全部' ? <LayoutGrid className="w-3.5 h-3.5" style={{ color: '#5f6c7a' }} /> : TYPE_ICON[val]({ className: 'w-3.5 h-3.5' })}
                    {label}
                  </button>
                ))}
              </div>
            <button onClick={() => setFlipped(false)} className="neo-btn flex-shrink-0">
              <ArrowRight className="w-4 h-4" style={{ transform: 'rotate(180deg)' }} /> 返回
            </button>
          </div>

          {/* 老师选择 — 凹陷胶囊滑动切换 */}
          <div ref={teacherWrapRef} className="relative px-2 flex-shrink-0" style={{ paddingTop: '0.25rem', paddingBottom: '0.25rem' }}>
            {/* 滑动凹陷胶囊 */}
            <div
              className="absolute rounded-full transition-all duration-300 pointer-events-none"
              style={{
                left: teacherInd.left,
                width: teacherInd.width,
                top: '0.25rem',
                bottom: '0.25rem',
                background: 'var(--neo-bg)',
                boxShadow: 'inset 3px 3px 6px var(--neo-shadow-dark), inset -3px -3px 6px var(--neo-shadow-light)',
                zIndex: 0,
              }}
            />
            <div className="relative flex items-center gap-0">
              <button data-teacher="全部" onClick={() => selectTeacher('全部')}
                className="flex-shrink-0"
                style={{
                  border: 'none', cursor: 'pointer',
                  padding: '0.3rem 0.85rem', fontSize: '0.75rem', fontWeight: 600,
                  borderRadius: '1.2rem', whiteSpace: 'nowrap',
                  color: courseTeacher === '全部' ? '#1e2b38' : '#5f6c7a',
                  background: 'transparent',
                  transition: 'color 0.15s',
                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                  zIndex: 1,
                }}>
                <Users className="w-4 h-4" style={{ color: courseTeacher === '全部' ? '#1e2b38' : '#5f6c7a' }} /> 全部
              </button>
              <div className="flex gap-0 overflow-x-auto" style={{ flex: 1, scrollbarWidth: 'none' }}>
                {teachers.map((t) => (
                  <button key={t.username} data-teacher={t.username} onClick={() => selectTeacher(t.username)}
                    className="flex-shrink-0"
                    style={{
                      border: 'none', cursor: 'pointer',
                      padding: '0.3rem 0.85rem', fontSize: '0.75rem', fontWeight: 600,
                      borderRadius: '1.2rem', whiteSpace: 'nowrap',
                      color: courseTeacher === t.username ? '#1e2b38' : '#5f6c7a',
                      background: 'transparent',
                      transition: 'color 0.15s',
                      display: 'flex', alignItems: 'center', gap: '0.25rem',
                      zIndex: 1,
                    }}>
                    <User className="w-4 h-4" style={{ color: courseTeacher === t.username ? '#1e2b38' : '#5f6c7a' }} /> {t.username}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 内容区域：课程列表 / 课件列表 */}
          <div className="flex-1 overflow-y-auto px-2 py-2 neo-scrollbar" style={{ minHeight: 0 }}>
            {selectedCourse ? (
              /* ── 课件视图 ── */
              <div>
                {materialsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <p style={{ color: '#4a5b6b' }}>加载中...</p>
                  </div>
                ) : materials.length === 0 ? (
                  <div className="text-center py-12" style={{ color: '#5f6c7a' }}>
                    该课程暂无课件
                  </div>
                ) : selectedCourse.type === 'scratch' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {materials.map(m => (
                      <a
                        key={m.name}
                        href={`/Scratch/index.html?folder=${encodeURIComponent(m.url)}`}
                        target="_blank"
                        className="neo-card !min-h-0 !p-4 no-underline cursor-pointer hover:brightness-95 transition-all flex flex-col items-center text-center gap-2"
                        style={{ borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.4)', boxShadow: '4px 4px 8px var(--neo-shadow-dark), -4px -4px 8px var(--neo-shadow-light)' }}
                      >
                        <FolderOpen className="w-8 h-8 ico-green" />
                        <div className="font-semibold text-sm truncate w-full" style={{ color: '#1e2b38' }}>
                          {m.name}
                        </div>
                        <div className="text-xs" style={{ color: '#5f6c7a' }}>
                          {m.has_main && m.has_student ? '👥 师生版' : m.has_main ? '📘 教师版' : `${m.sb3_count} 个 sb3`}
                        </div>
                        <div className="text-xs" style={{ color: '#2e8b57' }}>打开编辑器 ↗</div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {materials.map(m => (
                      <div key={m.name} className="neo-card !min-h-0 !p-4" style={{ borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.4)', boxShadow: '4px 4px 8px var(--neo-shadow-dark), -4px -4px 8px var(--neo-shadow-light)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <Folder className="w-5 h-5" style={{ color: '#5f6c7a' }} />
                          <span className="font-semibold text-sm" style={{ color: '#1e2b38' }}>{m.name}</span>
                          <span className="text-xs" style={{ color: '#5f6c7a' }}>{m.file_count} 个文件</span>
                        </div>
                        {m.files && m.files.length > 0 && (
                          <div className="flex flex-col gap-1">
                            {m.files.map(f => (
                              <a key={f.name} href={`${m.url}${f.name}`} target="_blank"
                                className="neo-btn justify-between text-sm no-underline">
                                <span className="flex items-center gap-2 truncate">
                                  <FileText className="w-4 h-4 flex-shrink-0" style={{ color: '#5f6c7a' }} />
                                  <span className="truncate">{f.name}</span>
                                </span>
                                <span className="text-xs" style={{ color: '#5f6c7a' }}>{(f.size / 1024).toFixed(1)} KB</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : coursesLoading ? (
              <div className="flex items-center justify-center h-full">
                <p style={{ color: '#4a5b6b' }}>加载中...</p>
              </div>
            ) : courses.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p style={{ color: '#4a5b6b' }}>暂无课程</p>
              </div>
            ) : courses.filter(c => courseType === '全部' || c.type === courseType).length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p style={{ color: '#4a5b6b' }}>该类型暂无课程</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.filter(c => courseType === '全部' || c.type === courseType).map(c => (
                  <button
                    key={c.name}
                    onClick={() => loadMaterials(c)}
                    className="neo-card !min-h-0 !p-4 cursor-pointer hover:brightness-95 transition-all text-left w-full"
                    style={{ borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.4)', fontFamily: 'inherit', boxShadow: '4px 4px 8px var(--neo-shadow-dark), -4px -4px 8px var(--neo-shadow-light)' }}
                  >
                    <div className="flex items-center gap-3">
                      {TYPE_ICON[c.type] ? TYPE_ICON[c.type]({ className: 'w-7 h-7' }) : <Folder className="w-7 h-7" style={{ color: '#5f6c7a' }} />}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[1.1rem] font-semibold truncate" style={{ color: '#1e2b38' }}>
                          {c.name}
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: '#5f6c7a' }}>
                          {c.material_count} 个课件
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: '#4a5b6b' }} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      </div>{/* flip-inner end */}
      </div>{/* flip-container end */}

      {/* ════ 站点信息（右下角 · 烫金字，贴浏览器底部） ════ */}
      <div
        className="select-none"
        style={{
          position: 'fixed',
          right: '1rem',
          bottom: '0.4rem',
          textAlign: 'right',
          color: '#2c3e50',
          fontSize: '0.68rem',
          lineHeight: 1.7,
          fontWeight: 'normal',
          letterSpacing: 'normal',
          opacity: 1,
          textShadow: '0.15rem 0.15rem 0.3rem rgba(255,255,255,0.7), -0.15rem -0.15rem 0.3rem rgba(188,195,201,0.4)',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <div>Copyright © 2025-present Arin|QC-Studio</div>
        <div>粤ICP备2026057743号-1</div>
      </div>

      {/* Login Modal */}
      {showLogin && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(232,237,242,0.7)', backdropFilter: 'blur(6px)' }}
        >
          <div className="neo-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[1.8rem] font-bold mb-4 text-center" style={{ color: '#1e2b38' }}>
              CodeNova
            </h3>
            <p className="mb-6 text-center" style={{ color: '#4a5b6b' }}>
              记录你的成长路线，同步创作进度
            </p>

            {error && (
              <p
                className="text-sm text-center mb-4 py-2 rounded-lg"
                style={{ color: '#c96a2c', background: 'rgba(201,106,44,0.1)' }}
              >
                {error}
              </p>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="neo-input-wrap">
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="用户名"
                />
              </div>
              <div className="neo-input-wrap">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="密码"
                />
              </div>
              <div className="flex gap-4 justify-center pt-2">
                <button type="submit" disabled={loading} className="neo-btn">
                  <LogIn className="w-3.5 h-3.5" /> {loading ? '登录中...' : '登录'}
                </button>
                <button type="button" onClick={() => setShowLogin(false)} className="neo-btn">
                  <X className="w-3.5 h-3.5" />
                  关闭
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
