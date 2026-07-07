import { useState, useEffect } from 'react';
import { BookOpen, GraduationCap, Award, Puzzle } from 'lucide-react';
import { StarsBackground } from './ui/StarsBackground';
import AvatarPicker, { AVATARS } from './ui/AvatarPicker';

import type { PortalUser } from '../lib/useAuth';

interface Props {
  onLogin: (user: PortalUser, token?: string) => void;
}

export default function HomePage({ onLogin }: Props) {
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
      const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.trim(), password }) });
      const data = await res.json();
      if (data.status === 'success') {
        onLogin(data.user as PortalUser, data.token);
        window.location.href = '/?view=dashboard';
      } else setError(data.detail || '登录失败');
    } catch { setError('无法连接服务器'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center relative overflow-hidden bg-cyber-bg p-6">
      <StarsBackground />

      {/* 主内容区 — 全部使用 rem 单位，修改 html font-size 整体缩放 */}
      <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-center">

        {/* Header */}
        <div className="flex items-center gap-5 mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-orange via-purple-500 to-cyan-400 flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.3)]">
            <span className="text-3xl">🍊</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              QC-Studio
              <span className="text-xs bg-brand-orange/20 text-brand-orange px-2.5 py-0.5 rounded-full">Beta</span>
            </h1>
            <p className="text-sm text-slate-400">少儿编程学习平台</p>
          </div>
        </div>

        {/* 英雄卡布局：Scratch 全宽 + 下方三张小卡 */}
        <div className="flex flex-col gap-5 w-full max-w-6xl px-8">

          {/* ════ 英雄卡：Scratch 课堂 — 全宽 ════ */}
          <div className="bg-slate-900/60 border border-green-500/20 rounded-2xl p-8 flex flex-col items-center text-center gap-4 hover:border-green-500/40 transition-all duration-300 group hover:translate-y-[-2px]">
            <GraduationCap className="w-16 h-16 text-green-400 shrink-0 group-hover:scale-110 transition-transform" />
            <h2 className="text-xl font-bold text-white shrink-0">Scratch 课堂</h2>
            <p className="text-sm text-slate-500 shrink-0">进入课堂，获取素材与案例</p>
            <div className="flex gap-3 justify-center shrink-0 flex-wrap">
              {teachers.length === 0 ? (
                <span className="text-sm text-slate-500">暂无老师</span>
              ) : (
                teachers.map((t) => (
                  <a
                    key={t.username}
                    className="text-sm bg-slate-800 hover:bg-green-600/30 text-slate-300 hover:text-green-300 px-5 py-2 rounded-lg transition-all"
                    href={`/?view=courses&teacher=${t.username}`}
                  >
                    {t.username}
                  </a>
                ))
              )}
            </div>
          </div>

          {/* ════ 底部：学习文档(宽) | 自由创作(方) | 个人中心(方) ════ */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">

            {/* 学习文档 — 占 2 列，宽大 */}
            <div className="col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center items-center text-center gap-3 hover:border-purple-500/30 transition-all duration-300 group hover:translate-y-[-2px]">
              <BookOpen className="w-14 h-14 text-purple-400 shrink-0 group-hover:scale-110 transition-transform" />
              <h2 className="text-lg font-bold text-white shrink-0">学习文档</h2>
              <p className="text-sm text-slate-500 shrink-0">Python / C++ / Scratch</p>
              <div className="flex gap-2 justify-center flex-wrap shrink-0">
                <a className="text-sm bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg transition-all font-bold" href="/docs/guide/">📖 使用指南</a>
                <a className="text-sm bg-slate-800 hover:bg-purple-600/30 text-slate-300 hover:text-purple-300 px-4 py-1.5 rounded-lg transition-all" href="/docs/scratch_course/">Scratch</a>
                <a className="text-sm bg-slate-800 hover:bg-purple-600/30 text-slate-300 hover:text-purple-300 px-4 py-1.5 rounded-lg transition-all" href="/docs/python_course/">Python</a>
                <a className="text-sm bg-slate-800 hover:bg-purple-600/30 text-slate-300 hover:text-purple-300 px-4 py-1.5 rounded-lg transition-all" href="/docs/cpp_course/">C++</a>
              </div>
            </div>

            {/* 自由创作 — 方卡 */}
            <a
              href="/Scratch/index.html"
              className="col-span-1 aspect-square bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center items-center text-center gap-3 no-underline group hover:border-cyan-500/30 transition-all duration-300 hover:translate-y-[-2px]"
            >
              <Puzzle className="w-14 h-14 text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
              <h2 className="text-lg font-bold text-white shrink-0">自由创作</h2>
              <p className="text-sm text-slate-500 shrink-0">Scratch 4.0 引擎</p>
              <span className="text-sm bg-cyan-500/20 text-cyan-400 px-3 py-0.5 rounded-full shrink-0">纯净模式</span>
            </a>

            {/* 个人中心 — 方卡，最右侧 */}
            <div className="col-span-1 aspect-square bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center items-center text-center gap-3 hover:border-orange-500/30 transition-all duration-300 group hover:translate-y-[-2px]">
              {storedUser ? (
                <>
                  {(() => {
                    const idx = parseInt((loggedInAvatar || '').replace('avatar_', ''), 10);
                    const a = AVATARS[isNaN(idx) ? 0 : idx % AVATARS.length];
                    return (
                      <button
                        onClick={() => setShowAvatarPicker(true)}
                        className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${a.bg} flex items-center justify-center text-2xl shadow-[0_0_35px_rgba(249,115,22,0.4)] shrink-0 cursor-pointer hover:scale-105 transition-transform`}
                      >
                        {a.icon}
                      </button>
                    );
                  })()}
                  <h2 className="text-lg font-bold text-white shrink-0">{loggedInUsername}</h2>
                  <p className="text-sm text-slate-500 shrink-0">{loggedInRole === 'teacher' ? '老师' : loggedInRole === 'student' ? '学生' : ''}</p>
                  <div className="flex gap-2 mt-1 shrink-0">
                    <a
                      href="/?view=dashboard"
                      className="text-sm bg-slate-800 hover:bg-orange-600/30 text-slate-300 hover:text-orange-300 px-4 py-2 rounded-lg transition-all"
                    >
                      进入空间
                    </a>
                    <button
                      onClick={handleLogout}
                      className="text-sm bg-slate-800 hover:bg-rose-600/30 text-slate-300 hover:text-rose-300 px-4 py-2 rounded-lg transition-all"
                    >
                      退出
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Award className="w-14 h-14 text-orange-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <h2 className="text-lg font-bold text-white shrink-0">个人中心</h2>
                  <p className="text-sm text-slate-500 shrink-0">记录你的成长路线</p>
                  <button
                    onClick={() => setShowLogin(true)}
                    className="text-sm bg-slate-800 hover:bg-orange-600/30 text-slate-300 hover:text-orange-300 px-5 py-2 rounded-lg transition-all"
                  >
                    登录
                  </button>
                </>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Avatar Picker */}
      {showAvatarPicker && (
        <AvatarPicker
          currentAvatar={loggedInAvatar}
          onSelect={handleAvatarSelect}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}

      {/* Footer — 备案信息 */}
      <p className="text-xs text-slate-700 mt-12 pb-5">
        粤ICP备2026057743号-1 · Arin | 青橙
      </p>

      {/* Login Modal */}
      {showLogin && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowLogin(false)}
              className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors text-lg leading-none"
            >
              ✕
            </button>
            <h2 className="text-white text-lg font-bold mb-4 text-center">登录</h2>

            {error && (
              <p className="text-red-400 text-sm text-center mb-3 bg-red-500/10 py-2 rounded-lg">{error}</p>
            )}

            <form onSubmit={handleLogin} className="space-y-3">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="账号"
                className="w-full bg-slate-800 px-4 py-2.5 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
              />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码"
                className="w-full bg-slate-800 px-4 py-2.5 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-orange hover:bg-brand-orange/90 disabled:opacity-50 text-black font-bold py-2.5 rounded-lg text-sm transition-colors"
              >
                {loading ? '登录中...' : '登录'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
