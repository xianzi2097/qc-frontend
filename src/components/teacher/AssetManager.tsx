import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowUp, ChevronRight, Download, FileText, Folder,
  FolderPlus, Hammer, Pencil, Plus, RefreshCw, Star, Trash2, Upload, X,
} from 'lucide-react';
import { apiV2, fileHref, zipHref, type AssetRow } from '../../lib/api';
import { confirmDelete } from '../ui/confirmDelete';
import { useAuth } from '../../lib/useAuth';
import {
  FORMAT_LABEL, FORMAT_OPTIONS, TYPE_LUCIDE, TYPE_OPTIONS,
  formatSize, type Bucket, type TreeNode,
} from '../../types/course';

/**
 * 资产管理 —— 教师端（M5b-6 S2，P1 拍板：CourseManager+ResourcesManager 合并一页）
 * - bucket 四选一：courses=课程 / books=书架 / reference=资料 / download=软件下载
 * - CRUD：POST /api/assets、PATCH（含挪 bucket）、DELETE（软删进回收站）
 * - 星标（仅课程族）：PATCH bucket 在 books/courses 间切换
 * - 文件树（S3）：逐层钻取 + 上传/建目录/改名/物理删/上下移排序/下载
 * - 发布（仅课程族）：POST publish → 轮询 publish-status（state: none/queued/building/done/failed）
 * - 回收站：GET /api/trash（V2 形状）；恢复人人可（自己的），彻底删仅 admin
 * 共 V2 零后端改动（接口规范 §3.4/§3.5/§3.11 现成）
 */

const BUCKETS: { value: Bucket; label: string }[] = [
  { value: 'courses', label: '课程' },
  { value: 'books', label: '书架' },
  { value: 'reference', label: '资料' },
  { value: 'download', label: '软件下载' },
];
const isCourseFamily = (b: Bucket) => b === 'courses' || b === 'books';

const PUBLISH_STATE: Record<string, { text: string; cls: string }> = {
  none: { text: '尚未渲染', cls: 'text-slate-500' },
  queued: { text: '⏳ 已入队，等待渲染…', cls: 'text-amber-600' },
  building: { text: '⏳ 正在渲染中…', cls: 'text-amber-600' },
  done: { text: '✅ 渲染成功', cls: 'text-emerald-600' },
  failed: { text: '❌ 渲染失败（上次成功版本仍可正常使用）', cls: 'text-rose-600' },
};

interface TrashItem { id: string; type: string; name: string; deleted_at: string }

export default function AssetManager() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [bucket, setBucket] = useState<Bucket>('courses');
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [selected, setSelected] = useState<AssetRow | null>(null);
  const [msg, setMsg] = useState('');

  // 新建
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [newType, setNewType] = useState('scratch');
  const [newFormat, setNewFormat] = useState('scratch');
  const [newShelf, setNewShelf] = useState<Bucket>('courses');   // 课程族：课程↔书架开关（打开面板时跟随当前 tab）

  // 编辑
  const [editing, setEditing] = useState<AssetRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');
  const [editType, setEditType] = useState('scratch');
  const [editFormat, setEditFormat] = useState('scratch');
  const [editShareable, setEditShareable] = useState(false);   // D34：课程下载开关
  const [editShelf, setEditShelf] = useState<Bucket>('courses');   // 课程族：课程↔书架开关

  // 文件树（逐层钻取）
  const [path, setPath] = useState('');
  const [entries, setEntries] = useState<TreeNode[] | null>(null);
  const [showMkdir, setShowMkdir] = useState(false);
  const [mkdirName, setMkdirName] = useState('');
  const [rename, setRename] = useState<{ path: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);

  // 发布
  const [publish, setPublish] = useState<{ state?: string; message?: string }>({ state: 'none' });
  const [publishing, setPublishing] = useState(false);

  // 回收站
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [showTrash, setShowTrash] = useState(false);

  // ── 资产列表 ──
  const loadAssets = useCallback(async (b: Bucket) => {
    try {
      const d = await apiV2<{ items: AssetRow[] }>(
        `/api/assets?bucket=${b}${userId ? `&owner=${encodeURIComponent(userId)}` : ''}`);
      setAssets(d.items);
    } catch (e) {
      console.error('加载资产失败', e);
    }
  }, [userId]);

  // 首次拉取：fetch 内联进 effect，setState 只在 .then 里（避免 effect 同步 setState）
  useEffect(() => {
    apiV2<{ items: AssetRow[] }>(
      `/api/assets?bucket=${bucket}${userId ? `&owner=${encodeURIComponent(userId)}` : ''}`)
      .then(d => setAssets(d.items))
      .catch(e => console.error('加载资产失败', e));
  }, [bucket, userId]);

  // ── 文件树（逐层） ──
  const loadDir = useCallback(async (assetId: string, p: string) => {
    setEntries(null);
    try {
      const d = await apiV2<{ entries: TreeNode[] }>(
        `/api/assets/${encodeURIComponent(assetId)}/files?path=${encodeURIComponent(p)}`);
      setEntries(d.entries);
    } catch (e) {
      console.error('加载目录失败', e);
      setEntries([]);
    }
  }, []);

  const openAsset = (a: AssetRow) => {
    setSelected(a);
    setPath('');
    setPublish(a.publish ?? { state: 'none' });
    loadDir(a.id, '');
  };

  // ── 新建 ──
  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setMsg('');
    try {
      // 课程族：bucket 由开关决定（课程↔书架）；其余分类跟随当前 tab
      const effBucket = isCourseFamily(bucket) ? newShelf : bucket;
      const body: Record<string, unknown> = { bucket: effBucket, name, description: newDesc.trim(), tags: newTags };
      if (isCourseFamily(effBucket)) { body.type = newType; body.format = newFormat; }
      await apiV2('/api/assets', { method: 'POST', body: JSON.stringify(body) });
      setShowCreate(false);
      setNewName(''); setNewDesc(''); setNewTags([]); setNewTagInput('');
      setMsg(`资产「${name}」已创建`);
      loadAssets(bucket);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '创建失败');   // 重名 5001/6001
    }
  };

  // ── 编辑（含挪 bucket） ──
  const openEdit = (a: AssetRow) => {
    setEditing(a);
    setEditName(a.name); setEditDesc(a.description); setEditTags(a.tags || []);
    setEditType(a.type || 'scratch'); setEditFormat(a.format || 'scratch');
    setEditShareable(!!a.shareable);
    setEditShelf(a.bucket);
    setMsg('');
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setMsg('');
    try {
      const body: Record<string, unknown> = { name: editName.trim(), description: editDesc.trim(), tags: editTags };
      if (isCourseFamily(editing.bucket)) {
        body.type = editType; body.format = editFormat; body.shareable = editShareable;
        body.bucket = editShelf;   // 课程↔书架开关（后端 PATCH 支持跨族挪动）
      }
      await apiV2(`/api/assets/${encodeURIComponent(editing.id)}`, {
        method: 'PATCH', body: JSON.stringify(body),
      });
      setEditing(null);
      setMsg('已保存');
      loadAssets(bucket);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '保存失败');
    }
  };

  // ── 星标（课程族：books ⇄ courses） ──
  const handleToggleShelf = async (a: AssetRow) => {
    const target: Bucket = a.bucket === 'courses' ? 'books' : 'courses';
    setMsg('');
    try {
      await apiV2(`/api/assets/${encodeURIComponent(a.id)}`, {
        method: 'PATCH', body: JSON.stringify({ bucket: target }),
      });
      setAssets(prev => prev.map(x => (x.id === a.id ? { ...x, bucket: target } : x)));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '操作失败');
    }
  };

  // ── 删除（软删进回收站） ──
  const handleDelete = async (a: AssetRow) => {
    const ok = await confirmDelete({ what: `资产「${a.name}」`, recoverable: true });
    if (!ok) return;
    setMsg('');
    try {
      await apiV2(`/api/assets/${encodeURIComponent(a.id)}`, { method: 'DELETE' });
      if (selected?.id === a.id) setSelected(null);
      setMsg(`资产「${a.name}」已移入回收站`);
      loadAssets(bucket);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '删除失败');
    }
  };

  // ── 文件操作 ──
  const refreshDir = () => { if (selected) loadDir(selected.id, path); };

  const handleUpload = async (files: FileList | null, useRelPath: boolean) => {
    if (!selected || !files || files.length === 0) return;
    setMsg('');
    let done = 0;
    for (const f of Array.from(files)) {
      const rel = useRelPath ? (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name : f.name;
      const full = path ? `${path}/${rel}` : rel;
      const fd = new FormData();
      fd.append('file', f);
      fd.append('path', full);
      try {
        await apiV2(`/api/assets/${encodeURIComponent(selected.id)}/files/upload`, { method: 'POST', body: fd });
        done++;
      } catch (e) {
        setMsg(e instanceof Error ? e.message : `上传「${f.name}」失败`);
      }
    }
    if (done > 0) setMsg(`已上传 ${done} 个文件`);
    refreshDir();
  };

  const handleMkdir = async () => {
    if (!selected || !mkdirName.trim()) return;
    const full = path ? `${path}/${mkdirName.trim()}` : mkdirName.trim();
    setMsg('');
    try {
      await apiV2(`/api/assets/${encodeURIComponent(selected.id)}/files/mkdir`, {
        method: 'POST', body: JSON.stringify({ path: full }),
      });
      setShowMkdir(false); setMkdirName('');
      refreshDir();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '创建失败');   // 409 已存在
    }
  };

  const handleRename = async () => {
    if (!selected || !rename || !renameValue.trim()) return;
    setMsg('');
    try {
      await apiV2(`/api/assets/${encodeURIComponent(selected.id)}/files/rename`, {
        method: 'PATCH', body: JSON.stringify({ path: rename.path, new_name: renameValue.trim() }),
      });
      setRename(null);
      refreshDir();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '重命名失败');
    }
  };

  const handleDeleteEntry = async (e: TreeNode) => {
    const full = path ? `${path}/${e.name}` : e.name;
    const ok = await confirmDelete({
      what: `${e.type === 'dir' ? '文件夹' : '文件'}「${e.name}」`,
      recoverable: false,
      note: '此操作不可恢复！',
    });
    if (!ok) return;
    setMsg('');
    try {
      await apiV2(`/api/assets/${encodeURIComponent(selected!.id)}/files?path=${encodeURIComponent(full)}`, {
        method: 'DELETE',
      });
      setMsg(`「${e.name}」已删除`);
      refreshDir();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : '删除失败');
    }
  };

  /** 上移/下移（position 语义：拖动项插入到"移除自身后"列表的第 index 位） */
  const handleMove = async (e: TreeNode, index: number, delta: -1 | 1) => {
    if (!selected || !entries) return;
    const target = index + delta;
    if (target < 0 || target >= entries.length) return;
    setMsg('');
    // 乐观更新
    const next = [...entries];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setEntries(next);
    try {
      await apiV2(`/api/assets/${encodeURIComponent(selected.id)}/files/order`, {
        method: 'POST', body: JSON.stringify({ path, names: [e.name], position: target }),
      });
    } catch (err) {
      setMsg(err instanceof Error ? err.message : '排序失败');
      refreshDir();
    }
  };

  // ── 发布（仅课程族） ──
  const handlePublish = async () => {
    if (!selected) return;
    setPublishing(true);
    setMsg('');
    try {
      await apiV2(`/api/assets/${encodeURIComponent(selected.id)}/publish`, { method: 'POST' });
      setPublish({ state: 'queued' });
      for (let i = 0; i < 90; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const st = await apiV2<{ state?: string; message?: string }>(
          `/api/assets/${encodeURIComponent(selected.id)}/publish-status`);
        setPublish(st);
        if (st.state === 'done' || st.state === 'failed') break;
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '渲染失败');
    } finally {
      setPublishing(false);
    }
  };

  // ── 回收站 ──
  const loadTrash = async () => {
    try {
      const d = await apiV2<{ items: TrashItem[] }>('/api/trash');
      setTrashItems(d.items.filter(i => i.type === 'asset'));
    } catch (e) {
      console.error('加载回收站失败', e);
    }
  };

  const handleRestore = async (t: TrashItem) => {
    setMsg('');
    try {
      await apiV2(`/api/trash/${encodeURIComponent(t.id)}/restore`, { method: 'POST' });
      setMsg(`「${t.name}」已恢复`);
      loadTrash();
      loadAssets(bucket);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '恢复失败');
    }
  };

  const handlePurge = async (t: TrashItem) => {
    const ok = await confirmDelete({ what: `资产「${t.name}」`, recoverable: false });
    if (!ok) return;
    setMsg('');
    try {
      await apiV2(`/api/trash/${encodeURIComponent(t.id)}`, { method: 'DELETE' });
      setMsg(`「${t.name}」已彻底删除`);
      loadTrash();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '删除失败');
    }
  };

  const addTag = (list: string[], setList: (v: string[]) => void, input: string, setInput: (v: string) => void) => {
    const t = input.trim();
    if (t && !list.includes(t)) setList([...list, t]);
    setInput('');
  };

  const pathParts = path ? path.split('/') : [];

  return (
    <div className="flex flex-col gap-3 h-[70vh] animate-fadeIn">
      {msg && <div className="px-3 py-2 text-xs text-slate-700 font-bold bg-slate-50 border border-slate-200 rounded-lg">{msg}</div>}

      {/* ── 工具条：bucket 四选一 + 操作 ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {BUCKETS.map(b => (
          <button key={b.value} onClick={() => { setBucket(b.value); setSelected(null); }}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold ${
              bucket === b.value ? 'bg-brand-orange text-black' : 'bg-white border border-slate-300 text-slate-600 hover:border-brand-orange'}`}>
            {b.label}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => loadAssets(bucket)} title="刷新"
          className="text-slate-500 hover:text-brand-orange p-1.5 rounded hover:bg-slate-100"><RefreshCw className="w-4 h-4" /></button>
        <button onClick={() => { setShowTrash(true); loadTrash(); }}
          className="text-xs bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg hover:border-brand-orange">回收站</button>
        <button onClick={() => { setShowCreate(v => !v); if (!showCreate) setNewShelf(isCourseFamily(bucket) ? bucket : 'courses'); setMsg(''); }}
          className="text-xs bg-brand-orange text-black font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> 新建资产
        </button>
      </div>

      {/* ── 新建面板 ── */}
      {showCreate && (
        <div className="bg-white border border-slate-300 rounded-2xl p-4 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="资产名称"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-brand-orange" />
            <div className="flex flex-wrap gap-1">
              {newTags.map(t => (
                <span key={t} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                  {t}<button onClick={() => setNewTags(newTags.filter(x => x !== t))}><X className="w-3 h-3" /></button>
                </span>
              ))}
              <input value={newTagInput} onChange={e => setNewTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(newTags, setNewTags, newTagInput, setNewTagInput); } }}
                placeholder="标签，回车添加"
                className="text-xs bg-white border border-slate-300 rounded-full px-2 py-0.5 w-28 outline-none focus:border-brand-orange" />
            </div>
            {isCourseFamily(bucket) && (
              <>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 shrink-0">放哪：</span>
                  <div className="flex rounded-lg overflow-hidden border border-slate-300">
                    <button onClick={() => setNewShelf('courses')}
                      className={`px-2.5 py-1 ${newShelf === 'courses' ? 'bg-brand-orange text-black font-bold' : 'bg-white text-slate-600'}`}>课程</button>
                    <button onClick={() => setNewShelf('books')}
                      className={`px-2.5 py-1 ${newShelf === 'books' ? 'bg-brand-orange text-black font-bold' : 'bg-white text-slate-600'}`}>书架</button>
                  </div>
                  <span className="text-slate-400">{newShelf === 'courses' ? '主页课程区展示' : '主页书架区展示'}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {TYPE_OPTIONS.map(t => (
                    <button key={t.value} onClick={() => setNewType(t.value)}
                      className={`text-xs px-2.5 py-1 rounded-lg ${newType === t.value ? 'bg-brand-orange text-black font-bold' : 'bg-white border border-slate-300 text-slate-600'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {FORMAT_OPTIONS.map(f => (
                    <button key={f.value} onClick={() => setNewFormat(f.value)}
                      className={`text-xs px-2.5 py-1 rounded-lg ${newFormat === f.value ? 'bg-brand-orange text-black font-bold' : 'bg-white border border-slate-300 text-slate-600'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={6}
              placeholder="描述（可选）"
              className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-orange resize-none" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)}
                className="text-xs bg-white border border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg">取消</button>
              <button onClick={handleCreate}
                className="text-xs bg-brand-orange text-black font-bold px-4 py-1.5 rounded-lg">创建</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 列表 / 文件面板 ── */}
      {selected ? (
        <div className="flex-1 min-h-0 bg-white border border-slate-300 rounded-2xl flex flex-col overflow-hidden">
          {/* 头部 */}
          <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-2">
            <button onClick={() => { setSelected(null); setEntries(null); }} title="返回列表"
              className="text-slate-500 hover:text-brand-orange p-1 rounded hover:bg-slate-100"><ArrowLeft className="w-4 h-4" /></button>
            <span className="text-sm font-bold text-slate-900 truncate">{selected.name}</span>
            {isCourseFamily(selected.bucket) && (
              <>
                {selected.format === 'ebook' && publish.state === 'done' && (
                  <a href={`/course/${selected.id}/`} target="_blank" rel="noreferrer"
                    className="text-xs text-brand-orange hover:underline">预览</a>
                )}
                {selected.format === 'ebook' && (
                  <button onClick={handlePublish} disabled={publishing}
                    className="text-xs bg-white border border-slate-300 text-slate-700 px-3 py-1 rounded-lg flex items-center gap-1 hover:border-brand-orange disabled:opacity-50">
                    <Hammer className="w-3.5 h-3.5" /> {publishing ? '渲染中…' : '保存并渲染'}
                  </button>
                )}
                {selected.format === 'ebook' && (
                  <span className={`text-xs ${(PUBLISH_STATE[publish.state || 'none']).cls}`}>
                    {publish.state === 'failed' && publish.message
                      ? `❌ 渲染失败：${publish.message}`
                      : (PUBLISH_STATE[publish.state || 'none']).text}
                  </span>
                )}
              </>
            )}
            <div className="flex-1" />
            {!isCourseFamily(selected.bucket) && (
              <a href={zipHref(selected.id)} title="打包下载"
                className="text-slate-500 hover:text-brand-orange p-1.5 rounded hover:bg-slate-100"><Download className="w-4 h-4" /></a>
            )}
          </div>

          {/* 根目录工具栏 */}
          <div className="px-5 py-2 border-b border-slate-200 flex items-center gap-2 flex-wrap">
            {/* 面包屑 */}
            <button onClick={() => { const p = ''; setPath(p); loadDir(selected.id, p); }}
              className={`text-xs ${path ? 'text-slate-500 hover:text-brand-orange' : 'text-slate-900 font-bold'}`}>根目录</button>
            {pathParts.map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-slate-400" />
                <button onClick={() => { const p = pathParts.slice(0, i + 1).join('/'); setPath(p); loadDir(selected.id, p); }}
                  className={`text-xs ${i === pathParts.length - 1 ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-brand-orange'}`}>{part}</button>
              </span>
            ))}
            <div className="flex-1" />
            <input ref={fileInput} type="file" multiple className="hidden"
              onChange={e => { handleUpload(e.target.files, false); e.target.value = ''; }} />
            <input ref={folderInput} type="file" multiple className="hidden" {...{ webkitdirectory: '' }}
              onChange={e => { handleUpload(e.target.files, true); e.target.value = ''; }} />
            <button onClick={() => fileInput.current?.click()}
              className="text-xs bg-white border border-slate-300 text-slate-700 px-3 py-1 rounded-lg flex items-center gap-1 hover:border-brand-orange">
              <Upload className="w-3.5 h-3.5" /> 上传文件
            </button>
            <button onClick={() => folderInput.current?.click()}
              className="text-xs bg-white border border-slate-300 text-slate-700 px-3 py-1 rounded-lg flex items-center gap-1 hover:border-brand-orange">
              <Upload className="w-3.5 h-3.5" /> 上传文件夹
            </button>
            <button onClick={() => { setShowMkdir(v => !v); setMkdirName(''); }}
              className="text-xs bg-white border border-slate-300 text-slate-700 px-3 py-1 rounded-lg flex items-center gap-1 hover:border-brand-orange">
              <FolderPlus className="w-3.5 h-3.5" /> 新建文件夹
            </button>
            <button onClick={refreshDir} title="刷新"
              className="text-slate-500 hover:text-brand-orange p-1 rounded hover:bg-slate-100"><RefreshCw className="w-4 h-4" /></button>
          </div>

          {showMkdir && (
            <div className="px-5 py-2 border-b border-slate-200 flex gap-2">
              <input autoFocus value={mkdirName} onChange={e => setMkdirName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleMkdir(); if (e.key === 'Escape') setShowMkdir(false); }}
                placeholder="文件夹名称"
                className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-brand-orange" />
              <button onClick={handleMkdir}
                className="text-xs bg-brand-orange text-black font-bold px-3 py-1.5 rounded-lg">创建</button>
            </div>
          )}

          {/* 文件列表（逐层钻取） */}
          <div className="flex-1 overflow-y-auto">
            {entries === null ? (
              <div className="p-6 text-sm text-slate-500 text-center">加载中…</div>
            ) : entries.length === 0 ? (
              <div className="p-6 text-sm text-slate-500 text-center">此文件夹暂无内容，可上传文件或新建文件夹</div>
            ) : entries.map((e, i) => (
              <div key={e.name}
                className="group flex items-center gap-2 px-5 py-2 border-b border-slate-100 hover:bg-slate-50">
                {e.type === 'dir' ? (
                  <button onClick={() => { const p = path ? `${path}/${e.name}` : e.name; setPath(p); loadDir(selected.id, p); }}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer">
                    <Folder className="w-4 h-4 text-brand-orange shrink-0" />
                    <span className="text-sm text-slate-900 truncate">{e.name}</span>
                  </button>
                ) : (
                  <a href={fileHref(selected.id, path ? `${path}/${e.name}` : e.name)} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 flex-1 min-w-0 no-underline">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-900 truncate">{e.name}</span>
                    <span className="text-xs text-slate-400 shrink-0">{typeof e.size === 'number' ? formatSize(e.size) : ''}</span>
                  </a>
                )}
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100">
                  <button onClick={() => handleMove(e, i, -1)} title="上移" disabled={i === 0}
                    className="text-slate-400 hover:text-brand-orange p-1 disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleMove(e, i, 1)} title="下移" disabled={i === entries.length - 1}
                    className="text-slate-400 hover:text-brand-orange p-1 disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { setRename({ path: path ? `${path}/${e.name}` : e.name, name: e.name }); setRenameValue(e.name); }}
                    title="重命名" className="text-slate-400 hover:text-brand-orange p-1"><Pencil className="w-3.5 h-3.5" /></button>
                  {e.type === 'file' && (
                    <a href={fileHref(selected.id, path ? `${path}/${e.name}` : e.name)} download title="下载"
                      className="text-slate-400 hover:text-brand-orange p-1"><Download className="w-3.5 h-3.5" /></a>
                  )}
                  <button onClick={() => handleDeleteEntry(e)} title="删除"
                    className="text-slate-400 hover:text-rose-500 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {assets.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              此分类暂无资产<br />
              <button onClick={() => setShowCreate(true)} className="text-brand-orange hover:underline mt-1">创建第一个</button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 p-1">
              {assets.map(a => {
                const Icon = TYPE_LUCIDE[a.type] ?? Folder;
                return (
                  <div key={a.id} onClick={() => openAsset(a)}
                    className="group bg-white border border-slate-300 rounded-2xl p-4 cursor-pointer hover:border-brand-orange transition-colors">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-brand-orange shrink-0" />
                      <span className="text-sm font-bold text-slate-900 truncate">{a.name}</span>
                      {isCourseFamily(a.bucket) && a.bucket === 'courses' && (
                        <span className="text-xs text-amber-500 shrink-0">★ 课程</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {(FORMAT_LABEL[a.format || 'folder'] || a.format) ?? ''}
                    </div>
                    {a.tags && a.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {a.tags.map(t => (
                          <span key={t} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100">
                      {isCourseFamily(a.bucket) && (
                        <button onClick={e => { e.stopPropagation(); handleToggleShelf(a); }}
                          title={a.bucket === 'courses' ? '移到书架' : '标为课程'}
                          className="text-slate-400 hover:text-amber-500 p-1"><Star className="w-3.5 h-3.5" /></button>
                      )}
                      <button onClick={e => { e.stopPropagation(); openEdit(a); }} title="编辑"
                        className="text-slate-400 hover:text-brand-orange p-1"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(a); }} title="删除"
                        className="text-slate-400 hover:text-rose-500 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 重命名弹窗 ── */}
      {rename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setRename(null)}>
          <div className="bg-white rounded-2xl p-6 w-[30rem] shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-slate-900 mb-3">重命名「{rename.name}」</h3>
            <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRename(null); }}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-orange" />
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setRename(null)}
                className="text-xs bg-white border border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg">取消</button>
              <button onClick={handleRename}
                className="text-xs bg-brand-orange text-black font-bold px-4 py-1.5 rounded-lg">确定</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 编辑弹窗 ── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl p-6 w-[30rem] shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-slate-900 mb-3">编辑「{editing.name}」</h3>
            <div className="space-y-2">
              <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="名称"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-brand-orange" />
              <div className="flex flex-wrap gap-1">
                {editTags.map(t => (
                  <span key={t} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                    {t}<button onClick={() => setEditTags(editTags.filter(x => x !== t))}><X className="w-3 h-3" /></button>
                  </span>
                ))}
                <input value={editTagInput} onChange={e => setEditTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(editTags, setEditTags, editTagInput, setEditTagInput); } }}
                  placeholder="标签，回车添加"
                  className="text-xs bg-white border border-slate-300 rounded-full px-2 py-0.5 w-28 outline-none focus:border-brand-orange" />
              </div>
              {isCourseFamily(editing.bucket) && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 shrink-0">放哪：</span>
                  <div className="flex rounded-lg overflow-hidden border border-slate-300">
                    <button onClick={() => setEditShelf('courses')}
                      className={`px-2.5 py-1 ${editShelf === 'courses' ? 'bg-brand-orange text-black font-bold' : 'bg-white text-slate-600'}`}>课程</button>
                    <button onClick={() => setEditShelf('books')}
                      className={`px-2.5 py-1 ${editShelf === 'books' ? 'bg-brand-orange text-black font-bold' : 'bg-white text-slate-600'}`}>书架</button>
                  </div>
                  <span className="text-slate-400">{editShelf === 'courses' ? '主页课程区展示' : '主页书架区展示'}</span>
                </div>
              )}
              {isCourseFamily(editing.bucket) && (
                <div className="flex flex-wrap gap-1">
                  {TYPE_OPTIONS.map(t => (
                    <button key={t.value} onClick={() => setEditType(t.value)}
                      className={`text-xs px-2.5 py-1 rounded-lg ${editType === t.value ? 'bg-brand-orange text-black font-bold' : 'bg-white border border-slate-300 text-slate-600'}`}>
                      {t.label}
                    </button>
                  ))}
                  {FORMAT_OPTIONS.map(f => (
                    <button key={f.value} onClick={() => setEditFormat(f.value)}
                      className={`text-xs px-2.5 py-1 rounded-lg ${editFormat === f.value ? 'bg-brand-orange text-black font-bold' : 'bg-white border border-slate-300 text-slate-600'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
              {isCourseFamily(editing.bucket) && (
                <button onClick={() => setEditShareable(v => !v)}
                  className="w-full flex items-center justify-between text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <span>允许别人下载这门课（源文件 zip）</span>
                  <span className={`w-9 h-5 rounded-full relative transition-colors ${editShareable ? 'bg-brand-orange' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${editShareable ? 'left-4.5' : 'left-0.5'}`} />
                  </span>
                </button>
              )}
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={5} placeholder="描述"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-orange resize-none" />
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setEditing(null)}
                className="text-xs bg-white border border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg">取消</button>
              <button onClick={handleUpdate}
                className="text-xs bg-brand-orange text-black font-bold px-4 py-1.5 rounded-lg">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 垃圾桶弹窗 ── */}
      {showTrash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowTrash(false)}>
          <div className="bg-white rounded-2xl p-6 w-[30rem] shadow-xl max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-slate-900 mb-3">资产回收站</h3>
            <div className="flex-1 overflow-y-auto space-y-1">
              {trashItems.length === 0 ? (
                <div className="text-sm text-slate-500 text-center py-6">回收站为空</div>
              ) : trashItems.map(t => (
                <div key={t.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-900 truncate">📦 {t.name}</div>
                    <div className="text-xs text-slate-400">删除于 {t.deleted_at.slice(0, 10)}</div>
                  </div>
                  <button onClick={() => handleRestore(t)}
                    className="text-xs text-emerald-600 border border-emerald-200 rounded-lg px-2.5 py-1 hover:bg-emerald-50">恢复</button>
                  {user?.role === 'admin' && (
                    <button onClick={() => handlePurge(t)}
                      className="text-xs text-rose-500 border border-rose-200 rounded-lg px-2.5 py-1 hover:bg-rose-50">永久删除</button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowTrash(false)}
                className="text-xs bg-white border border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
