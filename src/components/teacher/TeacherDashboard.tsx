import { useEffect, useState } from 'react';
import { Users, Award, Terminal, GraduationCap, Send, CheckCircle } from 'lucide-react';

interface ApiStudent {
  id: number;
  username: string;
  nickname: string;
  avatar_path: string;
  descriptors: Record<string, unknown>;
}

interface ApiClass {
  class_name: string;
  students: ApiStudent[];
}

interface TeacherDashboardProps {
  activeTab: string;
}

export default function TeacherDashboard({ activeTab }: TeacherDashboardProps) {
  // ── 消息发送状态 ──
  const [msgRecipient, setMsgRecipient] = useState('');
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgResult, setMsgResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [classes, setClasses] = useState<ApiClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = localStorage.getItem('user');
    const username = user ? JSON.parse(user).username : 'arin';

    fetch(`/api/students?username=${username}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setClasses(data.classes);
        } else {
          setError(data.detail || '加载失败');
        }
      })
      .catch(() => setError('无法连接后端服务器'))
      .finally(() => setLoading(false));
  }, []);

  const sendMessage = async () => {
    setMsgResult(null);
    setMsgSending(true);
    const user = localStorage.getItem('user');
    const sender = user ? JSON.parse(user).username : 't';
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender,
          recipient: msgRecipient,
          subject: msgSubject,
          body: msgBody,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsgResult({ ok: true, text: `✅ 消息已发送给 ${msgRecipient}` });
        setMsgSubject('');
        setMsgBody('');
      } else {
        setMsgResult({ ok: false, text: data.detail || '发送失败' });
      }
    } catch {
      setMsgResult({ ok: false, text: '请求失败，请检查后端服务' });
    } finally {
      setMsgSending(false);
    }
  };

  const allStudents = classes.flatMap(c => c.students);
  const attrKeys = [...new Set(allStudents.flatMap(s => Object.keys(s.descriptors || {})))];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Terminal className="text-geek-green" size={20} /> 教务指挥调度大盘
        </h2>
        <span className="text-xs bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-slate-400 font-mono">
          后端：{error ? '离线' : '在线'}
        </span>
      </div>

      {/* 数据卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 hover:border-geek-green/30 p-6 rounded-2xl flex flex-col items-center justify-center min-h-[200px] transition-all duration-300 group hover:translate-y-[-4px]">
          <span className="text-xs text-slate-500 tracking-wider mb-4">学生总数</span>
          <div className="text-geek-green group-hover:scale-110 transition-transform duration-300 mb-4">
            <Users size={44} />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {loading ? '...' : allStudents.length}<span className="text-xs text-slate-500 font-normal"> 人</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 hover:border-brand-orange/30 p-6 rounded-2xl flex flex-col items-center justify-center min-h-[200px] transition-all duration-300 group hover:translate-y-[-4px]">
          <span className="text-xs text-slate-500 tracking-wider mb-4">班级数量</span>
          <div className="text-brand-orange group-hover:scale-110 transition-transform duration-300 mb-4">
            <GraduationCap size={44} />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {loading ? '...' : classes.length}<span className="text-xs text-slate-500 font-normal"> 个班</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 hover:border-amber-500/30 p-6 rounded-2xl flex flex-col items-center justify-center min-h-[200px] transition-all duration-300 group hover:translate-y-[-4px]">
          <span className="text-xs text-slate-500 tracking-wider mb-4">属性维度</span>
          <div className="text-amber-400 group-hover:scale-110 transition-transform duration-300 mb-4">
            <Award size={44} />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {loading ? '...' : attrKeys.length}<span className="text-xs text-slate-500 font-normal"> 项</span>
          </div>
        </div>
      </div>

      {/* ── 发送消息 ── */}
      {activeTab === 'messages' && (
        <div className="animate-fadeIn space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Send size={16} className="text-brand-orange" /> 发送站内信
            </h3>

            {msgResult && (
              <div className={`mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${msgResult.ok ? 'bg-geek-green/10 text-geek-green border border-geek-green/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                {msgResult.ok ? <CheckCircle size={16} /> : <span>⚠</span>}
                {msgResult.text}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">收件人</label>
                <select
                  value={msgRecipient}
                  onChange={e => setMsgRecipient(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-orange transition-colors"
                >
                  <option value="">选择学生...</option>
                  {allStudents.map(s => (
                    <option key={s.id} value={s.username}>{s.nickname} ({s.username})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">主题</label>
                <input
                  type="text"
                  value={msgSubject}
                  onChange={e => setMsgSubject(e.target.value)}
                  placeholder="例如：Scratch 课堂笔记"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-orange transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">正文（支持 Markdown）</label>
                <textarea
                  value={msgBody}
                  onChange={e => setMsgBody(e.target.value)}
                  placeholder={`支持 Markdown 语法：\n# 标题\n**加粗**\n\`代码片段\`\n- 列表`}
                  rows={10}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-orange transition-colors resize-y font-mono"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={sendMessage}
                  disabled={msgSending || !msgRecipient || !msgSubject || !msgBody}
                  className="flex items-center gap-2 bg-brand-orange text-black font-bold px-6 py-3 rounded-xl text-sm hover:bg-orange-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {msgSending ? '发送中...' : <><Send size={16} /> 发送</>}
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
                value={msgRecipient}
                onChange={e => {
                  setMsgRecipient(e.target.value);
                }}
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
      )}

      {/* 按班级展示学生列表 */}
      {activeTab === 'students' && (
        <div className="space-y-6 animate-fadeIn">
          {loading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">加载中…</div>
          ) : error ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-rose-400">⚠ {error}</div>
          ) : classes.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">暂无班级数据</div>
          ) : (
            classes.map(cls => (
              <div key={cls.class_name} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="bg-slate-950 border-b border-slate-800 px-6 py-3 flex items-center gap-2">
                  <GraduationCap size={16} className="text-geek-green" />
                  <span className="text-sm font-bold text-white">{cls.class_name}</span>
                  <span className="text-xs text-slate-500 ml-2">{cls.students.length} 名学生</span>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/50 text-slate-400 text-xs tracking-wider border-b border-slate-800">
                      <th className="p-4">姓名</th>
                      <th className="p-4">账号</th>
                      {attrKeys.map(k => (
                        <th key={k} className="p-4">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-sm">
                    {cls.students.map(stu => (
                      <tr key={stu.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-bold text-white">{stu.nickname}</td>
                        <td className="p-4 font-mono text-slate-400">{stu.username}</td>
                        {attrKeys.map(k => (
                          <td key={k} className="p-4 text-slate-300">
                            {String(stu.descriptors?.[k] ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
