import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useCssVarsColors } from "@nabous.dev/providers/ColorsProvider";
import { camcorderLampLevel } from "./camcorder-light";

export function CamcorderLight({ enabled, reducedMotion, shadowSize }: { enabled: boolean; reducedMotion: boolean; shadowSize: number }) {
  const colors = useCssVarsColors();
  const lamp = useRef<THREE.SpotLight>(null);
  const started = useRef(0);
  const target = useMemo(() => new THREE.Object3D(), []);
  const offset = useMemo(() => new THREE.Vector3(), []);
  const forward = useMemo(() => new THREE.Vector3(), []);
  const rackCenter = useMemo(() => new THREE.Vector3(10, 0, -10), []);
  useLayoutEffect(() => {
    started.current = performance.now();
    if (lamp.current && !enabled) lamp.current.intensity = 0;
  }, [enabled]);
  useFrame(({ camera, size }) => {
    if (!lamp.current) return;
    const level = camcorderLampLevel((performance.now() - started.current) / 1000, enabled, reducedMotion);
    lamp.current.intensity = 0;
    if (!enabled) return;
    offset.set(.7, -.25, 0).applyQuaternion(camera.quaternion);
    lamp.current.position.copy(camera.position).add(offset);
    camera.getWorldDirection(forward);
    target.position.copy(camera.position).addScaledVector(forward, 240);
    target.updateMatrixWorld();
    const fov = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov);
    // Wider than the camera's horizontal field, with a very soft beam edge.
    lamp.current.angle = Math.max(.12, Math.min(.6, Math.atan(Math.tan(fov / 2) * size.width / size.height) * 1.4));
    const distance = camera.position.distanceToSquared(rackCenter);
    lamp.current.intensity = distance * 3.5 * level;
  });
  return <>
    <primitive object={target} />
    <spotLight ref={lamp} name="camcorder-light" color={colors.light} target={target} visible={enabled}
      intensity={0} penumbra={1} distance={650} decay={2} castShadow={enabled}
      shadow-mapSize={[shadowSize, shadowSize]} shadow-radius={5} shadow-bias={-.0003} />
  </>;
}
