import { useState } from 'react';
import { Cpu, BookOpen, GraduationCap, Award, Puzzle, User, Key, X } from 'lucide-react';
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

    {/* 卡片区 — flex 比例 + aspect-square，和后台一样自动适配屏幕 */}
    <div className="relative z-10 w-full max-w-[880px] mx-auto flex-1 flex flex-col justify-center">

      {/* Header（不动内容） */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-orange via-purple-500 to-cyan-400 flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.3)]">
          <span className="text-3xl">🍊</span>
        </div>

        <div>
          <h1 className="text-2xl font-black text-white">
            QC-Studio
            <span className="ml-2 text-xs bg-brand-orange/20 text-brand-orange px-2 py-0.5 rounded-full">
              Beta
            </span>
          </h1>
          <p className="text-slate-400 text-sm">少儿编程学习平台</p>
        </div>
      </div>

      {/* ================= ROW 1 ================= */}
      <div className="flex gap-5 mb-5">

        {/* Scratch 课堂 */}
        <div className="flex-[2] bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center items-center text-center gap-3">
          <GraduationCap size={42} className="text-green-400 shrink-0" />
          <h2 className="text-white font-bold text-xl shrink-0">Scratch 课堂</h2>
          <p className="text-slate-500 text-sm shrink-0">进入课堂，获取素材与案例</p>
          <div className="flex gap-2 justify-center shrink-0">
            <a className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-lg transition-colors" href="/classroom/?teacher=arin">Arin老师</a>
            <a className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-lg transition-colors" href="/classroom/?teacher=lin">大白老师</a>
          </div>
        </div>

        {/* 个人中心 — flex比例 + aspect-square，自动正方形 */}
        <div className="flex-[0.8] bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center items-center text-center gap-3 aspect-square">
          <Award size={42} className="text-orange-400 shrink-0" />
          <h2 className="text-white font-bold text-xl shrink-0">个人中心</h2>
          <p className="text-slate-500 text-sm shrink-0">记录你的成长路线</p>
          <button
            onClick={() => setShowLogin(true)}
            className="text-sm bg-brand-orange hover:bg-brand-orange/90 text-black font-bold px-5 py-2 rounded-lg shrink-0 transition-colors"
          >
            登录
          </button>
        </div>

      </div>

      {/* ================= ROW 2 ================= */}
      <div className="flex gap-5">

        {/* 学习文档 */}
        <div className="flex-[2] bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center items-center text-center gap-3">
          <BookOpen size={42} className="text-purple-400 shrink-0" />
          <h2 className="text-white font-bold text-xl shrink-0">学习文档</h2>
          <p className="text-slate-500 text-sm shrink-0">Python / C++ / Scratch</p>
          <div className="flex gap-2 justify-center flex-wrap shrink-0">
            <a className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-lg transition-colors" href="/docs/scratch_course/">Scratch</a>
            <a className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-lg transition-colors" href="/docs/python_course/">Python</a>
            <a className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-lg transition-colors" href="/docs/cpp_course/">C++</a>
          </div>
        </div>

        {/* 自由创作 — flex比例 + aspect-square，自动正方形 */}
        <a
          href="/Scratch/index.html"
          className="flex-[0.8] bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center items-center text-center gap-3 aspect-square no-underline group"
        >
          <Puzzle size={42} className="text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
          <h2 className="text-white font-bold text-xl shrink-0">自由创作</h2>
          <p className="text-slate-500 text-sm shrink-0">Scratch 4.0 引擎</p>
          <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full shrink-0">纯净模式</span>
        </a>

      </div>

    </div>

    {/* Footer — 固定底部 */}
    <p className="relative z-10 text-center text-xs text-slate-700 pb-4 shrink-0">
      粤ICP备2026057743号-1 · Arin | 青橙
    </p>

    {/* Login */}
    {showLogin && (
      <div
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        onClick={() => setShowLogin(false)}
      >
        <div
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-white text-lg font-bold mb-4 text-center">
            登录
          </h2>

          <form onSubmit={handleLogin} className="space-y-3">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="账号"
              className="w-full bg-slate-800 px-3 py-2 rounded-lg text-white"
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="密码"
              className="w-full bg-slate-800 px-3 py-2 rounded-lg text-white"
            />

            <button className="w-full bg-brand-orange text-black font-bold py-2 rounded-lg">
              {loading ? "登录中..." : "登录"}
            </button>
          </form>
        </div>
      </div>
    )}
  </div>
);
}
