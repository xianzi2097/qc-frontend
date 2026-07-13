import { useState, useEffect } from 'react';
import { RotateCcw, UserX, Plus } from 'lucide-react';
import Loader from '../ui/Loader';

export default function AdminDashboard() {
  const [tab, setTab] = useState('users');

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-2 border-b border-slate-600 pb-3">
        <button
          onClick={() => setTab('users')}
          className={`text-sm px-4 py-2 rounded-lg transition-all ${tab === 'users' ? 'bg-geek-green text-black font-bold' : 'text-slate-400 hover:text-white'}`}
        >
          👥 用户管理
        </button>
        <button
          onClick={() => setTab('trash')}
          className={`text-sm px-4 py-2 rounded-lg transition-all ${tab === 'trash' ? 'bg-geek-green text-black font-bold' : 'text-slate-400 hover:text-white'}`}
        >
          🗑️ 垃圾桶
        </button>
      </div>

      {tab === 'users' ? <UserList /> : <TrashList />}
    </div>
  );
}

function UserList() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '111111', role: 'teacher' });
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    fetch('/api/users')
      .then(r => r.json())
      .then(d => { if (d.status === 'success') setUsers(d.users); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newUser.username.trim()) return;
    setMsg('');
    try {
      const r = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const d = await r.json();
      if (d.status === 'success') {
        setShowCreate(false);
        setNewUser({ username: '', password: '111111', role: 'teacher' });
        load();
      } else {
        setMsg(d.detail || '创建失败');
      }
    } catch {
      setMsg('请求失败');
    }
  };

  const handleDelete = async (username: string) => {
    if (!confirm(`确定删除 ${username}？将移入垃圾桶`)) return;
    await fetch(`/api/users/${username}`, { method: 'DELETE' });
    load();
  };

  if (loading) return <Loader text="加载用户列表..." />;

  return (
    <div className="space-y-3">
      {/* 创建老师 */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">共 {users.length} 个用户</span>
        <button onClick={() => setShowCreate(!showCreate)}
          className="text-xs bg-geek-green text-black font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
          <Plus size={14} /> 创建老师
        </button>
      </div>

      {showCreate && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3">
          <input value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}
            placeholder="老师账号" className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none w-40" />
          <input value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
            placeholder="密码" className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none w-32" />
          <button onClick={handleCreate}
            className="text-xs bg-brand-orange text-black font-bold px-4 py-1.5 rounded-lg">确定</button>
          {msg && <span className="text-xs text-rose-400">{msg}</span>}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-600 rounded-2xl overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-950/50 text-slate-400 text-xs tracking-wider border-b border-slate-600">
            <th className="p-4">ID</th>
            <th className="p-4">用户名</th>
            <th className="p-4">角色</th>
            <th className="p-4">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 text-sm">
          {users.map((u: any) => (
            <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
              <td className="p-4 text-slate-400 font-mono">{u.id}</td>
              <td className="p-4 font-bold text-white">{u.username}</td>
              <td className="p-4">
                <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : u.role === 'teacher' ? 'bg-brand-orange/20 text-brand-orange' : 'bg-cyan-400/20 text-cyan-400'}`}>
                  {u.role === 'admin' ? '管理员' : u.role === 'teacher' ? '老师' : '学生'}
                </span>
              </td>
              <td className="p-4">
                {u.role !== 'admin' && (
                  <button onClick={() => handleDelete(u.username)}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1">
                    <UserX size={14} /> 删除
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function TrashList() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch('/api/trash?username=admin')
      .then(r => r.json())
      .then(d => { if (d.status === 'success') setItems(d.trash); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRestore = async (id: number) => {
    await fetch(`/api/trash/restore/${id}?username=admin`, { method: 'POST' });
    load();
  };

  const handlePermanentDelete = async (id: number) => {
    if (!confirm('永久删除？不可恢复！')) return;
    await fetch(`/api/trash/${id}?username=admin`, { method: 'DELETE' });
    load();
  };

  const handleEmpty = async () => {
    if (!confirm('清空整个垃圾桶？不可恢复！')) return;
    await fetch('/api/trash?username=admin', { method: 'DELETE' });
    load();
  };

  if (loading) return <Loader text="加载垃圾桶..." />;

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="flex justify-end">
          <button onClick={handleEmpty}
            className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-1.5 hover:bg-rose-500/20">
            清空垃圾桶
          </button>
        </div>
      )}
      {items.length === 0 ? (
        <div className="text-center py-12 text-slate-500">垃圾桶为空</div>
      ) : (
        <div className="bg-slate-900 border border-slate-600 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 text-slate-400 text-xs tracking-wider border-b border-slate-600">
                <th className="p-4">用户名</th>
                <th className="p-4">角色</th>
                <th className="p-4">删除时间</th>
                <th className="p-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {items.map((t: any) => (
                <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 font-bold text-white">{t.username}</td>
                  <td className="p-4 text-slate-400">{t.role}</td>
                  <td className="p-4 text-slate-500 text-xs">{t.trashed_at}</td>
                  <td className="p-4 flex gap-1">
                    <button onClick={() => handleRestore(t.id)}
                      className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-1.5 hover:bg-green-500/20 flex items-center gap-1">
                      <RotateCcw size={12} /> 恢复
                    </button>
                    <button onClick={() => handlePermanentDelete(t.id)}
                      className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-1.5 hover:bg-rose-500/20">
                      永久删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
