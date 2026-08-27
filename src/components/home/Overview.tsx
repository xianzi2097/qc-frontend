import { ArrowRight, GraduationCap, Star, Terminal } from 'lucide-react';

interface Props {
  onGoCourses: () => void;
  onGoFeatured: () => void;
}

/** 概览 — 内容区默认页：问候 + 三个快捷入口 */
export default function Overview({ onGoCourses, onGoFeatured }: Props) {
  const hour = new Date().getHours();
  const greeting = hour < 6 ? '夜深了' : hour < 12 ? '上午好' : hour < 18 ? '下午好' : '晚上好';

    const tiles = [
    { icon: GraduationCap, title: '去上课', desc: '老师主讲的主线课程', onClick: onGoCourses, href: '' },
    { icon: Star, title: '逛精选', desc: '老师挑选的选读内容', onClick: onGoFeatured, href: '' },
    { icon: Terminal, title: '在线编程', desc: '打开 Scratch 编辑器', onClick: undefined, href: '/Scratch/index.html' },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <header className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-ed-line">
        <h2 className="text-base font-semibold text-ed-ink">开始</h2>
      </header>

      <div className="flex-1 flex flex-col justify-center pl-24 px-10 py-10 max-w-[54rem]">
        <p className="text-lg text-ed-muted mb-2">{greeting}</p>
        <h3 className="ed-serif text-[2.1rem] leading-snug font-bold text-ed-ink mb-3">
          现在想创作点什么？
        </h3>
        <p className="text-sm text-ed-muted mb-10">
          从下面选一个开始，或者用左侧控制台进入任意板块。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tiles.map(t => {
            const inner = (
              <>
                <t.icon size={22} strokeWidth={1.6} className="text-ed-body" />
                <div className="mt-4 text-sm font-semibold text-ed-ink">{t.title}</div>
                <div className="text-xs text-ed-muted mt-1">{t.desc}</div>
                <ArrowRight
                  size={14}
                  className="mt-4 ml-auto text-ed-muted group-hover:text-brand-orange group-hover:translate-x-1 transition-all"
                />
              </>
            );
            const cls =
              'group flex flex-col bg-white border border-ed-line p-5 text-left cursor-pointer hover:border-brand-orange hover:shadow-sm transition-all';
            return t.href ? (
              <a key={t.title} href={t.href} target="_blank" rel="noreferrer" className={`${cls} no-underline`}>
                {inner}
              </a>
            ) : (
              <button key={t.title} onClick={t.onClick} className={cls}>
                {inner}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
