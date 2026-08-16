import { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap, ExternalLink,
  FolderOpen, FileCode2, FileText, FileImage,
} from 'lucide-react';

import type { Course, Material } from '../../types/course';
import { TYPE_ICON, getFileExt, formatSize } from '../../types/course';

const FILE_ICON: Record<string, React.ReactNode> = {
  html: <FileCode2 size={16} />, htm: <FileCode2 size={16} />,
  py: <FileCode2 size={16} />, cpp: <FileCode2 size={16} />,
  txt: <FileText size={16} />, md: <FileText size={16} />,
  pdf: <FileText size={16} />,
  png: <FileImage size={16} />, jpg: <FileImage size={16} />, jpeg: <FileImage size={16} />, gif: <FileImage size={16} />,
};

interface Teacher { id: string; username: string; role: string; }

export default function CoursePlaza() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/users?t=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        if (data.status === 'success') {
          const ts = data.users.filter((u: any) => u.role === 'teacher');
          setTeachers(ts);
          if (ts.length > 0) setSelectedTeacher(ts[0].username);
        } else setError('加载教师列表失败');
      })
      .catch(() => setError('无法连接服务器'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedTeacher) return;
    setSelectedCourse(null);
    setMaterials([]);
    fetch(`/api/courses?teacher=${selectedTeacher}&t=${Date.now()}`)
      .then(r => r.json())
      .then(data => { if (data.status === 'success') setCourses(data.courses); });
  }, [selectedTeacher]);

  const loadMaterials = useCallback(async (course: Course) => {
    setSelectedCourse(course);
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(course.id)}/materials?teacher=${selectedTeacher}&t=${Date.now()}`);
      const data = await res.json();
      if (data.status === 'success') setMaterials(data.materials);
    } catch {}
  }, [selectedTeacher]);

  // 电子书课程：已渲染成功则直接进入，不再经过「打开电子书」这一步
  const openCourse = (course: Course) => {
    if (course.format === 'ebook' && course.publish?.status === 'success') {
      window.open(`/course/${course.id}/`, '_blank');
      return;
    }
    loadMaterials(course);
  };

  const openScratch = (url: string) => {
    window.open(`/Scratch/index.html?folder=${encodeURIComponent(url)}`, '_blank');
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center text-slate-400">加载中…</div>;
  }

  if (error) {
    return <div className="h-full flex items-center justify-center text-rose-400">⚠ {error}</div>;
  }

  return (
    <div className="h-full flex flex-col animate-fadeIn">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <GraduationCap className="text-cyan-400" size={20} /> 课程广场
        </h2>
      </div>

      {/* 老师选择 */}
      <div className="px-4 pb-2 flex gap-2 overflow-x-auto shrink-0">
        {teachers.map(t => (
          <button key={t.id} onClick={() => setSelectedTeacher(t.username)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedTeacher === t.username
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            }`}>
            {t.username}
          </button>
        ))}
        {teachers.length === 0 && (
          <span className="text-xs text-slate-500">暂无教师</span>
        )}
      </div>

      {/* 内容 */}
      <div className="flex-1 flex gap-3 min-h-0 px-4 pb-4">
        {/* 左侧：课程列表 */}
        <div className="w-56 shrink-0 flex flex-col gap-2 overflow-y-auto">
          {courses.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-8">暂无课程</div>
          ) : courses.map(c => (
            <button key={c.id} onClick={() => openCourse(c)}
              className={`text-left px-3 py-2.5 rounded-xl text-sm transition-all ${
                selectedCourse?.id === c.id
                  ? 'bg-cyan-500/10 border border-cyan-500/30 text-white'
                  : 'bg-slate-800/60 border border-slate-700/50 text-slate-300 hover:bg-slate-700/80'
              }`}>
              <div className="flex items-center gap-2">
                <span>{TYPE_ICON[c.type] || '📁'}</span>
                <span className="truncate flex-1 font-medium">{c.name}</span>
                <span className="text-[10px] text-slate-500">{c.material_count}</span>
              </div>
              {c.description && (
                <p className="text-[10px] text-slate-500 mt-1 truncate">{c.description}</p>
              )}
            </button>
          ))}
        </div>

        {/* 右侧：课件详情 */}
        <div className="flex-1 bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-y-auto">
          {!selectedCourse ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">请从左侧选择一个课程</div>
          ) : selectedCourse.format === 'ebook' ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
              <span className="text-4xl">📖</span>
              <p className="text-sm font-bold text-white">{selectedCourse.name}</p>
              <p className="text-xs text-slate-400">课程尚未渲染成功，请联系管理员</p>
            </div>
          ) : materials.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">暂无课件</div>
          ) : (
            <div className="p-4 space-y-2">
              {materials.map(m => (
                <div key={m.name} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 hover:border-cyan-500/30 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <FolderOpen size={16} className="text-amber-400 shrink-0" />
                    <span className="text-sm font-bold text-white">{m.name}</span>
                  </div>

                  {/* Scratch */}
                  {m.has_main !== undefined && (
                    <div className="flex flex-wrap gap-2">
                      {m.has_main && (
                        <button onClick={() => openScratch(m.url)}
                          className="flex items-center gap-1.5 text-xs bg-amber-500/20 text-amber-300 px-3 py-1.5 rounded-lg border border-amber-500/30 hover:bg-amber-500/30 transition-all">
                          🧩 教师演示
                        </button>
                      )}
                      {m.has_student && (
                        <button onClick={() => openScratch(m.url)}
                          className="flex items-center gap-1.5 text-xs bg-green-500/20 text-green-300 px-3 py-1.5 rounded-lg border border-green-500/30 hover:bg-green-500/30 transition-all">
                          🧩 学生练习
                        </button>
                      )}
                    </div>
                  )}

                  {/* Python/C++ */}
                  {m.files && m.files.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {m.files.map(f => {
                        const ext = getFileExt(f.name);
                        return (
                          <button key={f.name} onClick={() => window.open(m.url + f.name, '_blank')}
                            className="flex items-center gap-1 text-[11px] bg-slate-800 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700 hover:border-cyan-500/30 hover:text-white transition-all">
                            {FILE_ICON[ext] || <FileCode2 size={16} />}
                            <span className="max-w-[120px] truncate">{f.name}</span>
                            <span className="text-[10px] text-slate-500">({formatSize(f.size)})</span>
                            <ExternalLink size={10} className="text-slate-500 ml-0.5" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
