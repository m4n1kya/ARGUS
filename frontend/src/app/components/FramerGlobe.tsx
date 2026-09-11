'use client';

import { useRef, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';

function ExoticGlobe() {
  const globeRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  // Load the 4K textures from the public folder
  const [diffuse, bump, roughness, lights, clouds] = useLoader(THREE.TextureLoader, [
    '/textures/exotic/diffuse.png',
    '/textures/exotic/bump.png',
    '/textures/exotic/roughness.png',
    '/textures/exotic/lights.png',
    '/textures/exotic/clouds.png',
  ]);

  useFrame(() => {
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.001; // Slow rotation
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += 0.0012; // Clouds rotate slightly faster
    }
  });

  return (
    <group>
      {/* Main Planet Sphere */}
      <mesh ref={globeRef}>
        <sphereGeometry args={[2.2, 64, 64]} />
        <meshStandardMaterial
          map={diffuse}
          bumpMap={bump}
          bumpScale={0.02}
          roughnessMap={roughness}
          emissiveMap={lights}
          emissive={new THREE.Color('#ffffff')}
          emissiveIntensity={1}
        />
      </mesh>

      {/* Clouds Sphere (slightly larger) */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[2.23, 64, 64]} />
        <meshStandardMaterial
          map={clouds}
          transparent={true}
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export default function FramerGlobe() {
  return (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center relative cursor-grab active:cursor-grabbing">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <ambientLight intensity={0.2} />
        <directionalLight position={[5, 3, 5]} intensity={2.5} />
        <Suspense fallback={null}>
          <ExoticGlobe />
        </Suspense>
        <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} />
      </Canvas>
    </div>
  );
}
