import { useCssVarsColors } from "@nabous.dev/providers/ColorsProvider";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/** A soft, shadow-free ember light shared by the rack and the surrounding floor. */
export function PointerGlow({ enabled }: { enabled: boolean }) {
  const colors = useCssVarsColors();
  const light = useRef<THREE.PointLight>(null);
  const rack = useRef<THREE.Object3D | null>(null);
  const active = useRef(false);
  const positioned = useRef(false);
  const { gl, scene } = useThree();
  const scratch = useMemo(() => ({
    pointer: new THREE.Vector2(),
    smoothPointer: new THREE.Vector2(),
    ray: new THREE.Raycaster(),
    plane: new THREE.Plane(),
    normal: new THREE.Vector3(),
    center: new THREE.Vector3(),
    position: new THREE.Vector3(),
  }), []);

  useEffect(() => {
    rack.current = scene.getObjectByName("server-racks") ?? null;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let bounds = gl.domElement.getBoundingClientRect();
    const measure = () => { bounds = gl.domElement.getBoundingClientRect(); };
    const reset = () => { active.current = false; };
    const move = (event: PointerEvent) => {
      if (!enabled || motion.matches || event.pointerType === "touch" || document.pointerLockElement) {
        reset();
        return;
      }
      if (!bounds.width || !bounds.height) return;
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      active.current = x >= 0 && x <= 1 && y >= 0 && y <= 1;
      if (active.current) {
        // Arabic mode mirrors the canvas in CSS, including its lighting.
        const direction = document.documentElement.dir === "rtl" ? -1 : 1;
        scratch.pointer.set((x * 2 - 1) * direction, 1 - y * 2);
      }
    };
    const leave = (event: PointerEvent) => { if (!event.relatedTarget) reset(); };
    const visibility = () => { if (document.hidden) reset(); };
    // The canvas sits behind HTML: listen on the window so text and CTAs don't
    // interrupt the glow. Store input only; no React updates or layout per move.
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerout", leave, { passive: true });
    window.addEventListener("blur", reset);
    window.addEventListener("resize", measure, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("pointerlockchange", reset);
    motion.addEventListener("change", reset);
    const observer = new ResizeObserver(measure);
    observer.observe(gl.domElement);
    return () => {
      reset();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerout", leave);
      window.removeEventListener("blur", reset);
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("pointerlockchange", reset);
      motion.removeEventListener("change", reset);
      observer.disconnect();
    };
  }, [enabled, gl, scene, scratch]);

  // Mounted after the scroll camera so its projection follows the current shot.
  useFrame(({ camera }, delta) => {
    if (!light.current || !rack.current) return;
    const dt = Math.min(delta, 0.05);
    const lit = enabled && active.current;
    light.current.intensity = THREE.MathUtils.damp(light.current.intensity, lit ? 360 : 0, 8, dt);
    if (!lit && light.current.intensity < 0.01) {
      light.current.intensity = 0;
      positioned.current = false;
      return;
    }
    if (!positioned.current) {
      scratch.smoothPointer.copy(scratch.pointer);
      positioned.current = true;
    } else {
      scratch.smoothPointer.lerp(scratch.pointer, 1 - Math.exp(-14 * dt));
    }

    // Project into a plane just in front of the rack. Unlike a fixed world XY
    // mapping, this stays under the cursor through camera orbits and resizing.
    rack.current.localToWorld(scratch.center.set(0, 3.5, 0));
    camera.getWorldDirection(scratch.normal).negate();
    scratch.center.addScaledVector(scratch.normal, 10);
    scratch.plane.setFromNormalAndCoplanarPoint(scratch.normal, scratch.center);
    scratch.ray.setFromCamera(scratch.smoothPointer, camera);
    if (scratch.ray.ray.intersectPlane(scratch.plane, scratch.position)) {
      // Keep the light above the ground even at the bottom of the viewport.
      scratch.position.y = Math.max(-1, scratch.position.y);
      light.current.position.copy(scratch.position);
    }
  });

  return <pointLight ref={light} color={colors.ember} intensity={0} distance={48} decay={2} castShadow={false} />;
}
