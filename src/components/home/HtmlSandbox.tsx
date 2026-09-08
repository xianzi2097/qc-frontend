import { useState } from 'react';

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <title>HTML 演示</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    h1 { color: #2f845e; }
    .box { background: #e8f4eb; padding: 16px; border-radius: 8px; margin: 12px 0; }
  </style>
</head>
<body>
  <h1>Hello, HTML!</h1>
  <div class="box">
    <p>在这里写你的 HTML 演示代码。</p>
    <p>右侧会实时预览效果。</p>
  </div>
</body>
</html>`;

/**
 * HTML 演示沙箱 — 左侧编辑代码，右侧实时预览
 */
export default function HtmlSandbox() {
  const [code, setCode] = useState(DEFAULT_HTML);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <header className="ed-header flex items-center justify-end px-8 pt-2 pb-2 border-b border-ed-line">
        <h2 className="text-ed-title font-semibold text-ed-ink">HTML 演示</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ed-muted">编辑代码 → 右侧实时预览</span>
          <button
            onClick={() => {
              const blob = new Blob([code], { type: 'text/html' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'demo.html';
              a.click();
              URL.revokeObjectURL(a.href);
            }}
            className="text-xs px-3 py-1.5 rounded-lg bg-ed-ink text-white hover:bg-brand transition-colors cursor-pointer"
          >
            下载 HTML
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* 左：代码编辑器 */}
        <div className="w-1/2 min-h-0 border-r border-ed-line flex flex-col">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-ed-line ed-toolbar">
            <span className="text-xs font-medium text-ed-muted">HTML 代码</span>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="flex-1 w-full p-4 font-mono text-sm leading-relaxed text-ed-ink bg-white resize-none focus:outline-none border-0"
            style={{ tabSize: 2 }}
          />
        </div>

        {/* 右：实时预览 */}
        <div className="w-1/2 min-h-0 flex flex-col">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-ed-line ed-toolbar">
            <span className="text-xs font-medium text-ed-muted">实时预览</span>
          </div>
          <iframe
            srcDoc={code}
            className="flex-1 w-full border-0 bg-white"
            title="HTML 预览"
            sandbox="allow-scripts"
          />
        </div>
      </div>
    </div>
  );
}
