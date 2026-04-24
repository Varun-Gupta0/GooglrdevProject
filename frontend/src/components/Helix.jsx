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
        emissiveIntensity={infected ? 0.8 : 0.45}
        shininess={120}
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
            <meshPhongMaterial 
              color="#7F77DD" 
              emissive="#7F77DD" 
              emissiveIntensity={0.5} 
              shininess={100} 
            />
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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      gap: 8,
    }}>
      <p style={{
        fontSize: 9,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        fontWeight: 700,
        color: 'var(--text-muted)',
        margin: 0,
        flexShrink: 0,
      }}>
        Bias DNA Visualizer — Click red nodes to fix
      </p>

      {/* Canvas wrapper — flex center ensures Three.js canvas is always centered */}
      <div style={{
        flex: 1,
        minHeight: 240,
        maxHeight: 380,
        borderRadius: 12,
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 40%, #1c2642 0%, #0a0e1a 70%, #05070f 100%)',
        boxShadow: 'inset 0 0 60px rgba(0,0,0,0.9), 0 0 30px rgba(28,38,66,0.4)',
        border: '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
      }}>
        <Canvas
          camera={{ position: [0, 0, 6], fov: 55 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 1.5]}
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <ambientLight intensity={0.3} color="#ffffff" />
          <pointLight position={[3,   2,  3]} intensity={2.2} color="#ff4d4d" />
          <pointLight position={[-3, -2, -3]} intensity={1.8} color="#4d4dff" />
          <pointLight position={[0,   5,  0]} intensity={1.0} color="#ffffff" />
          <HelixContent fixedNodes={fixedNodes} onFix={handleFix} />
        </Canvas>

        {/* Overlay label */}
        {allFixed && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            borderRadius: 12,
            flexDirection: 'column',
            gap: 8,
            animation: 'helix-fadein 0.4s ease',
          }}>
            <div style={{ fontSize: 32 }}>✅</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#2ed8a0' }}>All nodes fixed!</div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 11,
        padding: '0 2px',
        flexShrink: 0,
      }}>
        <span style={{ color: 'var(--text-muted)' }}>
          Total: <b style={{ color: 'var(--text-primary)' }}>{N}</b>
        </span>
        <span style={{ color: '#ff7070' }}>
          Biased: <b>{infectedCount - fixedCount}</b>
        </span>
        <span style={{ color: '#2ed8a0' }}>
          Fixed: <b>{fixedCount}</b>
        </span>
      </div>

      {/* Reset button */}
      <button
        onClick={handleReset}
        style={{
          width: '100%', padding: '8px 16px', borderRadius: 8,
          fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
          cursor: 'pointer', border: '1px solid',
          letterSpacing: '0.06em', transition: 'all 0.2s', flexShrink: 0,
          background:   allFixed ? 'rgba(29,158,117,0.12)' : 'rgba(255,255,255,0.04)',
          borderColor:  allFixed ? 'rgba(29,158,117,0.3)'  : 'rgba(255,255,255,0.08)',
          color:        allFixed ? '#2ed8a0'                : 'rgba(200,200,224,0.5)',
        }}
      >
        {allFixed ? '✓ ALL FIXED — RESET' : '↺ RESET HELIX'}
      </button>

      <style>{`
        @keyframes helix-fadein { from{opacity:0} to{opacity:1} }
      `}</style>
    </div>
  );
};

export default DNAHelixScene;
