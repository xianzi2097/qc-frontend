import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowUpRight, BookOpen, ChevronDown, ChevronRight, ExternalLink,
  FileText, Folder, FolderOpen,
} from 'lucide-react';
import { fetchMaterials } from '../../lib/api';
import { injectSeamless } from './seamless';
import { formatSize } from '../../types/course';
import type { Course, Material, MaterialNode } from '../../types/course';

interface Props {
  course: Course;
  onBack: () => void;
}

/**
 * 课程内容视图 — 供「课程目录点击」与「侧边栏在学课程直达」共用：
 * 电子书（已渲染）→ 无痕内嵌；未渲染成功 → 占位；其他 → 课件/文件列表
 */
export default function CourseDetail({ course, onBack }: Props) {
  const ebookOk = course.format === 'ebook' && course.publish?.status === 'success';
  const ebookFail = course.format === 'ebook' && course.publish?.status !== 'success';
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(!ebookOk && !ebookFail);
  const [ebookLoaded, setEbookLoaded] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (ebookOk || ebookFail) return;
    let stale = false;
    setLoading(true);
    fetchMaterials(course.id, course.teacher || '')
      .then(list => { if (!stale) setMaterials(list); })
      .catch(() => { if (!stale) setMaterials([]); })
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, [course.id, course.teacher, ebookOk, ebookFail]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="flex-shrink-0 flex items-center justify-between gap-6 px-8 pt-4 pb-3 border-b border-ed-line">
        <button
          onClick={onBack}
          className="group flex items-center gap-1.5 text-xs text-ed-muted hover:text-brand-orange transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          返回
        </button>
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-ed-ink">{course.name}</span>
          {ebookOk && (
            <a
              href={`/course/${course.id}/`}
              target="_blank"
              rel="noreferrer"
              title="新窗口打开"
              className="p-1 rounded-md text-ed-muted hover:text-brand-orange hover:bg-black/[0.04] transition-colors no-underline"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 relative bg-white">
        {ebookOk ? (
          <>
            {!ebookLoaded && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
                <span className="w-6 h-6 rounded-full border-2 border-ed-line border-t-brand-orange animate-spin" />
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
          <CenterNote text="该课程暂无课件" />
        ) : course.type === 'scratch' ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6">
            {materials.map(m => (
              <a
                key={m.name}
                href={`/Scratch/index.html?folder=${encodeURIComponent(m.url)}`}
                target="_blank"
                className="group flex flex-col items-center text-center gap-1.5 bg-white border border-ed-line p-5 no-underline hover:border-brand-orange hover:shadow-md transition-all"
              >
                <FolderOpen size={26} strokeWidth={1.5} className="text-ed-body group-hover:text-brand-orange transition-colors" />
                <div className="text-sm font-semibold text-ed-ink truncate w-full">{m.name}</div>
                <div className="text-[0.7rem] text-ed-muted">
                  {m.has_main && m.has_student ? '师生版' : m.has_main ? '教师版' : `${m.sb3_count ?? 0} 个 sb3`}
                </div>
                <div className="text-[0.7rem] text-brand-orange flex items-center gap-0.5">
                  打开编辑器 <ArrowUpRight size={11} />
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-6 py-6">
            {materials.map(m => {
              // 优先用后端递归树；旧响应无 tree 时退回直接文件列表
              const nodes: MaterialNode[] = m.tree?.length
                ? m.tree
                : (m.files ?? []).map(f => ({ name: f.name, type: 'file' as const, size: f.size, path: f.name }));
              return (
                <div key={m.name} className="bg-white border border-ed-line p-5">
                  <div className="flex items-center gap-2 pb-3 mb-1 border-b border-ed-line">
                    <Folder size={17} strokeWidth={1.5} className="text-ed-muted flex-shrink-0" />
                    <span className="text-sm font-semibold text-ed-ink truncate">{m.name}</span>
                    <span className="ml-auto text-xs text-ed-muted flex-shrink-0">
                      {countTreeFiles(nodes)} 个文件
                    </span>
                  </div>
                  {nodes.length === 0 ? (
                    <p className="py-4 text-center text-xs text-ed-muted">此文件夹暂无内容</p>
                  ) : (
                    <div>
                      {nodes.map(n => (
                        <TreeNodeRow key={n.name} node={n} urlBase={m.url} relPrefix="" depth={0} />
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

// ── folder 型课件：递归目录树 ──────────────────────────────

/** 统计子树内的文件总数（含所有嵌套层级） */
function countTreeFiles(nodes: MaterialNode[]): number {
  return nodes.reduce(
    (acc, n) => acc + (n.type === 'file' ? 1 : countTreeFiles(n.children ?? [])),
    0,
  );
}

/** /share 链接按路径段编码：中文、空格、#、% 等特殊字符不会断链 */
function shareHref(urlBase: string, relPath: string): string {
  const raw = urlBase.endsWith('/') ? urlBase + relPath : `${urlBase}/${relPath}`;
  return raw.split('/').map(encodeURIComponent).join('/');
}

/**
 * 单个树节点行：
 * 文件夹 → 点击展开/收起；文件 → 新窗口打开（Caddy /share 静态服务）。
 * 缩进 = 深度 × 16px，与主页 hairline 风格一致。
 */
function TreeNodeRow({ node, urlBase, relPrefix, depth }: {
  node: MaterialNode;
  urlBase: string;
  relPrefix: string;
  depth: number;
}) {
  const [open, setOpen] = useState(false);
  const rel = relPrefix ? `${relPrefix}/${node.name}` : node.name;

  if (node.type === 'dir') {
    const children = node.children ?? [];
    return (
      <div>
        <button
          onClick={() => setOpen(v => !v)}
          style={{ paddingLeft: depth * 16 + 4 }}
          className="group w-full flex items-center gap-2 pr-2 py-2 border-t border-ed-line text-left cursor-pointer hover:bg-black/[0.02] transition-colors"
        >
          {open
            ? <ChevronDown size={13} className="flex-shrink-0 text-ed-muted" />
            : <ChevronRight size={13} className="flex-shrink-0 text-ed-muted" />}
          <Folder size={14} strokeWidth={1.5} className="flex-shrink-0 text-brand-orange" />
          <span className="text-sm text-ed-body truncate group-hover:text-brand-orange transition-colors">
            {node.name}
          </span>
          <span className="ml-auto text-[0.7rem] text-ed-muted flex-shrink-0">
            {countTreeFiles(children)} 个文件
          </span>
        </button>
        {open && children.map(c => (
          <TreeNodeRow key={c.name} node={c} urlBase={urlBase} relPrefix={rel} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <a
      href={shareHref(urlBase, node.path || node.name)}
      target="_blank"
      rel="noreferrer"
      title={rel}
      style={{ paddingLeft: depth * 16 + 29 }}
      className="group flex items-center gap-2 pr-2 py-2 border-t border-ed-line no-underline hover:bg-black/[0.02] transition-colors"
    >
      <FileText size={14} strokeWidth={1.5} className="flex-shrink-0 text-ed-muted" />
      <span className="text-sm text-ed-body truncate group-hover:text-brand-orange transition-colors">
        {node.name}
      </span>
      <span className="ml-auto text-[0.7rem] text-ed-muted flex-shrink-0">
        {typeof node.size === 'number' ? formatSize(node.size) : ''}
      </span>
    </a>
  );
}
