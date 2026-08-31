import { useState, useEffect, useCallback, useRef } from 'react';
import { FolderOpen, Upload, Trash2, RefreshCw, FileText, Download, Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/useAuth';

interface Resource {
  name: string;
  size: number;
  teacher: string;
  url: string;
  category?: string;
  path?: string;
}

interface PendingFile {
  rel: string;
  file: File;
}

const CATEGORIES = [
  { value: 'reference', label: '参考资料', icon: FileText, desc: 'PDF、文档、图片等' },
  { value: 'download', label: '软件下载', icon: Download, desc: '安装包、工具等' },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 递归读取拖拽文件夹 */
async function collectFolder(
  entries: any[], basePath: string, out: PendingFile[],
) {
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

export default function ResourcesManager() {
  const { token } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('reference');
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const folderRef = useRef<HTMLInputElement>(null);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/resources');
      const data = await res.json();
      setResources(data.resources || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  const uploadBatch = async (files: PendingFile[]) => {
    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });
    try {
      for (let i = 0; i < files.length; i++) {
        const { rel, file } = files[i];
        const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '';
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);
        formData.append('path', dir);
        await fetch('/api/resources/upload/tree', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        setUploadProgress({ done: i + 1, total: files.length });
      }
      fetchResources();
    } catch { /* ignore */ }
    setUploading(false);
  };

  /** 拖拽文件/文件夹 */
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;

    const items = e.dataTransfer.items;
    if (!items) return;
    const entries: any[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = (items[i] as any).webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }
    if (entries.length === 0) return;

    const files: PendingFile[] = [];
    await collectFolder(entries, '', files);
    if (files.length === 0) return;
    await uploadBatch(files);
  };

  /** 选择文件夹上传 */
  const handleFolderPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || uploading) return;
    const files: PendingFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      files.push({ rel: (f as any).webkitRelativePath || f.name, file: f });
    }
    if (files.length === 0) return;
    await uploadBatch(files);
    e.target.value = '';
  };

  /** 单文件上传（兼容旧逻辑） */
  const handleUpload = async (file: File) => {
    await uploadBatch([{ rel: file.name, file }]);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  };

  const handleDelete = async (teacher: string, filename: string) => {
    if (!confirm(`确定删除资源 [${filename}]？`)) return;
    await fetch(`/api/resources/${teacher}/${filename}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchResources();
  };

  return (
    <div className="h-full flex flex-col animate-fadeIn">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-1 mb-4">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <FolderOpen className="text-brand-orange" size={20} /> 资源管理
        </h2>
        <button onClick={fetchResources} className="p-2 text-slate-400 hover:text-white transition-colors" title="刷新">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* 上传区域 */}
      <div className="bg-slate-900 border border-slate-600 rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-sm text-slate-400">上传类别：</span>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                category === cat.value
                  ? 'bg-brand-orange text-white font-bold'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <cat.icon size={14} />
              {cat.label}
            </button>
          ))}
        </div>

        {uploading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 size={24} className="text-brand-orange animate-spin mb-2" />
            <span className="text-sm text-slate-400">
              上传中 {uploadProgress.done}/{uploadProgress.total}
            </span>
          </div>
        ) : (
          <div className="flex gap-3">
            {/* 拖拽区域 */}
            <label
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`flex-1 flex flex-col items-center justify-center py-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                dragOver ? 'border-brand-orange bg-brand-orange/10' : 'border-slate-600 hover:border-slate-400'
              }`}
            >
              <Upload size={20} className="text-slate-500 mb-1" />
              <span className="text-sm text-slate-400">拖拽文件或文件夹到这里</span>
              <span className="text-xs text-slate-600 mt-1">支持多级目录，最大 200MB/文件</span>
              <input type="file" className="hidden" onChange={onFileChange} multiple />
            </label>

            {/* 选择文件夹按钮 */}
            <label
              onClick={() => folderRef.current?.click()}
              className="flex flex-col items-center justify-center px-6 py-6 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-slate-400 transition-all"
            >
              <FolderOpen size={20} className="text-slate-500 mb-1" />
              <span className="text-sm text-slate-400">选择文件夹</span>
              <span className="text-xs text-slate-600 mt-1">保留目录结构上传</span>
            </label>
            <input
              ref={folderRef}
              type="file"
              className="hidden"
              {...{ webkitdirectory: '', directory: '' } as any}
              onChange={handleFolderPick}
            />
          </div>
        )}
      </div>

      {/* 资源列表 */}
      <div className="bg-slate-900 border border-slate-600 rounded-2xl flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <Loader2 size={20} className="animate-spin mr-2" /> 加载中...
          </div>
        ) : resources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <FolderOpen size={36} className="mb-3 opacity-40" />
            <p className="text-sm">暂无资源</p>
            <p className="text-xs text-slate-600 mt-1">上传文件或文件夹后将显示在这里</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {resources.map((r, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-800/50 transition-colors group">
                <FileText size={16} className="text-slate-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <a href={r.url} target="_blank" rel="noreferrer"
                     className="text-sm text-slate-200 hover:text-brand-orange transition-colors no-underline truncate block">
                    {r.name}
                  </a>
                  <span className="text-xs text-slate-600">{r.teacher} · {formatSize(r.size)}</span>
                </div>
                <a href={r.url} download
                   className="text-slate-600 hover:text-brand-orange transition-colors opacity-0 group-hover:opacity-100"
                   title="下载">
                  <Download size={14} />
                </a>
                <button onClick={() => handleDelete(r.teacher, r.name)}
                        className="text-slate-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="删除">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
