import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Preload } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

// ─────────────────────────────────────────────
// CENTRAL GLOSSY SPHERE
// ─────────────────────────────────────────────
function CentralSphere() {
  const ref = useRef();

  const geo = useMemo(() => new THREE.SphereGeometry(1.15, 96, 96), []);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0d0d0d',
        metalness: 1.0,
        roughness: 0.07,
        envMapIntensity: 1.8,
      }),
    []
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    ref.current.rotation.y = t * 0.04;
    ref.current.rotation.x = Math.sin(t * 0.05) * 0.05;
  });

  return <mesh ref={ref} geometry={geo} material={mat} />;
}

// ─────────────────────────────────────────────
// ORBITAL RING  (full torus, tilted + spinning)
// ─────────────────────────────────────────────
function OrbitalRing({ tiltX = 0, tiltZ = 0, speed = 0.25, radius = 1.9, tube = 0.055, color = '#161616' }) {
  const ref = useRef();

  const geo = useMemo(() => new THREE.TorusGeometry(radius, tube, 24, 180), [radius, tube]);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        metalness: 1.0,
        roughness: 0.06,
        envMapIntensity: 2.0,
      }),
    [color]
  );

  useFrame(({ clock }) => {
    ref.current.rotation.z = clock.getElapsedTime() * speed;
  });

  return (
    <group rotation={[tiltX, 0, tiltZ]}>
      <mesh ref={ref} geometry={geo} material={mat} />
    </group>
  );
}

// ─────────────────────────────────────────────
// SWEEPING ARC  (partial tube ribbon spinning)
// ─────────────────────────────────────────────
function SweepingArc({ orbitR = 2.3, tube = 0.048, speed = 0.3, offset = 0, tiltX = 0.5, tiltZ = 0.2, span = 0.45, color = '#1e1e1e' }) {
  const ref = useRef();

  const geo = useMemo(() => {
    const pts = [];
    const arc = Math.PI * 2 * span;
    for (let i = 0; i <= 80; i++) {
      const a = (i / 80) * arc;
      pts.push(new THREE.Vector3(Math.cos(a) * orbitR, 0, Math.sin(a) * orbitR));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, 100, tube, 10, false);
  }, [orbitR, tube, span]);

  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        metalness: 1.0,
        roughness: 0.08,
        envMapIntensity: 1.8,
      }),
    [color]
  );

  useFrame(({ clock }) => {
    ref.current.rotation.y = clock.getElapsedTime() * speed + offset;
  });

  return (
    <group rotation={[tiltX, 0, tiltZ]}>
      <mesh ref={ref} geometry={geo} material={mat} />
    </group>
  );
}

// ─────────────────────────────────────────────
// BACKGROUND STAR FIELD
// ─────────────────────────────────────────────
function Stars() {
  const ref = useRef();

  const { geo, mat } = useMemo(() => {
    const count = 300;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 9 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: '#999999', size: 0.03, sizeAttenuation: true, transparent: true, opacity: 0.5 });
    return { geo: g, mat: m };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    ref.current.rotation.y = t * 0.006;
    ref.current.rotation.x = t * 0.002;
  });

  return <points ref={ref} geometry={geo} material={mat} />;
}

// ─────────────────────────────────────────────
// FLOATING DEBRIS SQUARES
// ─────────────────────────────────────────────
function Debris() {
  const meshRefs = useRef([]);
  const count = 7;

  const data = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const r = 3.8 + Math.random() * 2;
        return {
          baseX: Math.cos(angle) * r,
          baseY: (Math.random() - 0.5) * 3.5,
          baseZ: Math.sin(angle) * r,
          orbitR: r,
          orbitSpeed: 0.04 + Math.random() * 0.05,
          phase: Math.random() * Math.PI * 2,
          rotS: (Math.random() - 0.5) * 0.6,
          scale: 0.05 + Math.random() * 0.07,
        };
      }),
    []
  );

  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#555555', metalness: 0.9, roughness: 0.15 }),
    []
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    data.forEach((d, i) => {
      const m = meshRefs.current[i];
      if (!m) return;
      const a = t * d.orbitSpeed + d.phase;
      m.position.set(Math.cos(a) * d.orbitR, d.baseY + Math.sin(t * 0.25 + d.phase) * 0.15, Math.sin(a) * d.orbitR);
      m.rotation.x = t * d.rotS;
      m.rotation.y = t * d.rotS * 0.7;
    });
  });

  return (
    <>
      {data.map((d, i) => (
        <mesh
          key={i}
          ref={(el) => (meshRefs.current[i] = el)}
          geometry={geo}
          material={mat}
          scale={d.scale}
        />
      ))}
    </>
  );
}

// ─────────────────────────────────────────────
// FULL SCENE
// ─────────────────────────────────────────────
function Scene() {
  return (
    <>
      {/* Lighting — JSX, no imperative scene.add */}
      <ambientLight intensity={0.12} />
      <directionalLight position={[6, 8, 4]}  intensity={1.6} color="#ffffff" />
      <directionalLight position={[-6, 2, -4]} intensity={0.4} color="#6666cc" />
      <pointLight position={[0, -5, -6]} intensity={0.7} color="#8888bb" distance={22} />
      <pointLight position={[0, 8, 0]}   intensity={0.5} color="#ffffff"  distance={18} />
      <pointLight position={[-4, 0, 4]}  intensity={0.35} color="#ffffff" distance={14} />

      {/* Environment for metalness reflections (neutral studio) */}
      <Environment preset="studio" background={false} />

      {/* Scene content */}
      <Stars />
      <Debris />
      <CentralSphere />

      {/* Gyroscope orbital rings — 5 at different planes */}
      <OrbitalRing tiltX={Math.PI / 2}   tiltZ={0}    speed={ 0.18} radius={1.88} tube={0.062} color="#1a1a1a" />
      <OrbitalRing tiltX={Math.PI / 6}   tiltZ={0.2}  speed={-0.14} radius={1.96} tube={0.054} color="#171717" />
      <OrbitalRing tiltX={-Math.PI / 5}  tiltZ={0.5}  speed={ 0.22} radius={2.04} tube={0.047} color="#1e1e1e" />
      <OrbitalRing tiltX={Math.PI / 3.5} tiltZ={-0.4} speed={-0.10} radius={2.12} tube={0.040} color="#161616" />
      <OrbitalRing tiltX={-Math.PI / 7}  tiltZ={-0.8} speed={ 0.16} radius={2.20} tube={0.035} color="#1c1c1c" />

      {/* Sweeping arc ribbons */}
      <SweepingArc orbitR={2.36} tube={0.052} speed={ 0.28} offset={0}              tiltX={0.6}  tiltZ={0.3}  span={0.45} color="#242424" />
      <SweepingArc orbitR={2.52} tube={0.043} speed={-0.22} offset={Math.PI * 0.7}  tiltX={-0.5} tiltZ={0.8}  span={0.35} color="#1e1e1e" />
      <SweepingArc orbitR={2.66} tube={0.035} speed={ 0.35} offset={Math.PI * 1.3}  tiltX={1.1}  tiltZ={-0.4} span={0.55} color="#1a1a1a" />
      <SweepingArc orbitR={2.46} tube={0.030} speed={-0.18} offset={Math.PI * 1.9}  tiltX={-0.9} tiltZ={-0.6} span={0.40} color="#1c1c1c" />

      {/* Post-processing */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.1} luminanceSmoothing={0.9} height={300} intensity={0.55} />
        <Vignette eskil={false} offset={0.2} darkness={0.65} />
      </EffectComposer>

      <Preload all />
    </>
  );
}

// ─────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────
export default function HeroAnimation() {
  return (
    <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#0a0a0a' }}>
      <Canvas
        camera={{ position: [0, 0, 5.6], fov: 48 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#0a0a0a']} />
        <Scene />
      </Canvas>
    </div>
  );
}