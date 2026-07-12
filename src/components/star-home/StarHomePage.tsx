import { useState, useMemo, useCallback } from 'react';
import PlanetScene from './PlanetScene';
import type { PlanetEntry, OrbitalSatelliteData } from './PlanetScene';
import StarHomeLogo from './StarHomeLogo';
import DetailCard from './DetailCard';
import * as THREE from 'three';

const BASE = '/dashboard/';

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
export default function StarHomePage() {
  const [selectedEntry, setSelectedEntry] = useState<PlanetEntry | null>(null);
  const [camPos, setCamPos] = useState({ x: 0, y: 0, z: 0 });
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
      x: 2.5, y: 1.13, z: 0,
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
      x: 4.5, y: 1.79, z: 0,
      angle: -0.05,
    },
    {
      id: 'scratch',
      label: '地球',
      desc: '我们的家园，目前已知唯一存在生命的行星',
      color: '#4a9eff',
      size: 0.50,
      href: '',
      textureKey: 'earth',
      axialTilt: 0.409,
      x: 6.5, y: 1.30, z: 0,
      angle:0.0
    },
    {      id: 'moon',
      label: '月球',
      desc: '地球唯一的天然卫星',
      color: '#94a3b8',
      size: 0.15,
      href: '',
      textureKey: 'moon',
      axialTilt: 0.027,
      x: 3.5, y: 0, z: 0.8,
    },
    {      id: 'profile',
      label: '火星',
      desc: '红色星球，人类探索的下一个目标',
      color: '#fb923c',
      size: 0.35,
      href: '',
      textureKey: 'mars',
      axialTilt: 0.440,
      x:8.5, y: 0.30, z: 0,
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
      x: 11.5, y: -2.03, z: 0,
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
      x: 15, y: -4.24, z: 0,
      angle: -0.35,
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
      x: 18.0, y: -6.24, z: 0,
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
      x: 21.5, y: -8.21, z: 0,
      angle: 0.4,
    },
  ], []);

  const handleCamChange = useCallback((p: THREE.Vector3) => {
    setCamPos({ x: p.x, y: p.y, z: p.z });
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050510]">
      <StarHomeLogo />
      <PlanetScene entries={planetEntries} onPlanetClick={setSelectedEntry} orbitalSatellites={orbitalSatellites} onCameraChange={handleCamChange} />

      {/* ── UI 覆盖层槽位 ── */}
      <div className="fixed inset-0 pointer-events-none z-10">
        {selectedEntry && (
          <DetailCard entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
        )}
      </div>

      {/* ── 相机位置调试 ── */}
      <div className="fixed bottom-4 left-4 z-20 font-mono text-xs text-white/70 bg-black/50 px-2 py-1 rounded pointer-events-none select-none">
        cam x:{camPos.x.toFixed(1)} y:{camPos.y.toFixed(1)} z:{camPos.z.toFixed(2)}
      </div>
    </div>
  );
}
