"use client";
import { useEffect, useRef } from "react";
import { cn } from "../../lib/utils";

interface Sparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

/** 轻量粒子特效 — 纯 Canvas，零第三方依赖 */
export const SparklesCore = ({
  className,
  background = "transparent",
  minSize = 0.6,
  maxSize = 1.4,
  particleDensity = 60,
  particleColor = "#f97316",
  speed = 2,
}: {
  className?: string;
  background?: string;
  minSize?: number;
  maxSize?: number;
  particleDensity?: number;
  particleColor?: string;
  speed?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: Sparkle[] = [];
    const spawnRate = particleDensity / 60;

    function resize() {
      const rect = canvas!.parentElement!.getBoundingClientRect();
      canvas!.width = rect.width;
      canvas!.height = rect.height;
    }

    function spawn() {
      for (let i = 0; i < spawnRate; i++) {
        if (particles.length > particleDensity * 2) break;
        particles.push({
          x: Math.random() * canvas!.width,
          y: canvas!.height + 5,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -(Math.random() * 0.8 + 0.3) * speed,
          life: 0,
          maxLife: Math.random() * 120 + 80,
          size: Math.random() * (maxSize - minSize) + minSize,
          color: particleColor,
        });
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      spawn();

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        if (p.life > p.maxLife || p.y < -10) {
          particles.splice(i, 1);
          continue;
        }

        const alpha = 1 - p.life / p.maxLife;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, "0");
        ctx!.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [particleDensity, minSize, maxSize, particleColor, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 pointer-events-none", className)}
      style={{ background }}
      aria-hidden="true"
    />
  );
};
