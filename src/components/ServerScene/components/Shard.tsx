"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export function Shard({
  position,
  useWebGPU,
}: {
  position: THREE.Vector3;
  useWebGPU: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 1.8;
    ref.current.position.y =
      position.y + Math.sin(performance.now() * 0.003) * 0.1;
  });

  return (
    <mesh ref={ref} position={position} castShadow receiveShadow>
      <icosahedronGeometry args={[0.6, 0]} />
      {useWebGPU ? (
        <meshStandardNodeMaterial
          color="#6bffef"
          emissive="#52f0ff"
          emissiveIntensity={2}
          metalness={0.3}
          roughness={0.2}
        />
      ) : (
        <meshStandardMaterial
          color="#6bffef"
          emissive="#52f0ff"
          emissiveIntensity={2}
          metalness={0.3}
          roughness={0.2}
        />
      )}
    </mesh>
  );
}
