"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { getAudioEngine, resumeAudio, updateListener, type AudioVec3 } from "../audioEngine";

export function AudioListenerSync({ active }: { active: boolean }) {
  const { camera } = useThree();

  const pos = useRef(new THREE.Vector3());
  const fwd = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3());

  const asVec3 = useMemo(() => {
    const out: { p: AudioVec3; f: AudioVec3; u: AudioVec3 } = {
      p: { x: 0, y: 0, z: 0 },
      f: { x: 0, y: 0, z: -1 },
      u: { x: 0, y: 1, z: 0 },
    };
    return out;
  }, []);

  useFrame(() => {
    if (!active) return;
    const e = getAudioEngine();
    if (!e) return;

    // Keep audio running once user has interacted (resume is a no-op if already running).
    resumeAudio(true);

    camera.getWorldPosition(pos.current);
    camera.getWorldDirection(fwd.current);
    up.current.set(0, 1, 0).applyQuaternion(camera.quaternion);

    asVec3.p.x = pos.current.x;
    asVec3.p.y = pos.current.y;
    asVec3.p.z = pos.current.z;

    asVec3.f.x = fwd.current.x;
    asVec3.f.y = fwd.current.y;
    asVec3.f.z = fwd.current.z;

    asVec3.u.x = up.current.x;
    asVec3.u.y = up.current.y;
    asVec3.u.z = up.current.z;

    updateListener(asVec3.p, asVec3.f, asVec3.u);
  });

  return null;
}
