import type { ReactNode } from 'react';

export interface TextTabItem {
  value: string;
  label: ReactNode;
}

interface Props {
  items: TextTabItem[];
  value: string;
  onChange: (value: string) => void;
  accent?: string;
  className?: string;
}

/** 文字 Tab — 选中加粗，无下划线 */
export default function TextTabs({ items, value, onChange, className = '' }: Props) {
  return (
    <div className={`relative flex items-center ${className}`}>
      {items.map(it => (
        <button
          key={it.value}
          data-tab={it.value}
          onClick={() => onChange(it.value)}
          className={`relative z-1 flex-shrink-0 whitespace-nowrap px-3 py-1 text-sm cursor-pointer transition-colors ${
            value === it.value
              ? 'text-ed-ink font-bold'
              : 'text-ed-muted font-medium hover:text-ed-body'
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
