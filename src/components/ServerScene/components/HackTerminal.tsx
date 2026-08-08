"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export function HackTerminal({
  position,
  hacked,
  useWebGPU,
}: {
  position: THREE.Vector3;
  hacked: boolean;
  useWebGPU: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.4;
  });

  return (
    <group position={position}>
      <mesh ref={ref} castShadow receiveShadow>
        <boxGeometry args={[1, 1.8, 0.6]} />
        {useWebGPU ? (
          <meshStandardNodeMaterial
            color={hacked ? "#1b1b1f" : "#1a1f3a"}
            emissive={hacked ? "#33ff88" : "#ff2bd4"}
            emissiveIntensity={hacked ? 1.4 : 1.9}
            metalness={0.35}
            roughness={0.3}
          />
        ) : (
          <meshStandardMaterial
            color={hacked ? "#1b1b1f" : "#1a1f3a"}
            emissive={hacked ? "#33ff88" : "#ff2bd4"}
            emissiveIntensity={hacked ? 1.4 : 1.9}
            metalness={0.35}
            roughness={0.3}
          />
        )}
      </mesh>
      <mesh position={[0, 1.1, 0.36]}>
        <planeGeometry args={[0.6, 0.6]} />
        {useWebGPU ? (
          <meshStandardNodeMaterial
            color={hacked ? "#33ff88" : "#52f0ff"}
            emissive={hacked ? "#33ff88" : "#52f0ff"}
            emissiveIntensity={1.5}
            metalness={0.1}
            roughness={0.35}
            transparent
            opacity={0.9}
          />
        ) : (
          <meshStandardMaterial
            color={hacked ? "#33ff88" : "#52f0ff"}
            emissive={hacked ? "#33ff88" : "#52f0ff"}
            emissiveIntensity={1.5}
            metalness={0.1}
            roughness={0.35}
            transparent
            opacity={0.9}
          />
        )}
      </mesh>
    </group>
  );
}
