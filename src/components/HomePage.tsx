import { useState } from 'react';
import {
  BookOpen, GraduationCap, Award, Puzzle, Code2,
  Star, MapPin, LogIn, Play, X, HelpCircle
} from 'lucide-react';
import AvatarPicker, { AVATARS } from './ui/AvatarPicker';

import type { PortalUser } from '../lib/useAuth';

interface Props {
  onLogin: (user: PortalUser, token?: string) => void;
  onSwitchHome?: () => void;
}

export default function HomePage({ onLogin, onSwitchHome: _onSwitchHome }: Props) {
  const [showLogin, setShowLogin] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    fetch('/api/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
    }).catch(() => {});
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
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#e8edf2' }}
    >
      <div className="neo-wrap w-full max-w-6xl">

        {/* ════ 欢迎区 ════ */}
        <div className="flex justify-between items-center flex-wrap gap-4 px-2">
          <div>
            <h1
              className="text-[2.2rem] font-semibold tracking-tight flex items-center gap-2"
              style={{
                color: '#2c3e50',
                textShadow: '2px 2px 4px rgba(255,255,255,0.7), -2px -2px 4px rgba(188,195,201,0.4)'
              }}
            >
              <Star size={32} style={{ color: '#2c3e50' }} /> CodeNova
            </h1>
            <div
              className="flex items-center gap-1.5 mt-1"
              style={{ color: '#5f6c7a', fontWeight: 500 }}
            >
              <MapPin size={14} style={{ color: '#4a5c6c' }} /> 新拟态 · 统一风格
            </div>
          </div>

          <a href="/docs/guide/" className="neo-btn no-underline w-16 h-16 rounded-full" style={{ justifyContent: 'center', padding: 0 }}>
            <HelpCircle size={36} style={{ color: '#4a5c6c' }} />
          </a>
        </div>

        {/* ════ 4 等分卡片网格 ════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* ─── 在线课程 ─── */}
          <div className="neo-card">
            <div className="mb-5">
              <GraduationCap size={44} className="ico-green" />
            </div>
            <h2
              className="text-[1.7rem] font-[650] mb-2"
              style={{ color: '#1e2b38', letterSpacing: '-0.2px' }}
            >
              在线课程
            </h2>
            <p
              className="text-sm mb-4 flex-1"
              style={{ color: '#4a5b6b', fontWeight: 500, lineHeight: 1.5 }}
            >
              查看全部课程
            </p>
            <div className="flex flex-wrap gap-2">
              <a href="/courses?type=scratch" className="neo-btn fixed-w">
                <Puzzle size={14} className="ico-green" /> Scratch
              </a>
              <a href="/courses?type=python" className="neo-btn fixed-w">
                <Code2 size={14} className="ico-blue" /> Python
              </a>
              <a href="/courses?type=cpp" className="neo-btn fixed-w">
                <Code2 size={14} className="ico-orange" /> C++
              </a>
            </div>
          </div>

          {/* ─── 学习文档 ─── */}
          <div className="neo-card">
            <div className="mb-5">
              <BookOpen size={44} className="ico-purple" />
            </div>
            <h2
              className="text-[1.7rem] font-[650] mb-2"
              style={{ color: '#1e2b38', letterSpacing: '-0.2px' }}
            >
              学习文档
            </h2>
            <p
              className="text-sm mb-4 flex-1"
              style={{ color: '#4a5b6b', fontWeight: 500, lineHeight: 1.5 }}
            >
              Python / C++ / Scratch
            </p>
            <div className="flex flex-wrap gap-2">
              <a href="/docs/scratch_course/" className="neo-btn fixed-w">
                <Puzzle size={14} className="ico-green" /> Scratch
              </a>
              <a href="/docs/python_course/" className="neo-btn fixed-w">
                <Code2 size={14} className="ico-blue" /> Python
              </a>
              <a href="/docs/cpp_course/" className="neo-btn fixed-w">
                <Code2 size={14} className="ico-orange" /> C++
              </a>
            </div>
          </div>

          {/* ─── 自由创作 ─── */}
          <div className="neo-card">
            <div className="mb-5">
              <Puzzle size={44} className="ico-blue" />
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
                <Play size={14} className="ico-blue" /> 创作
              </a>
            </div>
          </div>

          {/* ─── 个人中心 ─── */}
          <div className="neo-card">
            <div className="mb-5">
              {storedUser ? (
                (() => {
                  const idx = parseInt((loggedInAvatar || '').replace('avatar_', ''), 10);
                  const a = AVATARS[isNaN(idx) ? 0 : idx % AVATARS.length];
                  return (
                    <button
                      onClick={() => setShowAvatarPicker(true)}
                      className="neo-btn text-4xl w-16 h-16 rounded-full"
                      style={{ justifyContent: 'center', padding: 0 }}
                    >
                      {a.icon}
                    </button>
                  );
                })()
              ) : (
                <Award size={44} className="ico-orange" />
              )}
            </div>
            <h2
              className="text-[1.7rem] font-[650] mb-2"
              style={{ color: '#1e2b38', letterSpacing: '-0.2px' }}
            >
              {storedUser ? loggedInUsername : '个人中心'}
            </h2>
            <p
              className="text-sm mb-4 flex-1"
              style={{ color: '#4a5b6b', fontWeight: 500, lineHeight: 1.5 }}
            >
              {storedUser
                ? (loggedInRole === 'teacher' ? '教师' : loggedInRole === 'student' ? '学生' : '')
                : '记录你的成长路线'}
            </p>
            <div className={storedUser ? 'flex gap-2' : 'flex justify-end'}>
              {storedUser ? (
                <>
                  <a href="/dashboard" className="neo-btn">
                    <LogIn size={14} className="ico-orange" /> 后台
                  </a>
                  <button onClick={handleLogout} className="neo-btn">
                    <X size={14} /> 退出
                  </button>
                </>
              ) : (
                <button onClick={() => setShowLogin(true)} className="neo-btn">
                  <LogIn size={14} className="ico-orange" /> 登录
                </button>
              )}
            </div>
          </div>

        </div>

        {/* ════ 分割线 + 备案 ════ */}
        <hr className="neo-hr" />
        <p className="text-xs text-center" style={{ color: '#5f6c7a' }}>
          粤ICP备2026057743号-1 · Arin | 青橙
        </p>
      </div>

      {/* Avatar Picker */}
      {showAvatarPicker && (
        <AvatarPicker
          currentAvatar={loggedInAvatar}
          onSelect={handleAvatarSelect}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}

      {/* Login Modal */}
      {showLogin && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(232,237,242,0.7)', backdropFilter: 'blur(6px)' }}
        >
          <div className="neo-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[1.8rem] font-bold mb-4 text-center" style={{ color: '#1e2b38' }}>
              <LogIn size={24} style={{ color: '#5f6c7a' }} className="inline-block mr-2" /> 登录
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
                  <LogIn size={14} /> {loading ? '登录中...' : '登录'}
                </button>
                <button type="button" onClick={() => setShowLogin(false)} className="neo-btn">
                  <X size={14} /> 取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
