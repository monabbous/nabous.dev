"use client";

import { useColors } from "@nabous.dev/providers/ColorsProvider";
import { Environment, PerspectiveCamera, SoftShadows } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  CuboidCollider,
  Physics,
  RapierRigidBody,
  RigidBody,
} from "@react-three/rapier";
import { Color } from "lamina";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { FrontSide, PCFSoftShadowMap, SpotLight, Vector3 } from "three";
import { DebrisRain } from "./DebrisRain";
import { PostFX } from "./PostFx";
import { ServerRacks } from "./ServerRacks";

export function ServerScene() {
  const colors = useColors();

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
        resize={{
          scroll: true,
        }}
        style={{
          width: "100vw",
          height: "100vh",
          backgroundColor: "transparent",
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
          <pointLight
            color="white"
            intensity={10000}
            // intensity={0}
            position={[10, 100, -10]}
            castShadow={false}
          />
          <spotLight
            color="white"
            intensity={2000}
            // intensity={0}
            position={[30, 80, 30]}
            angle={1.8}
            penumbra={0.9}
            distance={600}
            decay={2}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-radius={18}
            // shadow-bias={-0.0002}
            // shadow-normalBias={0.03}
            name="spotLight"
          />
          <ambientLight intensity={1.75} color={"white"} />
          <directionalLight
            color={"white"}
            intensity={1}
            position={[10, 0, -10]}
          />
          <directionalLight
            color={"white"}
            intensity={0.5}
            position={[0, 0, 100]}
          />

          <CuboidCollider args={[200, 1, 200]} position={[-10, -5, 0]} />

          {/* <RigidBody type="fixed" restitution={0.5} friction={0.5}> */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[-10, -0.5 * 8, 0]}
            receiveShadow
          >
            <planeGeometry args={[400, 400]} />
            <meshLambertMaterial
              opacity={1}
              transparent
              side={FrontSide}
              emissiveIntensity={0}
              color={colors.background}
              emissive={colors.background}
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
          <FloatingServerRacks />
          <DebrisRain
            warpInMs={1000}
            maxAlive={4}
            center={new Vector3(10, 50, -10)}
          />

          <MainSceneEffects />
          <PostFX />
          <Environment background resolution={64}>
            <mesh scale={100}>
              <sphereGeometry args={[1, 64, 64]} />
              <Color color={colors.background} alpha={1} mode="normal" />
            </mesh>
          </Environment>
        </Physics>
      </Canvas>
    </>
  );
}

const MainSceneEffects = () => {
  const scrollContainer = useMemo(() => {
    if (typeof window === "undefined") return null;
    return document.body;
  }, []);

  // const rapier = useRapier();
  // console.log(rapier);
  useFrame((state) => {
    // if (state.scene.getObjectByName("server-racks")) {
    //   state.camera.lookAt(
    //   );
    // }
    const isMobile = window.innerWidth < 768;

    const scrollY = scrollContainer?.scrollTop || 0;
    const docHeight = scrollContainer?.scrollHeight || 0;
    const winHeight = scrollContainer?.clientHeight || 0;
    const scrollableHeight = docHeight - winHeight;
    const scrollFraction =
      scrollableHeight > 0 ? scrollY / scrollableHeight : 0;

    const targetZ = 150 - scrollFraction * 0;
    const targetY = (isMobile ? 80 : 100) - scrollFraction * 100;
    const targetX = 150 - scrollFraction * 0;

    const focusY = (isMobile ? 5 : 0) - scrollFraction * 0;
    const focusX = (isMobile ? 23 : 0) - scrollFraction * -10;
    const focusZ = (isMobile ? 7 : -5) - scrollFraction * -10;

    state.camera.position.lerp(
      {
        x: targetX,
        y: targetY,
        z: targetZ,
      },
      0.05
    );

    state.camera.lookAt(focusX, focusY, focusZ);
    // state.camera.lookAt(0, 2, 0);
    // if (state.camera instanceof THREE.PerspectiveCamera) {
    //   const fov = 9 + scrollFraction * 60;
    //   if (fov !== state.camera.fov) {
    //     state.camera.fov = fov;
    //     state.camera.updateProjectionMatrix();
    //   }
    // }
  });

  useFrame((state) => {
    const serverRacks = state.scene.getObjectByName("server-racks");
    const spotLight = state.scene.getObjectByName(
      "spotLight"
    ) as unknown as SpotLight;

    spotLight.target.position.copy(serverRacks!.position!);
    spotLight.position.copy(serverRacks!.position!);
    spotLight.position.y += 40;
  });
  return (
    <>
      <PerspectiveCamera
        makeDefault
        fov={9}
        near={0.1}
        far={300}
        position={[150, 100, 150]}
      />
      {/* <SoftShadows
        samples={16} // NOT 1024 – that sharpens, not softens
        size={SHADOW_SIZE} // larger = softer penumbra
        focus={0.5}
      /> */}
      <SoftShadows samples={16} size={20} focus={0.5} />
    </>
  );
};

export function FloatingServerRacks() {
  const rb = useRef<RapierRigidBody | null>(null);

  // -------------------------
  // Target position (world space)
  // -------------------------
  const target = useRef(new THREE.Vector3(0, 0, 0));

  // -------------------------
  // Position PD tuning
  // -------------------------
  const posK = 18; // spring strength
  const posD = 50; // damping
  const maxForce = 900;

  // -------------------------
  // Upright PD tuning (keep yaw)
  // -------------------------
  const uprightK = 300;
  const uprightD = 400;
  const maxTorque = 600;

  // -------------------------
  // Stuck / recovery conditions
  // -------------------------
  const TILT_90_DOT_MAX = 0.12; // ~90° tilt when |dot| ≈ 0
  const FIXED_Y_VEL_MAX = 0.03; // nearly zero vertical velocity
  const FIXED_Y_POS_EPS = 0.02; // tiny Y drift tolerance
  const STUCK_FOR_SEC = 4.0; // must be stuck this long
  const KICK_COOLDOWN = 1.0; // prevent repeated kicks

  // -------------------------
  // Recovery impulse strength
  // -------------------------
  const jumpImpulse = 6.0;
  const angularKick = 3.5;

  // -------------------------
  // Internal state
  // -------------------------
  const stuckSeconds = useRef(0);
  const cooldownLeft = useRef(0);
  const lastY = useRef<number | null>(null);

  // -------------------------
  // Temp objects (no allocations per frame)
  // -------------------------
  const q = new THREE.Quaternion();
  const desired = new THREE.Quaternion();
  const delta = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const axis = new THREE.Vector3();
  const force = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const bodyUp = new THREE.Vector3();

  useFrame((_, dt) => {
    const b = rb.current;
    if (!b) return;

    // =========================
    // 1) POSITION PD (hold target)
    // =========================
    const p = b.translation();
    const v = b.linvel();

    force.set(
      target.current.x - p.x,
      target.current.y - p.y,
      target.current.z - p.z
    );

    force.multiplyScalar(posK);
    force.x -= posD * v.x;
    force.y -= posD * v.y;
    force.z -= posD * v.z;

    const fMag = force.length();
    if (fMag > maxForce) force.multiplyScalar(maxForce / fMag);

    b.addForce({ x: force.x, y: force.y, z: force.z }, true);

    // =========================
    // 2) UPRIGHT PD (kill roll/pitch, keep yaw)
    // =========================
    const rot = b.rotation();
    q.set(rot.x, rot.y, rot.z, rot.w);

    euler.setFromQuaternion(q, "YXZ");

    // Stabilize yaw as well (fixed heading). Change this value to rotate the rack.
    const targetYaw = 0; // radians

    desired.setFromEuler(new THREE.Euler(0, targetYaw, 0, "YXZ"));

    delta.copy(desired).multiply(q.clone().invert());

    if (delta.w < 0) delta.set(-delta.x, -delta.y, -delta.z, -delta.w);

    const w = THREE.MathUtils.clamp(delta.w, -1, 1);
    const angle = 2 * Math.acos(w);
    const s = Math.sqrt(1 - w * w);

    if (s > 1e-6 && angle > 1e-6) {
      axis.set(delta.x / s, delta.y / s, delta.z / s);

      const angVel = b.angvel();

      let tx = uprightK * angle * axis.x - uprightD * angVel.x;
      let ty = uprightK * angle * axis.y - uprightD * angVel.y;
      let tz = uprightK * angle * axis.z - uprightD * angVel.z;

      const tMag = Math.sqrt(tx * tx + ty * ty + tz * tz);
      if (tMag > maxTorque) {
        const k = maxTorque / tMag;
        tx *= k;
        ty *= k;
        tz *= k;
      }

      b.addTorque({ x: tx, y: ty, z: tz }, true);
    }

    // =========================
    // 3) STUCK DETECTOR + SOFT RECOVERY
    // =========================
    cooldownLeft.current = Math.max(0, cooldownLeft.current - dt);

    // track Y drift
    if (lastY.current === null) lastY.current = p.y;
    const yDrift = Math.abs(p.y - lastY.current);
    lastY.current = p.y;

    // body up vector
    bodyUp.set(0, 1, 0).applyQuaternion(q);
    const uprightDot = bodyUp.dot(up); // ~0 when sideways

    const isTilted90 = Math.abs(uprightDot) <= TILT_90_DOT_MAX;
    const isFixedY =
      Math.abs(v.y) <= FIXED_Y_VEL_MAX && yDrift <= FIXED_Y_POS_EPS;

    if (cooldownLeft.current <= 0) {
      if (isFixedY && isTilted90) stuckSeconds.current += dt;
      else stuckSeconds.current = 0;

      if (stuckSeconds.current >= STUCK_FOR_SEC) {
        // --- Linear impulse (jump) ---
        b.applyImpulse({ x: 0, y: jumpImpulse * b.mass(), z: 0 }, true);

        // --- Angular impulse (kick upright) ---
        axis.copy(bodyUp).cross(up);
        if (axis.lengthSq() > 1e-6) {
          axis.normalize();
          b.applyTorqueImpulse(
            {
              x: axis.x * angularKick * b.mass(),
              y: axis.y * angularKick * b.mass(),
              z: axis.z * angularKick * b.mass(),
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
      <ServerRacks />
    </RigidBody>
  );
}
