import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Plus, Trash2, ExternalLink, RefreshCw, FolderOpen, RotateCcw, Pencil, FileText, FolderPlus, Upload, Play, Loader2 } from 'lucide-react';
import { useLoading } from '../../lib/useLoading';
import { useAuth } from '../../lib/useAuth';

import type { Course, TreeNode } from '../../types/course';
import { TYPE_ICON, TYPE_OPTIONS, FORMAT_OPTIONS, FORMAT_LABEL } from '../../types/course';

export default function CourseManager() {
  const { username } = useAuth();
  const { wrap } = useLoading();
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('scratch');
  const [newFormat, setNewFormat] = useState('scratch');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [publish, setPublish] = useState<{ status?: string; error?: string; published_at?: string }>({});
  const [publishing, setPublishing] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });

  const loadCourses = useCallback(() => {
    setError('');
    wrap(
      fetch(`/api/courses?teacher=${username}&t=${Date.now()}`)
        .then(r => r.json())
        .then(data => {
          if (data.status === 'success') {
            setCourses(data.courses);
          } else {
            setError(data.detail || '加载失败');
          }
        }),
      '加载课程列表...'
    ).catch(() => setError('无法连接服务器'));
  }, [username]);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher: username, name: newName.trim(), course_type: newType, format: newFormat }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setShowCreate(false);
        setNewName('');
        loadCourses();
      } else {
        // FastAPI 422 验证错误：detail 可能是数组或字符串
        const msg = Array.isArray(data.detail)
          ? data.detail.map((e: any) => e.msg || JSON.stringify(e)).join('；')
          : (data.detail || '创建失败');
        setError(msg);
      }
    } catch {
      setError('无法连接服务器');
    }
  };

  const handleDelete = async (course: Course) => {
    if (!confirm(`确定删除课程「${course.name}」？此操作不可恢复。`)) return;
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(course.id)}?teacher=${username}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.status === 'success') {
        if (selectedCourse?.id === course.id) {
          setSelectedCourse(null);
          setTree([]);
        }
        loadCourses();
      } else {
        alert(data.detail || '删除失败');
      }
    } catch {
      alert('无法连接服务器');
    }
  };

  const loadTree = async (course: Course) => {
    setSelectedCourse(course);
    setPublish(course.publish || {});
    await wrap(
      fetch(`/api/courses/${encodeURIComponent(course.id)}/tree?t=${Date.now()}`)
        .then(res => res.json())
        .then(data => { if (data.status === 'success') setTree(data.tree || []); }),
      '加载文件...'
    ).catch(() => {});
  };

  const refreshTree = async () => {
    if (!selectedCourse) return;
    const data = await fetch(`/api/courses/${encodeURIComponent(selectedCourse.id)}/tree?t=${Date.now()}`).then(r => r.json());
    if (data.status === 'success') setTree(data.tree || []);
    loadCourses();
  };

  // ── 上传文件到指定目录（path 相对课程根） ──
  const handleUploadFile = async (path: string) => {
    if (!selectedCourse) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = async () => {
      const files = input.files;
      if (!files || files.length === 0) return;
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        await fetch(
          `/api/courses/${encodeURIComponent(selectedCourse.id)}/tree/upload?path=${encodeURIComponent(path)}`,
          { method: 'POST', body: formData }
        );
      }
      refreshTree();
    };
    input.click();
  };

  // ── 新建子文件夹（在指定父目录下） ──
  const [newFolderParent, setNewFolderParent] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');

  const handleCreateFolder = async () => {
    if (!selectedCourse || newFolderParent === null || !newFolderName.trim()) return;
    const parentPath = newFolderParent ? newFolderParent + '/' + newFolderName.trim() : newFolderName.trim();
    try {
      const res = await fetch(
        `/api/courses/${encodeURIComponent(selectedCourse.id)}/tree/folder?path=${encodeURIComponent(parentPath)}`,
        { method: 'POST' }
      );
      const data = await res.json().catch(() => null);
      if (data?.status !== 'success') { alert(data?.detail || '创建文件夹失败'); return; }
      setNewFolderParent(null);
      setNewFolderName('');
      refreshTree();
    } catch { alert('无法连接服务器'); }
  };

  // ── 删除文件/文件夹 ──
  const handleDeleteEntry = async (path: string, name: string) => {
    if (!selectedCourse || !confirm(`确定删除「${name}」？`)) return;
    await fetch(
      `/api/courses/${encodeURIComponent(selectedCourse.id)}/tree?path=${encodeURIComponent(path)}`,
      { method: 'DELETE' }
    );
    refreshTree();
  };

  // ── 重命名（自定义弹窗，不用原生 prompt） ──
  const [rename, setRename] = useState<{ kind: string; current: string; run: (newName: string) => Promise<void> } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const openRenameCourse = (course: Course) => {
    setRenameValue(course.name);
    setRename({
      kind: '课程',
      current: course.name,
      run: async (newName: string) => {
        const res = await fetch(`/api/courses/${encodeURIComponent(course.id)}/rename`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_name: newName }),
        });
        const data = await res.json().catch(() => null);
        if (data?.status !== 'success') return alert(data?.detail || '课程重命名失败');
        if (selectedCourse?.id === course.id) setSelectedCourse({ ...selectedCourse, name: newName });
        loadCourses();
      },
    });
  };

  const openRenameEntry = (path: string, name: string) => {
    if (!selectedCourse) return;
    setRenameValue(name);
    setRename({
      kind: '文件',
      current: name,
      run: async (newName: string) => {
        const res = await fetch(
          `/api/courses/${encodeURIComponent(selectedCourse.id)}/tree/rename?path=${encodeURIComponent(path)}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ new_name: newName }) }
        );
        const data = await res.json().catch(() => null);
        if (data?.status !== 'success') return alert(data?.detail || '重命名失败');
        refreshTree();
      },
    });
  };

  // ── 发布（电子书渲染） ──
  const handlePublish = async () => {
    if (!selectedCourse) return;
    setPublishing(true);
    setPublish({ status: 'building' });
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(selectedCourse.id)}/publish`, { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (data?.status !== 'success') { alert(data?.detail || '发布失败'); setPublishing(false); return; }
      for (let i = 0; i < 90; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const st = await fetch(`/api/courses/${encodeURIComponent(selectedCourse.id)}/publish/status?t=${Date.now()}`).then(r => r.json());
        const p = st?.publish || {};
        setPublish(p);
        if (p.status === 'success' || p.status === 'failed') break;
      }
    } catch { alert('无法连接服务器'); }
    setPublishing(false);
    loadCourses();
  };

  // ── 一键上传：拖拽/选择整个文件夹，递归解析目录并批量上传 ──
  type PendingFile = { rel: string; file: File };

  const readDirEntries = (reader: any): Promise<any[]> =>
    new Promise((resolve, reject) => reader.readEntries(resolve, reject));

  const collectFolder = async (entries: any[], base: string, out: PendingFile[]) => {
    for (const entry of entries) {
      const rel = base ? `${base}/${entry.name}` : entry.name;
      if (entry.isFile) {
        const file: File = await new Promise((res, rej) => entry.file(res, rej));
        out.push({ rel, file });
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const children: any[] = [];
        let batch: any[];
        do {
          batch = await readDirEntries(reader);
          children.push(...batch);
        } while (batch.length > 0);
        await collectFolder(children, rel, out);
      }
    }
  };

  const uploadBatch = async (files: PendingFile[]) => {
    if (!selectedCourse) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });
    try {
      for (let i = 0; i < files.length; i++) {
        const { rel, file } = files[i];
        const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
        const formData = new FormData();
        formData.append('file', file);
        await fetch(
          `/api/courses/${encodeURIComponent(selectedCourse.id)}/tree/upload?path=${encodeURIComponent(dir)}`,
          { method: 'POST', body: formData }
        );
        setUploadProgress({ done: i + 1, total: files.length });
      }
      refreshTree();
    } finally {
      setUploading(false);
      setShowDrop(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!selectedCourse || uploading) return;
    const items = e.dataTransfer.items;
    if (!items) return;
    const entries: any[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = (items[i] as any).webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }
    if (entries.length === 0) { alert('请拖入文件夹'); return; }
    const files: PendingFile[] = [];
    await collectFolder(entries, '', files);
    if (files.length === 0) { alert('文件夹为空'); return; }
    await uploadBatch(files);
  };

  const handleFolderPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCourse || uploading) return;
    const fileList = e.target.files;
    if (!fileList) return;
    const files: PendingFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      files.push({ rel: (f as any).webkitRelativePath || f.name, file: f });
    }
    if (files.length === 0) { alert('文件夹为空'); return; }
    await uploadBatch(files);
    e.target.value = '';
  };

  const handleRenameConfirm = async () => {
    if (!rename) return;
    const newName = renameValue.trim();
    if (!newName || newName === rename.current) { setRename(null); return; }
    try {
      await rename.run(newName);
    } catch {
      alert('无法连接服务器');
    }
    setRename(null);
  };

  // ── 课程回收站 ──
  const [trashItems, setTrashItems] = useState<any[]>([]);
  const [showTrash, setShowTrash] = useState(false);

  const loadTrash = useCallback(async () => {
    const res = await fetch(`/api/trash/items?username=${username}`);
    const data = await res.json();
    if (data.status === 'success') setTrashItems(data.items.filter((i: any) => i.type === 'course'));
  }, [username]);

  const handleRestore = async (folder: string) => {
    await fetch(`/api/trash/items/${encodeURIComponent(folder)}/restore?username=${username}`, { method: 'POST' });
    loadTrash();
    loadCourses();
  };

  const handlePermanentDelete = async (folder: string) => {
    if (!confirm('永久删除此课程？不可恢复！')) return;
    await fetch(`/api/trash/items/${encodeURIComponent(folder)}?username=${username}`, { method: 'DELETE' });
    loadTrash();
  };

  const renderTreeNode = (node: TreeNode, basePath: string): React.ReactNode => {
    const path = basePath ? `${basePath}/${node.name}` : node.name;
    if (node.type === 'dir') {
      return (
        <div key={path} className="border border-slate-700/50 rounded-xl mb-1">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-800/30 rounded-t-xl">
            <span className="flex items-center gap-2 text-sm text-white">
              <FolderOpen size={14} className="text-amber-400" /> {node.name}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => handleUploadFile(path)} title="上传到此文件夹"
                className="text-slate-500 hover:text-slate-200 p-1"><Upload size={14} /></button>
              <button onClick={() => setNewFolderParent(path)} title="新建子文件夹"
                className="text-slate-500 hover:text-slate-200 p-1"><FolderPlus size={14} /></button>
              <button onClick={() => openRenameEntry(path, node.name)} title="重命名"
                className="text-slate-500 hover:text-slate-200 p-1"><Pencil size={14} /></button>
              <button onClick={() => handleDeleteEntry(path, node.name)} title="删除"
                className="text-slate-500 hover:text-rose-400 p-1"><Trash2 size={14} /></button>
            </div>
          </div>
          {node.children && node.children.length > 0 && (
            <div className="px-3 py-2 space-y-1">
              {node.children.map(c => renderTreeNode(c, path))}
            </div>
          )}
        </div>
      );
    }
    return (
      <div key={path} className="flex items-center justify-between px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800/40 rounded">
        <span className="flex items-center gap-2 truncate">
          <FileText size={14} className="text-slate-500 shrink-0" /> {node.name}
          {node.size !== undefined && <span className="text-[10px] text-slate-600">({(node.size / 1024).toFixed(1)} KB)</span>}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => openRenameEntry(path, node.name)} title="重命名"
            className="text-slate-600 hover:text-slate-300 p-1"><Pencil size={12} /></button>
          <button onClick={() => handleDeleteEntry(path, node.name)} title="删除"
            className="text-slate-600 hover:text-rose-400 p-1"><Trash2 size={12} /></button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <BookOpen className="text-brand-orange" size={20} /> 课件管理
        </h2>
        <div className="flex gap-2">
          <button
            onClick={loadCourses}
            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw size={14} /> 刷新
          </button>
          <button
            onClick={() => { loadTrash(); setShowTrash(true); }}
            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Trash2 size={14} /> 回收站
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-xs bg-brand-orange hover:bg-brand-orange/90 text-black font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus size={14} /> 新建课程
          </button>
        </div>
      </div>

      {/* 新建课程弹窗 */}
      {showCreate && (
        <div className="bg-slate-900 border border-slate-600 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-4">新建课程</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">课程名称</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="如：Scratch-周六早-初级班"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-orange"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">课程类型</label>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              >
                {TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">打开方式</label>
              <select
                value={newFormat}
                onChange={e => setNewFormat(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-orange"
              >
                {FORMAT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                className="text-xs bg-brand-orange hover:bg-brand-orange/90 text-black font-bold px-4 py-2 rounded-lg"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="text-xs text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {/* 课程列表 */}
      {courses.length === 0 ? (
        <div className="text-sm text-slate-500 bg-slate-900/50 border border-slate-600 rounded-2xl p-8 text-center">
          暂无课程，点击「新建课程」开始创建
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.filter(c => TYPE_ICON[c.type] || c.type).map(course => (
            <div
              key={course.id}
              onClick={() => loadTree(course)}
              className={`bg-slate-900 border rounded-2xl p-5 cursor-pointer transition-all duration-300 group hover:translate-y-[-4px] ${
                selectedCourse?.id === course.id
                  ? 'border-brand-orange/50 ring-1 ring-brand-orange/20'
                  : 'border-slate-600 hover:border-brand-orange/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-2xl block mb-2">{TYPE_ICON[course.type] || '📁'}</span>
                  <h3 className="font-bold text-white text-sm mb-1">{course.name}</h3>
                  <p className="text-xs text-slate-500">
                    {FORMAT_LABEL[course.format || 'folder'] || course.format} · {course.material_count} 个课件
                  </p>
                </div>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => openRenameCourse(course)}
                    className="text-slate-600 hover:text-brand-orange opacity-0 group-hover:opacity-100 transition-all p-1"
                    title="重命名课程"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(course)}
                    className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                    title="删除课程"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 课件详情（文件树：所有课程统一） */}
      {selectedCourse && (
        <div className="bg-slate-900/50 border border-slate-600 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderOpen size={16} className="text-brand-orange" />
              {selectedCourse.name}
              <span className="text-[10px] font-normal text-slate-500 px-2 py-0.5 bg-slate-800 rounded-full">
                {FORMAT_LABEL[selectedCourse.format || 'folder'] || selectedCourse.format}
              </span>
            </h3>
            <div className="flex items-center gap-2">
              {selectedCourse.format === 'ebook' && (
                <>
                  {publish.status === 'success' && (
                    <a
                      href={`/course/${selectedCourse.teacher_key || username}/${selectedCourse.id}/`}
                      target="_blank"
                      className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-1.5 hover:bg-green-500/20"
                    >
                      <ExternalLink size={12} className="inline mr-1" />预览
                    </a>
                  )}
                  <button
                    onClick={handlePublish}
                    disabled={publishing}
                    className="flex items-center gap-1.5 text-xs bg-brand-orange hover:bg-brand-orange/90 text-black font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {publishing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                    {publishing ? '正在渲染...' : '保存并渲染'}
                  </button>
                </>
              )}
              <button
                onClick={() => { setSelectedCourse(null); setTree([]); }}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                关闭
              </button>
            </div>
          </div>

          {/* 发布状态提示（电子书） */}
          {selectedCourse.format === 'ebook' && publish.status && publish.status !== 'idle' && (
            <div className={`mb-4 text-xs px-4 py-2 rounded-lg border ${
              publish.status === 'success' ? 'text-green-400 bg-green-500/10 border-green-500/30'
              : publish.status === 'failed' ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
              : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
            }`}>
              {publish.status === 'building' && '⏳ 正在渲染中，请稍候…'}
              {publish.status === 'success' && `✅ 渲染成功${publish.published_at ? ' · ' + publish.published_at : ''}`}
              {publish.status === 'failed' && `❌ 渲染失败：${publish.error || '未知错误'}。请保留文件并联系管理员，上次成功版本仍可正常使用。`}
            </div>
          )}

          {/* 根目录工具栏 */}
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => handleUploadFile('')}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors">
              <Upload size={14} /> 上传文件
            </button>
            <button onClick={() => setShowDrop(true)}
              className="flex items-center gap-1.5 text-xs bg-brand-orange/20 hover:bg-brand-orange/30 text-brand-orange px-3 py-1.5 rounded-lg transition-colors">
              <FolderOpen size={14} /> 一键上传
            </button>
            <button onClick={() => setNewFolderParent('')}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors">
              <FolderPlus size={14} /> 新建文件夹
            </button>
            <button onClick={refreshTree}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors">
              <RefreshCw size={14} /> 刷新
            </button>
          </div>

          {/* 一键上传：拖拽/选择文件夹 */}
          {showDrop && (
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              className={`mb-3 border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                uploading ? 'border-slate-600' : 'border-brand-orange/50 hover:border-brand-orange'
              }`}
            >
              {uploading ? (
                <div className="text-sm text-slate-300">
                  <Loader2 size={16} className="inline animate-spin mr-2" />
                  正在上传 {uploadProgress.done}/{uploadProgress.total} 个文件…
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-300 mb-2">把课程文件夹拖到这里，自动解析目录结构并上传</p>
                  <label className="text-xs text-brand-orange cursor-pointer underline">
                    或点击选择文件夹
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      {...({ webkitdirectory: '', directory: '' } as any)}
                      onChange={handleFolderPick}
                    />
                  </label>
                  <button onClick={() => setShowDrop(false)} className="block mx-auto mt-3 text-xs text-slate-500 hover:text-slate-300">取消</button>
                </>
              )}
            </div>
          )}

          {/* 新建文件夹输入 */}
          {newFolderParent !== null && (
            <div className="flex gap-2 items-center mb-3">
              <input
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder={newFolderParent ? `在「${newFolderParent}」下新建文件夹` : '在课程根目录新建文件夹'}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-orange"
                onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setNewFolderParent(null); }}
                autoFocus
              />
              <button onClick={handleCreateFolder} className="text-xs bg-brand-orange text-black px-3 py-1.5 rounded-lg font-bold">创建</button>
              <button onClick={() => { setNewFolderParent(null); setNewFolderName(''); }} className="text-xs text-slate-400 hover:text-slate-200">取消</button>
            </div>
          )}

          {/* 文件树 */}
          {tree.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-8">
              暂无文件，点击「上传文件」或「新建文件夹」开始
            </div>
          ) : (
            <div className="space-y-1">
              {tree.map(n => renderTreeNode(n, ''))}
            </div>
          )}
        </div>
      )}

      {/* 课程回收站弹窗 */}
      {showTrash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowTrash(false); }}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-[500px] max-h-[70vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-600">
              <span className="text-sm text-white font-bold flex items-center gap-2"><Trash2 size={16} /> 课程回收站</span>
              <button onClick={() => setShowTrash(false)} className="text-slate-400 hover:text-white p-1"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-2">
              {trashItems.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">回收站为空</div>
              ) : trashItems.map(t => (
                <div key={t._folder} className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-white">📚 {t.original_path?.split('/').pop()}</span>
                      <span className="text-xs text-slate-500 ml-2">删除于 {t.deleted_at?.slice(0, 10)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleRestore(t._folder)}
                        className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-1.5 hover:bg-green-500/20 flex items-center gap-1">
                        <RotateCcw size={12} /> 恢复
                      </button>
                      <button onClick={() => handlePermanentDelete(t._folder)}
                        className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-1.5 hover:bg-rose-500/20">
                        永久删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 重命名弹窗 */}
      {rename && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setRename(null); }}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl w-[380px] max-w-[90vw] p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-white mb-4">重命名{rename.kind}</h3>
            <input
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              placeholder={`输入新的${rename.kind}名称`}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleRenameConfirm();
                if (e.key === 'Escape') setRename(null);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-orange"
            />
            <div className="flex gap-2 justify-end pt-4">
              <button
                onClick={() => setRename(null)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleRenameConfirm}
                className="text-xs bg-brand-orange hover:bg-brand-orange/90 text-black font-bold px-4 py-2 rounded-lg"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
