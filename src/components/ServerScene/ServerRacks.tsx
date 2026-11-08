import { useCssVarsColors } from "@nabous.dev/providers/ColorsProvider";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const displays = [
  // x, y, z, width, height, depth, in the rack's original ten-unit scale.
  [-.38, 0, .499, .0625, .0625, .05],
  [-.30, 0, .499, .0625, .0625, .05],
  [-.22, 0, .499, .0625, .0625, .05],
  [-.15, .35, .499, .5, .0125, .01],
  [-.15, .7, .499, .5, .125, .1],
  [.25, .745, .499, .0625, .0625, .05],
  [.33, .665, .499, .0625, .0625, .05],
  [.33, .745, .499, .0625, .0625, .05],
  [.25, .665, .499, .0625, .0625, .05],
];

/** Two shared geometries/materials, two draw calls (+ the casing shadow pass).
 * The parent remains a real Rapier rigid body: instancing changes paint only.
 */
export function ServerRacks({ powerOn = true }: { powerOn?: boolean }) {
  const colors = useCssVarsColors();
  const cases = useRef<THREE.InstancedMesh>(null);
  const lights = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => ({
    casing: new RoundedBoxGeometry(1, .25, 1, 2, .02),
    display: new RoundedBoxGeometry(1, 1, 1, 1, .2),
  }), []);
  const material = useMemo(() => ({
    casing: new THREE.MeshStandardMaterial({ color: colors.board, roughness: .85, metalness: .03, dithering: true }),
    display: new THREE.MeshLambertMaterial({ color: colors.indicator, emissive: colors.indicator,
      emissiveIntensity: powerOn ? 1.6 : .05, toneMapped: false }),
  }), [colors.board, colors.indicator, powerOn]);
  useEffect(() => () => { geometry.casing.dispose(); geometry.display.dispose(); }, [geometry]);
  useEffect(() => () => { material.casing.dispose(); material.display.dispose(); }, [material]);
  useLayoutEffect(() => {
    if (!cases.current || !lights.current) return;
    const transform = new THREE.Object3D();
    for (let index = 0; index < 3; index++) {
      transform.position.set(0, index * .35, 0);
      transform.scale.set(1, 1, 1);
      transform.updateMatrix();
      cases.current.setMatrixAt(index, transform.matrix);
    }
    displays.forEach(([x, y, z, width, height, depth], index) => {
      transform.position.set(x, y, z);
      transform.scale.set(width, height, depth);
      transform.updateMatrix();
      lights.current!.setMatrixAt(index, transform.matrix);
    });
    cases.current.instanceMatrix.needsUpdate = lights.current.instanceMatrix.needsUpdate = true;
    cases.current.computeBoundingSphere();
    lights.current.computeBoundingSphere();
  }, [geometry, material]);
  return <group name="server-racks" position={[10, 0, -10]} scale={10}>
    <instancedMesh ref={cases} args={[geometry.casing, material.casing, 3]} castShadow receiveShadow />
    <instancedMesh ref={lights} args={[geometry.display, material.display, displays.length]} />
  </group>;
}
