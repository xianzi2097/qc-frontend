import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Award, Puzzle, Code2,
  Star, LogIn, Play, X, HelpCircle,
  Library, ArrowRight, Search,
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
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);

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
      className="min-h-screen flex items-center justify-center p-6 cursor-default"
      style={{ background: '#e8edf2' }}
    >
      <div className="flip-container max-w-6xl">
        <div className={`flip-inner ${flipped ? 'flipped' : ''}`}>

        {/* ════ 正面：主页 ════ */}
        <div className="flip-front">
        <div className="neo-wrap w-full">

        {/* ════ 欢迎区 ════ */}
        <div className="flex justify-between items-center flex-wrap gap-4 px-2">
          <div>
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
              style={{ color: '#5f6c7a', fontWeight: 500 }}
            >
            开源少儿编程学习平台
            </div>
          </div>

          <a href="/docs/guide/" className="neo-btn no-underline w-10 h-10 rounded-full" style={{ justifyContent: 'center', padding: 0 }}>
            <HelpCircle className="w-5 h-5" style={{ color: '#4a5c6c' }} />
          </a>
        </div>

        {/* ════ 4 等分卡片网格 ════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

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
                <div className="flip-front neo-card h-full min-h-[22rem]">
                  <div className="mb-5">
                    <Award className="w-11 h-11 ico-orange" />
                  </div>
                  <h2 className="text-[1.7rem] font-[650] mb-2" style={{ color: '#1e2b38', letterSpacing: '-0.2px' }}>
                    {storedUser ? loggedInUsername : '个人中心'}
                  </h2>
                  <p className="text-sm mb-4 flex-1" style={{ color: '#4a5b6b', fontWeight: 500, lineHeight: 1.5 }}>
                    {storedUser
                      ? (loggedInRole === 'teacher' ? '教师' : loggedInRole === 'student' ? '学生' : '')
                      : '记录你的成长路线'}
                  </p>
                  {storedUser ? (
                    <div className="flex-1 flex items-center justify-center mb-4">
                      <div
                        className={`w-14 h-14 rounded-full bg-gradient-to-br ${AVATARS[currentAvatarIdx].bg} flex items-center justify-center text-2xl cursor-pointer select-none transition-transform hover:scale-110`}
                        onClick={() => setShowAvatarPicker(true)}
                        title="点击更换头像"
                      >
                        {AVATARS[currentAvatarIdx].icon}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1" />
                  )}
                  <div className='flex justify-center gap-2'>
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

        {/* ════ 分割线 + 备案 ════ */}
        <hr className="neo-hr" />
        <p className="text-xs text-center mb-2" style={{ color: '#5f6c7a' }}>
          粤ICP备2026057743号-1 · Arin | 青橙
        </p>
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
        <div className="neo-wrap w-full h-full" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* 顶部导航 */}
          <div className="flex justify-between items-center px-2 flex-shrink-0">
            <h1
              className="text-[1.5rem] font-semibold tracking-tight flex items-center gap-2"
              style={{
                color: '#2c3e50',
                textShadow: '0.15rem 0.15rem 0.3rem rgba(255,255,255,0.7), -0.15rem -0.15rem 0.3rem rgba(188,195,201,0.4)'
              }}
            >
              <Library className="w-6 h-6 ico-green" /> 课程广场
            </h1>
            <button onClick={() => setFlipped(false)} className="neo-btn">
              <ArrowRight className="w-4 h-4" style={{ transform: 'rotate(180deg)' }} /> 返回
            </button>
          </div>

          {/* 老师选择 — Tab 滑块 */}
          <div className="flex items-center gap-0 px-2 flex-shrink-0" style={{ paddingTop: '0.25rem', paddingBottom: '0.25rem' }}>
            <button onClick={() => selectTeacher('全部')}
              className="flex-shrink-0"
              style={{
                border: 'none', background: 'transparent', cursor: 'pointer',
                padding: '0.35rem 0.8rem', fontSize: '0.85rem', fontWeight: 600,
                color: courseTeacher === '全部' ? '#2c3e50' : '#5f6c7a',
                transition: 'all 0.15s', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: '0.25rem'
              }}>
              <Users className="w-4 h-4" style={{ color: '#5f6c7a' }} /> 全部
            </button>
            <div className="flex gap-0 overflow-x-auto" style={{ flex: 1, scrollbarWidth: 'none' }}>
              {teachers.map((t) => (
                <button key={t.username} onClick={() => selectTeacher(t.username)}
                  className="flex-shrink-0"
                  style={{
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    padding: '0.35rem 0.8rem', fontSize: '0.85rem', fontWeight: 600,
                    color: courseTeacher === t.username ? '#2c3e50' : '#5f6c7a',
                    transition: 'all 0.15s', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: '0.25rem'
                  }}>
                  <User className="w-4 h-4" style={{ color: '#5f6c7a' }} /> {t.username}
                </button>
              ))}
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map(c => (
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
