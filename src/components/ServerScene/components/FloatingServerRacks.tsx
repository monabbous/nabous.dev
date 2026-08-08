"use client";

import { useFrame } from "@react-three/fiber";
import { type RapierRigidBody, RigidBody } from "@react-three/rapier";
import { useRef } from "react";
import * as THREE from "three";

import { ServerRacks } from "../ServerRacks";

export function FloatingServerRacks({ powerOn = true }: { powerOn?: boolean }) {
  const rb = useRef<RapierRigidBody | null>(null);

  const target = useRef(new THREE.Vector3(0, 0, 0));

  const posK = 18;
  const posD = 50;
  const maxForce = 900;

  const uprightK = 300;
  const uprightD = 400;
  const maxTorque = 600;

  const TILT_90_DOT_MAX = 0.12;
  const FIXED_Y_VEL_MAX = 0.03;
  const FIXED_Y_POS_EPS = 0.02;
  const STUCK_FOR_SEC = 4.0;
  const KICK_COOLDOWN = 1.0;

  const jumpImpulse = 6.0;
  const angularKick = 3.5;

  const stuckSeconds = useRef(0);
  const cooldownLeft = useRef(0);
  const lastY = useRef<number | null>(null);

  const q = useRef(new THREE.Quaternion());
  const invQ = useRef(new THREE.Quaternion());
  const desired = useRef(new THREE.Quaternion());
  const delta = useRef(new THREE.Quaternion());
  const euler = useRef(new THREE.Euler());
  const axis = useRef(new THREE.Vector3());
  const force = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3(0, 1, 0));
  const bodyUp = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    const b = rb.current;
    if (!b) return;

    const p = b.translation();
    const v = b.linvel();

    const f = force.current;
    f.set(target.current.x - p.x, target.current.y - p.y, target.current.z - p.z).multiplyScalar(posK);

    f.x -= posD * v.x;
    f.y -= posD * v.y;
    f.z -= posD * v.z;

    const fMag = f.length();
    if (fMag > maxForce) f.multiplyScalar(maxForce / fMag);

    b.addForce({ x: f.x, y: f.y, z: f.z }, true);

    const r = b.rotation();
    const qq = q.current.set(r.x, r.y, r.z, r.w);

    euler.current.setFromQuaternion(qq, "YXZ");

    const targetYaw = 0;
    desired.current.setFromEuler(new THREE.Euler(0, targetYaw, 0, "YXZ"));

    invQ.current.copy(qq).invert();
    delta.current.copy(desired.current).multiply(invQ.current);

    if (delta.current.w < 0) {
      delta.current.x *= -1;
      delta.current.y *= -1;
      delta.current.z *= -1;
      delta.current.w *= -1;
    }

    const w = THREE.MathUtils.clamp(delta.current.w, -1, 1);
    const angle = 2 * Math.acos(w);

    if (angle > 1e-6) {
      const s = Math.sqrt(1 - w * w);
      if (s > 1e-6) {
        axis.current.set(delta.current.x / s, delta.current.y / s, delta.current.z / s);

        const angVel = b.angvel();

        let tx = uprightK * angle * axis.current.x - uprightD * angVel.x;
        let ty = uprightK * angle * axis.current.y - uprightD * angVel.y;
        let tz = uprightK * angle * axis.current.z - uprightD * angVel.z;

        const tMag = Math.hypot(tx, ty, tz);
        if (tMag > maxTorque) {
          const k = maxTorque / tMag;
          tx *= k;
          ty *= k;
          tz *= k;
        }

        b.addTorque({ x: tx, y: ty, z: tz }, true);
      }
    }

    cooldownLeft.current = Math.max(0, cooldownLeft.current - dt);

    if (lastY.current === null) lastY.current = p.y;
    const yDrift = Math.abs(p.y - lastY.current);
    lastY.current = p.y;

    bodyUp.current.set(0, 1, 0).applyQuaternion(qq);
    const uprightDot = bodyUp.current.dot(up.current);

    const isTilted90 = Math.abs(uprightDot) <= TILT_90_DOT_MAX;
    const isFixedY = Math.abs(v.y) <= FIXED_Y_VEL_MAX && yDrift <= FIXED_Y_POS_EPS;

    if (cooldownLeft.current <= 0) {
      stuckSeconds.current = isFixedY && isTilted90 ? stuckSeconds.current + dt : 0;

      if (stuckSeconds.current >= STUCK_FOR_SEC) {
        const m = b.mass();

        b.applyImpulse({ x: 0, y: jumpImpulse * m, z: 0 }, true);

        axis.current.copy(bodyUp.current).cross(up.current);
        if (axis.current.lengthSq() > 1e-6) {
          axis.current.normalize();
          b.applyTorqueImpulse(
            {
              x: axis.current.x * angularKick * m,
              y: axis.current.y * angularKick * m,
              z: axis.current.z * angularKick * m,
            },
            true
          );
        }

        stuckSeconds.current = 0;
        cooldownLeft.current = KICK_COOLDOWN;
      }
    }
  });

  return (
    <RigidBody
      ref={rb}
      colliders="hull"
      linearDamping={0.5}
      angularDamping={2.5}
      restitution={0.1}
      friction={0.6}
    >
      <ServerRacks powerOn={powerOn} />
    </RigidBody>
  );
}
