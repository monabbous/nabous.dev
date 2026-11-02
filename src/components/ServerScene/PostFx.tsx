import { EffectComposer, Bloom } from "@react-three/postprocessing";

export function PostFX() {
  return (
    <EffectComposer>
      <Bloom
        intensity={1.15}
        luminanceThreshold={0.55}
        luminanceSmoothing={0.35}
        mipmapBlur
      />
    </EffectComposer>
  );
}
