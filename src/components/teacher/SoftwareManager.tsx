import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HardDrive, Trash2, RefreshCw, FolderOpen, RotateCcw, Pencil, FileText, FolderPlus, Upload, Loader2, GripVertical, Plus } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLoading } from '../../lib/useLoading';
import { useAuth } from '../../lib/useAuth';

import type { TreeNode } from '../../types/course';

// ── 拖拽组件（复用 CourseManager） ──
function SortableItem({ id, children, className = '', dragHandle }: {
  id: string; children: React.ReactNode; className?: string; dragHandle?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-0 ${className}`} {...attributes} {...listeners}>
      {dragHandle && (
        <span className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 shrink-0 px-1 -ml-1">
          {dragHandle}
        </span>
      )}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

interface Software {
  id: string;
  name: string;
  description: string;
  teacher: string;
  material_count?: number;
  created_at: string;
}

export default function SoftwareManager() {
  const { username } = useAuth();
  const { wrap } = useLoading();
  const [items, setItems] = useState<Software[]>([]);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selected, setSelected] = useState<Software | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [showDrop, setShowDrop] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  // 新建时直接上传文件夹
  const [pendingFolder, setPendingFolder] = useState<PendingFile[] | null>(null);

  const loadItems = useCallback(() => {
    setError('');
    wrap(
      fetch(`/api/resources?teacher=${username}&category=download&t=${Date.now()}`)
        .then(r => r.json())
        .then(data => {
          if (data.status === 'success') {
            setItems(data.courses || data.resources || []);
          } else {
            setError(data.detail || '加载失败');
          }
        }),
      '加载软件列表...'
    ).catch(() => setError('无法连接服务器'));
  }, [username]);

  useEffect(() => { loadItems(); }, [loadItems]);

  // ── 创建软件（只填名称+描述，不生成 class.json） ──
  const handleCreate = async (withFolder?: PendingFile[]) => {
    if (!newName.trim()) return;
    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher: username, name: newName.trim(), description: newDesc.trim(), category: 'download', skip_class_json: true }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setShowCreate(false);
        setNewName('');
        setNewDesc('');
        setPendingFolder(null);
        loadItems();
        // 如果选了文件夹，创建后直接上传
        const newId = data.resource?.id || data.id;
        if (withFolder && withFolder.length > 0 && newId) {
          const software: Software = { id: newId, name: newName.trim(), description: newDesc.trim(), teacher: username, created_at: new Date().toISOString() };
          setSelected(software);
          await uploadBatchFor(software, withFolder);
        }
      } else {
        const msg = Array.isArray(data.detail)
          ? data.detail.map((e: any) => e.msg || JSON.stringify(e)).join('；')
          : (data.detail || '创建失败');
        setError(msg);
      }
    } catch { setError('无法连接服务器'); }
  };

  // ── 删除软件 ──
  const handleDelete = async (item: Software) => {
    if (!confirm(`确定删除「${item.name}」？此操作不可恢复。`)) return;
    try {
      const res = await fetch(`/api/resources/${encodeURIComponent(item.id)}?teacher=${username}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success') {
        if (selected?.id === item.id) { setSelected(null); setTree([]); }
        loadItems();
      } else { alert(data.detail || '删除失败'); }
    } catch { alert('无法连接服务器'); }
  };

  // ── 文件树 ──
  const loadTree = async (item: Software) => {
    setSelected(item);
    await wrap(
      fetch(`/api/resources/${encodeURIComponent(item.id)}/tree?t=${Date.now()}`)
        .then(res => res.json())
        .then(data => { if (data.status === 'success') setTree(data.tree || []); }),
      '加载文件...'
    ).catch(() => {});
  };

  const refreshTree = async () => {
    if (!selected) return;
    const data = await fetch(`/api/resources/${encodeURIComponent(selected.id)}/tree?t=${Date.now()}`).then(r => r.json());
    if (data.status === 'success') setTree(data.tree || []);
    loadItems();
  };

  // ── 上传文件 ──
  const handleUploadFile = async (path: string) => {
    if (!selected) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = async () => {
      const files = input.files;
      if (!files || files.length === 0) return;
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        await fetch(`/api/resources/${encodeURIComponent(selected.id)}/tree/upload?path=${encodeURIComponent(path)}`, { method: 'POST', body: formData });
      }
      refreshTree();
    };
    input.click();
  };

  // ── 新建文件夹 ──
  const [newFolderParent, setNewFolderParent] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');

  const handleCreateFolder = async () => {
    if (!selected || newFolderParent === null || !newFolderName.trim()) return;
    const parentPath = newFolderParent ? newFolderParent + '/' + newFolderName.trim() : newFolderName.trim();
    try {
      const res = await fetch(`/api/resources/${encodeURIComponent(selected.id)}/tree/folder?path=${encodeURIComponent(parentPath)}`, { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (data?.status !== 'success') { alert(data?.detail || '创建文件夹失败'); return; }
      setNewFolderParent(null);
      setNewFolderName('');
      refreshTree();
    } catch { alert('无法连接服务器'); }
  };

  // ── 删除文件/文件夹 ──
  const handleDeleteEntry = async (path: string, name: string) => {
    if (!selected || !confirm(`确定删除「${name}」？`)) return;
    await fetch(`/api/resources/${encodeURIComponent(selected.id)}/tree?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
    refreshTree();
  };

  // ── 重命名 ──
  const [rename, setRename] = useState<{ kind: string; current: string; run: (newName: string) => Promise<void> } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const openRenameEntry = (path: string, name: string) => {
    if (!selected) return;
    setRenameValue(name);
    setRename({
      kind: '文件',
      current: name,
      run: async (newName: string) => {
        const res = await fetch(`/api/resources/${encodeURIComponent(selected.id)}/tree/rename?path=${encodeURIComponent(path)}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ new_name: newName })
        });
        const data = await res.json().catch(() => null);
        if (data?.status !== 'success') return alert(data?.detail || '重命名失败');
        refreshTree();
      },
    });
  };

  // ── 拖拽排序 ──
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !selected) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const [aParent, aName] = activeId.includes('::') ? activeId.split('::') : ['', activeId];
    const [oParent, oName] = overId.includes('::') ? overId.split('::') : ['', overId];
    if (aParent !== oParent) return;
    // 本地先排序
    const reorderInTree = (nodes: TreeNode[], parentPath: string): TreeNode[] => {
      return nodes.map(node => {
        const nodePath = parentPath ? `${parentPath}/${node.name}` : node.name;
        if (nodePath === aParent && node.children) {
          const oldIdx = node.children.findIndex(c => c.name === aName);
          const newIdx = node.children.findIndex(c => c.name === oName);
          if (oldIdx === -1 || newIdx === -1) return node;
          const newChildren = [...node.children];
          const [moved] = newChildren.splice(oldIdx, 1);
          newChildren.splice(newIdx, 0, moved);
          return { ...node, children: newChildren };
        }
        if (node.children) return { ...node, children: reorderInTree(node.children, nodePath) };
        return node;
      });
    };
    if (aParent === '') {
      const oldIdx = tree.findIndex(c => c.name === aName);
      const newIdx = tree.findIndex(c => c.name === oName);
      if (oldIdx !== -1 && newIdx !== -1) {
        const newTree = [...tree];
        const [moved] = newTree.splice(oldIdx, 1);
        newTree.splice(newIdx, 0, moved);
        setTree(newTree);
      }
    } else {
      setTree(reorderInTree(tree, ''));
    }
    await fetch(`/api/resources/${encodeURIComponent(selected.id)}/tree/reorder?name=${encodeURIComponent(aName)}&dir=${encodeURIComponent(aParent)}&direction=swap&target=${encodeURIComponent(oName)}`, { method: 'POST' });
  };

  // ── 编辑软件 ──
  const [editingItem, setEditingItem] = useState<Software | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const openEditItem = (item: Software) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditDesc(item.description || '');
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !editName.trim()) return;
    try {
      const res = await fetch(`/api/resources/${encodeURIComponent(editingItem.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() }),
      });
      const data = await res.json();
      if (data.status === 'success') { setEditingItem(null); loadItems(); }
      else {
        const msg = Array.isArray(data.detail) ? data.detail.map((e: any) => e.msg || JSON.stringify(e)).join('；') : (data.detail || '更新失败');
        setError(msg);
      }
    } catch { setError('无法连接服务器'); }
  };

  // ── 批量上传 ──
  type PendingFile = { rel: string; file: File };
  const readDirEntries = (reader: any): Promise<any[]> => new Promise((resolve, reject) => reader.readEntries(resolve, reject));

  const collectFolder = async (entries: any[], base: string, out: PendingFile[]) => {
    for (const entry of entries) {
      const rel = base ? `${base}/${entry.name}` : entry.name;
      if (entry.isFile) { const file: File = await new Promise((res, rej) => entry.file(res, rej)); out.push({ rel, file }); }
      else if (entry.isDirectory) {
        const reader = entry.createReader();
        const children: any[] = [];
        let batch: any[];
        do { batch = await readDirEntries(reader); children.push(...batch); } while (batch.length > 0);
        await collectFolder(children, rel, out);
      }
    }
  };

  const uploadBatchFor = async (target: Software, files: PendingFile[]) => {
    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });
    try {
      for (let i = 0; i < files.length; i++) {
        const { rel, file } = files[i];
        const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
        const formData = new FormData();
        formData.append('file', file);
        await fetch(`/api/resources/${encodeURIComponent(target.id)}/tree/upload?path=${encodeURIComponent(dir)}`, { method: 'POST', body: formData });
        setUploadProgress({ done: i + 1, total: files.length });
      }
      // 上传完刷新
      const data = await fetch(`/api/resources/${encodeURIComponent(target.id)}/tree?t=${Date.now()}`).then(r => r.json());
      if (data.status === 'success') setTree(data.tree || []);
      loadItems();
    } finally { setUploading(false); }
  };

  const uploadBatch = async (files: PendingFile[]) => {
    if (!selected) return;
    await uploadBatchFor(selected, files);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!selected || uploading) return;
    const items = e.dataTransfer.items;
    if (!items) return;
    const entries: any[] = [];
    for (let i = 0; i < items.length; i++) { const entry = (items[i] as any).webkitGetAsEntry?.(); if (entry) entries.push(entry); }
    if (entries.length === 0) { alert('请拖入文件夹'); return; }
    const files: PendingFile[] = [];
    await collectFolder(entries, '', files);
    if (files.length === 0) { alert('文件夹为空'); return; }
    await uploadBatch(files);
  };

  const handleFolderPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selected || uploading) return;
    const fileList = e.target.files;
    if (!fileList) return;
    const files: PendingFile[] = [];
    for (let i = 0; i < fileList.length; i++) { const f = fileList[i]; files.push({ rel: (f as any).webkitRelativePath || f.name, file: f }); }
    if (files.length === 0) { alert('文件夹为空'); return; }
    await uploadBatch(files);
    e.target.value = '';
  };

  const handleRenameConfirm = async () => {
    if (!rename) return;
    const n = renameValue.trim();
    if (!n || n === rename.current) { setRename(null); return; }
    try { await rename.run(n); } catch { alert('无法连接服务器'); }
    setRename(null);
  };

  // ── 回收站 ──
  const [trashItems, setTrashItems] = useState<any[]>([]);
  const [showTrash, setShowTrash] = useState(false);

  const loadTrash = useCallback(async () => {
    const res = await fetch(`/api/trash/items?username=${username}`);
    const data = await res.json();
    if (data.status === 'success') setTrashItems(data.items.filter((i: any) => i.type === 'resource' || i.type === 'course'));
  }, [username]);

  const handleRestore = async (folder: string) => {
    await fetch(`/api/trash/items/${encodeURIComponent(folder)}/restore?username=${username}`, { method: 'POST' });
    loadTrash(); loadItems();
  };

  const handlePermanentDelete = async (folder: string) => {
    if (!confirm('永久删除？不可恢复！')) return;
    await fetch(`/api/trash/items/${encodeURIComponent(folder)}?username=${username}`, { method: 'DELETE' });
    loadTrash();
  };

  // ── 文件树渲染 ──
  const renderTreeNode = (node: TreeNode, basePath: string): React.ReactNode => {
    const path = basePath ? `${basePath}/${node.name}` : node.name;
    const sortableId = `${basePath}::${node.name}`;
    const dragHandle = <GripVertical size={12} />;

    if (node.type === 'dir') {
      return (
        <SortableItem key={sortableId} id={sortableId} className="border border-slate-700/50 rounded-xl mb-1" dragHandle={dragHandle}>
          <div className="flex items-center justify-between px-3 py-2 bg-slate-800/30 rounded-t-xl">
            <span className="flex items-center gap-2 text-sm text-white">
              <FolderOpen size={14} className="text-amber-400" /> {node.name}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => handleUploadFile(path)} title="上传到此文件夹" className="text-slate-500 hover:text-slate-200 p-1"><Upload size={14} /></button>
              <button onClick={() => setNewFolderParent(path)} title="新建子文件夹" className="text-slate-500 hover:text-slate-200 p-1"><FolderPlus size={14} /></button>
              <button onClick={() => openRenameEntry(path, node.name)} title="重命名" className="text-slate-500 hover:text-slate-200 p-1"><Pencil size={14} /></button>
              <button onClick={() => handleDeleteEntry(path, node.name)} title="删除" className="text-slate-500 hover:text-rose-400 p-1"><Trash2 size={14} /></button>
            </div>
          </div>
          {node.children && node.children.length > 0 && (
            <div className="px-3 py-2 space-y-1">{renderSortableChildren(node.children, path)}</div>
          )}
        </SortableItem>
      );
    }
    return (
      <SortableItem key={sortableId} id={sortableId} className="px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800/40 rounded" dragHandle={dragHandle}>
        <span className="flex items-center gap-1.5">
          <FileText size={14} className="text-slate-500 shrink-0" />
          <span className="truncate">{node.name}</span>
          {node.size !== undefined && <span className="text-[10px] text-slate-600 shrink-0">({(node.size / 1024).toFixed(1)} KB)</span>}
          <button onClick={() => openRenameEntry(path, node.name)} title="重命名" className="text-slate-600 hover:text-slate-300 p-0.5 shrink-0"><Pencil size={11} /></button>
          <button onClick={() => handleDeleteEntry(path, node.name)} title="删除" className="text-slate-600 hover:text-rose-400 p-0.5 shrink-0"><Trash2 size={11} /></button>
        </span>
      </SortableItem>
    );
  };

  const renderSortableChildren = (children: TreeNode[], parentPath: string) => (
    <SortableContext items={children.map(c => `${parentPath}::${c.name}`)} strategy={verticalListSortingStrategy}>
      {children.map(c => renderTreeNode(c, parentPath))}
    </SortableContext>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <HardDrive className="text-brand-orange" size={20} /> 软件管理
        </h2>
        <div className="flex gap-2">
          <button onClick={loadItems} className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors">
            <RefreshCw size={14} /> 刷新
          </button>
          <button onClick={() => { loadTrash(); setShowTrash(true); }} className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors">
            <Trash2 size={14} /> 回收站
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 text-xs bg-brand-orange hover:bg-brand-orange/90 text-black font-bold px-3 py-1.5 rounded-lg transition-colors">
            <Plus size={14} /> 新建软件
          </button>
        </div>
      </div>

      {/* 新建软件弹窗 */}
      {showCreate && (
        <div className="bg-slate-900 border border-slate-600 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-4">新建软件</h3>
          <div className="space-y-2">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-slate-400 block mb-1">软件名称</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="输入软件名称" autoFocus
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-orange" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-400 block mb-1">软件描述</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={1}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-orange resize-none" />
              </div>
            </div>
            {/* 文件夹上传：创建后自动上传 */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">安装包文件夹（可选）</label>
              <label className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-400 hover:border-brand-orange/50 cursor-pointer transition-colors">
                <FolderOpen size={14} className="text-brand-orange" />
                {pendingFolder ? <span className="text-white">{pendingFolder.length} 个文件待上传</span> : '选择文件夹（创建后自动上传）'}
                <input type="file" multiple className="hidden" {...({ webkitdirectory: '', directory: '' } as any)}
                  onChange={async e => {
                    const fileList = e.target.files;
                    if (!fileList) return;
                    const files: PendingFile[] = [];
                    for (let i = 0; i < fileList.length; i++) { const f = fileList[i]; files.push({ rel: (f as any).webkitRelativePath || f.name, file: f }); }
                    if (files.length > 0) setPendingFolder(files);
                  }} />
              </label>
              {pendingFolder && (
                <button onClick={() => setPendingFolder(null)} className="text-[10px] text-slate-500 hover:text-slate-300 mt-1">取消选择</button>
              )}
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => { setShowCreate(false); setNewDesc(''); setPendingFolder(null); }} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg">取消</button>
              <button onClick={() => handleCreate(pendingFolder || undefined)} className="text-xs bg-brand-orange hover:bg-brand-orange/90 text-black font-bold px-4 py-2 rounded-lg">
                {pendingFolder ? '创建并上传' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && <div className="text-xs text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded-lg px-4 py-2">{error}</div>}

      {/* 软件列表 */}
      {items.length === 0 ? (
        <div className="text-sm text-slate-500 bg-slate-900/50 border border-slate-600 rounded-2xl p-8 text-center">
          暂无软件，点击「新建软件」开始创建
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.id} onClick={() => loadTree(item)}
              className={`bg-slate-900 border rounded-2xl p-5 cursor-pointer transition-all duration-300 group hover:translate-y-[-4px] ${
                selected?.id === item.id ? 'border-brand-orange/50 ring-1 ring-brand-orange/20' : 'border-slate-600 hover:border-brand-orange/30'
              }`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-2xl block mb-2"><HardDrive size={28} className="text-blue-400" /></span>
                  <h3 className="font-bold text-white text-sm mb-1">{item.name}</h3>
                  {item.description && <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>}
                </div>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEditItem(item)} className="text-slate-600 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-all p-1" title="编辑">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(item)} className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all p-1" title="删除">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 文件树详情 */}
      {selected && (
        <div className="bg-slate-900/50 border border-slate-600 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderOpen size={16} className="text-brand-orange" />
              {selected.name}
            </h3>
            <button onClick={() => { setSelected(null); setTree([]); }} className="text-xs text-slate-500 hover:text-slate-300">关闭</button>
          </div>

          {/* 工具栏 */}
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => setShowDrop(true)} className="flex items-center gap-1.5 text-xs bg-brand-orange/20 hover:bg-brand-orange/30 text-brand-orange px-3 py-1.5 rounded-lg transition-colors">
              <FolderOpen size={14} /> 批量上传
            </button>
            <button onClick={() => handleUploadFile('')} className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors">
              <Upload size={14} /> 上传文件
            </button>
            <button onClick={() => setNewFolderParent('')} className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors">
              <FolderPlus size={14} /> 新建文件夹
            </button>
            <button onClick={refreshTree} className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors">
              <RefreshCw size={14} /> 刷新
            </button>
          </div>

          {/* 拖拽上传区 */}
          {showDrop && (
            <div onDragOver={e => e.preventDefault()} onDrop={handleDrop}
              className={`mb-3 border-2 border-dashed rounded-xl p-6 text-center transition-colors ${uploading ? 'border-slate-600' : 'border-brand-orange/50 hover:border-brand-orange'}`}>
              {uploading ? (
                <div className="text-sm text-slate-300">
                  <Loader2 size={16} className="inline animate-spin mr-2" />
                  正在上传 {uploadProgress.done}/{uploadProgress.total} 个文件…
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-300 mb-2">把软件文件夹拖到这里，自动解析目录结构并上传</p>
                  <label className="text-xs text-brand-orange cursor-pointer underline">
                    或点击选择文件夹
                    <input type="file" multiple className="hidden" {...({ webkitdirectory: '', directory: '' } as any)} onChange={handleFolderPick} />
                  </label>
                  <button onClick={() => setShowDrop(false)} className="block mx-auto mt-3 text-xs text-slate-500 hover:text-slate-300">取消</button>
                </>
              )}
            </div>
          )}

          {/* 新建文件夹输入 */}
          {newFolderParent !== null && (
            <div className="flex gap-2 items-center mb-3">
              <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                placeholder={newFolderParent ? `在「${newFolderParent}」下新建文件夹` : '在根目录新建文件夹'}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-orange"
                onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setNewFolderParent(null); }} autoFocus />
              <button onClick={handleCreateFolder} className="text-xs bg-brand-orange text-black px-3 py-1.5 rounded-lg font-bold">创建</button>
              <button onClick={() => { setNewFolderParent(null); setNewFolderName(''); }} className="text-xs text-slate-400 hover:text-slate-200">取消</button>
            </div>
          )}

          {/* 文件树 */}
          {tree.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-8">暂无文件，点击「上传文件」或「新建文件夹」开始</div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={tree.map(n => `::${n.name}`)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">{tree.map(n => renderTreeNode(n, ''))}</div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      {/* 回收站弹窗 */}
      {showTrash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowTrash(false); }}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-[500px] max-h-[70vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-600">
              <span className="text-sm text-white font-bold flex items-center gap-2"><Trash2 size={16} /> 软件回收站</span>
              <button onClick={() => setShowTrash(false)} className="text-slate-400 hover:text-white p-1"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-2">
              {trashItems.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">回收站为空</div>
              ) : trashItems.map(t => (
                <div key={t._folder} className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-white">📦 {t.original_path?.split('/').pop()}</span>
                      <span className="text-xs text-slate-500 ml-2">删除于 {t.deleted_at?.slice(0, 10)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleRestore(t._folder)} className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-1.5 hover:bg-green-500/20 flex items-center gap-1">
                        <RotateCcw size={12} /> 恢复
                      </button>
                      <button onClick={() => handlePermanentDelete(t._folder)} className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-1.5 hover:bg-rose-500/20">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setRename(null); }}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-[380px] max-w-[90vw] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-white mb-4">重命名{rename.kind}</h3>
            <input value={renameValue} onChange={e => setRenameValue(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleRenameConfirm(); if (e.key === 'Escape') setRename(null); }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-orange" />
            <div className="flex gap-2 justify-end pt-4">
              <button onClick={() => setRename(null)} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg">取消</button>
              <button onClick={handleRenameConfirm} className="text-xs bg-brand-orange hover:bg-brand-orange/90 text-black font-bold px-4 py-2 rounded-lg">确定</button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑软件弹窗 */}
      {createPortal(editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setEditingItem(null); }}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-[50vw] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-white mb-4">编辑软件</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-slate-400 block mb-1">软件名称</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="输入软件名称"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-400 block mb-1">软件描述</label>
                  <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none" />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setEditingItem(null)} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg">取消</button>
                <button onClick={handleUpdateItem} className="text-xs bg-brand-orange hover:bg-brand-orange/90 text-black font-bold px-4 py-2 rounded-lg">保存</button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
