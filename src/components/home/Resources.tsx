import { FileText } from 'lucide-react';

/** 资源栏目 — 考级真题、学习资料等公共资源 */
export default function Resources() {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <header className="flex-shrink-0 flex items-center justify-between gap-6 px-8 pt-2 pb-2 border-b border-ed-line">
        <h2 className="text-base font-semibold text-ed-ink">资源</h2>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <FileText size={48} strokeWidth={1.2} className="text-ed-muted/40 mb-4" />
        <p className="text-sm text-ed-muted">资源板块即将上线</p>
        <p className="text-xs text-ed-muted/60 mt-1">考级真题、学习资料等内容将在这里呈现</p>
      </div>
    </div>
  );
}
