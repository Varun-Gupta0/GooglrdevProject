import React, { useRef, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useEquiLens from '../store/useEquiLens';

// ─── Stable helix node data (20 nodes, seeded) ────────────────────────────────
const N = 20;

const buildHelixData = () => {
  const nodes = [];
  // Use fixed seed pattern so layout is stable across renders
  const infectedPattern = [1,1,0,1,1,0,1,0,1,1,1,0,1,1,0,0,1,0,1,1]; // 13 infected
  for (let i = 0; i < N; i++) {
    const t = (i / (N - 1)) * Math.PI * 4;
    const y = (i / (N - 1)) * 4.8 - 2.4;
    const infected = infectedPattern[i] === 1;
    nodes.push({
      posA: new THREE.Vector3(Math.cos(t) * 1.15, y, Math.sin(t) * 1.15),
      posB: new THREE.Vector3(Math.cos(t + Math.PI) * 1.15, y, Math.sin(t + Math.PI) * 1.15),
      infected,
      index: i,
    });
  }
  return nodes;
};

const HELIX_DATA = buildHelixData();

// Build tube splines once
const splineA = HELIX_DATA.map(n => n.posA);
const splineB = HELIX_DATA.map(n => n.posB);

// ─── Individual node mesh ──────────────────────────────────────────────────────
const HelixNode = ({ node, fixed, onClick }) => {
  const meshRef = useRef();
  const infected = node.infected && !fixed;
  const color = infected ? '#E24B4A' : '#1D9E75';

  useFrame(({ clock }) => {
    if (meshRef.current && infected) {
      const s = 1 + Math.sin(clock.getElapsedTime() * 2 + node.index * 0.55) * 0.12;
      meshRef.current.scale.setScalar(s);
    }
  });

  return (
    <mesh ref={meshRef} position={node.posA} onClick={infected ? onClick : undefined}>
      <sphereGeometry args={[0.15, 12, 12]} />
      <meshPhongMaterial
        color={color}
        emissive={color}
        emissiveIntensity={infected ? 0.3 : 0.1}
        shininess={90}
      />
    </mesh>
  );
};

// ─── Helix scene content ───────────────────────────────────────────────────────
const HelixContent = ({ fixedNodes, onFix }) => {
  const groupRef = useRef();

  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.y = clock.getElapsedTime() * 0.048 * 0.1 * 60;
  });

  const tubeGeoA = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(splineA);
    return new THREE.TubeGeometry(curve, 80, 0.018, 6, false);
  }, []);

  const tubeGeoB = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(splineB);
    return new THREE.TubeGeometry(curve, 80, 0.018, 6, false);
  }, []);

  return (
    <group ref={groupRef}>
      {/* DNA strands (tubes) */}
      <mesh geometry={tubeGeoA}>
        <meshBasicMaterial color="#331122" transparent opacity={0.28} />
      </mesh>
      <mesh geometry={tubeGeoB}>
        <meshBasicMaterial color="#112233" transparent opacity={0.28} />
      </mesh>

      {/* Strand A nodes (infected/clickable) + B nodes (purple) + rungs */}
      {HELIX_DATA.map((node, i) => (
        <group key={i}>
          <HelixNode node={node} fixed={fixedNodes.has(i)} onClick={() => onFix(i)} />

          {/* Strand B node (always purple, not interactive) */}
          <mesh position={node.posB}>
            <sphereGeometry args={[0.11, 10, 10]} />
            <meshPhongMaterial color="#7F77DD" emissive="#080010" shininess={80} />
          </mesh>

          {/* Connecting rung */}
          <lineSegments>
            <bufferGeometry setFromPoints={[node.posA, node.posB]} />
            <lineBasicMaterial color="#1a1a44" transparent opacity={0.45} />
          </lineSegments>
        </group>
      ))}
    </group>
  );
};

// ─── Exported component ────────────────────────────────────────────────────────
const DNAHelixScene = () => {
  const { helix, fixHelixSphere, resetHelix, addXP } = useEquiLens();
  const [fixedNodes, setFixedNodes] = useState(new Set());

  const handleFix = useCallback((index) => {
    setFixedNodes(prev => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      fixHelixSphere();
      addXP(30);
      return next;
    });
  }, [fixHelixSphere, addXP]);

  const handleReset = () => {
    setFixedNodes(new Set());
    resetHelix();
  };

  const infectedCount = HELIX_DATA.filter(n => n.infected).length;
  const fixedCount    = fixedNodes.size;
  const allFixed      = fixedCount >= infectedCount;

  return (
    <div className="flex flex-col h-full gap-2">
      <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'var(--text-muted)' }}>
        3D DNA HELIX — CLICK RED SPHERES TO FIX INFECTED FEATURES
      </p>

      <div style={{ flex: 1, minHeight: '280px', borderRadius: '8px', overflow: 'hidden', background: 'radial-gradient(circle at center, #1a1f2e 0%, #0a0f1c 100%)', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)', cursor: 'pointer' }}>
        <Canvas camera={{ position: [0, 0, 6], fov: 55 }} gl={{ antialias: true, alpha: true }} dpr={[1, 2]}>
          <ambientLight intensity={0.1} color="#111122" />
          <pointLight position={[3, 2, 3]}  intensity={1}   color="#ff3333" />
          <pointLight position={[-3, -2, -3]} intensity={0.8} color="#3333ff" />
          <pointLight position={[0, 5, 0]}  intensity={0.5} color="#ffffff" />
          <HelixContent fixedNodes={fixedNodes} onFix={handleFix} />
        </Canvas>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '0 2px' }}>
        <span style={{ color: 'var(--text-muted)' }}>Total: <b style={{ color: 'var(--text-primary)' }}>{N}</b></span>
        <span style={{ color: '#ff7070' }}>Infected: <b>{infectedCount - fixedCount}</b></span>
        <span style={{ color: '#2ed8a0' }}>Fixed: <b>{fixedCount}</b></span>
      </div>

      <button
        onClick={handleReset}
        style={{
          width: '100%', padding: '8px 16px', borderRadius: '8px', fontFamily: 'inherit',
          fontSize: '11px', fontWeight: 700, cursor: 'pointer', border: '1px solid',
          background: allFixed ? 'rgba(29,158,117,0.12)' : 'rgba(255,255,255,0.04)',
          borderColor: allFixed ? 'rgba(29,158,117,0.3)' : 'rgba(255,255,255,0.08)',
          color: allFixed ? '#2ed8a0' : 'rgba(200,200,224,0.5)',
          letterSpacing: '0.08em', transition: 'all 0.2s',
        }}
      >
        {allFixed ? '✓ ALL FIXED — RESET' : '↺ RESET HELIX'}
      </button>
    </div>
  );
};

export default DNAHelixScene;
