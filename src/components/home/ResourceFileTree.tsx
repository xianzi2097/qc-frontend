import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, BookOpen, ChevronDown, ChevronRight, Download, ExternalLink,
  FileText, Folder,
} from 'lucide-react';
import { fetchFileEntries, fileHref, zipHref } from '../../lib/api';
import { injectSeamless } from './seamless';
import { formatSize } from '../../types/course';
import type { Course, TreeNode } from '../../types/course';

interface Props {
  resource: Course;
  onBack: () => void;
}

/**
 * 资料/软件内容视图 — 逐层懒加载文件树（V2 /files 单层，P2）：
 * 电子书 → 无痕内嵌；单文件 → 直接打开/下载；其他 → 文件树
 */
export default function ResourceFileTree({ resource, onBack }: Props) {
  const ebookOk = resource.format === 'ebook' && resource.publish?.state === 'done';
  const ebookFail = resource.format === 'ebook' && !!resource.publish && resource.publish.state !== 'done';
  const [entries, setEntries] = useState<TreeNode[] | null>(null);
  const [ebookLoaded, setEbookLoaded] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (ebookOk || ebookFail) return;
    let stale = false;
    fetchFileEntries(resource.id, '')
      .then(list => { if (!stale) setEntries(list); })
      .catch(() => { if (!stale) setEntries([]); });
    return () => { stale = true; };
  }, [resource.id, ebookOk, ebookFail]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="flex-shrink-0 flex items-center gap-4 px-6 h-14 border-b border-ed-line"
        style={{ background: 'var(--bookshelf-header-bg)' }}>
        <button
          onClick={onBack}
          className="group flex items-center gap-1.5 text-xs text-ed-muted hover:text-brand transition-colors cursor-pointer flex-shrink-0"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          返回
        </button>
        <span className="text-ed-title font-semibold text-ed-ink truncate">{resource.name}</span>
      </header>

      <div className="flex-1 min-h-0 relative bg-card overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
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
        ) : entries === null ? (
          <CenterNote text="加载中…" />
        ) : entries.length === 0 ? (
          <CenterNote text="暂无文件" />
        ) : entries.length === 1 && entries[0].type === 'file' ? (
          /* ── 单文件模式：只有一个文件，不显示文件夹层，直接打开/下载 ── */
          (() => {
            const f = entries[0];
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
                    href={fileHref(resource.id, f.name)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all no-underline"
                  >
                    <ExternalLink size={15} /> 打开
                  </a>
                  <a
                    href={zipHref(resource.id)}
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
            <div className="bg-card border border-ed-line p-5">
              <div className="flex items-center gap-2 pb-3 mb-1 border-b border-ed-line">
                <Folder size={17} strokeWidth={1.5} className="text-ed-muted flex-shrink-0" />
                <span className="text-sm font-semibold text-ed-ink truncate">{resource.name}</span>
                {/* 下载整个资源 */}
                <a
                  href={zipHref(resource.id)}
                  title="下载整个资料"
                  className="p-1.5 text-ed-muted hover:text-brand transition-colors no-underline flex-shrink-0"
                >
                  <Download size={14} />
                </a>
              </div>
              <div>
                {entries.map(n => (
                  <TreeNodeRow key={n.name} node={n} assetId={resource.id} rel={n.name} depth={0} />
                ))}
              </div>
            </div>
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

// ── folder 型文件：逐层懒加载目录树（V2 /files 单层，P2） ──────────────

/**
 * 单个树节点行：
 * 文件夹 → 点击展开时逐层拉取；文件 → 新窗口打开 / 下载（files/download）。
 * 目录行悬停提供整目录 zip 下载。
 */
function TreeNodeRow({ node, assetId, rel, depth }: {
  node: TreeNode;
  assetId: string;
  rel: string;
  depth: number;
}) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<TreeNode[] | null>(null);

  if (node.type === 'dir') {
    const toggle = () => {
      const next = !open;
      setOpen(next);
      if (next && children === null) {
        fetchFileEntries(assetId, rel)
          .then(list => setChildren(list))
          .catch(() => setChildren([]));
      }
    };
    return (
      <div>
        <div
          className="group flex items-center gap-2 pr-2 border-t border-ed-line hover:bg-black/[0.02] transition-colors"
        >
          <button
            onClick={toggle}
            style={{ paddingLeft: `${depth + 0.25}rem` }}
            className="flex items-center gap-2 flex-1 min-w-0 py-2 text-left cursor-pointer"
          >
            {open
              ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-ed-muted" />
              : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-ed-muted" />}
            <Folder className="w-3.5 h-3.5 flex-shrink-0 text-brand" />
            <span className="text-sm text-ed-body truncate group-hover:text-brand transition-colors">
              {node.name}
            </span>
          </button>
          {/* 独立下载此目录 */}
          <a
            href={zipHref(assetId, rel)}
            title="下载此目录"
            className="p-1.5 text-ed-muted opacity-0 group-hover:opacity-100 hover:text-brand transition-all no-underline flex-shrink-0"
          >
            <Download size={13} />
          </a>
        </div>
        {open && (children === null
          ? <p className="py-2 pl-8 text-xs text-ed-muted">加载中…</p>
          : children.length === 0
            ? <p className="py-2 pl-8 text-xs text-ed-muted">空文件夹</p>
            : children.map(c => (
              <TreeNodeRow key={c.name} node={c} assetId={assetId} rel={`${rel}/${c.name}`} depth={depth + 1} />
            )))}
      </div>
    );
  }

  const fileUrl = fileHref(assetId, rel);
  return (
    <div
      style={{ paddingLeft: `${depth + 1.8}rem` }}
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
