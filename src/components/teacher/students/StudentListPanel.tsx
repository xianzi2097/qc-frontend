import { GraduationCap } from 'lucide-react';
import type { ApiClass } from '../types';

interface Props {
  classes: ApiClass[];
  loading: boolean;
  error: string;
  attrKeys: string[];
}

export default function StudentListPanel({ classes, loading, error, attrKeys }: Props) {
  if (loading) {
    return <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">加载中…</div>;
  }

  if (error) {
    return <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-rose-400">⚠ {error}</div>;
  }

  if (classes.length === 0) {
    return <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">暂无班级数据</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {classes.map(cls => (
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
      ))}
    </div>
  );
}
