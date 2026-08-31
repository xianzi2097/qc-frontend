import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Download, File, Folder, FolderOpen, Loader2 } from 'lucide-react';

interface Resource {
  id: string;
  name: string;
  category: string;
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

interface Props {
  resource: Resource;
  onBack: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 单个树节点（可递归展开） */
function TreeRow({ node, depth, resource }: { node: TreeNode; depth: number; resource: Resource }) {
  const [open, setOpen] = useState(depth === 0);
  const isFolder = node.type === 'folder';
  const filePath = node.path || node.name;
  const downloadUrl = `${resource.url}${filePath}`;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-black/[0.03] transition-colors group ${isFolder ? 'cursor-pointer' : ''}`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => isFolder && setOpen(!open)}
      >
        {isFolder ? (
          open ? <FolderOpen size={14} className="text-brand shrink-0" /> : <Folder size={14} className="text-ed-muted shrink-0" />
        ) : (
          <File size={14} className="text-ed-muted shrink-0" />
        )}
        <span className="text-sm text-ed-ink truncate flex-1">{node.name}</span>
        {!isFolder && (
          <>
            <span className="text-xs text-ed-muted">{formatSize(node.size)}</span>
            <a
              href={downloadUrl}
              download
              onClick={e => e.stopPropagation()}
              className="p-1 rounded text-ed-muted opacity-0 group-hover:opacity-100 hover:text-brand transition-all no-underline"
              title="下载"
            >
              <Download size={13} />
            </a>
          </>
        )}
      </div>
      {isFolder && open && node.children?.map((child, i) => (
        <TreeRow key={i} node={child} depth={depth + 1} resource={resource} />
      ))}
    </div>
  );
}

/** 学生端资源文件树 — 只读浏览 + 下载 */
export default function ResourceFileTree({ resource, onBack }: Props) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="flex-shrink-0 flex items-center justify-between gap-6 px-8 pt-2 pb-2 border-b border-ed-line">
        <button
          onClick={onBack}
          className="group flex items-center gap-1.5 text-xs text-ed-muted hover:text-brand transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          返回
        </button>
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-ed-ink">{resource.name}</span>
          {resource.teacher && <span className="text-xs text-ed-muted">{resource.teacher}</span>}
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-8 py-4" style={{ scrollbarWidth: 'thin' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-ed-muted">
            <Loader2 size={18} className="animate-spin mr-2" /> 加载中...
          </div>
        ) : tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-ed-muted">
            <Folder size={36} strokeWidth={1.2} className="mb-3 opacity-40" />
            <p className="text-sm">暂无文件</p>
          </div>
        ) : (
          <div className="border border-ed-line rounded-lg overflow-hidden">
            {tree.map((node, i) => (
              <TreeRow key={i} node={node} depth={0} resource={resource} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
