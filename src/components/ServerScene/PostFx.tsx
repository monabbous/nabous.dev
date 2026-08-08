import { useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";


export function PostFX() {
  const { gl } = useThree();
  const isWebGL = (gl as unknown as { isWebGLRenderer?: boolean })?.isWebGLRenderer === true;

  const ctx = (gl as unknown as { getContext?: () => unknown })?.getContext?.();
  const ctxAttrs =
    typeof (ctx as unknown as { getContextAttributes?: () => unknown }).getContextAttributes ===
    "function"
      ? (ctx as unknown as { getContextAttributes: () => unknown }).getContextAttributes()
      : null;

  // EffectComposer expects a WebGL renderer + a valid WebGL context.
  // During context loss (or if a WebGPU renderer sneaks in), ctxAttrs can be null.
  if (!isWebGL || !ctxAttrs) return null;


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
