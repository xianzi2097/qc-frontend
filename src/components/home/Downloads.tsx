import { ExternalLink, Download } from 'lucide-react';

/** 软件下载列表 — 预留组件，随时可填充 */
const SOFTWARES = [
  { name: 'Typora（免费版）', desc: '轻量 Markdown 编辑器', url: 'https://typora.io/', icon: '📝' },
  { name: 'Scratch 桌面版', desc: '离线版 Scratch 编辑器', url: 'https://scratch.mit.edu/download', icon: '🧩' },
  { name: 'Google Chrome', desc: '推荐使用的浏览器', url: 'https://www.google.com/chrome/', icon: '🌐' },
];

export default function Downloads() {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <header className="flex items-center justify-between px-8 pt-4 pb-4 border-b border-ed-line">
        <h2 className="text-base font-semibold text-ed-ink">软件下载</h2>
      </header>

      <div className="flex-1 px-8 py-6">
        <p className="text-sm text-ed-muted mb-6">以下软件推荐安装，点击即可跳转官方下载页。</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SOFTWARES.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-start gap-4 p-5 border border-ed-line rounded-lg bg-white hover:border-brand-orange hover:shadow-sm transition-all duration-300 no-underline"
            >
              <span className="text-2xl flex-shrink-0">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-ed-ink flex items-center gap-1.5">
                  {s.name}
                  <ExternalLink className="w-3 h-3 text-ed-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-xs text-ed-muted mt-1">{s.desc}</div>
              </div>
              <Download className="w-4 h-4 text-ed-muted group-hover:text-brand-orange transition-colors flex-shrink-0 mt-0.5" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
