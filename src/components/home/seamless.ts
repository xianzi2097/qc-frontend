/**
 * 无痕嵌入样式（注入同源 iframe 中的 VitePress 页面）：
 * - 嵌在主页里：隐藏 VitePress 顶栏（导航由左侧控制台接管，避免双导航）
 * - 颜色不碰：文档保留自己的春天绿主题（学生喜欢，阅读护眼）
 * - 新窗口独立打开时不经过这里 → 顶栏自然显示，自带完整导航（沉浸式阅读）
 * VitePress 是 SPA 内部跳转，样式注入一次持续生效；整页加载时 onLoad 重新注入。
 */
export const SEAMLESS_CSS = `
  :root {
    --vp-nav-height: 0px !important;
  }
  .VPNavBar {
    display: none !important;
  }
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: #d9d4c8;
    border-radius: 3px;
  }
`;




/** 向 iframe 文档注入无痕样式（在 iframe onLoad 时调用；仅同源页面有效） */
export function injectSeamless(frame: HTMLIFrameElement | null): void {
  const doc = frame?.contentDocument;
  if (!doc?.head) return;
  const style = doc.createElement('style');
  style.textContent = SEAMLESS_CSS;
  doc.head.appendChild(style);
}
