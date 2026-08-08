"use client";

import { useCssVarsColors } from "@nabous.dev/providers/ColorsProvider";
import { Environment } from "@react-three/drei";
import { Canvas, extend, type Catalogue } from "@react-three/fiber";
import {
  CuboidCollider,
  Physics,
  type RapierRigidBody,
} from "@react-three/rapier";
import { Color } from "lamina";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { FrontSide } from "three";
import * as THREE_WEBGPU from "three/webgpu";

import { DebrisRain } from "./DebrisRain";
import { PostFX } from "./PostFx";
import { WebGPUBloom } from "./WebGPUBloom";
import { useSfx } from "./useSfx";

import {
  ServerSceneProvider,
  useServerSceneRuntime,
} from "./ServerSceneContext";
import type { RenderQuality } from "./types";
import {
  bgCyber,
  DEBRIS_CENTER,
  neonCyan,
  neonMagenta,
  RACK_TARGET,
  SHARD_POSITIONS,
  TERMINAL_POSITIONS,
} from "./constants";

import { FloatingServerRacks } from "./components/FloatingServerRacks";
import { HackTerminal } from "./components/HackTerminal";
import { AudioListenerSync } from "./components/AudioListenerSync";
import { DynamicSky } from "./components/DynamicSky";
import { MainSceneEffects } from "./components/MainSceneEffects";
import { PlayerController } from "./components/PlayerController";
import { Shard } from "./components/Shard";
import { TargetDummy } from "./components/TargetDummy";
import type { DebrisPickTarget, HeldTarget } from "./pickupTypes";

// Enable WebGPU node materials when the WebGPU renderer is used.
extend(THREE_WEBGPU as unknown as Catalogue);

type Objectives = {
  shards: number;
  totalShards: number;
  hacks: number;
  totalHacks: number;
  rackPowerOn: boolean;
};

type ServerSceneProps = {
  play: boolean;
  paused: boolean;
  preferWebGPU?: boolean;
  quality: RenderQuality;
  touchMoveRef?: React.MutableRefObject<{ x: number; z: number }>;
  touchLookRef?: React.MutableRefObject<{ x: number; y: number }>;
  touchFireRef?: React.MutableRefObject<boolean>;
  onScore?: (delta: number) => void;
  onObjectives?: (data: Objectives) => void;
};

export function ServerScene({
  play,
  paused,
  preferWebGPU = true,
  quality,
  touchMoveRef,
  touchLookRef,
  touchFireRef,
  onScore,
  onObjectives,
}: ServerSceneProps) {
  return (
    <ServerSceneProvider preferWebGPU={preferWebGPU} quality={quality}>
      <ServerSceneInner
        play={play}
        paused={paused}
        touchMoveRef={touchMoveRef}
        touchLookRef={touchLookRef}
        touchFireRef={touchFireRef}
        onScore={onScore}
        onObjectives={onObjectives}
      />
    </ServerSceneProvider>
  );
}

function ServerSceneInner({
  play,
  paused,
  touchMoveRef,
  touchLookRef,
  touchFireRef,
  onScore,
  onObjectives,
}: Omit<ServerSceneProps, "preferWebGPU" | "quality">) {
  const colors = useCssVarsColors();
  const backgroundColor = colors?.background ?? bgCyber;

  const runtime = useServerSceneRuntime();
  const rendererKind = runtime.rendererKind;
  const isRendererReady = rendererKind === "webgpu" || rendererKind === "webgl";
  const useWebGPU = rendererKind === "webgpu";

  const [rackPowerOn, setRackPowerOn] = useState(true);
  const [collectedShards, setCollectedShards] = useState<boolean[]>(() =>
    SHARD_POSITIONS.map(() => false)
  );
  const [hackedTerminals, setHackedTerminals] = useState<boolean[]>(() =>
    TERMINAL_POSITIONS.map(() => false)
  );
  const [targets, setTargets] = useState<
    { pos: THREE.Vector3; alive: boolean }[]
  >(() => []);

  const playerRef = useRef<RapierRigidBody | null>(null);
  const lookRef = useRef({ yaw: 0, pitch: 0 });

  const debrisRegistryRef = useRef(new Map<string, DebrisPickTarget>());
  const [heldDebrisId, setHeldDebrisId] = useState<string | null>(null);
  const heldTargetRef = useRef<HeldTarget | null>({
    position: new THREE.Vector3(),
    rotation: new THREE.Quaternion(),
    scale: 0.28,
  });

  const [cameraInTransit, setCameraInTransit] = useState(false);

  const isGameActive = play && !paused;
  const { playFootstep, playDebrisThud, playDebrisWarpOut } = useSfx(true);

  const resolvedQuality = runtime.qualityResolved;

  const canRender = runtime.support.webgl || runtime.support.webgpu;

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

  const handleInteract = useCallback(
    (pos: THREE.Vector3) => {
      let handled = false;

      if (pos.distanceTo(RACK_TARGET) < 10) {
        setRackPowerOn((prev) => !prev);
        handled = true;
      }

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
        onObjectives({
          shards: collectedShards.filter(Boolean).length,
          totalShards: SHARD_POSITIONS.length,
          hacks: hackedTerminals.filter(Boolean).length,
          totalHacks: TERMINAL_POSITIONS.length,
          rackPowerOn,
        });
      }
    },
    [collectedShards, hackedTerminals, onObjectives, rackPowerOn]
  );

  const handleFire = useCallback(
    (origin: THREE.Vector3, dir: THREE.Vector3) => {
      const rayOrigin = origin.clone();
      const rayDir = dir.clone().normalize();
      let hitIndex: number | null = null;

      targets.forEach((t, idx) => {
        if (!t.alive) return;
        const toCenter = t.pos.clone().sub(rayOrigin);
        const proj = toCenter.dot(rayDir);
        if (proj < 0 || proj > 120) return;
        const closestPoint = rayOrigin.clone().addScaledVector(rayDir, proj);
        const distSq = closestPoint.distanceToSquared(t.pos);
        const radius = 1.3;
        if (distSq <= radius * radius) {
          hitIndex = idx;
        }
      });

      if (hitIndex === null) return;

      setTargets((prev) =>
        prev.map((t, i) => (i === hitIndex ? { ...t, alive: false } : t))
      );
      onScore?.(10);
      window.setTimeout(() => {
        setTargets((prev) => {
          const next = [...prev];
          const target = next[hitIndex!];
          if (target) next[hitIndex!] = { ...target, alive: true };
          return next;
        });
      }, 4000);
    },
    [onScore, targets]
  );

  const debrisMaxAlive = useMemo(() => {
    if (!isGameActive) return 2;
    if (resolvedQuality === "high") return 10;
    if (resolvedQuality === "medium") return 6;
    return 3;
  }, [isGameActive, resolvedQuality]);

  const debrisRatePerSecond = useMemo(() => {
    if (!isGameActive) return 2;
    if (resolvedQuality === "high") return 10;
    if (resolvedQuality === "medium") return 6;
    return 3;
  }, [isGameActive, resolvedQuality]);

  const debrisRadius = useMemo(() => {
    if (!isGameActive) return undefined;
    return resolvedQuality === "low" ? 12 : 18;
  }, [isGameActive, resolvedQuality]);

  if (!canRender) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white z-20 px-6 text-center">
        <div className="space-y-3 max-w-lg">
          <h2 className="text-xl font-bold">Renderer unavailable</h2>
          <p className="text-sm text-white/80">
            WebGL/WebGPU rendering is not available on this device/browser.
          </p>
          <p className="text-xs text-white/60">
            Try enabling hardware acceleration, updating your browser, or using
            a different device.
          </p>
        </div>
      </div>
    );
  }

  const fatalInitError = Boolean(
    runtime.rendererError && !runtime.rendererKind
  );

  if (fatalInitError) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white z-20 px-6 text-center">
        <div className="space-y-3 max-w-lg">
          <h2 className="text-xl font-bold">Renderer error</h2>
          <p className="text-sm text-white/80">{runtime.rendererError}</p>
          <p className="text-xs text-white/60">
            If this keeps happening, try lowering quality or switching browsers.
          </p>
        </div>
      </div>
    );
  }

  // console.log(runtime)


  return (
    <>
      {runtime.rendererError && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 text-white text-sm px-6 text-center">
          <div className="space-y-2 max-w-lg">
            <div className="text-base font-semibold">Renderer message</div>
            <div className="text-white/80">{runtime.rendererError}</div>
          </div>
        </div>
      )}
      {runtime.phase === "loading" && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 text-white text-sm">
          Preparing renderer...
        </div>
      )}
      <Suspense
        fallback={
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 text-white text-sm">
            Initializing scene...
          </div>
        }
      >
        <Canvas
          key={runtime.canvasKey}
          id="server-scene-canvas"
          dpr={runtime.dpr}
          gl={runtime.glFactory}
          onCreated={runtime.onCanvasCreated}
          style={{
            background: isGameActive ? "black" : "transparent",
            filter: isRendererReady ? "opacity(1)" : "opacity(0)",
          }}
          shadows={runtime.shadowMap}
          frameloop={isRendererReady ? "always" : "demand"}
        >
          <DynamicSky
            active={isGameActive}
            nightColor={bgCyber}
            dayColor={backgroundColor}
          />
          <AudioListenerSync active={isGameActive} />
          <Physics gravity={[0, -9.8, 0]} timeStep="vary" maxCcdSubsteps={2}>
            <group name="sun-group" position={[0, 10, -100]}>
              <directionalLight name="sun-light" color={neonCyan} intensity={20} />
              <mesh name="sun-object">
                <sphereGeometry args={[5, 32, 32]} />
                {useWebGPU ? (
                  <meshStandardNodeMaterial
                    color={neonCyan}
                    emissive={neonCyan}
                    emissiveIntensity={20}
                    roughness={0.8}
                    metalness={0}
                  />
                ) : (
                  <meshStandardMaterial
                    color={neonCyan}
                    emissive={neonCyan}
                    emissiveIntensity={20}
                    roughness={0.8}
                    metalness={0}
                  />
                )}
              </mesh>
            </group>

            <pointLight
              color={isGameActive ? neonCyan : "white"}
              intensity={isGameActive ? 0 : 10000}
              position={[10, 100, -10]}
            />

            <spotLight
              color={isGameActive ? neonMagenta : "white"}
              intensity={isGameActive ? 0 : 2000}
              position={[30, 80, 30]}
              angle={1.8}
              penumbra={0.9}
              distance={600}
              decay={2}
              castShadow={resolvedQuality !== "low"}
              shadow-mapSize={[
                runtime.shadowMapSize || 1,
                runtime.shadowMapSize || 1,
              ]}
              shadow-radius={resolvedQuality === "high" ? 10 : 8}
              name="spotLight"
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

            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[-10, -0.5 * 8, 0]}
              receiveShadow
              castShadow
            >
              <planeGeometry args={[400, 400]} />
              {useWebGPU ? (
                <meshStandardNodeMaterial
                  opacity={1}
                  transparent
                  side={FrontSide}
                  emissiveIntensity={0}
                  color={colors.background}
                  // emissive={
                  //   isGameActive ? neonMagenta : colors?.background ?? bgCyber
                  // }
                  roughness={1}
                  metalness={0}
                />
              ) : (
                <meshStandardMaterial
                  opacity={1}
                  transparent
                  side={FrontSide}
                  emissiveIntensity={0}
                  color={colors.background}
                  // emissive={
                  //   isGameActive ? neonMagenta : colors?.background ?? bgCyber
                  // }
                  roughness={1}
                  metalness={0}
                />
              )}
            </mesh>

            <FloatingServerRacks powerOn={rackPowerOn} />

            {SHARD_POSITIONS.map((pos, i) =>
              collectedShards[i] ? null : (
                <Shard
                  key={`shard-${i}`}
                  position={pos}
                  useWebGPU={useWebGPU}
                />
              )
            )}

            {TERMINAL_POSITIONS.map((pos, i) => (
              <HackTerminal
                key={`term-${i}`}
                position={pos}
                hacked={hackedTerminals[i]}
                useWebGPU={useWebGPU}
              />
            ))}

            {targets.map((t, i) =>
              t.alive ? (
                <TargetDummy
                  key={`target-${i}`}
                  position={t.pos}
                  useWebGPU={useWebGPU}
                />
              ) : null
            )}

            <PlayerController
              active={
                play &&
                !paused &&
                runtime.controlsReady &&
                !runtime.isSwitchingRenderer &&
                !cameraInTransit
              }
              bodyRef={playerRef}
              lookRef={lookRef}
              touchMoveRef={touchMoveRef}
              touchLookRef={touchLookRef}
              touchFireRef={touchFireRef}
              useWebGPU={useWebGPU}
              playFootstep={playFootstep}
              debrisRegistryRef={debrisRegistryRef}
              heldDebrisId={heldDebrisId}
              onSetHeldDebrisId={setHeldDebrisId}
              heldTargetRef={heldTargetRef}
              onInteract={handleInteract}
              onFire={handleFire}
            />

            <DebrisRain
              warpInMs={1000}
              maxAlive={debrisMaxAlive}
              center={DEBRIS_CENTER}
              radius={debrisRadius}
              ratePerSecond={debrisRatePerSecond}
              onImpactSound={(strength, position) => {
                playDebrisThud(strength, position);
              }}
              onWarpOutSound={(position) => {
                playDebrisWarpOut(1, position);
              }}
              heldId={heldDebrisId}
              heldTargetRef={heldTargetRef}
              onRegisterDebris={(t) => {
                debrisRegistryRef.current.set(t.id, t);
              }}
              onUnregisterDebris={(id) => {
                debrisRegistryRef.current.delete(id);
                setHeldDebrisId((cur) => (cur === id ? null : cur));
              }}
            />

            <MainSceneEffects
              active={play && !paused}
              playerRef={playerRef}
              rackPowerOn={rackPowerOn}
              lookRef={lookRef}
              rendererKind={rendererKind}
              onTransitChange={setCameraInTransit}
            />

            {rendererKind === "webgl" &&
              resolvedQuality !== "low" &&
              isRendererReady &&
              runtime.controlsReady && <PostFX />}

            {rendererKind === "webgpu" &&
              resolvedQuality !== "low" &&
              isRendererReady && (
                <WebGPUBloom
                  active={rendererKind === "webgpu"}
                  threshold={runtime.webgpuBloomConfig.threshold}
                  intensity={runtime.webgpuBloomConfig.intensity}
                  sigma={runtime.webgpuBloomConfig.sigma}
                />
              )}

            <Environment resolution={64}>
              <mesh scale={100}>
                <sphereGeometry args={[1, 64, 64]} />
                <Color
                  color={isGameActive ? bgCyber : backgroundColor}
                  alpha={1}
                  mode="normal"
                />
              </mesh>
            </Environment>
          </Physics>
        </Canvas>
      </Suspense>

      {isGameActive && runtime.controlsReady && isRendererReady && (
        <div className="fixed inset-0 z-20 pointer-events-none flex items-center justify-center">
          <div className="w-4 h-4 relative">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 w-px h-4 bg-red-500/70" />
            <div className="absolute top-1/2 left-0 -translate-y-1/2 h-px w-4 bg-red-500/70" />
          </div>
        </div>
      )}
    </>
  );
}
