import { EffectComposer, Bloom } from "@react-three/postprocessing";

export function PostFX() {
  return (
    <EffectComposer>
      <Bloom
        intensity={0.4}
        luminanceThreshold={1.1}
        luminanceSmoothing={0.35}
        mipmapBlur
      />
    </EffectComposer>
  );
}
