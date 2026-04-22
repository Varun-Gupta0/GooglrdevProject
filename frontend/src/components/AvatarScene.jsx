import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere, MeshDistortMaterial, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

const AICore = ({ fairnessScore }) => {
  const coreRef = useRef();
  const glowRef = useRef();
  const materialRef = useRef();
  const lightRef = useRef();
  
  // State targets based on fairness score
  const targetColor = useMemo(() => {
    if (fairnessScore < 40) return new THREE.Color('#ff2222'); // CRITICAL
    if (fairnessScore <= 70) return new THREE.Color('#f59e0b'); // UNSTABLE
    return new THREE.Color('#22c55e'); // ALIGNED
  }, [fairnessScore]);

  const targetSpeed = fairnessScore < 40 ? 4 : fairnessScore <= 70 ? 2.5 : 1.5;
  const targetDistort = fairnessScore < 40 ? 0.6 : fairnessScore <= 70 ? 0.4 : 0.2;
  const targetIntensity = fairnessScore < 40 ? 6 : fairnessScore <= 70 ? 4 : 2;

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // Smooth transitions for material
    if (materialRef.current) {
      materialRef.current.color.lerp(targetColor, 0.05);
      materialRef.current.emissive.lerp(targetColor, 0.05);
      materialRef.current.speed = THREE.MathUtils.lerp(materialRef.current.speed, targetSpeed, 0.05);
      materialRef.current.distort = THREE.MathUtils.lerp(materialRef.current.distort, targetDistort, 0.05);
    }
    
    // Smooth transitions and pulsing for light
    if (lightRef.current) {
      lightRef.current.color.lerp(targetColor, 0.05);
      const pulseSpeed = fairnessScore < 40 ? 5 : 2;
      const pulse = Math.sin(time * pulseSpeed) * 1.5;
      const currentTargetIntensity = targetIntensity + pulse;
      lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, currentTargetIntensity, 0.1);
    }

    if (coreRef.current) {
      coreRef.current.rotation.y = time * 0.4;
      coreRef.current.rotation.z = time * 0.2;
      
      const scaleSpeed = fairnessScore < 40 ? 4 : 1.5;
      const scaleAmt = fairnessScore < 40 ? 0.08 : 0.04;
      const scale = 1 + Math.sin(time * scaleSpeed) * scaleAmt;
      coreRef.current.scale.set(scale, scale, scale);
    }
    
    if (glowRef.current) {
      const glowScaleSpeed = fairnessScore < 40 ? 5 : 3;
      const glowScaleAmt = fairnessScore < 40 ? 0.2 : 0.1;
      const glowScale = 1.3 + Math.sin(time * glowScaleSpeed) * glowScaleAmt;
      glowRef.current.scale.set(glowScale, glowScale, glowScale);
      glowRef.current.rotation.y = -time * 0.2;
      
      if (glowRef.current.material) {
        glowRef.current.material.color.lerp(targetColor, 0.05);
      }
    }
  });

  return (
    <group>
      {/* Central Core Sphere */}
      <Sphere ref={coreRef} args={[1, 64, 64]}>
        <MeshDistortMaterial
          ref={materialRef}
          color={'#22c55e'}
          speed={1.5}
          distort={0.2}
          radius={1}
          emissive={'#22c55e'}
          emissiveIntensity={0.8}
          roughness={0.1}
          metalness={0.8}
        />
      </Sphere>

      {/* Energy Aura / Glow */}
      <Sphere ref={glowRef} args={[1.1, 32, 32]}>
        <meshBasicMaterial
          color={'#22c55e'}
          transparent
          opacity={0.15}
          wireframe
          blending={THREE.AdditiveBlending}
        />
      </Sphere>

      {/* Point Light for Internal Glow */}
      <pointLight ref={lightRef} intensity={2} color={'#22c55e'} distance={5} />
    </group>
  );
};

const AvatarScene = ({ fairnessScore }) => {
  return (
    <div className="w-full h-full min-h-[300px]">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 4], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <pointLight position={[-10, -10, -10]} color="#3b82f6" intensity={1} />
        
        <Float 
          speed={2} 
          rotationIntensity={1} 
          floatIntensity={1}
          floatingRange={[0.1, 0.3]}
        >
          <AICore fairnessScore={fairnessScore} />
        </Float>
        
        {/* Subtle background glow */}
        <mesh position={[0, 0, -2]}>
          <planeGeometry args={[20, 20]} />
          <meshBasicMaterial color="#000" transparent opacity={0.2} />
        </mesh>
      </Canvas>
    </div>
  );
};

export default AvatarScene;
