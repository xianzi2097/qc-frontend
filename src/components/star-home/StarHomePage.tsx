import { useState, useMemo } from 'react';
import { LayoutGrid } from 'lucide-react';
import PlanetScene from './PlanetScene';
import type { PlanetEntry, OrbitalSatelliteData } from './PlanetScene';
import StarHomeLogo from './StarHomeLogo';
import DetailCard from './DetailCard';

const BASE = '/';

/** 绕飞卫星数据 */
const orbitalSatellites: OrbitalSatelliteData[] = [
  {
    id: 'mro',
    targetX: 5.0, targetY: 0, targetZ: 0,
    distance: 0.6,
    speed: 0.4,
    model: `${BASE}models/MRO.glb`,
    size: 0.02,
  },
];

/** 星球主页 — 纯 UI 壳，逐步加功能 */
export default function StarHomePage({ onSwitchHome }: { onSwitchHome?: () => void }) {
  const [selectedEntry, setSelectedEntry] = useState<PlanetEntry | null>(null);
  const planetEntries = useMemo<PlanetEntry[]>(() => [
    // 太阳系：太阳在中心，行星在不同角度环绕
    {
      id: 'sun',
      label: '太阳',
      desc: '太阳系的中心，一颗普通的恒星。直径约 139 万公里，是地球的 109 倍；表面约 5500℃，核心超过 1500 万℃。它占了整个太阳系 99.8% 的质量，八大行星全都绕着它转——它给太阳系提供了光和热。',
      color: '#fbbf24',
      size: 1.5,
      href: '',
      textureKey: 'sun',
      noSelfRotation: true,
      x: 0, y: 0, z: 0,
    },
    {
      id: 'mercury',
      label: '水星',
      desc: '离太阳最近、也是最小的行星。直径约 4879 公里，只有地球三分之一。白天 430℃、夜里 -180℃，一天温差 600 度；绕太阳一圈只要 88 天。它几乎没有大气，天空永远是黑的。',
      color: '#a0a0a0',
      size: 0.25,
      href: '',
      textureKey: 'mercury',
      x: 2.5, y: 0, z: 0,
      angle: 3.21,
    },
    {
      id: 'create',
      label: '金星',
      desc: '天空中最亮的星，中国古代叫“太白”。个头和地球接近，却是太阳系最热的行星（约 465℃）——浓密的二氧化碳把热量全捂住了。它还倒着转：在金星上，太阳从西边升起。',
      color: '#e8c87a',
      size: 0.45,
      href: '',
      textureKey: 'venus',
      axialTilt: 3.096,
      x: 4.5, y: 0, z: 0,
      angle: -0.05,
    },
    {
      id: 'earth',
      label: '地球',
      desc: '我们的家园，目前已知唯一有生命的行星。直径约 12742 公里，71% 被液态水覆盖；大气层像防护罩，挡紫外线也挡陨石。它以每秒 29.8 公里的速度绕太阳奔跑，我们却稳稳站在上面。',
      color: '#4a9eff',
      size: 0.50,
      href: '',
      textureKey: 'earth',
      axialTilt: 0.409,
      x: 6.5, y: 0, z: 0,
      angle:0.0
    },
    {      id: 'moon',
      label: '月球',
      desc: '地球唯一的天然卫星，离我们最近的天体（平均 38.4 万公里）。没有空气和水，白天 127℃、夜里 -173℃。它的引力牵动着地球的潮汐；1969 年，人类第一次踏上它的土地。',
      color: '#94a3b8',
      size: 0.15,
      href: '',
      textureKey: 'moon',
      noSelfRotation: true,
      x: 7.3, y: 0.4, z: -0.6,
    },
    {      id: 'profile',
      label: '火星',
      desc: '红色星球，因土壤含氧化铁而“生锈”。直径约 6779 公里，只有地球一半。它是被探测器造访最多的行星——火星勘测轨道飞行器（MRO）在轨道上工作了十几年，替我们拍照、找水；中国的“祝融号”也上去跑过。它可能是人类第一颗殖民行星。',
      color: '#fb923c',
      size: 0.35,
      href: '',
      textureKey: 'mars',
      axialTilt: 0.440,
      x:8.5, y: 0, z: 0,
      angle: -0.1,
    },
    // ── 外行星（装饰） ──
    {
      id: 'jupiter',
      label: '木星',
      desc: '太阳系的行星之王。直径约 14 万公里，能装下 1300 个地球；它是气态巨行星，没有可以踩的地面。表面那个“大红斑”是一场刮了至少几百年的超级风暴，比地球还大。',
      color: '#d4a574',
      size: 1.0,
      href: '',
      textureKey: 'jupiter',
      x: 11.5, y: 0, z: 0,
      angle: 0,
    },
    {
      id: 'saturn',
      label: '土星',
      desc: '以华丽的光环闻名，中国古代称“镇星”。光环由无数冰块和石子组成，厚度却只有几十米。它密度极小——如果有足够大的水，这颗行星能浮起来。',
      color: '#e8d5a3',
      size: 0.85,
      href: '',
      textureKey: 'saturn',
      axialTilt: 0.467,
      x: 15, y: 0, z: 0,
      angle: 0.35,
    },
    {
      id: 'uranus',
      label: '天王星',
      desc: '一颗“躺着滚”的行星：自转轴倾斜 98 度，几乎是躺在轨道上打转。它是冰巨星，大气中的甲烷让它呈现青蓝色，也是太阳系里最冷的行星之一（约 -195℃）。',
      color: '#7ec8e3',
      size: 0.50,
      href: '',
      textureKey: 'uranus',
      axialTilt: 1.706,
      x: 18.0, y: 0, z: 0,
      angle: 0.2,
    },
    {
      id: 'neptune',
      label: '海王星',
      desc: '太阳系最远的行星，深蓝色的“风暴之星”。这里风速可达每小时 2000 公里，是太阳系最猛的风。它还是“笔尖上算出来的行星”——天文学家先用数学预言了它的位置，1846 年果然找到。',
      color: '#3b5ba5',
      size: 0.48,
      href: '',
      textureKey: 'neptune',
      x: 21.5, y: 0, z: 0,
      angle: -0.1,
    },
  ], []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050510]">
      {/* 返回主页（星空页已不是主页，按钮语义 = 返回） */}
      <button
        onClick={onSwitchHome}
        className="fixed top-4 right-4 z-20 flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white/70 px-3 py-1.5 rounded-xl transition-all"
        title="返回主页"
      >
        <LayoutGrid size={14} /> 返回
      </button>
      <StarHomeLogo />
      <PlanetScene entries={planetEntries} onPlanetClick={setSelectedEntry} orbitalSatellites={orbitalSatellites} />

      {/* ── UI 覆盖层槽位 ── */}
      <div className="fixed inset-0 pointer-events-none z-10">
        {selectedEntry && (
          <DetailCard entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
        )}
      </div>

    </div>
  );
}
