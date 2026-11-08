import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useCssVarsColors } from "@nabous.dev/providers/ColorsProvider";

/** A baked window-light pattern grounds the scene without another shadow map.
 * Only the standard tier mounts it; no animation or per-frame texture updates.
 */
export function StudioLight() {
  const colors = useCssVarsColors();
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.shadowBlur = 12;
    context.shadowColor = "white";
    for (let index = 0; index < 3; index++) {
      const gradient = context.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0, "transparent");
      gradient.addColorStop(.3, "rgba(255,255,255,.5)");
      gradient.addColorStop(.7, "rgba(255,255,255,.25)");
      gradient.addColorStop(1, "transparent");
      context.fillStyle = gradient;
      context.fillRect(24 + index * 76, 0, 42, 256);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture?.dispose(), [texture]);
  if (!texture) return null;
  return <group position={[26, -3.98, -15]} rotation={[0, -.55, 0]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
      <planeGeometry args={[130, 110]} />
      <meshBasicMaterial map={texture} color={colors.secondary} transparent opacity={.16} depthWrite={false} />
    </mesh>
  </group>;
}
