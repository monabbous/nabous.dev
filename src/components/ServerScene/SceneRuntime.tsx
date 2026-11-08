import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { sceneBudget, type SceneQuality } from "./quality";
import { createSceneClock } from "./frame-clock";

/** One display-synced clock; Rapier follows it without a second animation loop. */
export function SceneRuntime({ quality, adaptive, onSlow }: { quality: SceneQuality; adaptive: boolean; onSlow: () => void }) {
  const { advance, gl, clock } = useThree();
  const callback = useRef(onSlow);
  callback.current = onSlow;
  const samples = useRef({ frames: 0, slow: 0, sampleTime: 0 });
  useEffect(() => {
    let raf = 0;
    const frameClock = createSceneClock(sceneBudget(quality).frameRate);
    samples.current = { frames: 0, slow: 0, sampleTime: performance.now() };
    let elapsed = clock.elapsedTime;
    const tick = (now: number) => {
      raf = 0;
      if (document.hidden) return;
      const delta = frameClock.tick(now);
      if (delta !== null) {
        elapsed += delta;
        advance(elapsed);
      }
      raf = requestAnimationFrame(tick);
    };
    const visibility = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      frameClock.reset();
      if (!document.hidden) raf = requestAnimationFrame(tick);
    };
    document.addEventListener("visibilitychange", visibility);
    visibility();
    return () => { cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", visibility); };
  }, [advance, clock, quality]);
  useEffect(() => {
    const previous = gl.info.autoReset;
    gl.info.autoReset = false;
    return () => { gl.info.autoReset = previous; };
  }, [gl]);
  useFrame((_, delta) => {
    const s = samples.current;
    s.frames++;
    // Initial shader compilation and tab restoration aren't sustained pressure.
    if (adaptive && s.frames > 60 && delta < 0.25) {
      s.slow = delta > .04 ? s.slow + 1 : Math.max(0, s.slow - 1);
      if (s.slow >= 30 && quality !== "low") { s.slow = 0; callback.current(); }
    }
    if (process.env.NODE_ENV === "development" && s.frames % 30 === 0) {
      const now = performance.now();
      const fps = Math.round(30000 / Math.max(1, now - s.sampleTime));
      s.sampleTime = now;
      gl.domElement.dataset.renderStats = JSON.stringify({ frames: s.frames, fps, quality, calls: gl.info.render.calls,
        triangles: gl.info.render.triangles, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures });
    }
    gl.info.reset();
  }, -100);
  return null;
}
