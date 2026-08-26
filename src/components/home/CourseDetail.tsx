import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowUpRight, BookOpen, ExternalLink, FileText, Folder, FolderOpen,
} from 'lucide-react';
import { fetchMaterials } from '../../lib/api';
import { injectSeamless } from './seamless';
import type { Course, Material } from '../../types/course';

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
      <header className="flex-shrink-0 flex items-center justify-between gap-6 px-8 pt-6 pb-3 border-b border-ed-line">
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
            {materials.map(m => (
              <div key={m.name} className="bg-white border border-ed-line p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Folder size={17} strokeWidth={1.5} className="text-ed-muted" />
                  <span className="text-sm font-semibold text-ed-ink">{m.name}</span>
                  <span className="text-xs text-ed-muted">{m.file_count} 个文件</span>
                </div>
                {m.files && m.files.length > 0 && (
                  <div className="flex flex-col">
                    {m.files.map(f => (
                      <a
                        key={f.name}
                        href={`${m.url}${f.name}`}
                        target="_blank"
                        className="group flex items-center justify-between gap-3 py-2 px-1 border-t border-ed-line first:border-t-0 no-underline hover:bg-black/[0.02] transition-colors"
                      >
                        <span className="flex items-center gap-2 min-w-0 text-sm text-ed-body group-hover:text-brand-orange transition-colors">
                          <FileText size={14} strokeWidth={1.5} className="flex-shrink-0 text-ed-muted" />
                          <span className="truncate">{f.name}</span>
                        </span>
                        <span className="text-xs text-ed-muted flex-shrink-0">{(f.size / 1024).toFixed(1)} KB</span>
                      </a>
                    ))}
                  </div>
                )}
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
