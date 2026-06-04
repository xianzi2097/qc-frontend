"use client";
/**
 * Aceternity UI FloatingDock — macOS 弹性放大导航
 * 自定：文字标签 + 分割线 + 更大图标
 */

import { cn } from "../../lib/utils";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import type { MotionValue } from "motion/react";
import { useRef, useState } from "react";

interface DockItem {
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  isActive?: boolean;
}

export const FloatingDock = ({
  items,
  className,
  dividerAfter,
}: {
  items: DockItem[];
  className?: string;
  /** 在第几个 item 后面插入分割线 (0-indexed) */
  dividerAfter?: number;
}) => {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "mx-auto flex items-end gap-3 rounded-2xl bg-neutral-900/85 backdrop-blur-xl px-5 pb-3 pt-2 border border-white/20",
        className,
      )}
    >
      {items.map((item, idx) => (
        <div key={item.title} className="flex items-end gap-3">
          <IconContainer mouseX={mouseX} {...item} />
          {dividerAfter === idx && (
            <div className="w-px h-10 bg-white/15 mx-1 self-center" />
          )}
        </div>
      ))}
    </motion.div>
  );
};

function IconContainer({
  mouseX,
  title,
  icon,
  onClick,
  isActive,
}: {
  mouseX: MotionValue;
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  isActive?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthTransform = useTransform(distance, [-150, 0, 150], [48, 88, 48]);
  const heightTransform = useTransform(distance, [-150, 0, 150], [48, 88, 48]);
  const widthTransformIcon = useTransform(distance, [-150, 0, 150], [28, 48, 28]);
  const heightTransformIcon = useTransform(distance, [-150, 0, 150], [28, 48, 28]);

  const width = useSpring(widthTransform, { mass: 0.1, stiffness: 150, damping: 12 });
  const height = useSpring(heightTransform, { mass: 0.1, stiffness: 150, damping: 12 });
  const widthIcon = useSpring(widthTransformIcon, { mass: 0.1, stiffness: 150, damping: 12 });
  const heightIcon = useSpring(heightTransformIcon, { mass: 0.1, stiffness: 150, damping: 12 });

  const [hovered, setHovered] = useState(false);

  return (
    <button type="button" onClick={onClick} className="focus:outline-none flex flex-col items-center gap-1.5">
      <motion.div
        ref={ref}
        style={{ width, height }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative flex aspect-square items-center justify-center rounded-full bg-neutral-800"
      >
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 10, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 2, x: "-50%" }}
              className="absolute -top-8 left-1/2 w-fit rounded-md border border-neutral-600 bg-neutral-800 px-2 py-0.5 text-xs whitespace-pre text-white"
            >
              {title}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          style={{ width: widthIcon, height: heightIcon }}
          className="flex items-center justify-center"
        >
          {icon}
        </motion.div>
      </motion.div>
      <span className={cn(
        "text-[11px] leading-none text-center transition-colors",
        isActive ? "text-white" : "text-neutral-500",
      )}>
        {title}
      </span>
    </button>
  );
}
