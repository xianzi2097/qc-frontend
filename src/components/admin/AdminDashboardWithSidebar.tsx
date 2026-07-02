import { Shield, LogOut, Home } from 'lucide-react';
import { AVATARS } from '../ui/AvatarPicker';
import AdminDashboard from './AdminDashboard';

interface Props {
  username: string;
  role: string;
  logout: () => void;
}

function getAvatarCfg() {
  try {
    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;
    const idx = parseInt((user?.avatar_path || '').replace('avatar_', ''), 10);
    return AVATARS[isNaN(idx) ? 0 : idx % AVATARS.length];
  } catch { return AVATARS[0]; }
}

export default function AdminDashboardWithSidebar({ username, role, logout }: Props) {
  return (
    <div className="flex h-screen bg-cyber-bg text-slate-100 font-sans selection:bg-geek-green selection:text-black">
      <div className="w-64 bg-slate-900 border-r border-geek-green/10 flex flex-col justify-between p-4">
        <div>
          <div className="flex items-center gap-3 px-2 py-4 mb-6 border-b border-slate-600">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-orange via-purple-500 to-cyan-400 flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.3)]">
              <span className="text-3xl">🍊</span>
            </div>
            <div>
              <h1 className="font-bold text-base tracking-wider text-white">青橙 Studio</h1>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Shield size={12} className="text-purple-400" />
                管理后台
              </span>
            </div>
          </div>

          <nav className="space-y-1">
            <div className="text-xs text-slate-500 px-4 py-2 font-mono tracking-wider">
              <Shield size={14} className="inline mr-1 text-purple-400" /> 系统管理
            </div>
            <div className="border-t border-slate-600 pt-3 mt-3">
              <a href="/" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-slate-400 hover:bg-slate-800/60 hover:text-slate-200">
                <Home size={16} /> 返回主页
              </a>
            </div>
          </nav>
        </div>

        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-600 flex items-center gap-2">
          <div className="bg-purple-500 w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0">
            {getAvatarCfg().icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-purple-400 truncate">{username}</p>
            <p className="text-xs text-slate-600 font-mono">{role}</p>
          </div>
          <button onClick={logout} className="text-slate-500 hover:text-rose-400 transition-colors shrink-0" title="退出登录">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-8">
        <AdminDashboard />
      </main>
    </div>
  );
}
