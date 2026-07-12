import { useNavigate } from 'react-router-dom';
import type { PlanetEntry } from './PlanetScene';

/** 每个星球对应的导航菜单项 */
const PLANET_ACTIONS: Record<string, { label: string; href?: string; external?: boolean }[]> = {
  scratch: [
    { label: '📚 进入课程广场', href: '/courses' },
  ],
  docs: [
    { label: '🚀 快速开始', href: '/docs/guide/', external: true },
    { label: '🐍 Python 课程', href: '/docs/python_course/', external: true },
    { label: '⚙️ C++ 课程', href: '/docs/cpp_course/', external: true },
    { label: '🧩 Scratch 课程', href: '/docs/scratch_course/', external: true },
  ],
  create: [
    { label: '🎨 开始创作', href: '/Scratch/index.html', external: true },
  ],
  profile: [
    { label: '🚪 登录 / 进入空间', href: '/dashboard' },
  ],
};

interface Props {
  entry: PlanetEntry;
  onClose: () => void;
}

export default function DetailCard({ entry, onClose }: Props) {
  const navigate = useNavigate();
  const actions = PLANET_ACTIONS[entry.id] || [];

  const handleAction = (href: string, external?: boolean) => {
    if (external) {
      window.location.href = href;
    } else {
      navigate(href);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
      onClick={onClose}
    >
      {/* 毛玻璃背景 */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* 全息风格卡片 */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-sm w-[90%] rounded-2xl p-8 backdrop-blur-md"
        style={{
          background: 'linear-gradient(135deg, rgba(15,15,30,0.96), rgba(5,5,16,0.96))',
          border: `1px solid ${entry.color}44`,
          boxShadow: `0 0 60px ${entry.color}22, 0 0 120px ${entry.color}11`,
        }}
      >
        {/* 顶部发光线条 */}
        <div className="w-full h-px mb-6" style={{
          background: `linear-gradient(90deg, transparent, ${entry.color}88, transparent)`,
        }} />

        {/* 标题 */}
        <h2 className="text-white text-xl font-black tracking-wide mb-2"
          style={{ textShadow: `0 0 30px ${entry.color}` }}>
          {entry.label}
        </h2>

        {/* 描述 */}
        <p className="text-white/40 text-sm leading-relaxed mb-6">{entry.desc}</p>

        {/* 菜单按钮 */}
        <div className="flex flex-col gap-2.5 mb-5">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={() => handleAction(action.href || '', action.external)}
              className="group w-full text-left px-5 py-3 rounded-xl text-sm font-semibold
                transition-all duration-200 hover:scale-[1.02] cursor-pointer"
              style={{
                color: entry.color,
                border: `1px solid ${entry.color}44`,
                background: `${entry.color}11`,
                textShadow: `0 0 10px ${entry.color}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${entry.color}22`;
                e.currentTarget.style.boxShadow = `0 0 20px ${entry.color}44`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `${entry.color}11`;
                e.currentTarget.style.boxShadow = '';
              }}
            >
              <span className="opacity-70 group-hover:opacity-100 transition-opacity">
                {action.label}
              </span>
            </button>
          ))}
        </div>

        {/* 底部发光线条 */}
        <div className="w-full h-px mb-5" style={{
          background: `linear-gradient(90deg, transparent, ${entry.color}44, transparent)`,
        }} />

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-sm cursor-pointer transition-all duration-200
            hover:bg-white/10"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.3)',
          }}
        >
          关闭
        </button>
      </div>
    </div>
  );
}
