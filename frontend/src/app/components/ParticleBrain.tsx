'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

const PARTICLE_COUNT = 8000;
const COLORS = [
  new THREE.Color('#7B3FE4'), // Purple
  new THREE.Color('#FF8A00'), // Yellow/Orange
  new THREE.Color('#00FF88'), // Green
  new THREE.Color('#FFFFFF'), // White
];

function NeuralCore() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const noise3D = createNoise3D();

  // Create initial positions and colors
  const { positions, colors, randoms } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const randoms = new Float32Array(PARTICLE_COUNT);

    const radius = 2.5;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Random point on a sphere using spherical coordinates
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      positions.set([x, y, z], i * 3);

      // Assign a random color from our palette
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      colors.set([color.r, color.g, color.b], i * 3);

      // Random value for individual particle animation offsets
      randoms[i] = Math.random();
    }

    return { positions, colors, randoms };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const time = clock.getElapsedTime();

    // Rotate the entire core slowly
    meshRef.current.rotation.y = time * 0.05;
    meshRef.current.rotation.x = time * 0.02;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3;
      const x = positions[ix];
      const y = positions[ix + 1];
      const z = positions[ix + 2];

      // Use simplex noise to pulsate and deform the sphere to look more organic/brain-like
      const noise = noise3D(x * 0.5 + time * 0.2, y * 0.5, z * 0.5);
      const scaleBase = 1 + noise * 0.3;
      
      dummy.position.set(x * scaleBase, y * scaleBase, z * scaleBase);
      
      // Make the triangles look outward or rotate chaotically
      dummy.rotation.x = time * randoms[i] + randoms[i] * Math.PI * 2;
      dummy.rotation.y = time * randoms[i] * 2;
      
      // Scale down individual particles to be tiny
      const pScale = 0.04 + randoms[i] * 0.04;
      dummy.scale.set(pScale, pScale, pScale);

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <tetrahedronGeometry args={[1, 0]} />
      <meshBasicMaterial vertexColors toneMapped={false} />
      <instancedBufferAttribute attach="instanceColor" args={[colors, 3]} />
    </instancedMesh>
  );
}

function FloatingTriangles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 150;

  const { positions, colors, randoms } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const randoms = new Float32Array(count * 3); // For rotation speeds

    for (let i = 0; i < count; i++) {
      // Spread across a wide volume
      positions.set([
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 10 - 5
      ], i * 3);

      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      // Dimmer colors for background
      colors.set([color.r * 0.3, color.g * 0.3, color.b * 0.3], i * 3);

      randoms.set([Math.random(), Math.random(), Math.random()], i * 3);
    }
    return { positions, colors, randoms };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const time = clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      dummy.position.set(
        positions[ix],
        positions[ix + 1] + Math.sin(time * 0.5 + randoms[ix]) * 2, // Float up and down
        positions[ix + 2]
      );
      dummy.rotation.set(
        time * randoms[ix],
        time * randoms[ix + 1],
        time * randoms[ix + 2]
      );
      
      // Make them bigger but sparse
      const s = 0.15 + randoms[ix] * 0.15;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      {/* Use RingGeometry with 3 segments to create an empty glowing triangle outline */}
      <ringGeometry args={[0.5, 0.6, 3]} />
      <meshBasicMaterial vertexColors side={THREE.DoubleSide} transparent opacity={0.5} />
      <instancedBufferAttribute attach="instanceColor" args={[colors, 3]} />
    </instancedMesh>
  );
}

export default function ParticleBrain() {
  return (
    <div className="w-full h-full absolute inset-0">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={1} />
        <NeuralCore />
        <FloatingTriangles />
      </Canvas>
    </div>
  );
}
