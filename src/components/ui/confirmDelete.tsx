import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Trash2 } from 'lucide-react';

/**
 * 统一确认弹窗家族（spec §7 唯一真相，文案不散落各页面）：
 * - confirmDelete    删除类：recoverable=true → 必含「可在回收站恢复」；false → 必含「不可恢复」
 * - confirmDisable   停用类（D25，账号专用）：必含「可随时启用」、不提回收站
 */
function askConfirm(opts: {
  title: string;
  body: ReactNode;
  confirmText: string;
  danger: boolean;
}): Promise<boolean> {
  return new Promise(resolve => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const close = (ok: boolean) => {
      root.unmount();
      host.remove();
      resolve(ok);
    };
    root.render(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        onClick={() => close(false)}
      >
        <div
          className="w-80 bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-3 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Trash2 size={16} className={opts.danger ? 'text-rose-400' : 'text-amber-400'} />
            {opts.title}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{opts.body}</p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => close(false)}
              className="text-xs px-3 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800"
            >
              取消
            </button>
            <button
              onClick={() => close(true)}
              className={`text-xs px-3 py-1.5 rounded-lg text-white font-bold ${
                opts.danger ? 'bg-rose-500 hover:bg-rose-400' : 'bg-amber-500 hover:bg-amber-400'
              }`}
            >
              {opts.confirmText}
            </button>
          </div>
        </div>
      </div>,
    );
  });
}

export function confirmDelete({ what, recoverable, note }: { what: string; recoverable: boolean; note?: string }): Promise<boolean> {
  return askConfirm({
    title: '确认删除',
    body: (
      <>
        确定删除 {what}？
        <span className={recoverable ? 'text-emerald-400' : 'text-rose-400'}>
          {note ?? (recoverable ? '可在回收站恢复。' : '此操作不可恢复！')}
        </span>
      </>
    ),
    confirmText: '确认',
    danger: true,
  });
}

/** 停用账号（D25）：不进回收站、随时可启用 */
export function confirmDisable(what: string): Promise<boolean> {
  return askConfirm({
    title: '停用账号',
    body: (
      <>
        确定停用 {what}？
        <span className="text-emerald-400">停用后可随时启用，账号数据不受影响。</span>
      </>
    ),
    confirmText: '停用',
    danger: false,
  });
}
