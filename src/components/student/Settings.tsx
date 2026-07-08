import { useState } from 'react';
import { Settings as SettingsIcon, Lock, Check, X, Eye, EyeOff } from 'lucide-react';

interface Props {
  username: string;
}

export default function Settings({ username }: Props) {
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
    if (newPwd.length < 3) {
      setMsg({ type: 'error', text: '密码至少 3 位' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, old_password: oldPwd, new_password: newPwd }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setMsg({ type: 'success', text: '密码修改成功！' });
        setOldPwd('');
        setNewPwd('');
        setConfirmPwd('');
      } else {
        setMsg({ type: 'error', text: data.detail || '修改失败' });
      }
    } catch {
      setMsg({ type: 'error', text: '网络错误' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* 标题 */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
            <SettingsIcon size={20} className="text-slate-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">设置</h2>
            <p className="text-xs text-slate-500">账号安全与偏好设置</p>
          </div>
        </div>

        {/* 修改密码 */}
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
            {/* 原密码 */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">原密码</label>
              <input type={showPwd ? 'text' : 'password'} value={oldPwd}
                onChange={e => setOldPwd(e.target.value)}
                placeholder="输入原密码"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none placeholder-slate-500" />
            </div>

            {/* 新密码 */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">新密码</label>
              <input type={showPwd ? 'text' : 'password'} value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                placeholder="输入新密码"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none placeholder-slate-500" />
            </div>

            {/* 确认新密码 */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">确认新密码</label>
              <input type={showPwd ? 'text' : 'password'} value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                placeholder="再次输入新密码"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none placeholder-slate-500" />
            </div>
          </div>

          {/* 提示消息 */}
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
      </div>
    </div>
  );
}
