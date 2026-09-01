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
  /* VitePress 侧边栏：zoom 整体缩放，正文保持原样
     断点基于 iframe 视口（≈父窗口 − 主页侧边栏） */
  .VPSidebar {
    width: 272px !important;
    transform-origin: left top;
    zoom: 0.84 !important;
    transition: zoom 0.2s ease !important;
  }
  @media (min-width: 1272px) {
    .VPSidebar { zoom: 1.0 !important; }
  }
  @media (min-width: 1872px) {
    .VPSidebar { zoom: 1.1 !important; }
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

  // 注入 CSS
  const style = doc.createElement('style');
  style.textContent = SEAMLESS_CSS;
  doc.head.appendChild(style);

  // 注入 JS：同步内容区 padding + 主题色到 iframe
  const syncScript = doc.createElement('script');
  syncScript.textContent = `
    (function() {
      var W = window.parent;
      function syncPadding() {
        var content = document.querySelector('.VPContent');
        if (!content) return;
        // iframe 视口 <960px：VitePress 自己的侧边栏隐藏逻辑接管，不留 padding
        if (window.innerWidth < 960) {
          content.style.paddingLeft = '';
          return;
        }
        // 无侧边栏的页面（如首页）：不留 padding
        if (!content.classList.contains('has-sidebar')) {
          content.style.paddingLeft = '';
          return;
        }
        // 宽屏且有侧边栏：按 zoom 后的视觉宽度设置 padding
        var sidebar = document.querySelector('.VPSidebar');
        var zoom = sidebar ? (parseFloat(getComputedStyle(sidebar).zoom) || 1) : 1;
        content.style.paddingLeft = Math.round(272 * zoom) + 'px';
      }
      // 同步主题色相到 iframe
      function syncTheme() {
        if (!W) return;
        var parentHTML = W.document.documentElement;
        var theme = parentHTML.getAttribute('data-theme') || '';
        var customHue = W.getComputedStyle(parentHTML).getPropertyValue('--custom-hue').trim();
        var root = document.documentElement;
        if (theme) {
          root.setAttribute('data-theme', theme);
          if (theme === 'custom' && customHue) {
            root.style.setProperty('--custom-hue', customHue);
          }
        } else {
          root.removeAttribute('data-theme');
          root.style.removeProperty('--custom-hue');
        }
      }
      syncPadding(); syncTheme();
      if (W) {
        W.addEventListener('resize', syncPadding);
        // 主题变化时同步（MutationObserver 监听 data-theme 变化）
        new MutationObserver(syncTheme).observe(W.document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
      }
      // SPA 切换页面时 .has-sidebar 会变，重新同步 padding（避免旧页面残留）
      var vpContent = document.querySelector('.VPContent');
      if (vpContent) {
        new MutationObserver(syncPadding).observe(vpContent, {attributes: true, attributeFilter: ['class']});
      }
    })();
  `;
  doc.head.appendChild(syncScript);
}
