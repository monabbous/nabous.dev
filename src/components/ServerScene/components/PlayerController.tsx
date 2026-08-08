"use client";

import {
  CapsuleCollider,
  type RapierRigidBody,
  RigidBody,
} from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { DebrisPickTarget, HeldTarget } from "../pickupTypes";

export type PlayerControllerProps = {
  active: boolean;
  bodyRef: React.RefObject<RapierRigidBody | null>;
  lookRef: React.MutableRefObject<{ yaw: number; pitch: number }>;
  touchMoveRef?: React.MutableRefObject<{ x: number; z: number }>;
  touchLookRef?: React.MutableRefObject<{ x: number; y: number }>;
  touchFireRef?: React.MutableRefObject<boolean>;
  useWebGPU: boolean;
  playFootstep: (intensity?: number, position?: THREE.Vector3) => void;
  debrisRegistryRef: React.MutableRefObject<Map<string, DebrisPickTarget>>;
  heldDebrisId: string | null;
  onSetHeldDebrisId: (id: string | null) => void;
  heldTargetRef: React.MutableRefObject<HeldTarget | null>;
  onInteract?: (pos: THREE.Vector3) => void;
  onFire?: (origin: THREE.Vector3, dir: THREE.Vector3) => void;
};

type InputState = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
};

const baseInputState: InputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
};

const KEY_TO_ACTION: Record<string, keyof InputState | "jump" | "interact"> = {
  w: "forward",
  W: "forward",
  ArrowUp: "forward",
  s: "backward",
  S: "backward",
  ArrowDown: "backward",
  a: "left",
  A: "left",
  ArrowLeft: "left",
  d: "right",
  D: "right",
  ArrowRight: "right",
  Shift: "sprint",
  " ": "jump",
  Space: "jump",
  e: "interact",
  E: "interact",
};

const CODE_TO_ACTION: Record<string, keyof InputState | "jump" | "interact"> = {
  KeyW: "forward",
  KeyS: "backward",
  KeyA: "left",
  KeyD: "right",
  ShiftLeft: "sprint",
  ShiftRight: "sprint",
  Space: "jump",
  KeyE: "interact",
};

export function PlayerController({
  active,
  bodyRef,
  lookRef,
  touchMoveRef,
  touchLookRef,
  touchFireRef,
  useWebGPU,
  playFootstep,
  debrisRegistryRef,
  heldDebrisId,
  onSetHeldDebrisId,
  heldTargetRef,
  onInteract,
  onFire,
}: PlayerControllerProps) {
  const activeRef = useRef(active);
  const inputRef = useRef<InputState>({ ...baseInputState });
  const jumpBuffer = useRef(false);
  const interactBuffer = useRef(false);
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const lookInputRef = useRef({ yaw: 0 });
  const moveRef = useRef(new THREE.Vector3());
  const posRef = useRef(new THREE.Vector3());
  const quatRef = useRef(new THREE.Quaternion());
  const upRef = useRef(new THREE.Vector3(0, 1, 0));
  const gamepadPrevRef = useRef({ jump: false, interact: false });
  const shootBuffer = useRef(false);
  const lastFireMs = useRef(0);
  const stepTimerRef = useRef(0);

  const raycasterRef = useRef(new THREE.Raycaster());
  const tmpOriginRef = useRef(new THREE.Vector3());
  const tmpDirRef = useRef(new THREE.Vector3());
  const tmpEulerRef = useRef(new THREE.Euler(0, 0, 0, "YXZ"));

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!activeRef.current) return;
      if (!document.pointerLockElement) return;
      const yawDelta = -event.movementX * 0.0025;
      const pitchDelta = -event.movementY * 0.0025;
      lookInputRef.current.yaw += yawDelta;
      pitchRef.current = THREE.MathUtils.clamp(
        pitchRef.current + pitchDelta,
        -1.2,
        1.2
      );
    };

    const onMouseDown = (event: MouseEvent) => {
      if (!activeRef.current) return;
      if (event.button === 0) shootBuffer.current = true;
    };

    const onMouseUp = (event: MouseEvent) => {
      if (!activeRef.current) return;
      if (event.button === 0) shootBuffer.current = false;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!activeRef.current) return;
      const action = CODE_TO_ACTION[event.code] || KEY_TO_ACTION[event.key];
      if (!action) return;

      if (action === "jump") {
        jumpBuffer.current = true;
      } else if (action === "interact") {
        interactBuffer.current = true;
      } else {
        inputRef.current[action] = true;
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
        event.preventDefault();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!activeRef.current) return;
      const action = CODE_TO_ACTION[event.code] || KEY_TO_ACTION[event.key];
      if (!action) return;

      if (action === "jump") {
        jumpBuffer.current = false;
      } else if (action === "interact") {
        interactBuffer.current = false;
      } else {
        inputRef.current[action] = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!active) {
      inputRef.current = { ...baseInputState };
      jumpBuffer.current = false;
      interactBuffer.current = false;
      stepTimerRef.current = 0;
    }
  }, [active]);

  useFrame((_, dt) => {
    if (!active) return;
    const body = bodyRef?.current;
    if (!body) return;
    const maybeExtra = body as unknown as {
      isValid?: () => boolean;
      isRemoved?: () => boolean;
    };
    const isValid = maybeExtra.isValid?.();
    if (maybeExtra.isRemoved?.() || isValid === false) return;

    try {
      const v = body.linvel();

      // Basic gamepad polling (first connected pad)
      let padX = 0;
      let padZ = 0;
      let padYaw = 0;
      let padPitch = 0;
      let padJump = false;
      let padInteract = false;
      let padFire = false;

      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      if (pads && pads.length) {
        const pad = pads.find((p) => p && p.connected);
        if (pad) {
          padX = Number.isFinite(pad.axes[0]) ? pad.axes[0] : 0;
          padZ = Number.isFinite(pad.axes[1]) ? pad.axes[1] : 0;
          padYaw = Number.isFinite(pad.axes[2]) ? -pad.axes[2] : 0;
          padPitch = Number.isFinite(pad.axes[3]) ? pad.axes[3] : 0;
          padJump = !!pad.buttons?.[0]?.pressed;
          padInteract = !!pad.buttons?.[1]?.pressed;
          padFire = !!pad.buttons?.[7]?.pressed || !!pad.buttons?.[5]?.pressed;
        }
      }

      if (padJump && !gamepadPrevRef.current.jump) jumpBuffer.current = true;
      if (padInteract && !gamepadPrevRef.current.interact) interactBuffer.current = true;
      gamepadPrevRef.current = { jump: padJump, interact: padInteract };

      const input = inputRef.current;
      const touchMove = touchMoveRef?.current;
      let moveX =
        (input.right ? 1 : 0) -
        (input.left ? 1 : 0) +
        padX +
        (touchMove?.x ?? 0);
      let moveZ =
        (input.backward ? 1 : 0) +
        padZ -
        (input.forward ? 1 : 0) +
        (touchMove?.z ?? 0);

      // if (moveX)
      // avoiding moving double speed when moving diagonally
      if (moveZ && moveX) {
        const diag = Math.SQRT1_2; // 1 / sqrt(2) ≈ 0.70710678
        moveX *= diag;
        moveZ *= diag;
      }

      const touchLook = touchLookRef?.current;
      const lookYawDelta =
        lookInputRef.current.yaw +
        padYaw * 2.2 * dt +
        (touchLook?.x ?? 0) * 2.2 * dt;

      yawRef.current = THREE.MathUtils.euclideanModulo(
        yawRef.current + lookYawDelta,
        Math.PI * 2
      );
      pitchRef.current = THREE.MathUtils.clamp(
        pitchRef.current + padPitch * 1.4 * dt - (touchLook?.y ?? 0) * 1.4 * dt,
        -1.2,
        1.2
      );
      lookInputRef.current.yaw = 0;

      lookRef.current.yaw = yawRef.current;
      lookRef.current.pitch = pitchRef.current;

      // Update held target in front of the player (used by DebrisRain to lerp the held item).
      if (heldTargetRef.current) {
        const translation = body.translation();
        tmpOriginRef.current.set(translation.x, translation.y, translation.z);
        tmpOriginRef.current.add(new THREE.Vector3(0, 0.8, 0));

        tmpEulerRef.current.set(pitchRef.current, yawRef.current, 0, "YXZ");
        tmpDirRef.current
          .set(0, 0, -1)
          .applyEuler(tmpEulerRef.current)
          .normalize();

        heldTargetRef.current.position
          .copy(tmpOriginRef.current)
          .addScaledVector(tmpDirRef.current, 1.25);
        heldTargetRef.current.rotation.setFromEuler(tmpEulerRef.current);
      }

      moveRef.current.set(moveX, 0, moveZ);
      const moveLen = moveRef.current.length();
      if (moveLen > 1) moveRef.current.divideScalar(moveLen);

      const speed = (input.sprint ? 9 : 6) * moveLen;
      if (!Number.isFinite(speed)) return;

      quatRef.current.setFromAxisAngle(upRef.current, yawRef.current);
      moveRef.current.applyQuaternion(quatRef.current).multiplyScalar(speed);

      if (Number.isFinite(moveRef.current.x) && Number.isFinite(moveRef.current.z)) {
        // Blend toward target velocity so external impulses (e.g. debris impacts) can still affect the player.
        const accel = input.sprint ? 22 : 18;
        const t = 1 - Math.exp(-accel * dt);
        const vx = THREE.MathUtils.lerp(v.x, moveRef.current.x, t);
        const vz = THREE.MathUtils.lerp(v.z, moveRef.current.z, t);
        body.setLinvel({ x: vx, y: v.y, z: vz }, true);
      }

      if (
        Number.isFinite(quatRef.current.x) &&
        Number.isFinite(quatRef.current.y) &&
        Number.isFinite(quatRef.current.z) &&
        Number.isFinite(quatRef.current.w)
      ) {
        body.setRotation(
          {
            x: quatRef.current.x,
            y: quatRef.current.y,
            z: quatRef.current.z,
            w: quatRef.current.w,
          },
          true
        );
      }

      const translation = body.translation();
      posRef.current.set(translation.x, translation.y, translation.z);

      const grounded = Math.abs(v.y) < 0.05;
      if (jumpBuffer.current && grounded) {
        jumpBuffer.current = false;
        const m = body.mass();
        body.applyImpulse({ x: 0, y: m * 4.5, z: 0 }, true);
      }

      const horizontalSpeed = Math.hypot(moveRef.current.x, moveRef.current.z);
      if (grounded && horizontalSpeed > 0.6) {
        const cadence = input.sprint ? 0.28 : 0.38;
        stepTimerRef.current += dt;
        if (stepTimerRef.current >= cadence) {
          stepTimerRef.current = 0;
          const intensity = Math.min(1.6, 0.4 + horizontalSpeed * 0.08);
          playFootstep(intensity);
        }
      } else {
        stepTimerRef.current = 0;
      }

      const touchFire = touchFireRef?.current;
      const wantFire = shootBuffer.current || !!touchFire || padFire;
      if (onFire && wantFire) {
        const now = performance.now();
        const fireDelay = 120;
        if (now - lastFireMs.current >= fireDelay) {
          lastFireMs.current = now;
          const dir = new THREE.Vector3(0, 0, -1).applyEuler(
            new THREE.Euler(pitchRef.current, yawRef.current, 0, "YXZ")
          );
          const origin = posRef.current.clone().add(new THREE.Vector3(0, 0.6, 0));
          onFire(origin, dir);
        }
      }

      if (interactBuffer.current) {
        // If holding a debris item, drop it.
        if (heldDebrisId) {
          onSetHeldDebrisId(null);
          interactBuffer.current = false;
          return;
        }

        // Try to pick up debris under the crosshair.
        tmpOriginRef.current
          .copy(posRef.current)
          .add(new THREE.Vector3(0, 0.6, 0));
        tmpEulerRef.current.set(pitchRef.current, yawRef.current, 0, "YXZ");
        tmpDirRef.current
          .set(0, 0, -1)
          .applyEuler(tmpEulerRef.current)
          .normalize();

        const objects = Array.from(debrisRegistryRef.current.values()).map(
          (t) => t.object
        );
        raycasterRef.current.ray.origin.copy(tmpOriginRef.current);
        raycasterRef.current.ray.direction.copy(tmpDirRef.current);
        raycasterRef.current.far = 3;

        const hits = raycasterRef.current.intersectObjects(objects, true);
        const first = hits[0];
        if (first) {
          const hitObj = first.object;

          // Find the registered debris whose root object contains the hit object.
          let pickedId: string | null = null;
          for (const entry of debrisRegistryRef.current.values()) {
            let cur: THREE.Object3D | null = hitObj;
            while (cur) {
              if (cur === entry.object) {
                pickedId = entry.id;
                break;
              }
              cur = cur.parent;
            }
            if (pickedId) break;
          }

          if (pickedId) {
            onSetHeldDebrisId(pickedId);
            interactBuffer.current = false;
            return;
          }
        }

        onInteract?.(posRef.current.clone());
        interactBuffer.current = false;
      }
    } catch (e) {
      console.error("Error in PlayerController useFrame:", e);
    }
  });

  return (
    <RigidBody
      ref={bodyRef}
      name="player"
      colliders={false}
      linearDamping={3}
      angularDamping={8}
      restitution={0.05}
      friction={1}
      canSleep={false}
      enabledRotations={[false, true, false]}
      position={[10, 10, 10]}
    >
      <CapsuleCollider args={[0.05, 0.02]} />

      {/* Visuals only: simple stickman */}
      <group scale={0.5}>
        {/* Head */}
        <mesh castShadow receiveShadow position={[0, 2.05, 0]}>
          <sphereGeometry args={[0.42, 16, 16]} />
          {useWebGPU ? (
            <meshStandardNodeMaterial
              color="#7dd3fc"
              metalness={0.1}
              roughness={0.6}
              emissiveIntensity={0.3}
            />
          ) : (
            <meshStandardMaterial
              color="#7dd3fc"
              metalness={0.1}
              roughness={0.6}
              emissiveIntensity={0.3}
            />
          )}
        </mesh>

        {/* Torso */}
        <mesh castShadow receiveShadow position={[0, 1.15, 0]}>
          <cylinderGeometry args={[0.22, 0.26, 1.55, 12]} />
          {useWebGPU ? (
            <meshStandardNodeMaterial
              color="#7dd3fc"
              metalness={0.1}
              roughness={0.6}
              emissiveIntensity={0.3}
            />
          ) : (
            <meshStandardMaterial
              color="#7dd3fc"
              metalness={0.1}
              roughness={0.6}
              emissiveIntensity={0.3}
            />
          )}
        </mesh>

        {/* Arms */}
        <mesh
          castShadow
          receiveShadow
          position={[0, 1.55, 0]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.14, 0.14, 1.55, 10]} />
          {useWebGPU ? (
            <meshStandardNodeMaterial
              color="#7dd3fc"
              metalness={0.1}
              roughness={0.6}
              emissiveIntensity={0.3}
            />
          ) : (
            <meshStandardMaterial
              color="#7dd3fc"
              metalness={0.1}
              roughness={0.6}
              emissiveIntensity={0.3}
            />
          )}
        </mesh>

        {/* Legs */}
        <mesh castShadow receiveShadow position={[-0.22, 0.25, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 1.3, 10]} />
          {useWebGPU ? (
            <meshStandardNodeMaterial
              color="#7dd3fc"
              metalness={0.1}
              roughness={0.6}
              emissiveIntensity={0.3}
            />
          ) : (
            <meshStandardMaterial
              color="#7dd3fc"
              metalness={0.1}
              roughness={0.6}
              emissiveIntensity={0.3}
            />
          )}
        </mesh>
        <mesh castShadow receiveShadow position={[0.22, 0.25, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 1.3, 10]} />
          {useWebGPU ? (
            <meshStandardNodeMaterial
              color="#7dd3fc"
              metalness={0.1}
              roughness={0.6}
              emissiveIntensity={0.3}
            />
          ) : (
            <meshStandardMaterial
              color="#7dd3fc"
              metalness={0.1}
              roughness={0.6}
              emissiveIntensity={0.3}
            />
          )}
        </mesh>
      </group>
    </RigidBody>
  );
}
