"use client";

import { useCssVarsColors } from "@nabous.dev/providers/ColorsProvider";
import { useColorMode } from "@nabous.dev/providers/ColorModeProvider";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  CapsuleCollider,
  CuboidCollider,
  Physics,
  RapierRigidBody,
  RigidBody,
  useBeforePhysicsStep,
} from "@react-three/rapier";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { PCFSoftShadowMap, Vector3 } from "three";
import { DebrisRain } from "./DebrisRain";
import { PointerGlow } from "./PointerGlow";
import { ServerRacks } from "./ServerRacks";
import { chooseSceneQuality, sceneBudget, type SceneQuality } from "./quality";
import { SceneRuntime } from "./SceneRuntime";
import { StudioLight } from "./StudioLight";
import { CamcorderLight } from "./CamcorderLight";
import { cameraDamping, sampleScrollCamera } from "./scroll-camera";

const RACK_TARGET = new Vector3(10, 0, -10);
const GameBloom = lazy(() => import("./PostFx").then(module => ({ default: module.PostFX })));
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

export type ServerSceneProps = {
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
  const { mode } = useColorMode();
  const [quality, setQuality] = useState<SceneQuality>("low");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [adaptive, setAdaptive] = useState(false);
  const budget = sceneBudget(quality);
  useEffect(() => {
    const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(motion.matches);
      const coarsePointer = matchMedia("(pointer: coarse)").matches;
      const desktop = !coarsePointer || innerWidth >= 1024;
      setAdaptive(!desktop);
      setQuality(chooseSceneQuality({ cores: device.hardwareConcurrency, memory: device.deviceMemory,
        saveData: device.connection?.saveData, desktop, coarsePointer }));
    };
    update();
    motion.addEventListener("change", update);
    return () => motion.removeEventListener("change", update);
  }, []);
  const [sceneReady, setSceneReady] = useState(false);
  const revealScene = useCallback(() => setSceneReady(true), []);
  const paletteReady = Boolean(colors.background && colors.accent && colors.ember);
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

  return (
    <div className="scene-backdrop" data-scene-ready={sceneReady} data-scene-quality={quality}>
      {paletteReady && <Canvas
        id="server-scene-canvas"
        className="scene-render"
        frameloop="never"
        camera={{ fov: 9, near: 0.1, far: 500, position: [150, 100, 150] }}
        dpr={[0.75, budget.dpr]}
        gl={{
          antialias: true,
          powerPreference: "low-power",
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.NeutralToneMapping,
          toneMappingExposure: 1.1, // Adjust overall brightness/contrast
        }}
        resize={{
          scroll: false,
          debounce: { resize: 100, scroll: 100 },
        }}
        style={{
          width: "100vw",
          height: "100vh",
          opacity: sceneReady ? 1 : 0,
        }}
        scene={{
          scale: new Vector3(1, 1, 1),
        }}
        shadows={{
          enabled: true,
          type: PCFSoftShadowMap,
        }}
      >
        <color attach="background" args={[colors.background!]} />
        <SceneRuntime quality={quality} adaptive={adaptive} onSlow={() => setQuality(previous => previous === "standard" ? "balanced" : "low")} />
        <Suspense fallback={null}>
        <Physics
          gravity={[0, -9.8, 0]} // m/s²
           timeStep={1 / 60}
           updateLoop="follow"
           interpolate
           maxCcdSubsteps={1}
        >
          <SceneReady onReady={revealScene} />
          {/* <OrbitControls /> */}
          <pointLight
            color={colors.light}
            intensity={isGameActive ? 0 : 6500}
            // intensity={0}
            position={[10, 100, -10]}
            // castShadow
            // visible={false}
          />
          <hemisphereLight
            intensity={isGameActive ? 0 : 1.15}
            color={colors.light}
            groundColor={colors.primary}
          />
          <directionalLight
            color={colors.light}
            intensity={isGameActive ? 0 : 1}
            position={[30, 45, 20]}
          />
          <directionalLight
            color={colors.light}
            intensity={isGameActive ? 0 : 0.35}
            position={[0, 0, 100]}
          />

          <CuboidCollider args={[200, 1, 200]} position={[-10, -5, 0]} />

          {/* <RigidBody type="fixed" restitution={0.5} friction={0.5}> */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[-10, -0.5 * 8, 0]}
            receiveShadow
            name="server-scene-ground-mesh"
          >
            <planeGeometry args={[1000, 1000]} />
            <meshLambertMaterial name="server-scene-ground-material" color={isGameActive ? colors.deep : colors.ground} dithering />
          </mesh>
          {!play && mode === "light" && quality === "standard" && <StudioLight />}
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

          {play && <PlayerController
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
          />}
          {(!reducedMotion || play) && <DebrisRain
            warpInMs={1000}
            maxAlive={isGameActive ? (quality === "low" ? 4 : 10) : budget.debris}
            center={new Vector3(10, 50, -10)}
            radius={isGameActive ? 50 : undefined}
            ratePerSecond={isGameActive ? 10 : 2}
          />}

          <MainSceneEffects
            active={play && !paused}
            playerRef={playerRef}
            lookRef={lookRef}
          />
          <CamcorderLight enabled={!play && mode === "dark"} reducedMotion={reducedMotion} shadowSize={budget.shadowSize} />
          <PointerGlow enabled={!play} />
          {isGameActive && budget.bloom && <GameBloom />}
        </Physics>
        </Suspense>
      </Canvas>}
    </div>
  );
}

// This mounts only once the scene's Suspense dependencies (including physics)
// have resolved. Reveal after completed frames, rather than canvas creation.
function SceneReady({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  useFrame(() => {
    if (++frames.current === 3) onReady();
  });
  return null;
}

const Shard = ({ position }: { position: THREE.Vector3 }) => {
  const colors = useCssVarsColors();
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
        color={colors.secondary}
        emissive={colors.accent}
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
  const colors = useCssVarsColors();
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
          color={hacked ? colors.deep : colors.primary}
          emissive={hacked ? colors.secondary : colors.accent}
          emissiveIntensity={hacked ? 1.4 : 1.9}
          metalness={0.35}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 1.1, 0.36]}>
        <planeGeometry args={[0.6, 0.6]} />
        <meshStandardMaterial
          color={hacked ? colors.secondary : colors.accent}
          emissive={hacked ? colors.secondary : colors.accent}
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
  const colors = useCssVarsColors();
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 1.6;
  });

  return (
    <mesh ref={ref} position={position} castShadow receiveShadow>
      <icosahedronGeometry args={[1.1, 1]} />
      <meshStandardMaterial
        color={colors.accent}
        emissive={colors.accent}
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
  lookRef,
}: {
  active: boolean;
  playerRef: React.RefObject<RapierRigidBody | null>;
  lookRef: React.MutableRefObject<{ yaw: number; pitch: number }>;
}) => {
  const { camera, size } = useThree();
  const cameraInitialized = useRef(false);


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


  // const groundMesh = useMemo(() => {
  //   if (typeof document === "undefined") return null;
  //   return scene.getObjectByName("server-scene-ground") as THREE.Mesh | null;
  // }, [scene]);

  // const groundMaterial = useMemo(() => {
  //   if (!groundMesh) return null;
  //   return groundMesh.material as THREE.MeshLambertMaterial | null;
  // }, [groundMesh]);

  useFrame((_, dt) => {
    const lerpPos = cameraDamping(dt, active ? 9 : 7);
    const lerpFocus = cameraDamping(dt, active ? 12 : 7);
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
      // Keep the browsing camera fixed: no scroll orbit, pointer pan or roll.
      desiredFov = sampleScrollCamera(0, size.width, size.height, desiredPosRef.current, desiredFocusRef.current);

      // bleed out shake when idle
      bobAmpRef.current = THREE.MathUtils.lerp(bobAmpRef.current, 0, 0.2);
      camShakeRef.current.set(0, 0, 0);
    }

    // Start at the current scroll position (including restored history), with no fly-in.
    if (!cameraInitialized.current || !active) {
      camTarget.current.copy(desiredPosRef.current);
      camFocus.current.copy(desiredFocusRef.current);
      camFov.current = desiredFov;
      cameraInitialized.current = true;
    }
    camTarget.current.lerp(desiredPosRef.current, lerpPos);
    camFocus.current.lerp(desiredFocusRef.current, lerpFocus);

    camera.position.copy(camTarget.current);
    camera.lookAt(camFocus.current);

    camFov.current = THREE.MathUtils.lerp(camFov.current, desiredFov, cameraDamping(dt));
    (camera as THREE.PerspectiveCamera).fov = camFov.current;
    camera.updateProjectionMatrix();

  });

  return null;
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
  const colors = useCssVarsColors();
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
          color={colors.secondary}
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
  const axis = useRef(new THREE.Vector3());
  const force = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3(0, 1, 0));
  const bodyUp = useRef(new THREE.Vector3());

  useBeforePhysicsStep((world) => {
    const dt = world.timestep;
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

    // Target yaw is zero: reuse the identity quaternion without allocating Euler objects.
    desired.current.identity();

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
      colliders={false}
      linearDamping={0.5}
      angularDamping={2.5}
      restitution={0.1}
      friction={0.6}
    >
      {[0, 3.5, 7].map(y => <CuboidCollider key={y} args={[5, 1.25, 5]} position={[10, y, -10]} />)}
      <ServerRacks powerOn={powerOn} />
    </RigidBody>
  );
}
