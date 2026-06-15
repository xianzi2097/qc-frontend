import { useState } from 'react';
import { Send, CheckCircle, GraduationCap } from 'lucide-react';
import type { ApiClass } from './types';

interface Props {
  username: string;
  classes: ApiClass[];
}

export default function SendMessagePanel({ username, classes }: Props) {
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const allStudents = classes.flatMap(c => c.students);

  const handleSend = async () => {
    setResult(null);
    setSending(true);
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: username, recipient, subject, body }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, text: `✅ 消息已发送给 ${recipient}` });
        setSubject('');
        setBody('');
      } else {
        setResult({ ok: false, text: data.detail || '发送失败' });
      }
    } catch {
      setResult({ ok: false, text: '请求失败，请检查后端服务' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="animate-fadeIn space-y-4">
      {/* 发送站内信 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
          <Send size={16} className="text-brand-orange" /> 发送站内信
        </h3>

        {result && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${result.ok ? 'bg-geek-green/10 text-geek-green border border-geek-green/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
            {result.ok ? <CheckCircle size={16} /> : <span>⚠</span>}
            {result.text}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">收件人（学生账号）</label>
            <input
              type="text"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              placeholder="输入学生账号，如 s1, s2, s3"
              list="student-list"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-orange transition-colors"
            />
            <datalist id="student-list">
              {allStudents.filter(s => s.username).map(s => (
                <option key={s.id} value={s.username}>{s.nickname}</option>
              ))}
            </datalist>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">主题</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="例如：Scratch 课堂笔记"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-orange transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">正文（支持 Markdown）</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={`支持 Markdown 语法：\n# 标题\n**加粗**\n\`代码片段\`\n- 列表`}
              rows={10}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-orange transition-colors resize-y font-mono"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSend}
              disabled={sending || !recipient || !subject || !body}
              className="flex items-center gap-2 bg-brand-orange text-black font-bold px-6 py-3 rounded-xl text-sm hover:bg-orange-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? '发送中...' : <><Send size={16} /> 发送</>}
            </button>
          </div>
        </div>
      </div>

      {/* 快捷：一键发送给全班 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
          <GraduationCap size={16} className="text-cyan-400" /> 发送给全班
        </h3>
        <p className="text-xs text-slate-500 mb-4">选择班级后，消息将发送给该班所有学生</p>
        <div className="space-y-3">
          <select
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-400 transition-colors"
          >
            <option value="">选择班级...</option>
            {classes.map(c => (
              <option key={c.class_name} value={`__class:${c.class_name}`}>
                {c.class_name}（{c.students.length} 人）
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
