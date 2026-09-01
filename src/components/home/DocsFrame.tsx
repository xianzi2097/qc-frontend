import { useEffect, useRef, useState } from 'react';
import TextTabs from './TextTabs';
import { injectSeamless } from './seamless';

const DOC_TABS = [
  { value: '/docs/', label: '手册首页' },
  { value: '/docs/scratch_course/', label: 'Scratch' },
  { value: '/docs/python_course/', label: 'Python' },
  { value: '/docs/cpp_course/', label: 'C++' },
];

/** 学习文档 — VitePress 无痕内嵌：上方章节 Tab + 同源 iframe 填满内容区 */
export default function DocsFrame() {
  // src 只在点 Tab 时变化（触发 iframe 重新加载）；active 跟随 iframe 实际路径高亮
  const [src, setSrc] = useState(() => localStorage.getItem('docsSection') || '/docs/');
  const [active, setActive] = useState(src);
  const [loaded, setLoaded] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const pathRef = useRef(src);

  // iframe 文档加载完成 → 注入无痕样式
  const handleLoad = () => {
    injectSeamless(frameRef.current);
    setLoaded(true);
  };

  // 切换章节 → 记忆选择并重载 iframe
  const switchTab = (v: string) => {
    localStorage.setItem('docsSection', v);
    pathRef.current = v;
    setActive(v);
    setLoaded(false);
    setSrc(v);
  };

  // 同源轮询 iframe 实际路径：文档内点击跨章节链接时，Tab 高亮跟着走
  useEffect(() => {
    const timer = setInterval(() => {
      const path = frameRef.current?.contentWindow?.location.pathname;
      if (!path || path === pathRef.current) return;
      pathRef.current = path;
      const match = DOC_TABS.find(t => t.value !== '/docs/' && path.startsWith(t.value));
      setActive(match ? match.value : '/docs/');
    }, 500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="ed-header flex-shrink-0 flex items-center justify-between gap-6 px-8 pt-2 pb-2 border-b border-ed-line">
        <h2 className="text-base font-semibold text-ed-ink">学习文档</h2>
        <TextTabs items={DOC_TABS} value={active} onChange={switchTab} />
      </header>

      <div className="flex-1 min-h-0 relative bg-white">
        {!loaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
            <span className="w-6 h-6 rounded-full border-2 border-ed-line border-t-brand animate-spin" />
          </div>
        )}
        <iframe
          ref={frameRef}
          key={src}
          src={src}
          title="学习文档"
          onLoad={handleLoad}
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}
