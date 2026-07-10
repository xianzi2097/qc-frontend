import { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, useTexture } from '@react-three/drei';
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
  x: number;
  y: number;
  z: number;
  /** 地轴倾斜角（弧度），地球约 0.41（23.4°） */
  axialTilt?: number;
  /** 不自转（如月球，潮汐锁定） */
  noSelfRotation?: boolean;
  satellites?: { text: string; href: string }[];
}

interface Props {
  entries: PlanetEntry[];
  onPlanetClick: (entry: PlanetEntry) => void;
}

/* ── 本地纹理映射 ── */
const BASE = '/dashboard/';
const TEXTURE_MAP: Record<string, string> = {
  venus:  `${BASE}textures/venus_atmosphere.jpg`,
  earth:  `${BASE}textures/earth_daymap.jpg`,
  uranus: `${BASE}textures/uranus.jpg`,
  mars:   `${BASE}textures/mars.jpg`,
  moon:   `${BASE}textures/moon.jpg`,
};

/* ── 单颗星球 ── */
function Planet({ entry, onClick }: { entry: PlanetEntry; onClick: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const groupRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);
  const texture = useTexture(TEXTURE_MAP[entry.textureKey] || TEXTURE_MAP.earth);

  useEffect(() => {
    groupRef.current.position.set(entry.x, entry.y, entry.z);
    // 设置地轴倾斜
    if (entry.axialTilt) {
      meshRef.current.rotation.x = entry.axialTilt;
    }
  }, []);

  useFrame(() => {
    if (!entry.noSelfRotation) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[entry.size, 64, 64]} />
        <meshStandardMaterial map={texture} roughness={0.5} metalness={0.0} />
      </mesh>
      <Html position={[0, entry.size + 0.5, 0]} center>
        <div style={{
          color:'#fff', textAlign:'center',
          textShadow:`0 0 30px ${entry.color},0 2px 12px rgba(0,0,0,0.9)`,
          pointerEvents:'none', userSelect:'none',
        }}>
          <div style={{ fontSize: entry.size > 0.8 ? 20 : 15, fontWeight: 800, letterSpacing: 1, marginBottom: 2 }}>
            {entry.label}
          </div>
          <div style={{ fontSize: entry.size > 0.8 ? 13 : 11, fontWeight: 400, opacity: 0.55 }}>
            {entry.desc}
          </div>
        </div>
      </Html>
      {entry.satellites?.map((sat, i) => (
        <SatelliteButton key={sat.text} sat={sat} index={i} total={entry.satellites!.length}
          planetSize={entry.size} color={entry.color} />
      ))}
    </group>
  );
}

/* ── 卫星按钮 ── */
function SatelliteButton({ sat, index, total, planetSize, color }: {
  sat: { text: string; href: string }; index: number; total: number; planetSize: number; color: string;
}) {
  const seedAngle = useMemo(() => (index / total) * Math.PI * 2, [index, total]);
  const speed = useMemo(() => 0.15 + Math.random() * 0.08, []);
  const [pos, setPos] = useState({ x: 0, y: 0, z: 0 });
  const dist = planetSize + 1.2;
  useFrame(() => {
    const t = performance.now() / 1000;
    const a = seedAngle + t * speed * 0.3;
    setPos({ x: Math.cos(a)*dist, y: Math.sin(a*1.2)*dist*0.4, z: Math.sin(a)*dist*0.3 });
  });
  return (
    <Html position={[pos.x, pos.y, pos.z]} center>
      <a href={sat.href} style={{
        color, border:`1px solid ${color}44`, background:'rgba(0,0,0,0.5)',
        backdropFilter:'blur(6px)', padding:'4px 12px', borderRadius:16,
        fontSize:12, fontWeight:600, textDecoration:'none', display:'inline-block',
        cursor:'pointer', transition:'all 0.2s', whiteSpace:'nowrap', pointerEvents:'auto',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.transform='scale(1.12)'; e.currentTarget.style.boxShadow=`0 0 24px ${color}`; e.currentTarget.style.borderColor=color; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; e.currentTarget.style.borderColor=`${color}44`; }}
      >
        {sat.text}
      </a>
    </Html>
  );
}

/* ── 星星 ── */
function Stars() {
  const ref = useRef<THREE.Points>(null!);
  const [g] = useState(() => {
    const pos = new Float32Array(4000*3), col = new Float32Array(4000*3);
    for (let i = 0; i < 4000; i++) {
      const r=60+Math.random()*200, theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1);
      pos[i*3]=r*Math.sin(phi)*Math.cos(theta); pos[i*3+1]=r*Math.cos(phi); pos[i*3+2]=r*Math.sin(phi)*Math.sin(theta);
      const t=Math.random();
      if(t<0.1){col[i*3]=0.8;col[i*3+1]=0.85;col[i*3+2]=1}else if(t<0.15){col[i*3]=1;col[i*3+1]=0.85;col[i*3+2]=0.7}else{col[i*3]=1;col[i*3+1]=1;col[i*3+2]=1}
    }
    const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(pos,3)); geo.setAttribute('color',new THREE.BufferAttribute(col,3));
    return geo;
  },[]);
  return (<points ref={ref} geometry={g}><pointsMaterial size={0.25} transparent opacity={0.9} blending={THREE.AdditiveBlending} sizeAttenuation vertexColors /></points>);
}

/* ── 场景设置 ── */
function SceneSetup() {
  const {camera}=useThree();
  useEffect(()=>{camera.position.set(0,1.5,12);camera.lookAt(0,0,0);},[camera]);
  return <OrbitControls enableDamping dampingFactor={0.08} minDistance={4} maxDistance={15} maxPolarAngle={Math.PI/2.5}
    target={[0,0,0]} />;
}

/* ── 灯光 ── */
function SceneLights() {
  return (<>
    <ambientLight intensity={0.45} color="#88aacc" />
    {/* 主光：模拟太阳，右上空 */}
    <directionalLight position={[4, 6, 3]} intensity={10} color="#fff5e6" />
  </>);
}

/* ── 主场景 ── */
export default function PlanetScene({ entries, onPlanetClick }: Props) {
  return (
    <Canvas camera={{position:[0,1.5,12],fov:30,near:0.1,far:500}}
      style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',zIndex:0}}
      gl={{antialias:true,toneMapping:THREE.NeutralToneMapping,toneMappingExposure:2}}
      onCreated={({gl})=>{
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 1));
        // 锁 30fps，省 GPU
        const clock = new THREE.Clock();
        const interval = 1/30;
        const origRender = gl.render.bind(gl);
        let last = 0;
        gl.render = (scene, camera) => {
          const t = clock.getElapsedTime();
          if (t - last < interval) return;
          last = t;
          origRender(scene, camera);
        };
      }}
    >
      <SceneLights /><Stars />
      {entries.map(e=><Planet key={e.id} entry={e} onClick={()=>onPlanetClick(e)} />)}
      <SceneSetup />
    </Canvas>
  );
}
