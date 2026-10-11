import { useState, useEffect } from 'react';
import { Send, CheckCircle, Users } from 'lucide-react';
import { apiV2 } from '../../lib/api';

interface StudentOpt {
  id: string;
  username: string;
}

/**
 * 发送站内信（V2：POST /api/messages · {receiver_id, title, content}）
 * - 单发：学生名单取自 V2 /api/accounts?role=teacher 视角裁剪（id + username）
 * - 班级群发：灰色禁用按钮（P-a A 方案），M5b-5 班级域迁移后恢复
 * - 方向：仅 teacher 可发（V2 语义，admin 都不行）
 */
export default function SendMessagePanel() {
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    apiV2<{ items: StudentOpt[] }>('/api/accounts?role=student')
      .then(d => setStudents(d.items.filter(s => s.username)))
      .catch(() => {});
  }, []);

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
              {/* P-a A 方案：班级群发留 M5b-5（班级域）恢复 */}
              <button
                disabled
                title="班级群发待班级域迁移后开放"
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed opacity-70"
              >
                <Users size={14} /> 班级群发（暂未开放）
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">方向：老师 → 学生（单发）；正文支持 Markdown</p>
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
