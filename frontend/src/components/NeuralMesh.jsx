import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// ─── Stable node data (18 nodes — seeded positions) ───────────────────────────
const NODE_BIAS = [0.92, 0.82, 0.76, 0.70, 0.64, 0.58, 0.52, 0.44, 0.38, 0.31, 0.24, 0.18, 0.88, 0.78, 0.11, 0.14, 0.06, 0.73];

const NODE_POSITIONS = NODE_BIAS.map((_, i) => {
  // Deterministic positions using golden-ratio angles
  const phi   = Math.acos(1 - 2 * (i + 0.5) / NODE_BIAS.length);
  const theta = Math.PI * (1 + Math.sqrt(5)) * i;
  const r     = 2.4;
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta) * 0.7, // flatten a bit
    r * Math.cos(phi) * 0.6
  );
});

// Pre-compute edges (pairs closer than 2.7 units)
const EDGES = [];
for (let a = 0; a < NODE_POSITIONS.length; a++) {
  for (let b = a + 1; b < NODE_POSITIONS.length; b++) {
    if (NODE_POSITIONS[a].distanceTo(NODE_POSITIONS[b]) < 2.7) {
      EDGES.push(NODE_POSITIONS[a].clone(), NODE_POSITIONS[b].clone());
    }
  }
}

const nodeColor = (bias) => bias > 0.6 ? '#E24B4A' : bias > 0.35 ? '#EF9F27' : '#1D9E75';

// ─── Network scene content ─────────────────────────────────────────────────────
const NeuralContent = () => {
  const groupRef = useRef();
  const meshRefs = useRef([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.00025 * 60; // matches HTML t*.00025
      groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.12;
    }
    // Pulse biased nodes
    meshRefs.current.forEach((m, i) => {
      if (m && NODE_BIAS[i] > 0.35) {
        const s = 1 + Math.sin(t * 2 + i * 0.72) * 0.18 * NODE_BIAS[i];
        m.scale.setScalar(s);
      }
    });
  });

  return (
    <group ref={groupRef}>
      {/* Nodes */}
      {NODE_POSITIONS.map((pos, i) => {
        const bias = NODE_BIAS[i];
        const color = nodeColor(bias);
        const radius = 0.14 + bias * 0.06;
        return (
          <mesh
            key={i}
            ref={el => meshRefs.current[i] = el}
            position={pos}
          >
            <sphereGeometry args={[radius, 12, 12]} />
            <meshPhongMaterial
              color={color}
              emissive={color}
              emissiveIntensity={bias > 0.6 ? 0.9 : 0.45}
              shininess={100}
            />
          </mesh>
        );
      })}

      {/* Edges */}
      <lineSegments>
        <bufferGeometry setFromPoints={EDGES} />
        <lineBasicMaterial color="#7F77DD" transparent opacity={0.8} />
      </lineSegments>
    </group>
  );
};

const NeuralNetworkScene = () => {
  const biasedCount = NODE_BIAS.filter(v => v > 0.6).length;

  return (
    <div className="w-full flex flex-col gap-2">
      <div style={{ height: '255px', borderRadius: '8px', overflow: 'hidden', background: 'radial-gradient(circle at center, #1a1f2e 0%, #0a0f1c 100%)', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)' }}>
        <Canvas camera={{ position: [0, 0, 5.8], fov: 60 }} gl={{ antialias: true, alpha: true }} dpr={[1, 2]}>
          <ambientLight intensity={0.25} color="#ffffff" />
          <pointLight position={[5, 5, 5]}  intensity={2.0} color="#7F77DD" />
          <pointLight position={[-5, -3, -5]} intensity={1.2} color="#ff4d4d" />
          <NeuralContent />
          <OrbitControls enableZoom={false} rotateSpeed={0.6} />
        </Canvas>
      </div>

      <div style={{ display: 'flex', gap: '16px', fontSize: '10px', color: 'var(--text-muted)' }}>
        <span>● <span style={{ color: '#ff7070' }}>RED</span> = Biased</span>
        <span>● <span style={{ color: '#ffb74d' }}>AMBER</span> = Suspicious</span>
        <span>● <span style={{ color: '#2ed8a0' }}>GREEN</span> = Fair</span>
        <span style={{ marginLeft: 'auto' }}>
          {NODE_BIAS.length} nodes · {EDGES.length / 2} edges · <span style={{ color: '#ff7070' }}>{biasedCount} biased</span>
        </span>
      </div>
    </div>
  );
};

export default NeuralNetworkScene;
