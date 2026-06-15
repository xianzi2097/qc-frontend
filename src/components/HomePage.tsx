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
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-cyber-bg p-6">
      <StarsBackground />
      <SparklesCore className="absolute inset-0" background="transparent" minSize={0.6} maxSize={1.4} particleDensity={30} particleColor="#f97316" speed={1.0} />

      <div className="relative z-10 w-full max-w-[90%] md:max-w-[65%] lg:max-w-[45%] mx-auto" style={{ zoom: 1.1 }}>
        {/* ── Header ── */}
        <div className="flex items-center gap-4 mb-10 animate-fadeIn">
          <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-orange via-purple-500 to-cyan-400 flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.3)]">
            <span className="text-3xl">🍊</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">QC -Studio<span className="ml-2 text-xs bg-brand-orange/20 text-brand-orange px-2 py-0.5 rounded-full font-medium align-middle">Beta - STD</span></h1>
            <p className="text-slate-400 text-sm flex items-center gap-1.5 mt-0.5"><Cpu size={12} className="text-geek-green" />少儿编程学习平台</p>
          </div>
        </div>

        {/* ── 卡片 ── */}
        <div className="grid grid-cols-3 gap-5 mb-8">

          {/* 1. Scratch 课堂 */}
          <div className="col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 transition-all duration-300 hover:border-geek-green/30 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] text-center">
            <h2 className="text-white font-bold text-lg mb-3">Scratch 课堂</h2>
            <div className="flex justify-center mb-4" style={{ color: '#10b981' }}><GraduationCap size={36} /></div>
            <p className="text-slate-500 text-sm mb-4">进入课堂，获取素材与案例</p>
            <div className="flex gap-2 justify-center flex-wrap">
              <a href="/classroom/?teacher=arin" className="text-xs bg-slate-800 text-slate-300 hover:text-white hover:bg-geek-green/20 px-3 py-1.5 rounded-lg transition-colors">Arin 老师</a>
              <a href="/classroom/?teacher=lin" className="text-xs bg-slate-800 text-slate-300 hover:text-white hover:bg-geek-green/20 px-3 py-1.5 rounded-lg transition-colors">大白 老师</a>
            </div>
          </div>

          {/* 2. 个人中心 */}
          <div className="col-span-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 transition-all duration-300 hover:border-brand-orange/30 hover:shadow-[0_0_30px_rgba(249,115,22,0.1)] text-center flex flex-col justify-center">
            <h2 className="text-white font-bold text-lg mb-3">个人中心</h2>
            <div className="flex justify-center mb-4" style={{ color: '#f97316' }}><Award size={36} /></div>
            <p className="text-slate-500 text-sm mb-4">记录你的成长路线</p>
            <div className="flex justify-center">
              <button onClick={() => setShowLogin(true)} className="text-xs bg-brand-orange text-black font-bold px-4 py-2 rounded-lg hover:bg-orange-500 transition-colors">登录</button>
            </div>
          </div>

          {/* 3. 学习文档 */}
          <div className="col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 transition-all duration-300 hover:border-purple-500/30 hover:shadow-[0_0_30px_rgba(139,92,246,0.1)] text-center">
            <h2 className="text-white font-bold text-lg mb-3">学习文档</h2>
            <div className="flex justify-center mb-4" style={{ color: '#8b5cf6' }}><BookOpen size={36} /></div>
            <p className="text-slate-500 text-sm mb-4">Python 与 C++ 进阶教程，积木百科全书</p>
            <div className="flex gap-2 justify-center flex-wrap">
              <a href="/docs/scratch_course/" className="text-xs bg-slate-800 text-slate-300 hover:text-white hover:bg-purple-500/20 px-3 py-1.5 rounded-lg transition-colors">Scratch</a>
              <a href="/docs/python_course/" className="text-xs bg-slate-800 text-slate-300 hover:text-white hover:bg-purple-500/20 px-3 py-1.5 rounded-lg transition-colors">Python</a>
              <a href="/docs/cpp_course/" className="text-xs bg-slate-800 text-slate-300 hover:text-white hover:bg-purple-500/20 px-3 py-1.5 rounded-lg transition-colors">C++</a>
            </div>
          </div>

          {/* 4. 自由创作 */}
          <a href="/Scratch/index.html" className="col-span-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 transition-all duration-300 hover:border-cyan-500/30 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] no-underline text-center">
            <h2 className="text-white font-bold text-lg mb-3">自由创作</h2>
            <div className="flex justify-center mb-4" style={{ color: '#06b6d4' }}><Puzzle size={36} /></div>
            <p className="text-slate-500 text-sm mb-3">使用 Scratch 4.0 开源引擎</p>
            <span className="inline-block text-[10px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full font-medium">纯净模式</span>
          </a>
        </div>

        {/* ── 登录弹窗 ── */}
        {showLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowLogin(false)}>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
              <div className="relative flex items-center justify-center mb-4">
                <h2 className="text-white font-bold text-lg">登录</h2>
                <button onClick={() => { setShowLogin(false); setError(''); }} className="absolute right-0 text-slate-500 hover:text-white"><X size={18} /></button>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="账号" autoFocus className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-200 placeholder-slate-600 outline-none focus:border-brand-orange/50 transition-colors" />
                </div>
                <div className="relative">
                  <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="密码" className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-200 placeholder-slate-600 outline-none focus:border-brand-orange/50 transition-colors" />
                </div>
                {error && <p className="text-rose-400 text-sm text-center">{error}</p>}
                <button type="submit" disabled={loading} className="w-full bg-brand-orange text-black font-bold py-3 rounded-xl hover:bg-orange-500 transition-colors disabled:opacity-50">{loading ? '登录中…' : '登录'}</button>
              </form>
            </div>
          </div>
        )}

        {/* ── 底部备案 ── */}
        <p className="fixed bottom-4 left-0 right-0 text-center text-xs text-slate-700 z-10">粤ICP备2026057743号-1 · Arin | 青橙</p>
      </div>
    </div>
  );
}
