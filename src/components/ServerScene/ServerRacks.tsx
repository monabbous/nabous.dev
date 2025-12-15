import { useColors } from "@nabous.dev/providers/ColorsProvider";
import { RoundedBox } from "@react-three/drei";
import React from "react";

// export const screenMaterial = (
//   <meshLambertMaterial
//     color={"var(--colors__accent)"}
//     emissive={0x00b2b2}
//     emissiveIntensity={0.5}
//   />
// );

export function ScreenMaterial() {
  const colors = useColors();

  return (
    <meshLambertMaterial
      color={colors.accent}
      emissive={0x00b2b2}
      emissiveIntensity={0.5}
    />
  );
}

const buttonsSpacing = 0.08;

export function ServerRack({
  stackNumber,
  children,
}: {
  stackNumber: number;
  children?: React.ReactNode;
}) {
  const colors = useColors();

  return (
    <group scale={10} position={[0, stackNumber * 3.5, 0]} receiveShadow>
      {/* Rack */}
      <RoundedBox castShadow receiveShadow args={[1, 0.25, 1]} radius={0.02}>
        <meshPhongMaterial  color={colors.primary} side={0} />
      </RoundedBox>
      {children}
    </group>
  );
}

export function ServerRacks() {
  return (
    <>
      <group name={"server-racks"} position={[10, 0, -10]} receiveShadow>
        <ServerRack stackNumber={0}>
          <ButtensOnly />
        </ServerRack>
        <ServerRack stackNumber={1}>
          <LineScreen />
        </ServerRack>
        <ServerRack stackNumber={2}>
          <ScreenWithButtons />
        </ServerRack>
      </group>
    </>
  );
}

function ScreenWithButtons() {
  return (
    <>
      {/* Screen */}
      <RoundedBox
        castShadow
        receiveShadow
        args={[0.5, 0.125, 0.1]}
        position={[-0.15, 0, 0.5 - 0.001]}
      >
        <ScreenMaterial />
      </RoundedBox>

      {/* Buttons */}
      <RoundedBox
        castShadow
        receiveShadow
        args={[0.125, 0.125, 0.1]}
        scale={0.5}
        position={[0.25, 0.125 - buttonsSpacing, 0.5 - 0.001]}
      >
        <ScreenMaterial />
      </RoundedBox>

      <RoundedBox
        castShadow
        receiveShadow
        args={[0.125, 0.125, 0.1]}
        scale={0.5}
        position={[
          0.25 + buttonsSpacing,
          0.125 - buttonsSpacing * 2,
          0.5 - 0.001,
        ]}
      >
        <ScreenMaterial />
      </RoundedBox>
      <RoundedBox
        castShadow
        receiveShadow
        args={[0.125, 0.125, 0.1]}
        scale={0.5}
        position={[0.25 + buttonsSpacing, 0.125 - buttonsSpacing, 0.5 - 0.001]}
      >
        <ScreenMaterial />
      </RoundedBox>

      <RoundedBox
        castShadow
        receiveShadow
        args={[0.125, 0.125, 0.1]}
        scale={0.5}
        position={[0.25, 0.125 - buttonsSpacing * 2, 0.5 - 0.001]}
      >
        <ScreenMaterial />
      </RoundedBox>
    </>
  );
}

function LineScreen() {
  return (
    <>
      {/* Screen */}
      <RoundedBox
        castShadow
        receiveShadow
        args={[0.5, 0.125, 0.1]}
        position={[-0.15, 0, 0.5 - 0.001]}
        scale={[1, 0.1, 0.1]}
      >
        <ScreenMaterial />
      </RoundedBox>
    </>
  );
}

function ButtensOnly() {
  return (
    <>
      {/* Buttons */}
      <RoundedBox
        castShadow
        receiveShadow
        args={[0.125, 0.125, 0.1]}
        scale={0.5}
        position={[-0.38, 0, 0.5 - 0.001]}
      >
        <ScreenMaterial />
      </RoundedBox>
      <RoundedBox
        castShadow
        receiveShadow
        args={[0.125, 0.125, 0.1]}
        scale={0.5}
        position={[-0.38 + buttonsSpacing, 0, 0.5 - 0.001]}
      >
        <ScreenMaterial />
      </RoundedBox>
      <RoundedBox
        castShadow
        receiveShadow
        args={[0.125, 0.125, 0.1]}
        scale={0.5}
        position={[-0.38 + buttonsSpacing * 2, 0, 0.5 - 0.001]}
      >
        <ScreenMaterial />
      </RoundedBox>
    </>
  );
}
