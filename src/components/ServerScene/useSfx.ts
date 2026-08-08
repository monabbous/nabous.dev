import { useCallback, useEffect, useMemo, useRef } from "react";

import {
  ensureAudioEngine,
  getListenerPosition,
  playSpatialNoise,
  playSpatialWarpOut,
  resumeAudio,
  setReverbSettings,
  type AudioVec3,
} from "./audioEngine";

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type SfxApi = {
  playFootstep: (intensity?: number, position?: AudioVec3) => void;
  playDebrisThud: (intensity?: number, position?: AudioVec3) => void;
  playDebrisWarpOut: (intensity?: number, position?: AudioVec3) => void;
  setReverb: (settings: {
    wet?: number;
    /** Convenience: 0..1 mapped to the impulse response length (seconds). */
    roomSize?: number;
    /** Impulse response length in seconds. (Bigger = larger room.) */
    seconds?: number;
    /** Tail steepness/exponent. (Bigger = longer/smoother tail.) */
    decay?: number;
  }) => void;
};

export function useSfx(enabled = true): SfxApi {
  const primedRef = useRef(false);

  const ensureCtx = useCallback(() => {
    if (!enabled) return null;
    const e = ensureAudioEngine(true);
    if (!e) return null;
    resumeAudio(true);
    primedRef.current = primedRef.current || e.ctx.state === "running";
    return e.ctx;
  }, [enabled]);

  // Prime the AudioContext on the first user gesture so browsers allow playback.
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const prime = () => {
      if (primedRef.current) return;
      const ctx = ensureCtx();
      if (!ctx) return;
      ctx.resume().then(() => {
        primedRef.current = true;
      });
    };

    window.addEventListener("pointerdown", prime, { passive: true });
    window.addEventListener("touchstart", prime, { passive: true });
    window.addEventListener("keydown", prime, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("touchstart", prime);
      window.removeEventListener("keydown", prime);
    };
  }, [enabled, ensureCtx]);

  const playNoise = useCallback(
    ({
      duration = 0.2,
      decay = 2.5,
      volume = 5,
      lowpass = 1200,
      boomHz,
      boomGain = 0.5,
      position,
      reverbMix,
    }: {
      duration?: number;
      decay?: number;
      volume?: number;
      lowpass?: number;
      boomHz?: number;
      boomGain?: number;
      position?: AudioVec3;
      reverbMix?: number;
    }) => {
      if (!ensureCtx()) return;
      playSpatialNoise({
        enabled,
        duration,
        decay,
        volume,
        lowpass,
        boomHz,
        boomGain,
        position: position ?? getListenerPosition() ?? undefined,
        reverbMix,
      });
    },
    [enabled, ensureCtx]
  );

  const setReverb = useCallback(
    (settings: {
      wet?: number;
      roomSize?: number;
      seconds?: number;
      decay?: number;
    }) => {
      if (!ensureCtx()) return;

      const roomSize = settings.roomSize;
      const seconds =
        typeof roomSize === "number" && Number.isFinite(roomSize)
          ? lerp(0.4, 5, clamp(roomSize, 0, 1))
          : settings.seconds;

      setReverbSettings({
        wet: settings.wet,
        seconds,
        decay: settings.decay,
      });
    },
    [ensureCtx]
  );

  const api = useMemo<SfxApi>(() => {
    return {
      playFootstep: (intensity = 1, position) => {
        const amt = clamp(intensity, 0.2, 2);
        playNoise({
          duration: 0.18,
          decay: 3.2,
          volume: 0.3 * amt,
          lowpass: 900 + 1100 * amt,
          boomHz: 90 + 40 * amt,
          boomGain: 0.5,
          position,
          reverbMix: 0.28,
        });
      },
      playDebrisThud: (intensity = 1, position) => {
        const amt = clamp(intensity, 0.4, 2.2);
        playNoise({
          duration: 0.32,
          decay: 5.2,
          volume: 1 * amt,
          lowpass: 350 + 450 * amt,
          boomHz: 55 + 35 * amt,
          boomGain: 0.8,
          position,
          reverbMix: 0.42,
        });
      },
      playDebrisWarpOut: (intensity = 1, position) => {
        if (!ensureCtx()) return;
        playSpatialWarpOut({
          enabled,
          intensity: intensity * 1.15,
          position: position ?? getListenerPosition() ?? undefined,
          reverbMix: 0.6,
          duration: 0.28,
        });
      },
      setReverb,
    };
  }, [enabled, ensureCtx, playNoise, setReverb]);

  return api;
}
