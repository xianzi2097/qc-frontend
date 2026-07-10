import { useState, useEffect, useMemo } from 'react';
import { BookOpen, GraduationCap, Award, Puzzle } from 'lucide-react';
import AvatarPicker, { AVATARS } from '../ui/AvatarPicker';
import type { PortalUser } from '../../lib/useAuth';
import PlanetScene from './PlanetScene';
import type { PlanetEntry } from './PlanetScene';

interface Props {
  onLogin: (user: PortalUser, token?: string) => void;
}

export default function StarHomePage({ onLogin }: Props) {
  const [showLogin, setShowLogin] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<{ username: string }[]>([]);

  useEffect(() => {
    fetch(`/api/users?t=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        if (data.status === 'success') {
          setTeachers(data.users.filter((u: any) => u.role === 'teacher'));
        }
      })
      .catch(() => {});
  }, []);

  const storedUser = (() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();
  const loggedInUsername = storedUser?.username || '';
  const loggedInRole = storedUser?.role || '';
  const loggedInAvatar = storedUser?.avatar_path || '0';

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    window.location.reload();
  };

  const handleAvatarSelect = async (avatarId: string) => {
    try {
      await fetch('/api/update-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: storedUser.username, avatar_path: `avatar_${avatarId}` }),
      });
      storedUser.avatar_path = `avatar_${avatarId}`;
      localStorage.setItem('user', JSON.stringify(storedUser));
      setShowAvatarPicker(false);
      window.location.reload();
    } catch {
      // ignore
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError('请输入账号和密码'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        onLogin(data.user as PortalUser, data.token);
        window.location.href = '/?view=dashboard';
      } else setError(data.detail || '登录失败');
    } catch { setError('无法连接服务器'); }
    finally { setLoading(false); }
  };

  const planetEntries = useMemo<PlanetEntry[]>(() => [
    {
      id: 'scratch',
      label: 'Scratch 课堂',
      desc: '进入课堂 获取素材与案例',
      color: '#4a9eff',
      size: 1.1,
      href: teachers.length > 0
        ? `/?view=courses&teacher=${teachers[0].username}`
        : '/?view=courses',
      textureKey: 'earth',
      axialTilt: 0.41, // ~23.4° 真实地轴倾斜
      x: 0, y: 0, z: 0,
      satellites: teachers.map(t => ({
        text: `👤 ${t.username}`,
        href: `/?view=courses&teacher=${t.username}`,
      })),
    },
    {
      id: 'docs',
      label: '学习文档',
      desc: 'Python / C++ / Scratch',
      color: '#94a3b8',
      size: 0.32,
      href: '/docs/guide/',
      textureKey: 'moon',
      noSelfRotation: true, // 潮汐锁定，永远一面对着地球
      axialTilt: 0.03,
      x: 1.6, y: 1.5, z: 0,
      satellites: [
        { text: '📘 Python', href: '/docs/python_course/' },
        { text: '📙 C++', href: '/docs/cpp_course/' },
        { text: '📗 Scratch', href: '/docs/scratch_course/' },
      ],
    },
    {
      id: 'create',
      label: '自由创作',
      desc: 'Scratch 4.0 引擎 · 纯净模式',
      color: '#e8c87a',
      size: 0.5,
      href: '/Scratch/index.html',
      textureKey: 'venus',
       x: -3.3, y: -0.05, z: 0,
      satellites: [
        { text: '🎨 开始创作', href: '/Scratch/index.html' },
      ],
    },
    {
      id: 'profile',
      label: '个人中心',
      desc: storedUser ? `${loggedInUsername} · ${loggedInRole === 'teacher' ? '老师' : '学生'}` : '登录 · 成长记录',
      color: '#fb923c',
      size: 0.55,
      href: '/?view=dashboard',
      textureKey: 'mars',
      x: 3.3, y: -0.05, z: 0,
      satellites: storedUser
        ? [
            { text: '🚪 进入空间', href: '/?view=dashboard' },
            { text: '🚪 退出', href: '#logout' },
          ]
        : [
            { text: '🚪 登录', href: '#login' },
          ],
    },
  ], [teachers, storedUser, loggedInUsername, loggedInRole]);

  const handlePlanetClick = (entry: PlanetEntry) => {
    if (entry.id === 'profile') {
      if (!storedUser) {
        setShowLogin(true);
        return;
      }
      // 如果点击的是退出卫星，走 logout
      window.location.href = entry.href;
      return;
    }
    window.location.href = entry.href;
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#050510' }}>
      {/* ── 固定 Logo（左上角，不参与 3D） ── */}
      <div style={{
        position: 'fixed',
        top: 20,
        left: 24,
        zIndex: 100,
        pointerEvents: 'none',
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(8px)',
        padding: '10px 20px',
        borderRadius: 14,
        border: '1px solid rgba(249,115,22,0.25)',
        lineHeight: 1.3,
      }}>
        <div style={{ color: '#fff', fontSize: 20, fontWeight: 900, letterSpacing: 1 }}>
          QC-Studio
          <span style={{
            fontSize: 10, fontWeight: 600, color: '#f97316',
            background: 'rgba(249,115,22,0.15)',
            padding: '1px 7px', borderRadius: 8,
            marginLeft: 6, verticalAlign: 'middle',
          }}>Beta</span>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 400, marginTop: 1 }}>
          青橙少儿编程学习平台
        </div>
      </div>

      {/* 3D 星球场景 */}
      <PlanetScene entries={planetEntries} onPlanetClick={handlePlanetClick} />

      {/* ── UI 覆盖层 ── */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none',
        zIndex: 10,
      }}>
        {/* 登录弹窗 */}
        {showLogin && (
          <div
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              pointerEvents: 'auto',
            }}
            onClick={() => setShowLogin(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
                padding: 32,
                width: 340,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}
            >
              <h2 style={{ color: '#fff', margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>
                登录 QC-Studio
              </h2>
              <form onSubmit={handleLogin}>
                <input
                  placeholder="账号"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', marginBottom: 12,
                    borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                    background: '#0f172a', color: '#fff', fontSize: 14, outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <input
                  type="password"
                  placeholder="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', marginBottom: 12,
                    borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                    background: '#0f172a', color: '#fff', fontSize: 14, outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {error && (
                  <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 8,
                    border: 'none', background: loading ? '#334155' : '#f97316',
                    color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
                  }}
                >
                  {loading ? '登录中...' : '登录'}
                </button>
              </form>
              <button
                onClick={() => setShowLogin(false)}
                style={{
                  width: '100%', padding: '8px', marginTop: 8,
                  borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: '#94a3b8', fontSize: 13, cursor: 'pointer',
                }}
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 头像选择器 */}
        {showAvatarPicker && (
          <div
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              pointerEvents: 'auto',
              zIndex: 20,
            }}
            onClick={() => setShowAvatarPicker(false)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <AvatarPicker
                currentAvatar={loggedInAvatar}
                onSelect={handleAvatarSelect}
                onClose={() => setShowAvatarPicker(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
