import { useState, useEffect } from 'react';
import { BookOpen, GraduationCap, Award, Puzzle } from 'lucide-react';
import { StarsBackground } from './ui/StarsBackground';
import { SparklesCore } from './ui/sparkles';

interface Props {
  onLogin: (user: { username: string; role: string; nickname: string; avatar_path: string }) => void;
}

export default function HomePage({ onLogin }: Props) {
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const update = () => setZoom(window.innerWidth >= 2000 ? 1.25 : 1);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError('请输入账号和密码'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.trim(), password }) });
      const data = await res.json();
      if (data.status === 'success') { localStorage.setItem('user', JSON.stringify(data.user)); onLogin(data.user); }
      else setError(data.detail || '登录失败');
    } catch { setError('无法连接服务器'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center relative overflow-hidden bg-cyber-bg p-6">
      <StarsBackground />

      <SparklesCore
        className="absolute inset-0"
        background="transparent"
        minSize={0.6}
        maxSize={1.4}
        particleDensity={30}
        particleColor="#f97316"
        speed={1.0}
      />

      {/* 主内容区 — 纯 Tailwind，zoom 只作用于卡片区 */}
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

        {/* 卡片区 — 只有这里 zoom，背景和 footer 不受影响 */}
        <div style={{ zoom, width: '100%', maxWidth: 1152 / zoom, padding: '0 32px' }}>

        {/* ================= ROW 1 ================= */}
        <div className="grid grid-cols-5 gap-5 mb-5">

          {/* Scratch 课堂 — 占 3 列 */}
          <div className="col-span-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-8 flex flex-col justify-center items-center text-center gap-4 hover:border-green-500/30 transition-all duration-300 group hover:translate-y-[-2px]">
            <GraduationCap size={48} className="text-green-400 shrink-0 group-hover:scale-110 transition-transform" />
            <h2 className="text-lg font-bold text-white shrink-0">Scratch 课堂</h2>
            <p className="text-sm text-slate-500 shrink-0">进入课堂，获取素材与案例</p>
            <div className="flex gap-2 justify-center shrink-0">
              <a className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-1.5 rounded-lg transition-colors" href="/classroom/?teacher=arin">Arin老师</a>
              <a className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-1.5 rounded-lg transition-colors" href="/classroom/?teacher=lin">大白老师</a>
            </div>
          </div>

          {/* 个人中心 — 占 2 列 */}
          <div className="col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-8 flex flex-col justify-center items-center text-center gap-4 hover:border-orange-500/30 transition-all duration-300 group hover:translate-y-[-2px]">
            <Award size={48} className="text-orange-400 shrink-0 group-hover:scale-110 transition-transform" />
            <h2 className="text-lg font-bold text-white shrink-0">个人中心</h2>
            <p className="text-sm text-slate-500 shrink-0">记录你的成长路线</p>
            <button
              onClick={() => setShowLogin(true)}
              className="text-sm bg-brand-orange hover:bg-brand-orange/90 text-black font-bold px-5 py-2 rounded-lg shrink-0 transition-colors"
            >
              登录
            </button>
          </div>

        </div>

        {/* ================= ROW 2 ================= */}
        <div className="grid grid-cols-5 gap-5">

          {/* 学习文档 — 占 3 列 */}
          <div className="col-span-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-8 flex flex-col justify-center items-center text-center gap-4 hover:border-purple-500/30 transition-all duration-300 group hover:translate-y-[-2px]">
            <BookOpen size={48} className="text-purple-400 shrink-0 group-hover:scale-110 transition-transform" />
            <h2 className="text-lg font-bold text-white shrink-0">学习文档</h2>
            <p className="text-sm text-slate-500 shrink-0">Python / C++ / Scratch</p>
            <div className="flex gap-2 justify-center flex-wrap shrink-0">
              <a className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-1.5 rounded-lg transition-colors" href="/docs/scratch_course/">Scratch</a>
              <a className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-1.5 rounded-lg transition-colors" href="/docs/python_course/">Python</a>
              <a className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-1.5 rounded-lg transition-colors" href="/docs/cpp_course/">C++</a>
            </div>
          </div>

          {/* 自由创作 — 占 2 列 */}
          <a
            href="/Scratch/index.html"
            className="col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-8 flex flex-col justify-center items-center text-center gap-4 no-underline group hover:border-cyan-500/30 transition-all duration-300 hover:translate-y-[-2px]"
          >
            <Puzzle size={48} className="text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
            <h2 className="text-lg font-bold text-white shrink-0">自由创作</h2>
            <p className="text-sm text-slate-500 shrink-0">Scratch 4.0 引擎</p>
            <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2.5 py-0.5 rounded-full shrink-0">纯净模式</span>
          </a>

        </div>

        </div>{/* zoom 容器结束 */}

      </div>

      {/* Footer */}
      <p className="relative z-10 text-center text-xs text-slate-700 pb-5 shrink-0">
        粤ICP备2026057743号-1 · Arin | 青橙
      </p>

      {/* Login Modal */}
      {showLogin && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setShowLogin(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
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
