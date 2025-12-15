import { useFrame, useThree } from "@react-three/fiber";
import React, { useMemo, useRef } from "react";
import * as THREE from "three";

export function MouseSpotLight({
  color = "#ff0000",
  intensity = 45,
  distance = 45,
  angle = 0.35,
  penumbra = 0.85,
  decay = 2,
  backOffset = 12,
  targetDistance = 40,
}: {
  color?: THREE.ColorRepresentation;
  intensity?: number;
  distance?: number;
  angle?: number;
  penumbra?: number;
  decay?: number;
  backOffset?: number;
  targetDistance?: number;
}) {
  const light = useRef<THREE.SpotLight>(null);
  const target = useRef<THREE.Object3D>(null);
  const { camera, mouse } = useThree();

  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  useFrame(() => {
    if (!light.current || !target.current) return;

    raycaster.setFromCamera(mouse, camera);

    // Target where the mouse points in world space
    const aimPoint = raycaster.ray.origin
      .clone()
      .add(raycaster.ray.direction.clone().multiplyScalar(targetDistance));

    target.current.position.copy(aimPoint);

    // Light slightly behind camera (head-mounted feel)
    const lightPos = camera.position
      .clone()
      .add(raycaster.ray.direction.clone().multiplyScalar(-backOffset));

    light.current.position.copy(lightPos);
    light.current.target = target.current;
    light.current.target.updateMatrixWorld();
  });

  return (
    <>
      <spotLight
        ref={light}
        color={color}
        intensity={intensity}
        distance={distance}
        angle={angle}
        penumbra={penumbra}
        decay={decay}
        castShadow={false}
      />
      <object3D ref={target} />
    </>
  );
}
