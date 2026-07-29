/**
 * 纯 CSS 导航栏 — 直接切换，零动效，零性能开销
 */
import { cn } from "../../lib/utils";

interface DockItem {
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  isActive?: boolean;
  activeBg?: string;
}

export const FloatingDock = ({
  items,
  className,
  dividerAfter,
}: {
  items: DockItem[];
  className?: string;
  dividerAfter?: number;
}) => {
  return (
    <div className={cn("mx-auto flex items-center gap-1 rounded-xl px-0 py-1", className)}>
      {items.map((item, idx) => (
        <div key={item.title} className="flex items-center gap-1">
          <button
            type="button"
            onClick={item.onClick}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-xl select-none relative",
              item.isActive && (item.activeBg || "bg-white/10"),
            )}
          >
            <div className="relative z-10 w-14 h-14 flex items-center justify-center rounded-lg">
              {item.icon}
            </div>
            <span className={cn(
              "relative z-10 text-[13px] font-medium leading-none",
              item.isActive ? "text-white" : "text-neutral-500",
            )}>
              {item.title}
            </span>
          </button>
          {dividerAfter === idx && (
            <div className="w-px h-10 bg-white/30 mx-1 self-center flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
};
