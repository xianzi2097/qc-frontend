import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight, BookOpen, ChevronDown, ChevronRight,
  Download, FileText, Folder, FolderOpen,
} from 'lucide-react';
import { fetchMaterials, fetchFileEntries, fileHref, scratchFolderHref, zipHref } from '../../lib/api';
import { injectSeamless } from './seamless';
import { formatSize } from '../../types/course';
import type { Course, Material, TreeNode } from '../../types/course';

interface Props {
  course: Course;
  /** 保留：header 已不显示返回按钮，返回由侧边栏接管 */
  onBack?: () => void;
}

/**
 * 课程内容视图 — 供「课程目录点击」与「侧边栏在学课程直达」共用：
 * 电子书（已渲染）→ 无痕内嵌；未渲染成功 → 占位；Scratch → 课件格；
 * 其他（folder 型）→ 逐课件懒加载文件树（V2 /files 单层，P2 逐层加载）
 */
export default function CourseDetail({ course }: Props) {
  const ebookOk = course.format === 'ebook' && course.publish?.state === 'done';
  const ebookFail = course.format === 'ebook' && !!course.publish && course.publish.state !== 'done';
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(!ebookOk && !ebookFail);
  const [ebookLoaded, setEbookLoaded] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (ebookOk || ebookFail) return;
    let stale = false;
    setLoading(true);
    fetchMaterials(course.id)
      .then(list => { if (!stale) setMaterials(list); })
      .catch(() => { if (!stale) setMaterials([]); })
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, [course.id, ebookOk, ebookFail]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="flex-shrink-0 flex items-center gap-4 px-6 h-14 border-b border-ed-line"
        style={{ background: 'var(--bookshelf-header-bg)' }}>
        <span className="text-ed-title font-semibold text-ed-ink truncate">{course.name}</span>
        {course.shareable && (
          <a
            href={zipHref(course.id)}
            className="ml-auto flex items-center gap-1.5 text-sm text-ed-body hover:text-brand transition-colors no-underline"
            title="下载这门课的源文件（zip）"
          >
            <Download className="w-4 h-4" />
            下载
          </a>
        )}
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
              key={course.id}
              src={`/course/${course.id}/`}
              title={course.name}
              onLoad={() => { injectSeamless(frameRef.current); setEbookLoaded(true); }}
              className="w-full h-full border-0"
            />
          </>
        ) : ebookFail ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <BookOpen size={40} strokeWidth={1.5} className="text-ed-muted" />
            <p className="font-semibold text-ed-ink">{course.name}</p>
            <p className="text-sm text-ed-muted">课程尚未渲染成功，请联系管理员</p>
          </div>
        ) : loading ? (
          <CenterNote text="加载中…" />
        ) : materials.length === 0 ? (
          <CenterNote text="该课程暂无文件" />
        ) : course.type === 'scratch' ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6">
            {materials.map(m => (
              <a
                key={m.name}
                href={`/Scratch/index.html?folder=${scratchFolderHref(course.id, m.name)}`}
                target="_blank"
                className="group flex flex-col items-center text-center gap-1.5 bg-card border border-ed-line p-5 no-underline hover:border-brand hover:shadow-md transition-all"
              >
                <FolderOpen size={26} strokeWidth={1.5} className="text-ed-body group-hover:text-brand transition-colors" />
                <div className="text-sm font-semibold text-ed-ink truncate w-full">{m.name}</div>
                <div className="text-[0.7rem] text-ed-muted">
                  {m.has_main && m.has_student ? '师生版' : m.has_main ? '教师版' : `${m.sb3_count ?? 0} 个 sb3`}
                </div>
                <div className="text-[0.7rem] text-brand flex items-center gap-0.5">
                  打开编辑器 <ArrowUpRight size={11} />
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-6 py-6">
            {materials.map(m => (
              <div key={m.name} className="bg-card border border-ed-line p-5">
                <div className="flex items-center gap-2 pb-3 mb-1 border-b border-ed-line">
                  <Folder size={17} strokeWidth={1.5} className="text-ed-muted flex-shrink-0" />
                  <span className="text-sm font-semibold text-ed-ink truncate">{m.name}</span>
                </div>
                <LessonTree assetId={course.id} lesson={m.name} />
              </div>
            ))}
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

/** 某课件目录的首层（进入即载，子层展开再拉） */
function LessonTree({ assetId, lesson }: { assetId: string; lesson: string }) {
  const [entries, setEntries] = useState<TreeNode[] | null>(null);

  useEffect(() => {
    let stale = false;
    fetchFileEntries(assetId, lesson)
      .then(list => { if (!stale) setEntries(list); })
      .catch(() => { if (!stale) setEntries([]); });
    return () => { stale = true; };
  }, [assetId, lesson]);

  if (entries === null) return <p className="py-4 text-center text-xs text-ed-muted">加载中…</p>;
  if (entries.length === 0) return <p className="py-4 text-center text-xs text-ed-muted">此文件夹暂无内容</p>;
  return (
    <div>
      {entries.map(n => (
        <TreeNodeRow key={n.name} node={n} assetId={assetId} rel={`${lesson}/${n.name}`} depth={0} />
      ))}
    </div>
  );
}

/**
 * 单个树节点行：
 * 文件夹 → 点击展开时逐层拉取；文件 → 新窗口打开（files/download）。
 * 缩进 = 深度 × 1rem，与主页 hairline 风格一致。
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
        <button
          onClick={toggle}
          style={{ paddingLeft: `${depth + 0.25}rem` }}
          className="group w-full flex items-center gap-2 pr-2 py-2 border-t border-ed-line text-left cursor-pointer hover:bg-black/[0.02] transition-colors"
        >
          {open
            ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-ed-muted" />
            : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-ed-muted" />}
          <Folder className="w-3.5 h-3.5 flex-shrink-0 text-brand" />
          <span className="text-sm text-ed-body truncate group-hover:text-brand transition-colors">
            {node.name}
          </span>
        </button>
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

  return (
    <a
      href={fileHref(assetId, rel)}
      target="_blank"
      rel="noreferrer"
      title={rel}
      style={{ paddingLeft: `${depth + 1.8}rem` }}
      className="group flex items-center gap-2 pr-2 py-2 border-t border-ed-line no-underline hover:bg-black/[0.02] transition-colors"
    >
      <FileText size={14} strokeWidth={1.5} className="flex-shrink-0 text-ed-muted" />
      <span className="text-sm text-ed-body truncate group-hover:text-brand transition-colors">
        {node.name}
      </span>
      <span className="ml-auto text-[0.7rem] text-ed-muted flex-shrink-0">
        {typeof node.size === 'number' ? formatSize(node.size) : ''}
      </span>
    </a>
  );
}
