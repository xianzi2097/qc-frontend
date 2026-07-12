import type { PlanetEntry } from './PlanetScene';

interface Props {
  entry: PlanetEntry;
  onClose: () => void;
}

export default function DetailCard({ entry, onClose }: Props) {

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
