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
      desc: '太阳系的中心恒星',
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
      desc: '最靠近太阳的小行星',
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
      desc: '太阳系最热的行星，逆向自转',
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
      desc: '我们的家园，目前已知唯一存在生命的行星',
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
      desc: '地球唯一的天然卫星',
      color: '#94a3b8',
      size: 0.15,
      href: '',
      textureKey: 'moon',
      noSelfRotation: true,
      x: 7.3, y: 0.4, z: -0.6,
    },
    {      id: 'profile',
      label: '火星',
      desc: '红色星球，人类探索的下一个目标',
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
      desc: '太阳系最大的行星',
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
      desc: '美丽的环状行星',
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
      desc: '侧躺着自转的冰巨星',
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
      desc: '太阳系最远的行星',
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
      {/* 切换回卡片主页 */}
      <button
        onClick={onSwitchHome}
        className="fixed top-4 right-4 z-20 flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white/70 px-3 py-1.5 rounded-xl transition-all"
        title="切换到卡片主页"
      >
        <LayoutGrid size={14} /> 卡片
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
