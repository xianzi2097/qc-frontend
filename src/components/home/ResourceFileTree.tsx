import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, BookOpen, ChevronDown, ChevronRight, Download, ExternalLink,
  FileText, Folder,
} from 'lucide-react';
import { fetchResourceTree } from '../../lib/api';
import { injectSeamless } from './seamless';
import { formatSize } from '../../types/course';
import type { Course, Material, MaterialNode } from '../../types/course';

interface Props {
  resource: Course & { url?: string };
  onBack: () => void;
}

/**
 * 课程内容视图 — 供「课程目录点击」与「侧边栏在学课程直达」共用：
 * 电子书（已渲染）→ 无痕内嵌；未渲染成功 → 占位；其他 → 文件列表
 */
export default function ResourceFileTree({ resource, onBack }: Props) {
  const ebookOk = resource.format === 'ebook' && resource.publish?.status === 'success';
  const ebookFail = resource.format === 'ebook' && resource.publish?.status !== 'success';
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(!ebookOk && !ebookFail);
  const [ebookLoaded, setEbookLoaded] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (ebookOk || ebookFail) return;
    let stale = false;
    setLoading(true);
    fetchResourceTree(resource.id, resource.url || `/resources/${resource.id}/`)
      .then(list => { if (!stale) setMaterials(list); })
      .catch(() => { if (!stale) setMaterials([]); })
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, [resource.id, ebookOk, ebookFail]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="ed-header flex-shrink-0 flex items-center justify-between gap-6 px-8 pt-2 pb-2 border-b border-ed-line">
        <button
          onClick={onBack}
          className="group flex items-center gap-1.5 text-xs text-ed-muted hover:text-brand transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          返回
        </button>
        <h2 className="text-ed-title font-semibold text-ed-ink truncate">{resource.name}</h2>
      </header>

      <div className="flex-1 min-h-0 relative bg-card">
        {ebookOk ? (
          <>
            {!ebookLoaded && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
                <span className="w-6 h-6 rounded-full border-2 border-ed-line border-t-brand animate-spin" />
              </div>
            )}
            <iframe
              ref={frameRef}
              key={resource.id}
              src={`/course/${resource.id}/`}
              title={resource.name}
              onLoad={() => { injectSeamless(frameRef.current); setEbookLoaded(true); }}
              className="w-full h-full border-0"
            />
          </>
        ) : ebookFail ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <BookOpen size={40} strokeWidth={1.5} className="text-ed-muted" />
            <p className="font-semibold text-ed-ink">{resource.name}</p>
            <p className="text-sm text-ed-muted">课程尚未渲染成功，请联系管理员</p>
          </div>
        ) : loading ? (
          <CenterNote text="加载中…" />
        ) : materials.length === 0 ? (
          <CenterNote text="暂无文件" />
        ) : materials.length === 1 && (materials[0].tree?.length ?? 0) === 1 && materials[0].tree![0].type === 'file' ? (
          /* ── 单文件模式：只有一个文件，不显示文件夹层，直接打开/下载 ── */
          (() => {
            const m = materials[0];
            const f = m.tree![0];
            const fileUrl = shareHref(m.url, f.path || f.name);
            return (
              <div className="flex flex-col items-center justify-center gap-6 py-16">
                <FileText size={48} strokeWidth={1.2} className="text-brand" />
                <div className="text-center">
                  <p className="text-base font-semibold text-ed-ink truncate max-w-md">{f.name}</p>
                  <p className="text-xs text-ed-muted mt-1">
                    {typeof f.size === 'number' ? formatSize(f.size) : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all no-underline"
                  >
                    <ExternalLink size={15} /> 打开
                  </a>
                  <a
                    href={`/api/resources/${encodeURIComponent(resource.id)}/download`}
                    className="flex items-center gap-2 px-5 py-2.5 bg-ed-ink text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all no-underline"
                  >
                    <Download size={15} /> 下载
                  </a>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="flex flex-col gap-6 py-6">
            {materials.map(m => {
              // 优先用后端递归树；旧响应无 tree 时退回直接文件列表
              const nodes: MaterialNode[] = m.tree?.length
                ? m.tree
                : (m.files ?? []).map(f => ({ name: f.name, type: 'file' as const, size: f.size, path: f.name }));
              return (
                <div key={m.name} className="bg-card border border-ed-line p-5">
                  <div className="flex items-center gap-2 pb-3 mb-1 border-b border-ed-line">
                    <Folder size={17} strokeWidth={1.5} className="text-ed-muted flex-shrink-0" />
                    <span className="text-sm font-semibold text-ed-ink truncate">{m.name}</span>
                    <span className="ml-auto text-xs text-ed-muted flex-shrink-0">
                      {countTreeFiles(nodes)} 个文件
                    </span>
                    {/* 下载整个资源 */}
                    <a
                      href={`/api/resources/${encodeURIComponent(resource.id)}/download`}
                      title="下载整个资料"
                      className="p-1.5 text-ed-muted hover:text-brand transition-colors no-underline flex-shrink-0"
                    >
                      <Download size={14} />
                    </a>
                  </div>
                  {nodes.length === 0 ? (
                    <p className="py-4 text-center text-xs text-ed-muted">此文件夹暂无内容</p>
                  ) : (
                    <div>
                      {nodes.map(n => (
                        <TreeNodeRow key={n.name} node={n} urlBase={m.url} relPrefix="" depth={0} resourceId={resource.id} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** 居中占位文案 */
function CenterNote({ text }: { text: string }) {
  return (
    <div className="h-full min-h-40 flex items-center justify-center text-sm text-ed-muted">
      {text}
    </div>
  );
}

// ── folder 型文件：递归目录树 ──────────────────────────────

/** 统计子树内的文件总数（含所有嵌套层级） */
function countTreeFiles(nodes: MaterialNode[]): number {
  return nodes.reduce(
    (acc, n) => acc + (n.type === 'file' ? 1 : countTreeFiles(n.children ?? [])),
    0,
  );
}

/** /courses 链接按路径段编码：中文、空格、#、% 等特殊字符不会断链 */
function shareHref(urlBase: string, relPath: string): string {
  const raw = urlBase.endsWith('/') ? urlBase + relPath : `${urlBase}/${relPath}`;
  return raw.split('/').map(encodeURIComponent).join('/');
}

/**
 * 单个树节点行：
 * 文件夹 → 点击展开/收起；文件 → 新窗口打开（Caddy /courses 静态服务）。
 * 缩进 = 深度 × 16px，与主页 hairline 风格一致。
 */
function TreeNodeRow({ node, urlBase, relPrefix, depth, resourceId }: {
  node: MaterialNode;
  urlBase: string;
  relPrefix: string;
  depth: number;
  resourceId: string;
}) {
  const [open, setOpen] = useState(false);
  const rel = relPrefix ? `${relPrefix}/${node.name}` : node.name;

  if (node.type === 'dir') {
    const children = node.children ?? [];
    const dirPath = node.path || rel;
    return (
      <div>
        <div
          className="group flex items-center gap-2 pr-2 border-t border-ed-line hover:bg-black/[0.02] transition-colors"
        >
          <button
            onClick={() => setOpen(v => !v)}
            style={{ paddingLeft: depth * 16 + 4 }}
            className="flex items-center gap-2 flex-1 min-w-0 py-2 text-left cursor-pointer"
          >
            {open
              ? <ChevronDown size={13} className="flex-shrink-0 text-ed-muted" />
              : <ChevronRight size={13} className="flex-shrink-0 text-ed-muted" />}
            <Folder size={14} strokeWidth={1.5} className="flex-shrink-0 text-brand" />
            <span className="text-sm text-ed-body truncate group-hover:text-brand transition-colors">
              {node.name}
            </span>
            <span className="ml-auto text-[0.7rem] text-ed-muted flex-shrink-0">
              {countTreeFiles(children)} 个文件
            </span>
          </button>
          {/* 独立下载此目录 */}
          <a
            href={`/api/resources/${encodeURIComponent(resourceId)}/download?path=${encodeURIComponent(dirPath)}`}
            title="下载此目录"
            className="p-1.5 text-ed-muted opacity-0 group-hover:opacity-100 hover:text-brand transition-all no-underline flex-shrink-0"
          >
            <Download size={13} />
          </a>
        </div>
        {open && children.map(c => (
          <TreeNodeRow key={c.name} node={c} urlBase={urlBase} relPrefix={rel} depth={depth + 1} resourceId={resourceId} />
        ))}
      </div>
    );
  }

  const filePath = node.path || node.name;
  const fileUrl = shareHref(urlBase, filePath);
  return (
    <div
      style={{ paddingLeft: depth * 16 + 29 }}
      className="group flex items-center gap-2 pr-2 border-t border-ed-line hover:bg-black/[0.02] transition-colors"
    >
      <a
        href={fileUrl}
        target="_blank"
        rel="noreferrer"
        title={`打开 ${rel}`}
        className="flex items-center gap-2 flex-1 min-w-0 py-2 no-underline"
      >
        <FileText size={14} strokeWidth={1.5} className="flex-shrink-0 text-ed-muted" />
        <span className="text-sm text-ed-body truncate group-hover:text-brand transition-colors">
          {node.name}
        </span>
        <span className="ml-auto text-[0.7rem] text-ed-muted flex-shrink-0">
          {typeof node.size === 'number' ? formatSize(node.size) : ''}
        </span>
      </a>
      {/* 下载单文件 */}
      <a
        href={fileUrl}
        download
        title={`下载 ${rel}`}
        className="p-1.5 text-ed-muted opacity-0 group-hover:opacity-100 hover:text-brand transition-all no-underline flex-shrink-0"
      >
        <Download size={13} />
      </a>
    </div>
  );
}
