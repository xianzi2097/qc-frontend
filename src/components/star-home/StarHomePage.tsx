import { useMemo } from 'react';
import PlanetScene from './PlanetScene';
import type { PlanetEntry, OrbitalSatelliteData } from './PlanetScene';
import StarHomeLogo from './StarHomeLogo';

const BASE = '/dashboard/';

/** 绕飞卫星数据 */
const orbitalSatellites: OrbitalSatelliteData[] = [
  {

    id: 'mro',
    targetX: 3.3, targetY: -0.05, targetZ: 0,
    distance: 1.0,
    speed: 0.4,
    model: `${BASE}models/MRO.glb`,
    size: 0.04,
  },
];

/** 星球主页 — 纯 UI 壳，逐步加功能 */
export default function StarHomePage() {
  const planetEntries = useMemo<PlanetEntry[]>(() => [
    {
      id: 'scratch',
      label: 'Scratch 课堂',
      desc: '进入课堂 获取素材与案例',
      color: '#4a9eff',
      size: 1.1,
      href: '',
      textureKey: 'earth',
      axialTilt: 0.409,
      x: 0, y: 0, z: 0,
    },
    {
      id: 'docs',
      label: '学习文档',
      desc: 'Python / C++ / Scratch',
      color: '#94a3b8',
      size: 0.32,
      href: '',
      textureKey: 'moon',
      noSelfRotation: true,
      axialTilt: 0.027,
      x: 1.6, y: 1.5, z: 0,
    },
    {
      id: 'create',
      label: '自由创作',
      desc: 'Scratch 4.0 引擎 · 纯净模式',
      color: '#e8c87a',
      size: 0.5,
      href: '',
      textureKey: 'venus',
      axialTilt: 3.096,
      x: -3.3, y: -0.05, z: 0,
    },
    {
      id: 'profile',
      label: '个人中心',
      desc: '登录 · 成长记录',
      color: '#fb923c',
      size: 0.55,
      href: '',
      textureKey: 'mars',
      axialTilt: 0.440,
      x: 3.3, y: -0.05, z: 0,
    },
  ], []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050510]">
      <StarHomeLogo />
      <PlanetScene entries={planetEntries} onPlanetClick={() => {}} orbitalSatellites={orbitalSatellites} />

      {/* ── UI 覆盖层槽位 ── */}
      <div className="fixed inset-0 pointer-events-none z-10">
        {/* TODO: LoginModal */}
        {/* TODO: DetailCard */}
        {/* TODO: AvatarPicker */}
      </div>
    </div>
  );
}
