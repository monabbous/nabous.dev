"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export function TargetDummy({
  position,
  useWebGPU,
}: {
  position: THREE.Vector3;
  useWebGPU: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 1.6;
  });

  return (
    <mesh ref={ref} position={position} castShadow receiveShadow>
      <icosahedronGeometry args={[1.1, 1]} />
      {useWebGPU ? (
        <meshStandardNodeMaterial
          color="#ff2bd4"
          emissive="#52f0ff"
          emissiveIntensity={2.4}
          metalness={0.4}
          roughness={0.25}
        />
      ) : (
        <meshStandardMaterial
          color="#ff2bd4"
          emissive="#52f0ff"
          emissiveIntensity={2.4}
          metalness={0.4}
          roughness={0.25}
        />
      )}
    </mesh>
  );
}
