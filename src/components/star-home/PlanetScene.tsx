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
  satellites?: { text: string; href: string }[];
}

interface Props {
  entries: PlanetEntry[];
  onPlanetClick: (entry: PlanetEntry) => void;
}

/* ── 真实星球贴图 URL（Solar System Scope，CC-BY 4.0） ── */
const TEXTURE_URLS: Record<string, string> = {
  venus:  'https://www.solarsystemscope.com/textures/download/2k_venus_atmosphere.jpg',
  earth:  'https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg',
  uranus: 'https://www.solarsystemscope.com/textures/download/2k_uranus.jpg',
  mars:   'https://www.solarsystemscope.com/textures/download/2k_mars.jpg',
};

/* ── 单颗星球 ── */
function Planet({ entry, onClick }: { entry: PlanetEntry; onClick: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const groupRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);
  const texture = useTexture(TEXTURE_URLS[entry.textureKey] || TEXTURE_URLS.earth);

  useEffect(() => { groupRef.current.position.set(entry.x, entry.y, entry.z); }, []);

  useFrame(() => {
    meshRef.current.rotation.y += 0.005;
    meshRef.current.rotation.x += 0.0005;
  });

  return (
    <group ref={groupRef}>
      <mesh scale={1.12}>
        <sphereGeometry args={[entry.size, 32, 32]} />
        <meshBasicMaterial color={entry.color} transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>
      <mesh ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[entry.size, 64, 64]} />
        <meshStandardMaterial map={texture} roughness={0.6} metalness={0.1}
          emissive={new THREE.Color(entry.color)} emissiveIntensity={hovered ? 0.3 : 0.04} />
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
  useEffect(()=>{camera.position.set(0,1.5,8);camera.lookAt(0,0,0);},[camera]);
  return <OrbitControls enableDamping dampingFactor={0.08} minDistance={4} maxDistance={15} maxPolarAngle={Math.PI/2.5} />;
}

/* ── 灯光 ── */
function SceneLights() {
  return (<>
    <ambientLight intensity={0.4} color="#222244" />
    <directionalLight position={[8,12,10]} intensity={2.5} color="#ffeedd" />
    <directionalLight position={[-6,-2,-8]} intensity={0.5} color="#4488ff" />
  </>);
}

/* ── 主场景 ── */
export default function PlanetScene({ entries, onPlanetClick }: Props) {
  return (
    <Canvas camera={{position:[0,1.5,8],fov:45,near:0.1,far:500}}
      style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',zIndex:0}}
      gl={{antialias:true,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1}}
      onCreated={({gl})=>{gl.setPixelRatio(Math.min(window.devicePixelRatio,2))}}
    >
      <SceneLights /><Stars />
      {entries.map(e=><Planet key={e.id} entry={e} onClick={()=>onPlanetClick(e)} />)}
      <SceneSetup />
    </Canvas>
  );
}
