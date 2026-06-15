import { useState } from 'react';
import { Cpu, Key, User, LogIn } from 'lucide-react';
import { StarsBackground } from './ui/StarsBackground';
import { SparklesCore } from './ui/sparkles';

interface Props {
  onLogin: (user: { username: string; role: string; nickname: string; avatar_path: string }) => void;
}

export default function HomePage({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('请输入账号和密码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        const user = data.user;
        localStorage.setItem('user', JSON.stringify(user));
        onLogin(user);
      } else {
        setError(data.detail || '登录失败');
      }
    } catch {
      setError('无法连接服务器');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center relative overflow-hidden bg-cyber-bg">
      <StarsBackground />

      {/* 顶部光晕 */}
      <SparklesCore
        className="absolute inset-0"
        background="transparent"
        minSize={0.6}
        maxSize={1.4}
        particleDensity={60}
        particleColor="#f97316"
        speed={1.2}
      />

      <div className="relative z-10 w-full max-w-sm mx-auto px-6">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-orange via-purple-500 to-cyan-400 mb-6 shadow-[0_0_40px_rgba(249,115,22,0.3)]">
            <span className="text-4xl">🍊</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">
            青橙 Studio
          </h1>
          <p className="text-slate-400 text-sm flex items-center justify-center gap-1.5">
            <Cpu size={13} className="text-geek-green" />
            少儿编程学习平台
          </p>
        </div>

        {/* 登录表单 */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="账号"
              autoFocus
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-slate-200 placeholder-slate-600 outline-none focus:border-brand-orange/50 transition-colors"
            />
          </div>
          <div className="relative">
            <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="密码"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-slate-200 placeholder-slate-600 outline-none focus:border-brand-orange/50 transition-colors"
            />
          </div>

          {error && (
            <p className="text-rose-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-orange text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-orange-500 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={18} />
                登录
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-600 mt-8">
          青橙 Studio · 教师端 &amp; 学生端
        </p>
      </div>
    </div>
  );
}
