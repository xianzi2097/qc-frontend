import { useEffect, useState } from 'react';
import { Users, Award, Terminal, GraduationCap } from 'lucide-react';

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
