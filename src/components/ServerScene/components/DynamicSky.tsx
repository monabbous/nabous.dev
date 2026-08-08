"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function DynamicSky({
  active,
  nightColor,
  dayColor,
  horizonY = -4,
  radius = 100,
  yOffset = 20,
}: {
  active: boolean;
  nightColor: string;
  dayColor: string;
  horizonY?: number;
  radius?: number;
  yOffset?: number;
}) {
  const { scene } = useThree();

  const night = useMemo(() => new THREE.Color(nightColor), [nightColor]);
  const day = useMemo(() => new THREE.Color(dayColor), [dayColor]);

  const tmp = useRef(new THREE.Color());
  const lastActiveRef = useRef<boolean | null>(null);

  useFrame(() => {
    if (!active) {
      // Preserve the pre-game transparent canvas look.
      if (lastActiveRef.current !== false) {
        scene.background = null;
        lastActiveRef.current = false;
      }
      return;
    }

    lastActiveRef.current = true;

    const time = performance.now() * 0.001;
    const sunY = Math.sin(time) * radius + yOffset;
    const day01 = clamp01((sunY - horizonY) / radius);

    tmp.current.copy(night).lerp(day, day01);
    scene.background = tmp.current;
  });

  return null;
}
