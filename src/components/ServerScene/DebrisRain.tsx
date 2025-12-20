import { useFrame } from "@react-three/fiber";
import { RapierRigidBody, RigidBody } from "@react-three/rapier";
import React, { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { ScreenMaterial } from "./ServerRacks";
import { useCssVarsColors } from "@nabous.dev/providers/ColorsProvider";

// If you want to reuse your own material:
// import { screenMaterial } from "./ServerRacks";

export type Debris = {
  id: string;
  kind: "box" | "sphere" | "capsule";
  size: [number, number, number]; // used for box
  radius: number; // used for sphere/capsule
  height: number; // used for capsule
  position: [number, number, number];
  rotation: [number, number, number];
  linvel: [number, number, number];
  angvel: [number, number, number];
  bornAt: number;
  lifeMs: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// A slightly cheeky ease that "pops" in.
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// A matching ease that "sucks" out.
const easeInBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return c3 * t * t * t - c1 * t * t;
};

export function DebrisRain({
  center = new THREE.Vector3(0, 0, 0),
  spawnY = 12,
  radius = 8,
  ratePerSecond = 2.2,
  maxAlive = 2,
  // Warp timings
  warpInMs = 250,
  warpOutMs = 350,
  // Physics defaults
  mass = 100,
}: {
  center?: THREE.Vector3;
  spawnY?: number;
  radius?: number;
  ratePerSecond?: number;
  maxAlive?: number;
  warpInMs?: number;
  warpOutMs?: number;
  mass?: number;
}) {
  const [items, setItems] = useState<Debris[]>([]);
  const acc = useRef(0);
  const nowRef = useRef(0);

  const rng = useMemo(() => Math.random, []);

  useFrame((_, dt) => {
    const now = performance.now();
    nowRef.current = now;

    // Despawn old debris
    setItems((prev) => prev.filter((d) => now - d.bornAt < d.lifeMs));

    // Spawn control (frame-rate independent)
    acc.current += dt * ratePerSecond;

    // If we already have too many alive, stop spawning.
    // Note: items.length here is from the last render. That’s okay; we’re conservative.
    if (items.length >= maxAlive) {
      acc.current = Math.min(acc.current, 1);
      return;
    }

    while (acc.current >= 1 && items.length < maxAlive) {
      acc.current -= 1;

      const kindRoll = rng();
      const kind: Debris["kind"] =
        kindRoll < 0.55 ? "box" : kindRoll < 0.85 ? "sphere" : "capsule";

      const x = center.x + (rng() * 2 - 1) * radius;
      const z = center.z + (rng() * 2 - 1) * radius;
      const y = center.y + spawnY + rng() * 2;

      const baseSize = 1 + rng() * 0.25; // small bits
      const size: [number, number, number] = [
        baseSize * (0.7 + rng() * 1.2),
        baseSize * (0.7 + rng() * 1.2),
        baseSize * (0.7 + rng() * 1.2),
      ];

      const radiusVal = baseSize * (0.6 + rng() * 0.8);
      const heightVal = baseSize * (1.0 + rng() * 2.0);

      const d: Debris = {
        id: `${now}-${rng().toString(16).slice(2)}`,
        kind,
        size,
        radius: radiusVal,
        height: heightVal,
        position: [x, y, z],
        rotation: [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI],
        linvel: [(rng() * 2 - 1) * 1.5, 0, (rng() * 2 - 1) * 1.5],
        angvel: [(rng() * 2 - 1) * 6, (rng() * 2 - 1) * 6, (rng() * 2 - 1) * 6],
        bornAt: now,
        lifeMs: 9000 + rng() * 4000, // 9–13s
      };

      setItems((prev) => (prev.length < maxAlive ? [...prev, d] : prev));
    }
  });

  return (
    <>
      {items.map((d) => (
        <DebrisItem
          key={d.id}
          d={d}
          nowRef={nowRef}
          warpInMs={warpInMs}
          warpOutMs={warpOutMs}
          mass={mass}
        />
      ))}
    </>
  );
}

function DebrisItem({
  d,
  nowRef,
  warpInMs,
  warpOutMs,
  mass,
}: {
  d: Debris;
  nowRef: React.MutableRefObject<number>;
  warpInMs: number;
  warpOutMs: number;
  mass: number;
}) {
  const colors = useCssVarsColors();
  const rb = useRef<RapierRigidBody | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const lightRef = useRef<THREE.PointLight | null>(null);
  const applied = useRef(false);

  const baseIntensity = 30 + 30 * (mass / 25);

  useFrame(() => {
    const b = rb.current;
    const m = meshRef.current;
    if (!b || !m) return;

    // Apply initial velocities once
    if (!applied.current) {
      applied.current = true;
      b.setLinvel({ x: d.linvel[0], y: d.linvel[1], z: d.linvel[2] }, true);
      b.setAngvel({ x: d.angvel[0], y: d.angvel[1], z: d.angvel[2] }, true);
    }

    const now = nowRef.current || performance.now();
    const age = now - d.bornAt;
    const remaining = d.lifeMs - age;

    // --- Visual warp in/out via mesh scaling ---
    let s = 1;

    // Warp IN
    if (age < warpInMs) {
      const t = clamp01(age / warpInMs);
      s = easeOutBack(t);
    }

    // Warp OUT
    if (remaining < warpOutMs) {
      const t = clamp01(1 - remaining / warpOutMs);
      const falloff = Math.pow(1 - easeInBack(t), 1.45);
      const overshoot = 1 + 0.6 * Math.sin(t * Math.PI * 1.3);
      const flicker = clamp01(
        0.85 + 0.25 * Math.sin((now + d.bornAt) * 0.02 + t * 10)
      );
      s *= falloff * overshoot * flicker;
      s = Math.max(0, s);

      if (s < 0.05) {
        b.setLinvel({ x: 0, y: 0, z: 0 }, true);
        b.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
    }

    m.scale.setScalar(s);
    if (lightRef.current) {
      (
        meshRef.current!.material as THREE.MeshStandardMaterial
      ).emissiveIntensity =
        (lightRef.current.intensity = baseIntensity * s) / 100;
    }
  });

  return (
    <RigidBody
      ref={rb}
      colliders={
        d.kind === "box" ? "cuboid" : d.kind === "sphere" ? "ball" : "hull"
      }
      position={d.position}
      rotation={d.rotation}
      linearDamping={0.15}
      angularDamping={0.2}
      restitution={0.15}
      friction={0.8}
      mass={mass}
      ccd
    >
      <group castShadow receiveShadow>
        <mesh ref={meshRef}>
          {d.kind === "box" ? (
            <boxGeometry args={d.size} />
          ) : d.kind === "sphere" ? (
            <sphereGeometry args={[d.radius, 16, 16]} />
          ) : (
            <capsuleGeometry args={[d.radius, d.height, 6, 12]} />
          )}

          {/* Swap this for your material if you want */}
          <ScreenMaterial />
        </mesh>

        <pointLight
          ref={lightRef}
          color={colors.accent}
          intensity={baseIntensity}
          distance={100}
          decay={1.5}
          position={[0, 0, 0]}
          castShadow
          shadow-mapSize-width={256}
          shadow-mapSize-height={256}
        />
      </group>
    </RigidBody>
  );
}
