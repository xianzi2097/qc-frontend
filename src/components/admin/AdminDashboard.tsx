import { useState, useEffect } from 'react';
import { RotateCcw, UserX, Plus, UserCheck, UserPlus } from 'lucide-react';
import { useLoading } from '../../lib/useLoading';
import { apiV2 } from '../../lib/api';
import { confirmDelete, confirmDisable } from '../ui/confirmDelete';
import NewAccountCard from '../ui/NewAccountCard';

export default function AdminDashboard() {
  const [tab, setTab] = useState('users');

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-2 border-b border-slate-300 pb-3">
        <button
          onClick={() => setTab('users')}
          className={`text-sm px-4 py-2 rounded-lg transition-all ${tab === 'users' ? 'bg-geek-green text-black font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}
        >
          👥 用户管理
        </button>
        <button
          onClick={() => setTab('trash')}
          className={`text-sm px-4 py-2 rounded-lg transition-all ${tab === 'trash' ? 'bg-geek-green text-black font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}
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
  const { wrap } = useLoading();
  const [newRole, setNewRole] = useState<'teacher' | 'student' | null>(null);   // 新建账号卡片（2026-10-12 统一）
  const [msg, setMsg] = useState('');

  const load = () => {
    wrap(
      apiV2<{ items: { id: string; username: string; role: string; status: string }[] }>('/api/accounts')
        .then(d => setUsers(d.items)),
      '加载用户列表...'
    ).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  // 创建账号：统一委托 ui/NewAccountCard 卡片（onCreated 里 load 刷新列表）

  const handleDisable = async (u: { id: string; username: string }) => {
    const ok = await confirmDisable(u.username);
    if (!ok) return;
    try {
      await apiV2(`/api/accounts/${encodeURIComponent(u.id)}`, { method: 'DELETE' });
      setMsg(`已停用 ${u.username}，可随时启用`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '停用失败');
    }
  };

  const handleEnable = async (u: { id: string; username: string }) => {
    try {
      await apiV2(`/api/accounts/${encodeURIComponent(u.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      });
      setMsg(`已启用 ${u.username}`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '启用失败');
    }
  };

  return (
    <div className="space-y-3">
      {/* 创建账号：老师 / 学生（2026-10-12 统一走卡片）*/}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-600">共 {users.length} 个用户</span>
        <div className="flex items-center gap-2">
          <button onClick={() => { setMsg(''); setNewRole('teacher'); }}
            className="text-xs bg-geek-green text-black font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
            <Plus size={14} /> 创建老师
          </button>
          <button onClick={() => { setMsg(''); setNewRole('student'); }}
            className="text-xs bg-brand-orange text-black font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
            <UserPlus size={14} /> 新建学生
          </button>
        </div>
      </div>
      {msg && <div className="text-xs text-emerald-700 font-bold px-1">{msg}</div>}

      {/* 新建账号卡片（学生/老师通用：入职入学时间、备注、学生可选初始班级） */}
      {newRole && (
        <NewAccountCard role={newRole}
          onClose={() => setNewRole(null)}
          onCreated={({ username }) => {
            setMsg(`账号「${username}」已创建`);
            load();
          }} />
      )}

      <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs tracking-wider border-b border-slate-300">
            <th className="p-4">ID</th>
            <th className="p-4">用户名</th>
            <th className="p-4">角色</th>
            <th className="p-4">状态</th>
            <th className="p-4">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 text-sm">
          {users.map((u: any) => (
            <tr key={u.id} className="hover:bg-slate-50 transition-colors">
              <td className="p-4 text-slate-500 font-mono">{u.id}</td>
              <td className="p-4 font-bold text-slate-900">{u.username}</td>
              <td className="p-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'teacher' ? 'bg-orange-100 text-orange-700' : 'bg-cyan-100 text-cyan-700'}`}>
                  {u.role === 'admin' ? '管理员' : u.role === 'teacher' ? '老师' : '学生'}
                </span>
              </td>
              <td className="p-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${u.status === 'deleted' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {u.status === 'deleted' ? '已停用' : '正常'}
                </span>
              </td>
              <td className="p-4">
                {u.role !== 'admin' && u.status === 'deleted' && (
                  <button onClick={() => handleEnable(u)}
                      className="text-xs text-emerald-700 hover:text-emerald-900 flex items-center gap-1 font-bold">
                    <UserCheck size={14} /> 启用
                  </button>
                )}
                {u.role !== 'admin' && u.status !== 'deleted' && (
                  <button onClick={() => handleDisable(u)}
                      className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 font-bold">
                    <UserX size={14} /> 停用
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

const TRASH_TYPE_LABEL: Record<string, string> = { account: '账号', class: '班级', asset: '资源' };

interface TrashItem {
  id: string;
  type: string;
  name: string;
  owner_id: string;
  disk_path: string;
  deleted_at: string;
}

function TrashList() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [msg, setMsg] = useState('');
  const { wrap } = useLoading();

  const load = () => {
    wrap(
      apiV2<{ items: TrashItem[] }>('/api/trash').then(d => setItems(d.items)),
      '加载垃圾桶...'
    ).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleRestore = async (id: string) => {
    try {
      await apiV2(`/api/trash/${encodeURIComponent(id)}/restore`, { method: 'POST' });
      setMsg('已恢复');
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '恢复失败');
    }
  };

  const handlePermanentDelete = async (t: { id: string; type: string; name: string }) => {
    const ok = await confirmDelete({
      what: `${TRASH_TYPE_LABEL[t.type] ?? t.type}「${t.name}」`,
      recoverable: false,
    });
    if (!ok) return;
    try {
      await apiV2(`/api/trash/${encodeURIComponent(t.id)}`, { method: 'DELETE' });
      setMsg('已彻底删除');
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '删除失败');
    }
  };

  const handleEmpty = async () => {
    const ok = await confirmDelete({ what: '垃圾桶里的全部内容', recoverable: false });
    if (!ok) return;
    try {
      const d = await apiV2<{ purged: number; kept: number }>('/api/trash', { method: 'DELETE' });
      setMsg(`已清空 ${d.purged} 条${d.kept ? `，保留账号条目 ${d.kept} 条` : ''}`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '清空失败');
    }
  };

  return (
    <div className="space-y-3">
      {msg && <div className="text-xs text-slate-700 font-bold px-1">{msg}</div>}
      {items.length > 0 && (
        <div className="flex justify-end">
          <button onClick={handleEmpty}
            className="text-xs text-rose-600 bg-rose-50 border border-rose-300 rounded-lg px-3 py-1.5 hover:bg-rose-100 font-bold">
            清空垃圾桶
          </button>
        </div>
      )}
      {items.length === 0 ? (
        <div className="text-center py-12 text-slate-500">垃圾桶为空</div>
      ) : (
        <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs tracking-wider border-b border-slate-300">
                <th className="p-4">名称</th>
                <th className="p-4">类型</th>
                <th className="p-4">删除时间</th>
                <th className="p-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {items.map((t: TrashItem) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-slate-900">{t.name}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${t.type === 'account' ? 'bg-purple-100 text-purple-700' : t.type === 'class' ? 'bg-cyan-100 text-cyan-700' : 'bg-orange-100 text-orange-700'}`}>
                      {TRASH_TYPE_LABEL[t.type] ?? t.type}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 text-xs">{t.deleted_at}</td>
                  <td className="p-4 flex gap-1">
                    <button onClick={() => handleRestore(t.id)}
                      className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg px-3 py-1.5 hover:bg-emerald-100 flex items-center gap-1 font-bold">
                      <RotateCcw size={12} /> 恢复
                    </button>
                    {/* 账号条目只可恢复不可火化（后端 403；D25 后正常不产生账号条目） */}
                    {t.type !== 'account' && (
                      <button onClick={() => handlePermanentDelete(t)}
                        className="text-xs text-rose-600 bg-rose-50 border border-rose-300 rounded-lg px-3 py-1.5 hover:bg-rose-100 font-bold">
                        永久删除
                      </button>
                    )}
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
