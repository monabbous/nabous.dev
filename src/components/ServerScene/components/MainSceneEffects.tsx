"use client";

import { PerspectiveCamera, SoftShadows } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import type { RapierRigidBody } from "@react-three/rapier";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { SpotLight } from "three";

const SOFT_SHADOWS_ONCE_KEY = "__nabous_soft_shadows_once__";

function claimSoftShadowsOnce(): boolean {
  const g = globalThis as unknown as Record<string, unknown>;
  if (g[SOFT_SHADOWS_ONCE_KEY] === true) return false;
  g[SOFT_SHADOWS_ONCE_KEY] = true;
  return true;
}

export function MainSceneEffects({
  active,
  playerRef,
  rackPowerOn,
  lookRef,
  rendererKind,
  onTransitChange,
}: {
  active: boolean;
  playerRef: React.RefObject<RapierRigidBody | null>;
  rackPowerOn: boolean;
  lookRef: React.MutableRefObject<{ yaw: number; pitch: number }>;
  rendererKind: "webgpu" | "webgl" | null;
  onTransitChange?: (inTransit: boolean) => void;
}) {
  const { scene, camera } = useThree();

  const shouldMountSoftShadows = useMemo(() => {
    if (rendererKind !== "webgl") return false;
    return claimSoftShadowsOnce();
  }, [rendererKind]);

  const scrollContainer = useMemo(() => {
    if (typeof window === "undefined") return null;
    return document.body;
  }, []);

  const isMobileRef = useRef(false);
  const scrollFractionRef = useRef(0);

  const serverRacksRef = useRef<THREE.Object3D | null>(null);
  const spotLightRef = useRef<SpotLight | null>(null);

  const camTarget = useRef(new THREE.Vector3(150, 100, 150));
  const camFocus = useRef(new THREE.Vector3(0, 0, 0));
  const camFov = useRef(9);
  const strideLength = 1.2;

  const desiredPosRef = useRef(new THREE.Vector3());
  const desiredFocusRef = useRef(new THREE.Vector3());
  const followOffsetRef = useRef(new THREE.Vector3(0, 3, 100));
  const lookAheadRef = useRef(new THREE.Vector3(0, 1.5, -6));
  const upRef = useRef(new THREE.Vector3(0, 1, 0));
  const camShakeRef = useRef(new THREE.Vector3());
  const bobTimeRef = useRef(0);
  const bobAmpRef = useRef(0);

  const pullback01Ref = useRef(1);
  const transitActiveRef = useRef(false);
  const lastReportedTransitRef = useRef<boolean | null>(null);
  const forwardRef = useRef(new THREE.Vector3());
  const headOffsetRef = useRef(new THREE.Vector3(0, 0.9, 0));
  const firstPersonNudgeRef = useRef(new THREE.Vector3(0, 0, 0.15));
  const focusDistRef = useRef(4);

  useEffect(() => {
    // When gameplay activates, run a one-time 3rd-person -> 1st-person camera transit.
    if (active) {
      transitActiveRef.current = true;
      pullback01Ref.current = 1;
    } else {
      transitActiveRef.current = false;
      if (lastReportedTransitRef.current !== false) {
        lastReportedTransitRef.current = false;
        onTransitChange?.(false);
      }
    }
  }, [active, onTransitChange]);

  useEffect(() => {
    if (!scrollContainer) return;

    const onResize = () => {
      isMobileRef.current = window.innerWidth < 768;
    };

    const onScroll = () => {
      const scrollY = scrollContainer.scrollTop || 0;
      const docHeight = scrollContainer.scrollHeight || 0;
      const winHeight = scrollContainer.clientHeight || 0;
      const scrollableHeight = docHeight - winHeight;
      scrollFractionRef.current =
        scrollableHeight > 0 ? scrollY / scrollableHeight : 0;
    };

    onResize();
    onScroll();

    window.addEventListener("resize", onResize, { passive: true });
    scrollContainer.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      scrollContainer?.removeEventListener("scroll", onScroll);
    };
  }, [scrollContainer]);

  useEffect(() => {
    serverRacksRef.current = scene.getObjectByName("server-racks") ?? null;
    spotLightRef.current =
      (scene.getObjectByName("spotLight") as SpotLight) ?? null;
  }, [scene]);

  useFrame((_, dt) => {
    const lerpPos = active ? 0.12 : 0.08;
    const lerpFocus = active ? 0.18 : 0.12;
    let desiredFov = active ? 55 : 9;

    let moveSpeed = 0;

    if (active && playerRef.current) {
      const p = playerRef.current.translation();
      const v = playerRef.current.linvel();
      moveSpeed = Math.hypot(v.x, v.z);
      const grounded = Math.abs(v.y) < 0.5;
      const base = desiredPosRef.current.set(p.x, p.y + 0.4, p.z);

      const yaw = lookRef.current.yaw;
      const pitch = lookRef.current.pitch;

      // One-time transit: ease pullback from 1 -> 0, then stop applying the effect.
      if (transitActiveRef.current) {
        const t = 1 - Math.exp(-2.2 * dt);
        pullback01Ref.current = THREE.MathUtils.lerp(pullback01Ref.current, 0, t);
      } else {
        pullback01Ref.current = 0;
      }

      const targetBob = grounded
        ? THREE.MathUtils.clamp(moveSpeed * 0.004, 0, 0.015)
        : 0;

      desiredFov = active ? 55 + moveSpeed * moveSpeed * 0.15 : 9;
      bobAmpRef.current = THREE.MathUtils.lerp(
        bobAmpRef.current,
        targetBob,
        0.2
      );
      if (bobAmpRef.current > 1e-4) {
        const phaseSpeed = moveSpeed > 0.01 ? moveSpeed / strideLength : 0;
        bobTimeRef.current += phaseSpeed * dt * Math.PI * 2;
        const vertical = Math.sin(bobTimeRef.current * 2) * bobAmpRef.current;
        const lateral = Math.sin(bobTimeRef.current) * bobAmpRef.current * 0.5;
        camShakeRef.current.set(lateral, Math.abs(vertical), 0);
      } else {
        camShakeRef.current.set(0, 0, 0);
      }

      // Forward direction from the current look (includes pitch).
      forwardRef.current
        .set(0, 0, -1)
        .applyEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"))
        .normalize();

      const thirdPersonDist = 4.6;
      const dist = THREE.MathUtils.lerp(0, thirdPersonDist, pullback01Ref.current);

      // Start near 1st-person (slightly forward so we don't sit inside the head),
      // then pull back along the view direction for 3rd-person.
      followOffsetRef.current
        .copy(headOffsetRef.current)
        .addScaledVector(forwardRef.current, firstPersonNudgeRef.current.z)
        .addScaledVector(forwardRef.current, -dist);

      if (lastReportedTransitRef.current !== true) {
        followOffsetRef.current.multiply({
          x: 0,
          y: 1,
          z: 0
        });
      }

      lookAheadRef.current
        .copy(headOffsetRef.current)
        .addScaledVector(forwardRef.current, focusDistRef.current);

      desiredPosRef.current.copy(base).add(followOffsetRef.current);
      desiredPosRef.current.add(camShakeRef.current);
      desiredFocusRef.current.copy(base).add(lookAheadRef.current);
      desiredFocusRef.current.addScaledVector(camShakeRef.current, 0.3);

      // Consider transit complete when the camera has effectively reached the 1st-person pose.
      if (transitActiveRef.current) {
        const closeEnoughPullback = pullback01Ref.current < 0.02;
        const closeEnoughPos = camTarget.current.distanceTo(desiredPosRef.current) < 0.08;
        if (closeEnoughPullback && closeEnoughPos) {
          transitActiveRef.current = false;
        }

        if (lastReportedTransitRef.current !== true) {
          lastReportedTransitRef.current = true;
          onTransitChange?.(true);
        }
      } else if (lastReportedTransitRef.current !== false) {
        lastReportedTransitRef.current = false;
        onTransitChange?.(false);
      }
    } else {
      const t = scrollFractionRef.current;
      const isMobile = isMobileRef.current;
      const idlePos = desiredPosRef.current.set(
        150,
        (isMobile ? 80 : 100) - t * 100,
        150
      );
      const idleFocus = desiredFocusRef.current.set(
        (isMobile ? 23 : 0) - t * -10,
        isMobile ? 5 : 0,
        (isMobile ? 7 : -5) - t * -10
      );
      camTarget.current.lerp(idlePos, 0.06);
      camFocus.current.lerp(idleFocus, 0.06);

      bobAmpRef.current = THREE.MathUtils.lerp(bobAmpRef.current, 0, 0.2);
      camShakeRef.current.set(0, 0, 0);
    }

    camTarget.current.lerp(desiredPosRef.current, lerpPos);
    camFocus.current.lerp(desiredFocusRef.current, lerpFocus);

    camera.position.copy(camTarget.current);
    camera.lookAt(camFocus.current);

    camFov.current = THREE.MathUtils.lerp(camFov.current, desiredFov, 0.08);
    (camera as THREE.PerspectiveCamera).fov = camFov.current;
    camera.updateProjectionMatrix();

    const serverRacks = serverRacksRef.current;
    const spotLight = spotLightRef.current;
    const spotTarget = spotLight?.target;
    if (serverRacks && spotLight && spotTarget) {
      spotLight.position.copy(serverRacks.position);
      spotLight.position.y += 40;

      const targetIntensity = rackPowerOn ? 2000 : 850;
      spotLight.intensity = THREE.MathUtils.lerp(
        spotLight.intensity,
        targetIntensity,
        0.12
      );
      if (spotTarget.parent !== scene) {
        scene.add(spotTarget);
      }
      spotTarget.position.copy(serverRacks.position);
      spotTarget.updateMatrixWorld();
    }
  });

  useFrame(() => {
    const sunGroup = scene.getObjectByName("sun-group");
    const sunLight = scene.getObjectByName(
      "sun-light"
    ) as THREE.DirectionalLight;
    const sunObject = sunGroup?.getObjectByName("sun-object") as THREE.Mesh;
    if (sunGroup && sunLight && sunObject) {
      // sunGroup.visible = false;

      const time = performance.now() * 0.00001;
      const radius = 100;
      const sunX = Math.cos(time) * radius;
      const sunY = Math.sin(time) * radius + 20;
      const sunZ = -0;
      sunGroup.position.set(sunX, sunY, sunZ);
      sunLight.position.copy(sunGroup.position);
      sunLight.lookAt(0, 0, 0);
      sunObject.position.copy(sunGroup.position);

      // Treat the ground plane as the horizon; once the sun goes below it,
      // it should not illuminate objects above the ground.
      // Ground plane in ServerScene is at y = -0.5 * 8 = -4.
      const horizonY = -4;
      const aboveHorizon = sunY - horizonY;
      const day01 = THREE.MathUtils.clamp(aboveHorizon / radius, 0, 1) * 2;

      // Fade in from 0 at the horizon to ~11 at full daylight.
      sunLight.intensity = rackPowerOn ? day01 * (1 + day01 * 1) : 0;
      const mat = sunObject.material as unknown;
      if (mat && typeof mat === "object" && "emissiveIntensity" in mat) {
        (mat as { emissiveIntensity: number }).emissiveIntensity = sunLight.intensity;
      }
    }
  });

  return (
    <>
      <PerspectiveCamera
        makeDefault
        fov={9}
        near={0.1}
        far={500}
        position={[150, 100, 150]}
      />
      {shouldMountSoftShadows && (
        <SoftShadows samples={12} size={20} focus={0.5} />
      )}
    </>
  );
}
