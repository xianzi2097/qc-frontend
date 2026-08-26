import { useState } from 'react';
import { X } from 'lucide-react';
import { login } from '../../lib/api';
import type { PortalUser } from '../../lib/useAuth';

interface Props {
  open: boolean;
  onClose: () => void;
  onLogin: (user: PortalUser, token?: string) => void;
}

/** 登录面板 — 纸面卡片 + 下划线输入框（杂志订阅卡风格），替代旧版卡片背面翻转登录 */
export default function LoginPanel({ open, onClose, onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError('请输入账号和密码'); return; }
    setLoading(true);
    setError('');
    try {
      const { user, token } = await login(username.trim(), password);
      onLogin(user, token);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : '无法连接服务器');
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-[22rem] max-w-[90vw] bg-ed-paper border border-ed-line shadow-2xl p-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="ed-serif text-[1.9rem] font-bold text-ed-ink tracking-tight">登入</h2>
          <button
            onClick={onClose}
            className="p-1 -m-1 text-ed-muted hover:text-ed-ink transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-[0.7rem] text-ed-muted tracking-[0.25em] mt-1 mb-8">
          CODE NOVA · 记录你的成长路线
        </p>

        {error && (
          <p className="text-sm text-brand-orange bg-brand-orange/10 px-3 py-2 mb-5">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <label className="block">
            <span className="text-[0.68rem] tracking-[0.2em] text-ed-muted">用户名 / USERNAME</span>
            <input
              autoFocus
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="mt-1 w-full bg-transparent border-0 border-b border-ed-line focus:border-brand-orange outline-none py-1.5 text-sm text-ed-ink transition-colors"
            />
          </label>
          <label className="block">
            <span className="text-[0.68rem] tracking-[0.2em] text-ed-muted">密码 / PASSWORD</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full bg-transparent border-0 border-b border-ed-line focus:border-brand-orange outline-none py-1.5 text-sm text-ed-ink transition-colors"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-ed-ink text-white py-2.5 text-sm tracking-[0.4em] hover:bg-brand-orange transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading ? '登录中' : '进入'}
          </button>
        </form>
      </div>
    </div>
  );
}
