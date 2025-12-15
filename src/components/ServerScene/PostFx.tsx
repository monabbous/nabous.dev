import { EffectComposer, Bloom } from "@react-three/postprocessing";

export function PostFX() {
  return (
    <EffectComposer>
      <Bloom
        intensity={2.15}
        luminanceThreshold={0.18}
        luminanceSmoothing={0.25}
        mipmapBlur
      />
    </EffectComposer>
  );
}
