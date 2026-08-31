import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, FileText, Folder, FolderOpen, Download, Upload, Trash2, Loader2, RefreshCw, FolderPlus } from 'lucide-react';
import { useAuth } from '../../lib/useAuth';

interface Resource {
  id: string;
  name: string;
  category: string;
  description: string;
  teacher: string;
  url: string;
}

interface TreeNode {
  name: string;
  type: 'file' | 'folder';
  size: number;
  children?: TreeNode[];
  path?: string;
}

interface PendingFile {
  rel: string;
  file: File;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 递归读取拖拽文件夹 */
async function collectFolder(entries: any[], basePath: string, out: PendingFile[]) {
  for (const entry of entries) {
    const rel = basePath ? `${basePath}/${entry.name}` : entry.name;
    if (entry.isFile) {
      const file = await new Promise<File>((resolve) => entry.file(resolve));
      out.push({ rel, file });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const children: any[] = [];
      let batch: any[];
      do {
        batch = await new Promise<any[]>((resolve) => reader.readEntries(resolve));
        children.push(...batch);
      } while (batch.length > 0);
      await collectFolder(children, rel, out);
    }
  }
}

function TreeRow({ node, depth, urlBase }: { node: TreeNode; depth: number; urlBase: string }) {
  const [open, setOpen] = useState(depth < 1);
  const isFolder = node.type === 'folder';
  const rel = node.path || node.name;
  const href = `${urlBase}${rel}${isFolder ? '/' : ''}`;

  return (
    <>
      <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-slate-800/50 rounded-lg text-sm group"
           style={{ paddingLeft: `${depth * 1.2 + 0.5}rem` }}>
        {isFolder ? (
          <button onClick={() => setOpen(!open)} className="text-slate-400 hover:text-white shrink-0">
            {open ? <FolderOpen size={14} /> : <Folder size={14} />}
          </button>
        ) : (
          <FileText size={14} className="text-slate-500 shrink-0 ml-[1.2rem]" />
        )}
        <div className="flex-1 min-w-0">
          {isFolder ? (
            <button onClick={() => setOpen(!open)} className="text-sm text-slate-200 hover:text-white text-left truncate block">
              {node.name}
            </button>
          ) : (
            <a href={href} target="_blank" rel="noreferrer"
               className="text-sm text-slate-200 hover:text-brand-orange transition-colors no-underline truncate block">
              {node.name}
            </a>
          )}
        </div>
        <span className="text-xs text-slate-600 shrink-0">{isFolder ? `${node.children?.length || 0} 项` : formatSize(node.size)}</span>
        {!isFolder && (
          <a href={href} download className="text-slate-600 hover:text-brand-orange opacity-0 group-hover:opacity-100 transition-opacity" title="下载">
            <Download size={13} />
          </a>
        )}
      </div>
      {isFolder && open && node.children?.map((child, i) => (
        <TreeRow key={`${rel}/${child.name}-${i}`} node={{ ...child, path: `${rel}/${child.name}` }} depth={depth + 1} urlBase={urlBase} />
      ))}
    </>
  );
}

interface Props {
  resource: Resource;
  onBack: () => void;
  onRefresh: () => void;
}

export default function ResourceDetail({ resource, onBack, onRefresh }: Props) {
  const { token } = useAuth();
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const folderRef = useRef<HTMLInputElement>(null);

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/resources/${resource.id}/tree`);
      const data = await res.json();
      setTree(data.tree || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [resource.id]);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  const uploadBatch = async (files: PendingFile[]) => {
    setUploading(true);
    try {
      for (const { rel, file } of files) {
        const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
        const formData = new FormData();
        formData.append('file', file);
        await fetch(`/api/resources/${resource.id}/tree/upload?path=${encodeURIComponent(dir)}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      }
      fetchTree();
      onRefresh();
    } catch { /* ignore */ }
    setUploading(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;
    const entries: any[] = [];
    for (let i = 0; i < e.dataTransfer.items.length; i++) {
      const entry = (e.dataTransfer.items[i] as any).webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }
    if (entries.length === 0) return;
    const files: PendingFile[] = [];
    await collectFolder(entries, '', files);
    if (files.length > 0) uploadBatch(files);
  };

  const handleFolderPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || uploading) return;
    const files: PendingFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      files.push({ rel: (f as any).webkitRelativePath || f.name, file: f });
    }
    if (files.length > 0) uploadBatch(files);
    e.target.value = '';
  };

  const handleDelete = async () => {
    if (!confirm(`确定删除资源「${resource.name}」及其所有文件？`)) return;
    await fetch(`/api/resources/${resource.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    onBack();
    onRefresh();
  };

  const categoryLabel = resource.category === 'download' ? '软件下载' : '参考资料';

  return (
    <div className="h-full flex flex-col animate-fadeIn">
      {/* 头部 */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white truncate">{resource.name}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full ${resource.category === 'download' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
              {categoryLabel}
            </span>
          </div>
          {resource.description && <p className="text-xs text-slate-500 mt-0.5">{resource.description}</p>}
        </div>
        <button onClick={fetchTree} className="p-2 text-slate-400 hover:text-white transition-colors" title="刷新">
          <RefreshCw size={16} />
        </button>
        <button onClick={handleDelete} className="p-2 text-slate-600 hover:text-rose-400 transition-colors" title="删除资源">
          <Trash2 size={16} />
        </button>
      </div>

      {/* 上传区域 */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`mb-4 border-2 border-dashed rounded-xl transition-all ${dragOver ? 'border-brand-orange bg-brand-orange/10' : 'border-slate-600 hover:border-slate-400'}`}
      >
        {uploading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={20} className="text-brand-orange animate-spin mr-2" />
            <span className="text-sm text-slate-400">上传中...</span>
          </div>
        ) : (
          <div className="flex gap-3 p-4">
            <label className="flex-1 flex flex-col items-center justify-center py-4 cursor-pointer">
              <Upload size={20} className="text-slate-500 mb-1" />
              <span className="text-sm text-slate-400">拖拽文件到这里</span>
              <input type="file" className="hidden" multiple onChange={(e) => {
                const files: PendingFile[] = [];
                for (let i = 0; i < (e.target.files?.length || 0); i++) {
                  const f = e.target.files![i];
                  files.push({ rel: f.name, file: f });
                }
                if (files.length > 0) uploadBatch(files);
                e.target.value = '';
              }} />
            </label>
            <label onClick={() => folderRef.current?.click()}
                   className="flex flex-col items-center justify-center px-6 py-4 cursor-pointer border-l border-slate-700">
              <FolderPlus size={20} className="text-slate-500 mb-1" />
              <span className="text-sm text-slate-400">选择文件夹</span>
            </label>
            <input ref={folderRef} type="file" className="hidden"
                   {...{ webkitdirectory: '', directory: '' } as any}
                   onChange={handleFolderPick} />
          </div>
        )}
      </div>

      {/* 文件树 */}
      <div className="bg-slate-900 border border-slate-600 rounded-2xl flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <Loader2 size={20} className="animate-spin mr-2" /> 加载中...
          </div>
        ) : tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <FolderOpen size={36} className="mb-3 opacity-40" />
            <p className="text-sm">空文件夹</p>
            <p className="text-xs text-slate-600 mt-1">拖拽文件或选择文件夹上传</p>
          </div>
        ) : (
          <div className="p-2">
            {tree.map((node, i) => (
              <TreeRow key={`${node.name}-${i}`} node={{ ...node, path: node.name }} depth={0} urlBase={resource.url} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
