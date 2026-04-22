import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// ─── Colour helpers (matches sCol logic from HTML) ────────────────────────────
const getTargetColor = (f) => {
  if (f >= 75) return new THREE.Color('#1D9E75'); // Fair — teal green
  if (f >= 50) return new THREE.Color('#EF9F27'); // Moderate — amber
  return new THREE.Color('#E24B4A');               // Biased — red
};

// ─── Particle positions (stable — computed once outside component) ─────────────
const PARTICLE_POSITIONS = (() => {
  const arr = new Float32Array(600 * 3);
  // Deterministic "pseudo-random" using index math so React re-renders are stable
  for (let i = 0; i < 600; i++) {
    const t  = (i * 2.399) % (Math.PI * 2);   // golden-angle spread
    const p  = Math.acos(1 - (2 * i) / 600);
    const rv = 1.5 + ((i * 0.618033) % 0.8);
    arr[i * 3]     = rv * Math.sin(p) * Math.cos(t);
    arr[i * 3 + 1] = rv * Math.sin(p) * Math.sin(t);
    arr[i * 3 + 2] = rv * Math.cos(p);
  }
  return arr;
})();

// ─── Main animated orb group ───────────────────────────────────────────────────
const OrbCore = ({ fairnessScore }) => {
  const coreRef   = useRef();
  const wireRef   = useRef();
  const ring1Ref  = useRef();
  const ring2Ref  = useRef();
  const ptsRef    = useRef();
  const lightRef  = useRef();

  const matCore  = useRef();
  const matWire  = useRef();
  const matRing1 = useRef();
  const matRing2 = useRef();
  const matPts   = useRef();

  const targetColor = useMemo(() => getTargetColor(fairnessScore), [fairnessScore]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // ── Smooth color lerp on all materials ───────────────────────────────────
    const lf = 0.04; // lerp factor
    [matCore, matWire, matRing1, matRing2, matPts].forEach(({ current: m }) => {
      if (m) m.color.lerp(targetColor, lf);
    });
    if (matCore.current) {
      const emTarget = targetColor.clone().multiplyScalar(0.3);
      matCore.current.emissive.lerp(emTarget, lf);
    }
    if (lightRef.current) {
      lightRef.current.color.lerp(targetColor, lf);
      // Intensity pulse — faster when biased
      const pulseSpeed = fairnessScore < 50 ? 4 : 2;
      const baseIntensity = fairnessScore < 50 ? 3 : fairnessScore < 75 ? 2 : 1.5;
      lightRef.current.intensity = baseIntensity + Math.sin(t * pulseSpeed) * 0.8;
    }

    // ── Core orb rotation + pulse scale ─────────────────────────────────────
    if (coreRef.current) {
      coreRef.current.rotation.y += 0.0035;
      coreRef.current.rotation.x = Math.sin(t * 0.3) * 0.08;
      const scaleAmt = fairnessScore < 50 ? 0.045 : 0.025;
      const scaleSpd = fairnessScore < 50 ? 3.5 : 1.8;
      const s = 1 + Math.sin(t * scaleSpd) * scaleAmt;
      coreRef.current.scale.setScalar(s);
    }

    // ── Wireframe shell counter-rotation ─────────────────────────────────────
    if (wireRef.current) {
      wireRef.current.rotation.y -= 0.0015;
      wireRef.current.rotation.z  = t * 0.12;
    }

    // ── Torus rings ──────────────────────────────────────────────────────────
    if (ring1Ref.current) ring1Ref.current.rotation.z += 0.0022;
    if (ring2Ref.current) ring2Ref.current.rotation.y += 0.0018;

    // ── Particle cloud ───────────────────────────────────────────────────────
    if (ptsRef.current) {
      ptsRef.current.rotation.y += 0.001;
      ptsRef.current.rotation.x  = Math.sin(t * 0.2) * 0.06;
    }
  });

  const startColor = '#E24B4A'; // Initial value — immediately lerped

  return (
    <group>
      {/* Internal point light for glow */}
      <pointLight ref={lightRef} intensity={2} color={startColor} distance={6} />

      {/* Core icosahedron */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1, 3]} />
        <meshPhongMaterial
          ref={matCore}
          color={startColor}
          emissive={startColor}
          emissiveIntensity={0.3}
          shininess={160}
        />
      </mesh>

      {/* Wireframe shell */}
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[1.09, 1]} />
        <meshBasicMaterial
          ref={matWire}
          color={startColor}
          wireframe
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Torus ring 1 */}
      <mesh ref={ring1Ref} rotation={[Math.PI * 0.38, 0, 0]}>
        <torusGeometry args={[1.62, 0.022, 8, 80]} />
        <meshBasicMaterial ref={matRing1} color={startColor} transparent opacity={0.5} />
      </mesh>

      {/* Torus ring 2 */}
      <mesh ref={ring2Ref} rotation={[Math.PI * 0.65, Math.PI * 0.2, 0]}>
        <torusGeometry args={[1.35, 0.012, 8, 60]} />
        <meshBasicMaterial ref={matRing2} color={startColor} transparent opacity={0.25} />
      </mesh>

      {/* Particle cloud */}
      <points ref={ptsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[PARTICLE_POSITIONS, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          ref={matPts}
          color={startColor}
          size={0.022}
          sizeAttenuation
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
};

// ─── Scene wrapper — exported ──────────────────────────────────────────────────
const BiasOrb = ({ fairnessScore = 34, className = '' }) => (
  <div className={`w-full h-full ${className}`}>
    <Canvas
      camera={{ position: [0, 0, 3.7], fov: 60 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.12} color="#111122" />
      <pointLight position={[3, 3, 3]} intensity={0.8} color="#ffffff" />

      <Float speed={1.8} rotationIntensity={0.4} floatIntensity={0.4} floatingRange={[0, 0.2]}>
        <OrbCore fairnessScore={fairnessScore} />
      </Float>

      <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={0.6} />
    </Canvas>
  </div>
);

export default BiasOrb;
