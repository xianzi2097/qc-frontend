import { useState, useEffect } from 'react';
import { UserPlus, CheckCircle } from 'lucide-react';
import { apiV2 } from '../../lib/api';

interface ClassOpt { id: string; name: string }

/**
 * 新建账号卡片（2026-10-12 定稿）：学生/老师通用
 * - 身份 = id(系统唯一) + 账号名(可改不可重，登录兼显示名) + 密码(老师自设，≥6 位，不预填)
 * - 档案：日期一列两义——学生=入学时间、老师=入职时间；备注通用
 * - 学生多一格「初始班级」（可选，建号即入班）；不用先选班就能建号
 * - 成功后卡片内自显结果（继续新建/完成），调用方只管刷新列表
 */
export default function NewAccountCard({ role, onClose, onCreated }: {
  role: 'student' | 'teacher';
  onClose: () => void;
  onCreated?: (info: { username: string; className?: string }) => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');   // 不预填（2026-10-12 拍板）：老师自设好记的密码
  const [remark, setRemark] = useState('');
  const [enrolledAt, setEnrolledAt] = useState(new Date().toISOString().split('T')[0]);
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [classId, setClassId] = useState('');   // 初始班级（仅学生、可选）
  const [err, setErr] = useState('');
  const [created, setCreated] = useState<{ username: string; className?: string } | null>(null);

  // 初始班级可选项：老师见自己的班，admin 见全部（仅学生卡片拉）
  useEffect(() => {
    if (role !== 'student') return;
    apiV2<{ items: ClassOpt[] }>('/api/classes')
      .then(d => setClasses(d.items))
      .catch(() => {});
  }, [role]);

  const submit = async () => {
    const u = username.trim();
    if (!u) return;
    setErr('');
    try {
      const acc = await apiV2<{ id: string }>('/api/accounts', {
        method: 'POST',
        body: JSON.stringify({ username: u, password, role, remark: remark.trim(), enrolled_at: enrolledAt }),
      });
      // 学生选了初始班级 → 建号即入班（不选则无班级，账号↔班级解耦）
      let className: string | undefined;
      if (role === 'student' && classId) {
        try {
          await apiV2(`/api/classes/${classId}/students`, {
            method: 'POST', body: JSON.stringify({ account_id: acc.id }),
          });
          className = classes.find(c => c.id === classId)?.name;
        } catch (e) {
          console.error('初始入班失败', e);
        }
      }
      setCreated({ username: u, className });
      onCreated?.({ username: u, className });
    } catch (e) {
      setErr(e instanceof Error ? e.message : '创建失败');   // 重名 3001 等
    }
  };

  const isStudent = role === 'student';
  const field = 'w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-brand-orange';
  const enter = { onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter') submit(); } };

  // ── 成功页（卡片内自显结果）──
  if (created) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="w-96 bg-white rounded-2xl border border-slate-300 p-5 space-y-3 shadow-2xl text-center"
          onClick={e => e.stopPropagation()}>
          <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
          <p className="text-sm text-slate-800 font-bold">
            「{created.username}」已创建
            {created.className ? `，已加入「${created.className}」` : isStudent ? '（暂无班级）' : ''}
          </p>
          <div className="flex justify-center gap-2">
            <button onClick={() => { setCreated(null); setUsername(''); setClassId(''); setRemark(''); setErr(''); }}
              className="text-xs px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100">继续新建</button>
            <button onClick={onClose}
              className="text-xs px-4 py-1.5 rounded-lg bg-brand-orange text-black font-bold hover:opacity-90">完成</button>
          </div>
        </div>
      </div>
    );
  }

  // ── 表单页 ──
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-96 bg-white rounded-2xl border border-slate-300 p-5 space-y-3 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-brand-orange" /> {isStudent ? '新建学生' : '新建老师'}
        </h3>
        <div className="space-y-2">
          <input autoFocus value={username} onChange={e => setUsername(e.target.value)}
            {...enter} placeholder={isStudent ? '学生账号' : '老师账号'} className={field} />
          <input value={password} onChange={e => setPassword(e.target.value)}
            {...enter} placeholder="密码（至少 6 位）" className={field} />
          <input value={remark} onChange={e => setRemark(e.target.value)}
            {...enter} placeholder="备注（选填）" className={field} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 shrink-0">{isStudent ? '入学时间' : '入职时间'}</span>
            <input type="date" value={enrolledAt} onChange={e => setEnrolledAt(e.target.value)}
              className={`${field} [color-scheme:light]`} />
          </div>
          {isStudent && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 shrink-0">初始班级</span>
              <select value={classId} onChange={e => setClassId(e.target.value)} className={field}>
                <option value="">暂不入班</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        {err && <div className="text-xs text-rose-600 font-bold">{err}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100">取消</button>
          <button onClick={submit}
            className="text-xs px-4 py-1.5 rounded-lg bg-brand-orange text-black font-bold hover:opacity-90">创建</button>
        </div>
      </div>
    </div>
  );
}
