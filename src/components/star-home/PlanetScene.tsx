import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line, Text, useTexture, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/* ── 入口数据 ── */
export interface PlanetEntry {
  id: string;
  label: string;
  desc: string;
  color: string;
  size: number;
  href: string;
  textureKey: string;
  x: number;   // 轨道半径
  y: number;   // 高度（未启用）
  z: number;   // 废弃
  angle?: number; // 角度（弧度），不设则按 (x,0,0) 摆放
  axialTilt?: number;
  noSelfRotation?: boolean;
  reverseRotation?: boolean;
  satellites?: { text: string; href: string }[];
}

interface Props {
  entries: PlanetEntry[];
  onPlanetClick: (entry: PlanetEntry) => void;
  orbitalSatellites?: OrbitalSatelliteData[];
  onCameraChange?: (p: THREE.Vector3) => void;
}

export interface OrbitalSatelliteData {
  id: string;
  targetX: number; targetY: number; targetZ: number;
  distance: number;
  speed: number;
  texture?: string;
  model?: string;
  size?: number;
}

const BASE = '/dashboard/';
const TEXTURE_MAP: Record<string, string> = {
  venus:  `${BASE}textures/venus_atmosphere.jpg`,
  earth:  `${BASE}textures/earth_daymap.jpg`,
  earth_night: `${BASE}textures/earth_nightmap.jpg`,
  uranus: `${BASE}textures/uranus.jpg`,
  mars:   `${BASE}textures/mars.jpg`,
  moon:   `${BASE}textures/moon.jpg`,
  jupiter: `${BASE}textures/jupiter.jpg`,
  saturn:  `${BASE}textures/saturn.jpg`,
  neptune: `${BASE}textures/neptune.jpg`,
  sun:     `${BASE}textures/sun.jpg`,
  mercury: `${BASE}textures/mercury.jpg`,
};

/* ── 完美的 2D 纯平轨道环 ── */
function OrbitRing({ radius }: { radius: number }) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      pts.push([
        Math.cos(angle) * radius,
        0, // 强制 Y=0，绝对纯平
        Math.sin(angle) * radius,
      ]);
    }
    return pts;
  }, [radius]);

  return <Line points={points} color="#ffffff" opacity={0.15} transparent lineWidth={1} />;
}

/* ── 行星物理引擎 ── */
function Planet({ entry, onClick, planetPositionsRef }: { 
  entry: PlanetEntry; 
  onClick: () => void;
  planetPositionsRef: React.MutableRefObject<Record<string, THREE.Vector3>>;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const groupRef = useRef<THREE.Group>(null!);
  const texture = useTexture(TEXTURE_MAP[entry.textureKey] || TEXTURE_MAP.earth);
  const nightTex = useTexture(TEXTURE_MAP.earth_night);
  const isEarth = entry.textureKey === 'earth';
  const isSun = entry.id === 'sun';


  useEffect(() => {
    // 初始位置固定，不公转
    if (groupRef.current) {
      const px = entry.angle != null ? entry.x * Math.cos(entry.angle) : entry.x;
      const pz = entry.angle != null ? entry.x * Math.sin(entry.angle) : entry.z;
      groupRef.current.position.set(px, 0, pz);
      // 通知探测器行星位置
      if (!planetPositionsRef.current[entry.id]) {
        planetPositionsRef.current[entry.id] = new THREE.Vector3();
      }
      planetPositionsRef.current[entry.id].set(px, 0, pz);
    }
    if (entry.axialTilt && meshRef.current) {
      meshRef.current.rotation.x = entry.axialTilt;
    }
  }, [entry.x, entry.z, entry.axialTilt]);

  useFrame((state) => {
    // 自转
    if (!entry.noSelfRotation && meshRef.current) {
      meshRef.current.rotation.y += entry.reverseRotation ? -0.005 : 0.005;
    }
    // 月球绕地球公转 + 潮汐锁定
    if (entry.id === 'moon' && groupRef.current && meshRef.current) {
      const earthPos = planetPositionsRef.current['scratch'];
      if (!earthPos) return;
      const t = state.clock.getElapsedTime();
      const angle = t * 0.4;
      groupRef.current.position.set(
        earthPos.x + Math.cos(angle) * 0.8,
        0.45,
        earthPos.z + Math.sin(angle) * 0.8,
      );
      meshRef.current.rotation.y = angle + Math.PI / 2; // 潮汐锁定，永远一面对着地球
      return;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[entry.size, 64, 64]} />
        {isSun ? (
          <meshBasicMaterial map={texture} color="#d4d4d4"/>
        ) : (
        <meshStandardMaterial
          map={texture}
          roughness={0.8}
          metalness={0.1}
          emissiveMap={isEarth ? nightTex : undefined}
          emissive={isEarth ? '#ffffff' : '#000000'}
          emissiveIntensity={isEarth ? 0.3 : 0}
        />
        )}
      </mesh>
      {/* 名称标签 */}
      <Text
        position={[0, -entry.size - 0.35, 0]}
        fontSize={0.25}
        color="white"
        anchorX="center"
        anchorY="top"
        opacity={0.8}
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {entry.label}
      </Text>
    </group>
  );
}

/* ── 探测器/月球引擎 (完全跟随宿主的动态旋转) ── */
function OrbitalSatellite({ data, planetPositionsRef }: { 
  data: OrbitalSatelliteData; 
  planetPositionsRef: React.MutableRefObject<Record<string, THREE.Vector3>>;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);
  const { camera } = useThree();

  const gltf = data.model ? useGLTF(data.model) : null;
  const tex = data.texture ? useTexture(data.texture) : null;

  const parentPlanetId = useMemo(() => {
    const idLower = data.id.toLowerCase();
    if (idLower.includes('moon')) return 'scratch';
    if (idLower.includes('mars') || idLower.includes('rover') || idLower === 'mro') return 'profile';
    return 'scratch'; // 默认回退
  }, [data.id]);

  useFrame((state) => {
    // 获取宿主行星此刻由于公转产生的实时 [X, 0, Z]
    const liveCenter = planetPositionsRef.current[parentPlanetId];
    if (liveCenter && groupRef.current) {
      const t = state.clock.getElapsedTime();
      const angle = t * data.speed;
      const d = data.distance;
      
      // 在宿主星的实时坐标上叠加探测器的圆周运动
      groupRef.current.position.set(
        liveCenter.x + Math.cos(angle) * d,
        liveCenter.y + Math.sin(angle) * d * 0.2, // 允许探测器有轻微 Y 轴上下浮动增加动感
        liveCenter.z + Math.sin(angle) * d
      );

      if (meshRef.current) {
        meshRef.current.rotation.y += 0.02; 
      } else {
        groupRef.current.lookAt(camera.position); 
      }
    }
  });

  const s = data.size ?? 0.4;

  if (gltf) {
    return (
      <group ref={groupRef}>
        <primitive ref={meshRef} object={gltf.scene.clone()} scale={s} />
      </group>
    );
  }

  return (
    <group ref={groupRef}>
      <sprite scale={[s, s, 1]}>
        <spriteMaterial map={tex || undefined} transparent opacity={0.9} />
      </sprite>
    </group>
  );
}

function Stars() {
  const ref = useRef<THREE.Points>(null!);
  const g = useMemo(() => {
    const pos = new Float32Array(3500*3), col = new Float32Array(3500*3);
    for (let i = 0; i < 3500; i++) {
      const r=80+Math.random()*150, theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1);
      pos[i*3]=r*Math.sin(phi)*Math.cos(theta); pos[i*3+1]=r*Math.cos(phi); pos[i*3+2]=r*Math.sin(phi)*Math.sin(theta);
      const t=Math.random();
      if(t<0.1){col[i*3]=0.8;col[i*3+1]=0.85;col[i*3+2]=1}else{col[i*3]=1;col[i*3+1]=1;col[i*3+2]=1}
    }
    const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(pos,3)); geo.setAttribute('color',new THREE.BufferAttribute(col,3));
    return geo;
  },[]);
  return (<points ref={ref} geometry={g}><pointsMaterial size={0.2} transparent opacity={0.8} blending={THREE.AdditiveBlending} vertexColors /></points>);
}

function SceneSetup({ onCamChange }: { onCamChange?: (p: THREE.Vector3) => void }) {
  const {camera}=useThree();
  useEffect(()=>{
    camera.position.set(10, 25, 0.1); // 相机对准右侧，太阳在左侧
    camera.lookAt(10,0,0);
  },[camera]);
  useFrame(() => {
    onCamChange?.(camera.position);
  });
  return <OrbitControls enableDamping dampingFactor={0.05} minDistance={5} maxDistance={80} maxPolarAngle={Math.PI/2.1} target={[10,0,0]} />;
}

function SceneLights() {
  return (<>
    <ambientLight intensity={0.08} color="#c8d8e8" />
    {/* 光源在太阳中心 */}
    <pointLight position={[0, 0, 0]} intensity={15} distance={50} decay={0.5} color="#ffdd88" />
  </>);
}

export default function PlanetScene({ entries, onPlanetClick, orbitalSatellites, onCameraChange }: Props) {
  const planetPositionsRef = useRef<Record<string, THREE.Vector3>>({});

  return (
    <Canvas camera={{position:[0,25,0.1],fov:35,near:0.1,far:500}}
      style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',zIndex:0}}
      gl={{antialias:true,toneMapping:THREE.NeutralToneMapping,toneMappingExposure:1.5}}
    >
      <SceneLights />
      <Stars />
      
      {/* 动态绘制完美轨道环 */}
      {entries.map(e => {
        if (e.id === 'sun' || e.id === 'moon') return null;
        // 轨道环半径直接用 x
        const radius = Math.abs(e.x);
        return radius > 0 ? <OrbitRing key={`orbit-${e.id}`} radius={radius} /> : null;
      })}

      {entries.map(e => (
        <Planet key={e.id} entry={e} onClick={() => onPlanetClick(e)} planetPositionsRef={planetPositionsRef} />
      ))}
      
      {orbitalSatellites?.map(s => (
        <OrbitalSatellite key={s.id} data={s} planetPositionsRef={planetPositionsRef} />
      ))}
      
      <SceneSetup onCamChange={onCameraChange} />
    </Canvas>
  );
}