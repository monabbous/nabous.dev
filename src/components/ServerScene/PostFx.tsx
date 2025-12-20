import { EffectComposer, Bloom } from "@react-three/postprocessing";

export function PostFX() {
  return (
    <EffectComposer>
      <Bloom
        intensity={3.15}
        luminanceThreshold={0.1}
        luminanceSmoothing={0.25}
        mipmapBlur
      />
    </EffectComposer>
  );
}
