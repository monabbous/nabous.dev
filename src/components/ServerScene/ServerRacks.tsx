import { useCssVarsColors } from "@nabous.dev/providers/ColorsProvider";
import { RoundedBox } from "@react-three/drei";
import React from "react";

// export const screenMaterial = (
//   <meshLambertMaterial
//     color={"var(--colors__accent)"}
//     emissive={0x00b2b2}
//     emissiveIntensity={0.5}
//   />
// );

export function ScreenMaterial({ powerOn = true }: { powerOn?: boolean }) {
  const colors = useCssVarsColors();

  return (
    <meshLambertMaterial
      color={colors.accent}
      emissive={0x00b2b2}
      emissiveIntensity={powerOn ? 0.6 : 0.1}
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
  const colors = useCssVarsColors();

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

export function ServerRacks({ powerOn = true }: { powerOn?: boolean }) {
  return (
    <>
      <group name={"server-racks"} position={[10, 0, -10]} receiveShadow>
        <ServerRack stackNumber={0}>
          <ButtensOnly powerOn={powerOn} />
        </ServerRack>
        <ServerRack stackNumber={1}>
          <LineScreen powerOn={powerOn} />
        </ServerRack>
        <ServerRack stackNumber={2}>
          <ScreenWithButtons powerOn={powerOn} />
        </ServerRack>
      </group>
    </>
  );
}

function ScreenWithButtons({ powerOn }: { powerOn: boolean }) {
  return (
    <>
      {/* Screen */}
      <RoundedBox
        castShadow
        receiveShadow
        args={[0.5, 0.125, 0.1]}
        position={[-0.15, 0, 0.5 - 0.001]}
      >
        <ScreenMaterial powerOn={powerOn} />
      </RoundedBox>

      {/* Buttons */}
      <RoundedBox
        castShadow
        receiveShadow
        args={[0.125, 0.125, 0.1]}
        scale={0.5}
        position={[0.25, 0.125 - buttonsSpacing, 0.5 - 0.001]}
      >
        <ScreenMaterial powerOn={powerOn} />
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
        <ScreenMaterial powerOn={powerOn} />
      </RoundedBox>
      <RoundedBox
        castShadow
        receiveShadow
        args={[0.125, 0.125, 0.1]}
        scale={0.5}
        position={[0.25 + buttonsSpacing, 0.125 - buttonsSpacing, 0.5 - 0.001]}
      >
        <ScreenMaterial powerOn={powerOn} />
      </RoundedBox>

      <RoundedBox
        castShadow
        receiveShadow
        args={[0.125, 0.125, 0.1]}
        scale={0.5}
        position={[0.25, 0.125 - buttonsSpacing * 2, 0.5 - 0.001]}
      >
        <ScreenMaterial powerOn={powerOn} />
      </RoundedBox>
    </>
  );
}

function LineScreen({ powerOn }: { powerOn: boolean }) {
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
        <ScreenMaterial powerOn={powerOn} />
      </RoundedBox>
    </>
  );
}

function ButtensOnly({ powerOn }: { powerOn: boolean }) {
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
        <ScreenMaterial powerOn={powerOn} />
      </RoundedBox>
      <RoundedBox
        castShadow
        receiveShadow
        args={[0.125, 0.125, 0.1]}
        scale={0.5}
        position={[-0.38 + buttonsSpacing, 0, 0.5 - 0.001]}
      >
        <ScreenMaterial powerOn={powerOn} />
      </RoundedBox>
      <RoundedBox
        castShadow
        receiveShadow
        args={[0.125, 0.125, 0.1]}
        scale={0.5}
        position={[-0.38 + buttonsSpacing * 2, 0, 0.5 - 0.001]}
      >
        <ScreenMaterial powerOn={powerOn} />
      </RoundedBox>
    </>
  );
}
