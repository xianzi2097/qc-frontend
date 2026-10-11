import { useState, useEffect } from 'react';
import { Send, CheckCircle, Users } from 'lucide-react';
import { apiV2 } from '../../lib/api';

interface StudentOpt {
  id: string;
  username: string;
}

interface ClassOpt {
  id: string;
  name: string;
}

/**
 * 发送站内信（V2：POST /api/messages · {receiver_id, title, content}）
 * - 单发：学生名单取自 V2 /api/accounts?role=student（id + username）
 * - 班级群发（P6，M5b-5 恢复）：选班 → 取详情学生 → 前端循环单发（V2 无批量端点）
 * - 方向：仅 teacher 可发（V2 语义，admin 都不行）
 */
export default function SendMessagePanel() {
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [blastClassId, setBlastClassId] = useState('');
  const [blastStudents, setBlastStudents] = useState<StudentOpt[]>([]);
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    apiV2<{ items: StudentOpt[] }>('/api/accounts?role=student')
      .then(d => setStudents(d.items.filter(s => s.username)))
      .catch(() => {});
    apiV2<{ items: ClassOpt[] }>('/api/classes')
      .then(d => setClasses(d.items))
      .catch(() => {});
  }, []);

  /** 选班 → 拉详情学生（群发对象）；放事件里取，不在 effect 里 setState */
  const handleSelectClass = async (id: string) => {
    setBlastClassId(id);
    if (!id) { setBlastStudents([]); return; }
    try {
      const d = await apiV2<{ students: StudentOpt[] }>(`/api/classes/${id}`);
      setBlastStudents((d.students || []).filter(s => s.id));
    } catch {
      setBlastStudents([]);
    }
  };

  /** P6：V2 无群发端点 → 前端循环单发，失败单独计数 */
  const handleBlast = async () => {
    setResult(null);
    setSending(true);
    try {
      const cls = classes.find(c => c.id === blastClassId);
      if (!cls || blastStudents.length === 0) {
        setResult({ ok: false, text: '班级没有学生，无法群发' });
        return;
      }
      let fail = 0;
      for (const s of blastStudents) {
        try {
          await apiV2('/api/messages', {
            method: 'POST',
            body: JSON.stringify({ receiver_id: s.id, title: subject, content: body }),
          });
        } catch {
          fail++;
        }
      }
      if (fail === 0) {
        setResult({ ok: true, text: `✅ 已群发给「${cls.name}」${blastStudents.length} 人` });
        setSubject('');
        setBody('');
      } else {
        setResult({ ok: false, text: `⚠ 群发完成 ${blastStudents.length - fail}/${blastStudents.length} 人，失败 ${fail} 人` });
      }
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : '群发失败' });
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    setResult(null);
    setSending(true);
    try {
      const target = students.find(s => s.username === recipient);
      if (!target) {
        setResult({ ok: false, text: '请选择学生' });
        setSending(false);
        return;
      }
      await apiV2('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ receiver_id: target.id, title: subject, content: body }),
      });
      setResult({ ok: true, text: `✅ 消息已发送给 ${recipient}` });
      setSubject('');
      setBody('');
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : '发送失败' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="animate-fadeIn">
      {/* 发送站内信 */}
      <div className="bg-white border border-slate-300 rounded-2xl p-6 transition-all duration-300 hover:border-orange-300">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
          <Send size={16} className="text-orange-500" /> 发送站内信
        </h3>

        {result && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2 font-bold ${result.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-rose-50 text-rose-600 border border-rose-300'}`}>
            {result.ok ? <CheckCircle size={16} /> : <span>⚠</span>}
            {result.text}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">收件人</label>
            <div className="flex gap-2">
              <select
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-orange-400 transition-colors"
              >
                <option value="">选择学生...</option>
                {students.map(s => (
                  <option key={s.id} value={s.username}>{s.username}</option>
                ))}
              </select>
            </div>
            {/* 班级群发（P6，M5b-5 恢复）：选班 → 前端循环单发（V2 无批量端点） */}
            <div className="flex gap-2 mt-2">
              <select
                value={blastClassId}
                onChange={e => handleSelectClass(e.target.value)}
                className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-orange-400 transition-colors"
              >
                <option value="">选择班级（群发）...</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={handleBlast}
                disabled={sending || !blastClassId || blastStudents.length === 0 || !subject || !body}
                title={blastClassId
                  ? `群发给「${classes.find(c => c.id === blastClassId)?.name ?? ''}」全班`
                  : '先选择班级'}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-orange-500 text-black font-bold hover:bg-orange-400 transition-colors disabled:bg-slate-200 disabled:text-slate-500 disabled:border disabled:border-slate-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Users size={14} /> 班级群发（{blastStudents.length} 人）
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">方向：老师 → 学生；单发或选班群发；正文支持 Markdown</p>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">主题</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="例如：Scratch 课堂笔记"
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-orange-400 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">正文（支持 Markdown）</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={`支持 Markdown 语法：\n# 标题\n**加粗**\n\`代码片段\`\n- 列表`}
              rows={10}
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-orange-400 transition-colors resize-y font-mono"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSend}
              disabled={sending || !recipient || !subject || !body}
              className="flex items-center gap-2 bg-orange-500 text-black font-bold px-6 py-3 rounded-xl text-sm hover:bg-orange-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? '发送中...' : <><Send size={16} /> 发送</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
