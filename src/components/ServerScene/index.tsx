"use client";

import { useCssVarsColors } from "@nabous.dev/providers/ColorsProvider";
import { Environment, PerspectiveCamera, SoftShadows } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  CapsuleCollider,
  CuboidCollider,
  Physics,
  RapierRigidBody,
  RigidBody,
} from "@react-three/rapier";
import { Color } from "lamina";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { FrontSide, PCFSoftShadowMap, SpotLight, Vector3 } from "three";
import { DebrisRain } from "./DebrisRain";
import { PostFX } from "./PostFx";
import { ServerRacks } from "./ServerRacks";

const RACK_TARGET = new Vector3(10, 0, -10);
const SHARD_POSITIONS: Vector3[] = [
  // new Vector3(-6, 0.4, 12),
  // new Vector3(12, 0.45, 6),
  // new Vector3(16, 0.5, -6),
  // new Vector3(-2, 0.5, -12),
  // new Vector3(8, 0.6, -16),
];

const TERMINAL_POSITIONS: Vector3[] = [
  // new Vector3(4, 0.5, 2),
  // new Vector3(14, 0.5, -2),
];

type ServerSceneProps = {
  play: boolean;
  paused: boolean;
  touchMoveRef?: React.MutableRefObject<{ x: number; z: number }>;
  touchLookRef?: React.MutableRefObject<{ x: number; y: number }>;
  touchFireRef?: React.MutableRefObject<boolean>;
  onScore?: (delta: number) => void;
  onObjectives?: (data: {
    shards: number;
    totalShards: number;
    hacks: number;
    totalHacks: number;
    rackPowerOn: boolean;
  }) => void;
};

export function ServerScene({
  play,
  paused,
  touchMoveRef,
  touchLookRef,
  touchFireRef,
  onScore,
  onObjectives,
}: ServerSceneProps) {
  const colors = useCssVarsColors();
  const [rackPowerOn, setRackPowerOn] = useState(true);
  const [collectedShards, setCollectedShards] = useState<boolean[]>(() =>
    SHARD_POSITIONS.map(() => false),
  );
  const [hackedTerminals, setHackedTerminals] = useState<boolean[]>(() =>
    TERMINAL_POSITIONS.map(() => false),
  );
  const [targets, setTargets] = useState<
    { pos: THREE.Vector3; alive: boolean }[]
  >(() =>
    [
      // new THREE.Vector3(12, 1.2, -6),
      // new THREE.Vector3(-4, 1.0, 10),
      // new THREE.Vector3(6, 1.1, 14),
      // new THREE.Vector3(14, 1.0, 6),
    ].map((p) => ({ pos: p, alive: true })),
  );
  const playerRef = useRef<RapierRigidBody | null>(null);
  const lookRef = useRef({ yaw: 0, pitch: 0 });
  const isGameActive = play && !paused;
  const neonMagenta = "#ff2bd4";
  const neonCyan = "#32f8ff";
  const bgCyber = "#05040d";

  useEffect(() => {
    if (!onObjectives) return;
    onObjectives({
      shards: collectedShards.filter(Boolean).length,
      totalShards: SHARD_POSITIONS.length,
      hacks: hackedTerminals.filter(Boolean).length,
      totalHacks: TERMINAL_POSITIONS.length,
      rackPowerOn,
    });
  }, [collectedShards, hackedTerminals, onObjectives, rackPowerOn]);

  // const bgColor = useMemo(
  //   () =>
  //     typeof window === "undefined"
  //       ? ""
  //       : getComputedStyle(document.body)?.backgroundColor,
  //   []
  // );

  return (
    <>
      <Canvas
        id="server-scene-canvas"
        dpr={[1, 1.8]}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.AgXToneMapping, // Best for dynamic range
          toneMappingExposure: 1.1, // Adjust overall brightness/contrast
        }}
        resize={{
          scroll: true,
        }}
        style={{
          width: "100vw",
          height: "100vh",
          background: "black",
        }}
        scene={{
          scale: new Vector3(1, 1, 1),
        }}
        shadows={{
          enabled: true,
          type: PCFSoftShadowMap,
        }}
      >
        <Physics
          gravity={[0, -9.8, 0]} // m/s²
          timeStep="vary"
          maxCcdSubsteps={2}
        >
          {/* <OrbitControls /> */}
          <group name={"sun-group"} position={[0, 10, -100]}>
            <directionalLight
              name={"sun-light"}
              color={"white"}
              intensity={20}
              // intensity={0}
              // castShadow
              // visible={false}
            />
            <mesh name={"sun-object"}>
              <sphereGeometry args={[5, 32, 32]} />
              <meshLambertMaterial emissive={"white"} emissiveIntensity={20} />
            </mesh>
          </group>
          <pointLight
            color={isGameActive ? neonCyan : "white"}
            intensity={isGameActive ? 0 : 10000}
            // intensity={0}
            position={[10, 100, -10]}
            // castShadow
            // visible={false}
          />
          <spotLight
            color={isGameActive ? neonMagenta : "white"}
            intensity={isGameActive ? 0 : 2000}
            // intensity={0}
            position={[30, 80, 30]}
            angle={1.8}
            penumbra={0.9}
            distance={600}
            decay={2}
            castShadow
            shadow-mapSize={[1536, 1536]}
            shadow-radius={18}
            // shadow-bias={-0.0002}
            // shadow-normalBias={0.03}
            name="spotLight"
            // visible={false}
          />
          <ambientLight
            intensity={isGameActive ? 0 : 1.75}
            color={isGameActive ? "#6af" : "white"}
          />
          <directionalLight
            color={isGameActive ? neonCyan : "white"}
            intensity={isGameActive ? 0 : 1}
            position={[10, 0, -10]}
          />
          <directionalLight
            color={isGameActive ? neonMagenta : "white"}
            intensity={isGameActive ? 0 : 0.5}
            position={[0, 0, 100]}
          />

          <CuboidCollider args={[200, 1, 200]} position={[-10, -5, 0]} />

          {/* <RigidBody type="fixed" restitution={0.5} friction={0.5}> */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[-10, -0.5 * 8, 0]}
            receiveShadow
            castShadow
            name="server-scene-ground-mesh"
          >
            <planeGeometry args={[1000, 1000]} />
            <meshLambertMaterial
              name="server-scene-ground-material"
              opacity={1}
              transparent
              side={FrontSide}
              emissiveIntensity={0}
              color={isGameActive ? bgCyber : colors.background}
              emissive={isGameActive ? neonMagenta : colors.background}
              dithering
            />
          </mesh>
          {/* </RigidBody> */}
          {/* <Float
            enabled={false}
            speed={10} // Animation speed, defaults to 1
            rotationIntensity={0.2} // XYZ rotation intensity, defaults to 1
            floatIntensity={1} // Up/down float intensity, works like a multiplier with floatingRange,defaults to 1
            floatingRange={[-1, 1]} // Range of y-axis values the object will float within, defaults to [-0.1,0.1]
          >
            <RigidBody name="server-racks">
              <ServerRacks />
            </RigidBody>
          </Float> */}
          <FloatingServerRacks powerOn={rackPowerOn} />

          {SHARD_POSITIONS.map((pos, i) =>
            collectedShards[i] ? null : (
              <Shard key={`shard-${i}`} position={pos} />
            ),
          )}

          {TERMINAL_POSITIONS.map((pos, i) => (
            <HackTerminal
              key={`term-${i}`}
              position={pos}
              hacked={hackedTerminals[i]}
            />
          ))}

          {targets.map((t, i) =>
            t.alive ? (
              <TargetDummy key={`target-${i}`} position={t.pos} />
            ) : null,
          )}

          <PlayerController
            active={play && !paused}
            bodyRef={playerRef}
            lookRef={lookRef}
            touchMoveRef={touchMoveRef}
            touchLookRef={touchLookRef}
            touchFireRef={touchFireRef}
            onInteract={(pos) => {
              let handled = false;

              // Toggle racks if close
              if (pos.distanceTo(RACK_TARGET) < 10) {
                setRackPowerOn((prev) => !prev);
                handled = true;
              }

              // Collect shards
              SHARD_POSITIONS.forEach((p, idx) => {
                if (!collectedShards[idx] && pos.distanceTo(p) < 1.4) {
                  setCollectedShards((prev) => {
                    const next = [...prev];
                    next[idx] = true;
                    return next;
                  });
                  handled = true;
                }
              });

              // Hack terminals
              TERMINAL_POSITIONS.forEach((p, idx) => {
                if (!hackedTerminals[idx] && pos.distanceTo(p) < 2) {
                  setHackedTerminals((prev) => {
                    const next = [...prev];
                    next[idx] = true;
                    return next;
                  });
                  handled = true;
                }
              });

              if (!handled && onObjectives) {
                // still update HUD even if nothing new
                onObjectives({
                  shards: collectedShards.filter(Boolean).length,
                  totalShards: SHARD_POSITIONS.length,
                  hacks: hackedTerminals.filter(Boolean).length,
                  totalHacks: TERMINAL_POSITIONS.length,
                  rackPowerOn,
                });
              }
            }}
            onFire={(origin, dir) => {
              // hitscan against targets
              const rayOrigin = origin.clone();
              const rayDir = dir.clone().normalize();
              let hitIndex: number | null = null;
              targets.forEach((t, idx) => {
                if (!t.alive) return;
                const toCenter = t.pos.clone().sub(rayOrigin);
                const proj = toCenter.dot(rayDir);
                if (proj < 0 || proj > 120) return;
                const closestPoint = rayOrigin
                  .clone()
                  .addScaledVector(rayDir, proj);
                const distSq = closestPoint.distanceToSquared(t.pos);
                const radius = 1.3;
                if (distSq <= radius * radius) {
                  hitIndex = idx;
                }
              });
              if (hitIndex !== null) {
                setTargets((prev) => {
                  const next = prev.map((t, i) =>
                    i === hitIndex ? { ...t, alive: false } : t,
                  );
                  return next;
                });
                if (onScore) onScore(10);
                setTimeout(() => {
                  setTargets((prev) => {
                    const next = [...prev];
                    const target = next[hitIndex!];
                    if (target) next[hitIndex!] = { ...target, alive: true };
                    return next;
                  });
                }, 4000);
              }
            }}
          />
          <DebrisRain
            warpInMs={1000}
            maxAlive={isGameActive ? 10 : 2}
            center={new Vector3(10, 50, -10)}
            radius={isGameActive ? 50 : undefined}
            ratePerSecond={isGameActive ? 10 : 2}
          />

          <MainSceneEffects
            active={play && !paused}
            playerRef={playerRef}
            rackPowerOn={rackPowerOn}
            lookRef={lookRef}
          />
          <PostFX />
          <Environment background resolution={64}>
            <mesh scale={100}>
              <sphereGeometry args={[1, 64, 64]} />
              <Color
                color={isGameActive ? bgCyber : colors.background}
                alpha={1}
                mode="normal"
              />
            </mesh>
          </Environment>
        </Physics>
      </Canvas>
    </>
  );
}

const Shard = ({ position }: { position: THREE.Vector3 }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 1.8;
    ref.current.position.y =
      position.y + Math.sin(performance.now() * 0.003) * 0.1;
  });

  return (
    <mesh ref={ref} position={position} castShadow receiveShadow>
      <icosahedronGeometry args={[0.6, 0]} />
      <meshStandardMaterial
        color="#6bffef"
        emissive="#52f0ff"
        emissiveIntensity={2}
        metalness={0.3}
        roughness={0.2}
      />
    </mesh>
  );
};

const HackTerminal = ({
  position,
  hacked,
}: {
  position: THREE.Vector3;
  hacked: boolean;
}) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.4;
  });

  return (
    <group position={position}>
      <mesh ref={ref} castShadow receiveShadow>
        <boxGeometry args={[1, 1.8, 0.6]} />
        <meshStandardMaterial
          color={hacked ? "#1b1b1f" : "#1a1f3a"}
          emissive={hacked ? "#33ff88" : "#ff2bd4"}
          emissiveIntensity={hacked ? 1.4 : 1.9}
          metalness={0.35}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 1.1, 0.36]}>
        <planeGeometry args={[0.6, 0.6]} />
        <meshStandardMaterial
          color={hacked ? "#33ff88" : "#52f0ff"}
          emissive={hacked ? "#33ff88" : "#52f0ff"}
          emissiveIntensity={1.5}
          metalness={0.1}
          roughness={0.35}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
};

const TargetDummy = ({ position }: { position: THREE.Vector3 }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 1.6;
  });

  return (
    <mesh ref={ref} position={position} castShadow receiveShadow>
      <icosahedronGeometry args={[1.1, 1]} />
      <meshStandardMaterial
        color="#ff2bd4"
        emissive="#52f0ff"
        emissiveIntensity={2.4}
        metalness={0.4}
        roughness={0.25}
      />
    </mesh>
  );
};

const MainSceneEffects = ({
  active,
  playerRef,
  rackPowerOn,
  lookRef,
}: {
  active: boolean;
  playerRef: React.RefObject<RapierRigidBody | null>;
  rackPowerOn: boolean;
  lookRef: React.MutableRefObject<{ yaw: number; pitch: number }>;
}) => {
  const { scene, camera } = useThree();

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
  const strideLength = 1.2; // meters per step for head-bob pacing

  const desiredPosRef = useRef(new THREE.Vector3());
  const desiredFocusRef = useRef(new THREE.Vector3());
  const followOffsetRef = useRef(new THREE.Vector3(0, 3, 100));
  const lookAheadRef = useRef(new THREE.Vector3(0, 1.5, -6));
  const upRef = useRef(new THREE.Vector3(0, 1, 0));
  const camShakeRef = useRef(new THREE.Vector3());
  const bobTimeRef = useRef(0);
  const bobAmpRef = useRef(0);

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
      scrollContainer.removeEventListener("scroll", onScroll);
    };
  }, [scrollContainer]);

  useEffect(() => {
    serverRacksRef.current = scene.getObjectByName("server-racks") ?? null;
    spotLightRef.current =
      (scene.getObjectByName("spotLight") as SpotLight) ?? null;
  }, [scene]);

  const spaceElement = useMemo(() => {
    if (typeof document === "undefined") return null;
    return document.getElementById("space");
  }, []);

  // const groundMesh = useMemo(() => {
  //   if (typeof document === "undefined") return null;
  //   return scene.getObjectByName("server-scene-ground") as THREE.Mesh | null;
  // }, [scene]);

  // const groundMaterial = useMemo(() => {
  //   if (!groundMesh) return null;
  //   return groundMesh.material as THREE.MeshLambertMaterial | null;
  // }, [groundMesh]);

  useFrame((_, dt) => {
    const lerpPos = active ? 0.12 : 0.08;
    const lerpFocus = active ? 0.18 : 0.12;
    let desiredFov = active ? 55 : 9;

    let moveSpeed = 0;

    const spaceElementRect = spaceElement?.getBoundingClientRect();
    const spaceElementHeight = spaceElementRect?.height ?? 0;
    const spaceElementTop = spaceElementRect?.top ?? 0;

    if (active && playerRef.current) {
      const p = playerRef.current.translation();
      const v = playerRef.current.linvel();
      moveSpeed = Math.hypot(v.x, v.z);
      const grounded = Math.abs(v.y) < 0.5;
      const base = desiredPosRef.current.set(p.x, p.y + 0.4, p.z);

      const yaw = lookRef.current.yaw;
      const pitch = lookRef.current.pitch;

      // Stride-locked head-bob (vertical + slight lateral sway)
      const targetBob = grounded
        ? THREE.MathUtils.clamp(moveSpeed * 0.004, 0, 0.015)
        : 0;

      desiredFov = active ? 55 + moveSpeed * moveSpeed * 0.15 : 9;
      bobAmpRef.current = THREE.MathUtils.lerp(
        bobAmpRef.current,
        targetBob,
        0.2,
      );
      if (bobAmpRef.current > 1e-4) {
        const phaseSpeed = moveSpeed > 0.01 ? moveSpeed / strideLength : 0;
        bobTimeRef.current += phaseSpeed * dt * Math.PI * 2; // radians
        const vertical = Math.sin(bobTimeRef.current * 2) * bobAmpRef.current;
        const lateral = Math.sin(bobTimeRef.current) * bobAmpRef.current * 0.5;
        camShakeRef.current.set(lateral, Math.abs(vertical), 0);
      } else {
        camShakeRef.current.set(0, 0, 0);
      }

      followOffsetRef.current
        .set(0, 0.8, 4.5)
        .applyAxisAngle(upRef.current, yaw + Math.PI);

      lookAheadRef.current
        .set(0, 0, -3)
        .applyEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"))
        .add(new THREE.Vector3(0, 0.6, 0));

      desiredPosRef.current.copy(base).add(followOffsetRef.current);
      desiredPosRef.current.add(camShakeRef.current);
      desiredFocusRef.current.copy(base).add(lookAheadRef.current);
      desiredFocusRef.current.addScaledVector(camShakeRef.current, 0.3);
    } else {
      const t = THREE.MathUtils.smoothstep(scrollFractionRef.current, 0, 1);
      const isMobile = isMobileRef.current;
      // const isRtl =
      //   // typeof document !== "undefined" && document.documentElement.dir === "rtl";
      //   false;
      const idlePos = desiredPosRef.current.set(
        (isMobile ? 142 : 150) - t * (isMobile ? 260 : 290),
        (isMobile ? 84 : 100) - t * (isMobile ? 26 : 35),
        (isMobile ? 142 : 150) - t * (isMobile ? 37 : 45),
      );
      const idleFocus = desiredFocusRef.current.set(
        (isMobile ? 23 : 0) + t * (isMobile ? -8 : 15),
        (isMobile ? 5 : 0) + t * 10,
        (isMobile ? 7 : -5) + t * 8,
      );

      idlePos.y +=
        Math.max(
          0,
          -(spaceElementTop - spaceElementHeight) / spaceElementHeight,
        ) * (isMobile ? -20 : -30);
      idlePos.x +=
        Math.max(
          0,
          -(spaceElementTop - spaceElementHeight) / spaceElementHeight,
        ) * (isMobile ? -10 : -50);
      idlePos.z +=
        Math.max(
          0,
          -(spaceElementTop - spaceElementHeight) / spaceElementHeight,
        ) * (isMobile ? -10 : -10);

      const groundMesh = _.scene.getObjectByName(
        "server-scene-ground-mesh",
      ) as THREE.Mesh | null;
      const groundMaterial =
        groundMesh?.material as THREE.MeshLambertMaterial | null;

      // set the ground alpha based on the camera height, should go near 0 when camera is low and stop at zero,
      // should start fading from y = 10
      // the fade should be eased, so that it fades faster at the end

      const CUTOFF_Y = 20;

      if (groundMaterial) {
        // const groundAlpha = THREE.MathUtils.clamp((idlePos.y - 10) / 20, 0, 1);
        // const groundAlpha = THREE.MathUtils.clamp((idlePos.y - CUTOFF_Y) / 20, 0, 1);
        // groundMaterial.opacity = groundAlpha;

        const groundAlpha = THREE.MathUtils.clamp(
          (idlePos.y - CUTOFF_Y) / 20,
          0,
          1,
        );
        const easedAlpha = THREE.MathUtils.smoothstep(groundAlpha, 0, 1);
        groundMaterial.opacity = easedAlpha;
      }

      camTarget.current.lerp(idlePos, 0.06);
      camFocus.current.lerp(idleFocus, 0.06);

      // bleed out shake when idle
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
    if (serverRacks && spotLight) {
      spotLight.position.copy(serverRacks.position);
      spotLight.position.y += 40;

      const targetIntensity = rackPowerOn ? 2000 : 850;
      spotLight.intensity = THREE.MathUtils.lerp(
        spotLight.intensity,
        targetIntensity,
        0.12,
      );

      spotLight.target.position.copy(serverRacks.position);
      spotLight.target.updateMatrixWorld();
    }
  });

  useFrame(() => {
    const sunGroup = scene.getObjectByName("sun-group");
    const sunLight = scene.getObjectByName(
      "sun-light",
    ) as THREE.DirectionalLight;
    const sunObject = sunGroup?.getObjectByName("sun-object") as THREE.Mesh;
    if (sunGroup && sunLight && sunObject) {
      // if (!active && sunGroup.visible) {
      sunGroup.visible = false;
      // } else if (active && !sunGroup.visible) {
      // sunGroup.visible = true;
      // }

      const time = performance.now() * 0.001;
      const radius = 100;
      const sunX = Math.cos(time) * radius;
      const sunY = Math.sin(time) * radius + 20;
      const sunZ = -0;
      sunGroup.position.set(sunX, sunY, sunZ);
      sunLight.position.copy(sunGroup.position);
      sunLight.lookAt(0, 0, 0);
      sunObject.position.copy(sunGroup.position);

      const intensityFactor = THREE.MathUtils.clamp(sunY / radius, 0, 1);

      (sunObject.material as THREE.MeshLambertMaterial).emissiveIntensity =
        sunLight.intensity = rackPowerOn ? 10 + intensityFactor * 10 : 0;
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
      <SoftShadows samples={12} size={20} focus={0.5} />
    </>
  );
};

type PlayerControllerProps = {
  active: boolean;
  bodyRef: React.RefObject<RapierRigidBody | null>;
  lookRef: React.MutableRefObject<{ yaw: number; pitch: number }>;
  touchMoveRef?: React.MutableRefObject<{ x: number; z: number }>;
  touchLookRef?: React.MutableRefObject<{ x: number; y: number }>;
  touchFireRef?: React.MutableRefObject<boolean>;
  onInteract?: (pos: THREE.Vector3) => void;
  onFire?: (origin: THREE.Vector3, dir: THREE.Vector3) => void;
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

function PlayerController({
  active,
  bodyRef,
  lookRef,
  touchMoveRef,
  touchLookRef,
  touchFireRef,
  onInteract,
  onFire,
}: PlayerControllerProps) {
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

  // Mouse look (pointer lock)
  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!document.pointerLockElement) return;
      const yawDelta = -event.movementX * 0.0025; // invert horizontal pan
      const pitchDelta = -event.movementY * 0.0025;
      lookInputRef.current.yaw += yawDelta;
      pitchRef.current = THREE.MathUtils.clamp(
        pitchRef.current + pitchDelta,
        -1.2,
        1.2,
      );
    };

    const onMouseDown = (event: MouseEvent) => {
      if (event.button === 0) {
        shootBuffer.current = true;
      }
    };

    const onMouseUp = (event: MouseEvent) => {
      if (event.button === 0) {
        shootBuffer.current = false;
      }
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
      const action = CODE_TO_ACTION[event.code] || KEY_TO_ACTION[event.key];
      if (!action) return;

      if (action === "jump") {
        jumpBuffer.current = true;
      } else if (action === "interact") {
        interactBuffer.current = true;
      } else {
        inputRef.current[action] = true;
      }

      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(
          event.key,
        )
      ) {
        event.preventDefault();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
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
    }
  }, [active]);

  useFrame((_, dt) => {
    const body = bodyRef.current;
    if (!body) return;

    const v = body.linvel();

    if (!active) {
      body.setLinvel({ x: 0, y: v.y, z: 0 }, true);
      return;
    }

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
        padYaw = Number.isFinite(pad.axes[2]) ? -pad.axes[2] : 0; // right stick X inverted to match mouse
        padPitch = Number.isFinite(pad.axes[3]) ? pad.axes[3] : 0; // right stick Y
        padJump = !!pad.buttons?.[0]?.pressed;
        padInteract = !!pad.buttons?.[1]?.pressed;
        padFire = !!pad.buttons?.[7]?.pressed || !!pad.buttons?.[5]?.pressed;
      }
    }

    if (padJump && !gamepadPrevRef.current.jump) jumpBuffer.current = true;
    if (padInteract && !gamepadPrevRef.current.interact)
      interactBuffer.current = true;
    gamepadPrevRef.current = { jump: padJump, interact: padInteract };

    const input = inputRef.current;
    const touchMove = touchMoveRef?.current;
    const moveX =
      (input.right ? 1 : 0) - (input.left ? 1 : 0) + padX + (touchMove?.x ?? 0);
    const moveZ =
      (input.backward ? 1 : 0) +
      padZ -
      (input.forward ? 1 : 0) +
      (touchMove?.z ?? 0);

    // Apply look deltas (mouse + right stick)
    const touchLook = touchLookRef?.current;
    const lookYawDelta =
      lookInputRef.current.yaw +
      padYaw * 2.2 * dt +
      (touchLook?.x ?? 0) * 2.2 * dt;
    yawRef.current += lookYawDelta;
    pitchRef.current = THREE.MathUtils.clamp(
      pitchRef.current + padPitch * 1.4 * dt - (touchLook?.y ?? 0) * 1.4 * dt,
      -1.2,
      1.2,
    );
    lookInputRef.current.yaw = 0;

    // Expose look to other systems
    lookRef.current.yaw = yawRef.current;
    lookRef.current.pitch = pitchRef.current;

    moveRef.current.set(moveX, 0, moveZ);
    const moveLen = moveRef.current.length();
    if (moveLen > 1) moveRef.current.divideScalar(moveLen);

    const speed = (input.sprint ? 9 : 6) * moveLen;

    // Rotate move vector by current yaw (so strafing respects camera yaw)
    quatRef.current.setFromAxisAngle(upRef.current, yawRef.current);
    moveRef.current.applyQuaternion(quatRef.current).multiplyScalar(speed);

    body.setLinvel(
      { x: moveRef.current.x, y: v.y, z: moveRef.current.z },
      true,
    );
    body.setRotation(
      {
        x: quatRef.current.x,
        y: quatRef.current.y,
        z: quatRef.current.z,
        w: quatRef.current.w,
      },
      true,
    );

    const grounded = Math.abs(v.y) < 0.05;
    if (jumpBuffer.current && grounded) {
      jumpBuffer.current = false;
      const m = body.mass();
      body.applyImpulse({ x: 0, y: m * 4.5, z: 0 }, true);
    }

    const translation = body.translation();
    posRef.current.set(translation.x, translation.y, translation.z);

    // Shooting: combine mouse/touch/gamepad
    const touchFire = touchFireRef?.current;
    const wantFire = shootBuffer.current || !!touchFire || padFire;
    if (onFire && wantFire) {
      const now = performance.now();
      const fireDelay = 120; // ms between shots
      if (now - lastFireMs.current >= fireDelay) {
        lastFireMs.current = now;
        const dir = new THREE.Vector3(0, 0, -1).applyEuler(
          new THREE.Euler(pitchRef.current, yawRef.current, 0, "YXZ"),
        );
        const origin = posRef.current.clone().add(new THREE.Vector3(0, 0.6, 0));
        onFire(origin, dir);
      }
    }

    if (interactBuffer.current) {
      if (onInteract) {
        onInteract(posRef.current.clone());
      }
      interactBuffer.current = false;
    }
  });

  // Make player roughly 1/100 the size of server racks
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
      position={[10, 0.25, 100]}
    >
      <CapsuleCollider args={[0.05, 0.02]} />
      <mesh castShadow receiveShadow scale={0.1}>
        <capsuleGeometry args={[0.5, 2, 6, 12]} />
        <meshStandardMaterial
          color="#7dd3fc"
          metalness={0.1}
          roughness={0.6}
          emissiveIntensity={0.3}
        />
      </mesh>
    </RigidBody>
  );
}

export function FloatingServerRacks({ powerOn = true }: { powerOn?: boolean }) {
  const rb = useRef<RapierRigidBody | null>(null);

  // Target (world space)
  const target = useRef(new THREE.Vector3(0, 0, 0));

  // Tunables (keep as constants; they don’t need to be recreated)
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

  // Internal state
  const stuckSeconds = useRef(0);
  const cooldownLeft = useRef(0);
  const lastY = useRef<number | null>(null);

  // Temp objects (no per-frame allocations)
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

    // =========================
    // 1) POSITION PD
    // =========================
    const p = b.translation();
    const v = b.linvel();

    const f = force.current;
    f.set(
      target.current.x - p.x,
      target.current.y - p.y,
      target.current.z - p.z,
    ).multiplyScalar(posK);

    f.x -= posD * v.x;
    f.y -= posD * v.y;
    f.z -= posD * v.z;

    const fMag = f.length();
    if (fMag > maxForce) f.multiplyScalar(maxForce / fMag);

    b.addForce({ x: f.x, y: f.y, z: f.z }, true);

    // =========================
    // 2) UPRIGHT PD (keep yaw)
    // =========================
    const r = b.rotation();
    const qq = q.current.set(r.x, r.y, r.z, r.w);

    // If you *don’t* need to read yaw, you can skip Euler conversion entirely.
    // Keeping it because you might want to swap targetYaw dynamically.
    euler.current.setFromQuaternion(qq, "YXZ");

    const targetYaw = 0;
    desired.current.setFromEuler(new THREE.Euler(0, targetYaw, 0, "YXZ"));

    // delta = desired * inverse(current)
    invQ.current.copy(qq).invert();
    delta.current.copy(desired.current).multiply(invQ.current);

    // ensure shortest path
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
        axis.current.set(
          delta.current.x / s,
          delta.current.y / s,
          delta.current.z / s,
        );

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

    // =========================
    // 3) STUCK DETECTOR + RECOVERY
    // =========================
    cooldownLeft.current = Math.max(0, cooldownLeft.current - dt);

    if (lastY.current === null) lastY.current = p.y;
    const yDrift = Math.abs(p.y - lastY.current);
    lastY.current = p.y;

    bodyUp.current.set(0, 1, 0).applyQuaternion(qq);
    const uprightDot = bodyUp.current.dot(up.current);

    const isTilted90 = Math.abs(uprightDot) <= TILT_90_DOT_MAX;
    const isFixedY =
      Math.abs(v.y) <= FIXED_Y_VEL_MAX && yDrift <= FIXED_Y_POS_EPS;

    if (cooldownLeft.current <= 0) {
      stuckSeconds.current =
        isFixedY && isTilted90 ? stuckSeconds.current + dt : 0;

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
            true,
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
