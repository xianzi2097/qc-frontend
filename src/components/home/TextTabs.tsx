import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export interface TextTabItem {
  value: string;
  label: ReactNode;
}

interface Props {
  items: TextTabItem[];
  value: string;
  onChange: (value: string) => void;
  /** 下划线颜色，默认品牌橙 */
  accent?: string;
  className?: string;
}

/** 编辑风文字 Tab — 底部细下划线平滑滑动到当前项 */
export default function TextTabs({ items, value, onChange, accent = '#f97316', className = '' }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState({ left: 0, width: 0 });

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const active = wrap.querySelector<HTMLElement>(`[data-tab="${CSS.escape(value)}"]`);
    if (!active) { setInd({ left: 0, width: 0 }); return; }
    const w = wrap.getBoundingClientRect();
    const r = active.getBoundingClientRect();
    setInd({ left: r.left - w.left, width: r.width });
  }, [value]);

  useEffect(() => {
    measure();
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    // 首帧布局/字体就绪后宽度可能变化，补测一次
    const t = setTimeout(measure, 300);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(t); };
  }, [measure, items]);

  return (
    <div ref={wrapRef} className={`relative flex items-end ${className}`}>
      {items.map(it => (
        <button
          key={it.value}
          data-tab={it.value}
          onClick={() => onChange(it.value)}
          className={`relative z-1 flex-shrink-0 whitespace-nowrap px-3 pb-2 pt-1 text-sm cursor-pointer transition-colors ${
            value === it.value
              ? 'text-ed-ink font-bold'
              : 'text-ed-muted font-medium hover:text-ed-body'
          }`}
        >
          {it.label}
        </button>
      ))}
      {/* 滑动下划线 */}
      <div
        className="absolute bottom-0 h-[2px] rounded-full transition-all duration-300 pointer-events-none"
        style={{ left: ind.left, width: ind.width, background: accent }}
      />
    </div>
  );
}
