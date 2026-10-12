import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Search, GraduationCap } from 'lucide-react';
import { apiV2 } from '../../lib/api';
import { confirmDelete } from '../ui/confirmDelete';

/**
 * 班级管理 —— 教师端（2026-10-11 重设计，取代 StudentListPanel）
 * - a 建班：POST /api/classes
 * - b 建学生账号：POST /api/accounts（老师不再事事找管理员；P5 默认密码 111111）
 * - c 班级加人：POST /api/classes/{id}/students {account_id}
 * - c1 加人只认已有账号：GET /api/students?q= 搜索 → 点「添加」入班，不现场建号
 * - 移出：DELETE /api/classes/{id}/students/{accountId}（只删关系不删账号）
 * 全 V2 零后端改动（接口规范 §3.2/§3.3 现成）；新学生默认无班级（账号与班级解耦）
 */
interface ClassRow { id: string; name: string; student_count: number }
interface Member { id: string; username: string; name?: string; remark?: string; joined_at?: string }
interface StudentHit { id: string; username: string; name?: string; classes: { id: string; name: string }[] }

export default function ClassManager() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [msg, setMsg] = useState('');

  // a 建班
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  // b 新建学生：入口在侧栏「新建学生」（ui/NewAccountCard），不混在班级管理里

  // c1 搜索加人
  const [searchQ, setSearchQ] = useState('');
  const [hits, setHits] = useState<StudentHit[]>([]);
  const [searched, setSearched] = useState(false);

  const selected = classes.find(c => c.id === selectedId) ?? null;

  const loadClasses = useCallback(async () => {
    try {
      const d = await apiV2<{ items: ClassRow[] }>('/api/classes');
      setClasses(d.items);
    } catch (e) {
      console.error('加载班级失败', e);
    }
  }, []);

  // 首次拉取：fetch 内联进 effect，setState 只在 .then 里（避免 effect 同步 setState）
  useEffect(() => {
    apiV2<{ items: ClassRow[] }>('/api/classes')
      .then(d => setClasses(d.items))
      .catch(e => console.error('加载班级失败', e));
  }, []);

  // 选班 → 拉成员（放事件里清空，不在 effect 里同步 setState）
  useEffect(() => {
    if (!selectedId) return;
    apiV2<{ students: Member[] }>(`/api/classes/${selectedId}`)
      .then(d => setMembers(d.students))
      .catch(() => setMembers([]));
  }, [selectedId]);

  // ── a 建班 ──
  const handleCreateClass = async () => {
    const name = newClassName.trim();
    if (!name) return;
    setMsg('');
    try {
      await apiV2('/api/classes', { method: 'POST', body: JSON.stringify({ name }) });
      setNewClassName('');
      setShowCreateClass(false);
      setMsg(`班级「${name}」已创建`);
      loadClasses();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '创建失败');   // 重名 4001
    }
  };

  const handleDeleteClass = async (c: ClassRow) => {
    const ok = await confirmDelete({ what: `班级「${c.name}」`, recoverable: true });
    if (!ok) return;
    try {
      await apiV2(`/api/classes/${c.id}`, { method: 'DELETE' });   // 进回收站
      if (selectedId === c.id) { setSelectedId(''); setMembers([]); }
      setMsg(`班级「${c.name}」已移入回收站`);
      loadClasses();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '删除失败');
    }
  };

  // ── b 新建学生：入口在侧栏（ui/NewAccountCard）──

  // ── c1 搜索已有学生账号 ──
  const handleSearch = async () => {
    setMsg('');
    try {
      const d = await apiV2<{ items: StudentHit[] }>(
        `/api/students?q=${encodeURIComponent(searchQ.trim())}`);
      setHits(d.items);
      setSearched(true);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '搜索失败');
    }
  };

  // ── c 入班 / 移出 ──
  const handleAddStudent = async (s: StudentHit) => {
    if (!selected) return;
    setMsg('');
    try {
      await apiV2(`/api/classes/${selected.id}/students`, {
        method: 'POST', body: JSON.stringify({ account_id: s.id }),
      });
      setMsg(`已把「${s.username}」加入「${selected.name}」`);
      setMembers(prev => [...prev, { id: s.id, username: s.username, name: s.name, remark: '' }]);
      setHits(prev => prev.map(h => (h.id === s.id
        ? { ...h, classes: [...h.classes, { id: selected.id, name: selected.name }] }
        : h)));
      loadClasses();   // 计数刷新
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '添加失败');   // 已在班内 4009
    }
  };

  const handleRemove = async (m: Member) => {
    if (!selected) return;
    if (!window.confirm(`把 ${m.username} 移出「${selected.name}」？（只移出班级，不删账号）`)) return;
    try {
      await apiV2(`/api/classes/${selected.id}/students/${m.id}`, { method: 'DELETE' });
      setMembers(prev => prev.filter(x => x.id !== m.id));
      setHits(prev => prev.map(h => (h.id === m.id
        ? { ...h, classes: h.classes.filter(c => c.id !== selected.id) }
        : h)));
      setMsg(`已把「${m.username}」移出班级`);
      loadClasses();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '移出失败');
    }
  };

  return (
    <div className="flex flex-col gap-3 h-[70vh] animate-fadeIn">
      {msg && <div className="px-3 py-2 text-xs text-slate-700 font-bold bg-slate-50 border border-slate-200 rounded-lg">{msg}</div>}
      <div className="flex gap-4 flex-1 min-h-0">
      {/* ── 左：班级列表（a 建班）── */}
      <div className="w-64 shrink-0 bg-white border border-slate-300 rounded-2xl overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-brand-orange" /> 班级列表
          </span>
          <button onClick={() => { setShowCreateClass(v => !v); setMsg(''); }} title="新建班级"
            className="text-slate-500 hover:text-brand-orange p-1 rounded hover:bg-slate-100">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {showCreateClass && (
          <div className="px-3 py-2 border-b border-slate-200 flex gap-1">
            <input autoFocus value={newClassName}
              onChange={e => setNewClassName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateClass(); if (e.key === 'Escape') setShowCreateClass(false); }}
              placeholder="班级名称"
              className="flex-1 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-brand-orange" />
            <button onClick={handleCreateClass}
              className="text-xs bg-brand-orange text-black font-bold px-2.5 py-1.5 rounded-lg">确定</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-1">
          {classes.length === 0 ? (
            <div className="p-4 text-sm text-slate-500 text-center">
              还没有班级<br />
              <button onClick={() => setShowCreateClass(true)}
                className="text-brand-orange hover:underline mt-1">创建第一个</button>
            </div>
          ) : classes.map(c => (
            <div key={c.id}
              onClick={() => { setSelectedId(c.id); setMembers([]); setMsg(''); }}
              className={`group flex items-center justify-between px-3 py-2 cursor-pointer ${
                selectedId === c.id
                  ? 'bg-brand-orange/10 text-slate-900 font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm truncate">{c.name}</span>
                <span className="text-xs text-slate-400 font-normal">{c.student_count}人</span>
              </div>
              <button onClick={e => { e.stopPropagation(); handleDeleteClass(c); }} title="删除"
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 p-0.5">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── 右：班级详情（b 建账号 + c/c1 搜索加人）── */}
      <div className="flex-1 bg-white border border-slate-300 rounded-2xl overflow-hidden flex flex-col">
        {selected ? (
          <>
            <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{selected.name}</span>
              <span className="text-xs text-slate-500">{members.length}名学生</span>
            </div>

            {/* 提示条已挪到根级（不选班也能看到反馈） */}

            {/* b 新建学生卡片：渲染在根级（不选班也能开） */}

            {/* c1 搜索已有学生账号 → 点「添加」入班（只认已有账号） */}
            <div className="px-5 py-3 border-b border-slate-200 space-y-2">
              <div className="flex items-center gap-2">
                <input value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                  placeholder="搜索已有学生账号（输入后点搜索）"
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-brand-orange" />
                <button onClick={handleSearch}
                  className="text-xs bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:border-brand-orange">
                  <Search className="w-3.5 h-3.5" /> 搜索
                </button>
              </div>

              {searched && (
                <div className="max-h-44 overflow-y-auto space-y-1">
                  {hits.length === 0 ? (
                    <div className="text-xs text-slate-500 py-2">没有匹配的学生账号</div>
                  ) : hits.map(s => {
                    const inClass = s.classes.some(c => c.id === selected.id);
                    return (
                      <div key={s.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-slate-800 truncate">{s.name || s.username}</span>
                          <span className="text-[10px] text-slate-500 truncate">
                            {s.classes.length ? s.classes.map(c => c.name).join('、') : '未入班'}
                          </span>
                        </div>
                        {inClass ? (
                          <span className="text-[10px] text-slate-400 px-2 shrink-0">已在本班</span>
                        ) : (
                          <button onClick={() => handleAddStudent(s)}
                            className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-lg font-bold hover:bg-emerald-100 shrink-0">
                            添加
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 成员名单 */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1">
              <div className="text-xs text-slate-400">班级成员</div>
              {members.length === 0 ? (
                <div className="text-sm text-slate-500 py-6 text-center">还没有学生，搜索上方账号点「添加」</div>
              ) : members.map(m => (
                <div key={m.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-slate-800 truncate">{m.name || m.username}</span>
                    {m.remark && <span className="text-[10px] text-slate-400 truncate">{m.remark}</span>}
                  </div>
                  <button onClick={() => handleRemove(m)}
                    className="text-xs text-rose-500 hover:text-rose-600 font-bold shrink-0">移出</button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">选择左侧班级管理学生</p>
            </div>
          </div>
        )}
      </div>
      </div>
      {/* b 新建学生卡片已移至教师侧栏「新建学生」入口 */}
    </div>
  );
}
