import { useState } from 'react';
import { Lock, Check, X, Eye, EyeOff } from 'lucide-react';

/** 修改密码卡片（V2：PATCH /api/auth/password）——学生端设置页与后台弹层共用一份实现 */
export function ChangePasswordForm() {
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    setMsg(null);
    if (!oldPwd || !newPwd) {
      setMsg({ type: 'error', text: '请填写完整' });
      return;
    }
    if (newPwd !== confirmPwd) {
      setMsg({ type: 'error', text: '两次密码输入不一致' });
      return;
    }
    if (newPwd.length < 6) {
      setMsg({ type: 'error', text: '密码至少 6 位' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_password: oldPwd, new_password: newPwd }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setMsg({ type: 'success', text: '密码修改成功！' });
        setOldPwd('');
        setNewPwd('');
        setConfirmPwd('');
      } else {
        setMsg({ type: 'error', text: data.msg || '修改失败' });
      }
    } catch {
      setMsg({ type: 'error', text: '网络错误' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-cyan-400" />
          <span className="text-sm text-white font-medium">修改密码</span>
        </div>
        <button onClick={() => setShowPwd(!showPwd)}
          className="text-slate-500 hover:text-slate-300 p-1" title={showPwd ? '隐藏密码' : '显示密码'}>
          {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">原密码</label>
          <input type={showPwd ? 'text' : 'password'} value={oldPwd}
            onChange={e => setOldPwd(e.target.value)}
            placeholder="输入原密码"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none placeholder-slate-500" />
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1 block">新密码</label>
          <input type={showPwd ? 'text' : 'password'} value={newPwd}
            onChange={e => setNewPwd(e.target.value)}
            placeholder="输入新密码"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none placeholder-slate-500" />
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1 block">确认新密码</label>
          <input type={showPwd ? 'text' : 'password'} value={confirmPwd}
            onChange={e => setConfirmPwd(e.target.value)}
            placeholder="再次输入新密码"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none placeholder-slate-500" />
        </div>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
          msg.type === 'success'
            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
        }`}>
          {msg.type === 'success' ? <Check size={14} /> : <X size={14} />}
          {msg.text}
        </div>
      )}

      <button onClick={handleChangePassword} disabled={loading}
        className="w-full text-xs text-black font-bold bg-cyan-400 rounded-lg px-4 py-2.5 hover:bg-cyan-500 disabled:opacity-50">
        {loading ? '修改中…' : '确认修改'}
      </button>
    </div>
  );
}

/** 后台通用弹层（教师端/管理员端侧栏入口用；后台 UI 后续统一重设计） */
export default function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-96 max-w-[90vw]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white tracking-wider">账号安全</h3>
          <button onClick={onClose} title="关闭弹窗" className="text-slate-400 hover:text-white p-1">
            <X size={16} />
          </button>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
