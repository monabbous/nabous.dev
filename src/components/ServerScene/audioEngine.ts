const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

export type AudioVec3 = { x: number; y: number; z: number };

type Engine = {
  ctx: AudioContext;
  master: GainNode;
  dryBus: GainNode;
  wetBus: GainNode;
  musicBus: GainNode;
  reverbIn: GainNode;
  convolver: ConvolverNode;
};

type AudioSettings = {
  master: number;
  musicEnabled: boolean;
  musicVolume: number;
  musicUrl: string | null;
  reverbWet: number;
  reverbSeconds: number;
  reverbDecay: number;
};

let engine: Engine | null = null;

// Persist user settings across engine creation.
const desired: AudioSettings = {
  master: 0.9,
  musicEnabled: true,
  musicVolume: 0.55,
  musicUrl: "/Once in a Long, Long While.mp3",
  reverbWet: 0.55,
  reverbSeconds: 4.8,
  reverbDecay: 7.5,
};

type MusicState = {
  el: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  filter: BiquadFilterNode;
  dry: GainNode;
  reverbSend: GainNode;
  wasPlayingBeforePause: boolean;
};

let music: MusicState | null = null;

export function getAudioSettings(): AudioSettings {
  return { ...desired };
}

export function setMasterVolume(volume: number) {
  if (!Number.isFinite(volume)) return;
  desired.master = clamp(volume, 0, 1.5);
  if (engine) engine.master.gain.value = desired.master;
}

export function setMusicEnabled(enabled: boolean) {
  desired.musicEnabled = Boolean(enabled);
  if (!desired.musicEnabled) {
    stopBackgroundMusic();
    return;
  }
}

export function setMusicVolume(volume: number) {
  if (!Number.isFinite(volume)) return;
  desired.musicVolume = clamp(volume, 0, 1.5);
  if (music) music.gain.gain.value = desired.musicVolume;
}

export function setMusicUrl(url: string | null) {
  desired.musicUrl = typeof url === "string" && url.trim().length > 0 ? url : null;
}

export function playBackgroundMusic(url?: string) {
  const nextUrl = typeof url === "string" && url.trim().length > 0 ? url : desired.musicUrl;
  if (!nextUrl) return;

  // Persist URL and ensure engine.
  desired.musicUrl = nextUrl;
  if (!desired.musicEnabled) return;

  const e = ensureAudioEngine(true);
  if (!e) return;

  if (!music) {
    const el = new Audio();
    el.loop = true;
    el.preload = "auto";
    el.crossOrigin = "anonymous";

    const source = e.ctx.createMediaElementSource(el);
    const gain = e.ctx.createGain();
    gain.gain.value = desired.musicVolume;

    const filter = e.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.7;

    const dry = e.ctx.createGain();
    dry.gain.value = 1;

    const reverbSend = e.ctx.createGain();
    reverbSend.gain.value = 0;

    source.connect(gain);
    gain.connect(filter);
    filter.connect(dry);
    dry.connect(e.musicBus);

    filter.connect(reverbSend);
    reverbSend.connect(e.reverbIn);

    music = {
      el,
      source,
      gain,
      filter,
      dry,
      reverbSend,
      wasPlayingBeforePause: false,
    };
  }

  if (music.el.src !== new URL(nextUrl, window.location.href).toString()) {
    music.el.src = nextUrl;
  }

  // Resume context if needed and start playback.
  if (e.ctx.state === "suspended") {
    e.ctx.resume().catch(() => {});
  }

  music.el.volume = 1;
  music.el.play().catch(() => {
    // Some browsers still block until a gesture; caller is expected to be user-initiated.
  });

  // Default presentation for active gameplay.
  setMusicMode("game");
}

export function stopBackgroundMusic() {
  if (!music) return;
  try {
    music.el.pause();
    music.el.currentTime = 0;
    music.wasPlayingBeforePause = false;
  } catch {
    // ignore
  }
}

export function pauseAllAudio() {
  if (music) {
    try {
      music.wasPlayingBeforePause = !music.el.paused;
      music.el.pause();
    } catch {
      // ignore
    }
  }

  if (engine && engine.ctx.state === "running") {
    engine.ctx.suspend().catch(() => {});
  }
}

export function resumeAllAudio() {
  // Resume audio graph.
  resumeAudio(true);

  // Resume music if it was playing.
  if (music && desired.musicEnabled && music.wasPlayingBeforePause) {
    music.wasPlayingBeforePause = false;
    music.el.play().catch(() => {
      // Might still require a gesture depending on browser policies.
    });
  }
}

export type MusicMode = "game" | "paused" | "home";

export function setMusicMode(mode: MusicMode) {
  const e = engine;
  if (!e || !music) return;

  const now = e.ctx.currentTime;

  // Targets tuned for: game = bright/clean, paused = muffled, home = more muffled + bigger verb.
  const targets =
    mode === "game"
      ? { cutoff: 18000, send: 0.0, dry: 1.0 }
      : mode === "paused"
        ? { cutoff: 520, send: 0.08, dry: 1.0 }
        : { cutoff: 420, send: 0.6, dry: 0.85 };

  // Smooth transitions to avoid zipper/clicks.
  try {
    music.filter.frequency.cancelScheduledValues(now);
    music.filter.frequency.setTargetAtTime(targets.cutoff, now, 0.08);

    music.reverbSend.gain.cancelScheduledValues(now);
    music.reverbSend.gain.setTargetAtTime(targets.send, now, 0.12);

    music.dry.gain.cancelScheduledValues(now);
    music.dry.gain.setTargetAtTime(targets.dry, now, 0.12);
  } catch {
    // ignore
  }
}

let lastListener:
  | { position: AudioVec3; forward: AudioVec3; up: AudioVec3 }
  | null = null;

export function getListenerPosition(): AudioVec3 | null {
  if (!lastListener) return null;
  // Return a copy so callers can't mutate our cached state.
  return {
    x: lastListener.position.x,
    y: lastListener.position.y,
    z: lastListener.position.z,
  };
}

function createCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { webkitAudioContext?: typeof AudioContext };
  const Ctx = globalThis.AudioContext ?? w.webkitAudioContext;
  if (!Ctx) return null;
  return new Ctx();
}

function createImpulseResponse(
  ctx: AudioContext,
  seconds = desired.reverbSeconds,
  decay = desired.reverbDecay
): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const env = Math.pow(1 - t, decay);
      // Slightly different noise per channel.
      data[i] = (Math.random() * 2 - 1) * env;
    }
  }

  return buffer;
}

export function getAudioEngine(): Engine | null {
  return engine;
}

export function ensureAudioEngine(enabled: boolean): Engine | null {
  if (!enabled) return null;
  if (engine) return engine;

  const ctx = createCtx();
  if (!ctx) return null;

  const master = ctx.createGain();
  master.gain.value = desired.master;
  master.connect(ctx.destination);

  const dryBus = ctx.createGain();
  dryBus.gain.value = 1;
  dryBus.connect(master);

  const wetBus = ctx.createGain();
  // Overall reverb amount (global wet level). Per-sound wet/dry is controlled via reverbMix.
  wetBus.gain.value = desired.reverbWet;
  wetBus.connect(master);

  const musicBus = ctx.createGain();
  musicBus.gain.value = 1;
  musicBus.connect(master);

  const convolver = ctx.createConvolver();
  convolver.buffer = createImpulseResponse(ctx, desired.reverbSeconds, desired.reverbDecay);

  const reverbIn = ctx.createGain();
  reverbIn.gain.value = 1;
  reverbIn.connect(convolver);
  convolver.connect(wetBus);

  engine = { ctx, master, dryBus, wetBus, musicBus, reverbIn, convolver };
  return engine;
}

export function setReverbSettings({
  wet,
  seconds,
  decay,
}: {
  wet?: number;
  seconds?: number;
  decay?: number;
}) {
  if (typeof wet === "number" && Number.isFinite(wet)) {
    desired.reverbWet = clamp(wet, 0, 1.5);
    if (engine) engine.wetBus.gain.value = desired.reverbWet;
  }

  if (
    (typeof seconds === "number" && Number.isFinite(seconds)) ||
    (typeof decay === "number" && Number.isFinite(decay))
  ) {
    const nextSeconds =
      typeof seconds === "number" && Number.isFinite(seconds)
        ? clamp(seconds, 0.2, 6)
        : desired.reverbSeconds;
    const nextDecay =
      typeof decay === "number" && Number.isFinite(decay)
        ? clamp(decay, 0.5, 12)
        : desired.reverbDecay;

    desired.reverbSeconds = nextSeconds;
    desired.reverbDecay = nextDecay;

    if (engine) {
      engine.convolver.buffer = createImpulseResponse(engine.ctx, nextSeconds, nextDecay);
    }
  }
}

export function resumeAudio(enabled: boolean) {
  const e = ensureAudioEngine(enabled);
  if (!e) return;
  if (e.ctx.state === "suspended") {
    e.ctx.resume().catch(() => {});
  }
}

// NOTE: We avoid importing three at runtime here to keep this module usable without
// forcing three.js into non-3D code paths. Callers pass plain vectors.
export function updateListener(
  position: AudioVec3,
  forward: AudioVec3,
  up: AudioVec3
) {
  const e = engine;
  if (!e) return;

  lastListener = {
    position: { x: position.x, y: position.y, z: position.z },
    forward: { x: forward.x, y: forward.y, z: forward.z },
    up: { x: up.x, y: up.y, z: up.z },
  };

  const l = e.ctx.listener as unknown as {
    positionX?: AudioParam;
    positionY?: AudioParam;
    positionZ?: AudioParam;
    forwardX?: AudioParam;
    forwardY?: AudioParam;
    forwardZ?: AudioParam;
    upX?: AudioParam;
    upY?: AudioParam;
    upZ?: AudioParam;
    setPosition?: (x: number, y: number, z: number) => void;
    setOrientation?: (
      fx: number,
      fy: number,
      fz: number,
      ux: number,
      uy: number,
      uz: number
    ) => void;
  };

  const now = e.ctx.currentTime;

  if (l.positionX && l.positionY && l.positionZ) {
    l.positionX.setValueAtTime(position.x, now);
    l.positionY.setValueAtTime(position.y, now);
    l.positionZ.setValueAtTime(position.z, now);
  } else {
    l.setPosition?.(position.x, position.y, position.z);
  }

  if (l.forwardX && l.forwardY && l.forwardZ && l.upX && l.upY && l.upZ) {
    l.forwardX.setValueAtTime(forward.x, now);
    l.forwardY.setValueAtTime(forward.y, now);
    l.forwardZ.setValueAtTime(forward.z, now);
    l.upX.setValueAtTime(up.x, now);
    l.upY.setValueAtTime(up.y, now);
    l.upZ.setValueAtTime(up.z, now);
  } else {
    l.setOrientation?.(forward.x, forward.y, forward.z, up.x, up.y, up.z);
  }
}

export function playSpatialNoise({
  enabled,
  duration = 0.2,
  decay = 2.5,
  volume = 0.5,
  lowpass = 1200,
  boomHz,
  boomGain = 0.5,
  position,
  reverbMix = 0.25,
}: {
  enabled: boolean;
  duration?: number;
  decay?: number;
  volume?: number;
  lowpass?: number;
  boomHz?: number;
  boomGain?: number;
  position?: AudioVec3;
  reverbMix?: number;
}) {
  const e = ensureAudioEngine(enabled);
  if (!e) return;

  const ctx = e.ctx;
  const now = ctx.currentTime;

  // Buffer
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  const vol = clamp(volume, 0, 2);
  const dec = clamp(decay, 0.5, 8);

  for (let i = 0; i < length; i++) {
    const t = i / length;
    const env = Math.pow(1 - t, dec);
    const noise = (Math.random() * 2 - 1) * env;
    const boom =
      boomHz && boomGain
        ? Math.sin(2 * Math.PI * boomHz * (i / ctx.sampleRate)) * env * boomGain
        : 0;
    data[i] = (noise + boom) * vol;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = lowpass;

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(vol, now);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.95);

  let out: AudioNode = envelope;

  if (position) {
    const panner = ctx.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 2.5;
    panner.maxDistance = 120;
    panner.rolloffFactor = 1.6;

    const px = position.x;
    const py = position.y;
    const pz = position.z;

    const hasParams =
      (panner as unknown as { positionX?: AudioParam }).positionX &&
      (panner as unknown as { positionY?: AudioParam }).positionY &&
      (panner as unknown as { positionZ?: AudioParam }).positionZ;

    if (hasParams) {
      (panner as unknown as { positionX: AudioParam }).positionX.setValueAtTime(px, now);
      (panner as unknown as { positionY: AudioParam }).positionY.setValueAtTime(py, now);
      (panner as unknown as { positionZ: AudioParam }).positionZ.setValueAtTime(pz, now);
    } else {
      (panner as unknown as { setPosition?: (x: number, y: number, z: number) => void }).setPosition?.(
        px,
        py,
        pz
      );
    }

    envelope.connect(panner);
    out = panner;
  }

  const dryGain = ctx.createGain();
  const wetGain = ctx.createGain();
  const mix = clamp(reverbMix, 0, 1);
  dryGain.gain.value = 1 - mix;
  wetGain.gain.value = mix;

  source.connect(filter);
  filter.connect(envelope);

  out.connect(dryGain);
  dryGain.connect(e.dryBus);

  out.connect(wetGain);
  wetGain.connect(e.reverbIn);

  source.start();
  source.stop(now + duration + 0.05);

  // Cleanup
  source.onended = () => {
    try {
      source.disconnect();
      filter.disconnect();
      envelope.disconnect();
      dryGain.disconnect();
      wetGain.disconnect();
      if (out !== envelope) out.disconnect();
    } catch {
      // ignore
    }
  };
}

export function playSpatialWarpOut({
  enabled,
  intensity = 1,
  duration = 0.28,
  position,
  reverbMix = 0.55,
}: {
  enabled: boolean;
  intensity?: number;
  duration?: number;
  position?: AudioVec3;
  reverbMix?: number;
}) {
  const e = ensureAudioEngine(enabled);
  if (!e) return;

  const ctx = e.ctx;
  const now = ctx.currentTime;

  const amt = clamp(intensity, 0.2, 2);
  const dur = clamp(duration, 0.12, 0.8);
  const wet = clamp(reverbMix, 0, 1);

  // Short filtered noise whoosh.
  const noiseLen = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const noiseBuffer = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  // Tonal “warp” accent (downward sweep reads more like a sci-fi whoosh).
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.detune.setValueAtTime((Math.random() * 2 - 1) * 18, now);
  osc.frequency.setValueAtTime(2400, now);
  osc.frequency.exponentialRampToValueAtTime(220, now + dur);

  const mix = ctx.createGain();
  mix.gain.value = 1;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.15;
  // Sweep from airy to midrange to get a “whoosh”.
  filter.frequency.setValueAtTime(6200, now);
  filter.frequency.exponentialRampToValueAtTime(700, now + dur);

  const envelope = ctx.createGain();
  const peak = clamp(0.11 * amt, 0.03, 0.22);
  envelope.gain.setValueAtTime(0, now);
  // Gentler attack to avoid clicks/pops.
  envelope.gain.linearRampToValueAtTime(peak, now + 0.03);
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  noise.connect(mix);
  osc.connect(mix);
  mix.connect(filter);
  filter.connect(envelope);

  let out: AudioNode = envelope;
  if (position) {
    const panner = ctx.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 2.5;
    panner.maxDistance = 120;
    panner.rolloffFactor = 1.6;

    const px = position.x;
    const py = position.y;
    const pz = position.z;

    const hasParams =
      (panner as unknown as { positionX?: AudioParam }).positionX &&
      (panner as unknown as { positionY?: AudioParam }).positionY &&
      (panner as unknown as { positionZ?: AudioParam }).positionZ;

    if (hasParams) {
      (panner as unknown as { positionX: AudioParam }).positionX.setValueAtTime(px, now);
      (panner as unknown as { positionY: AudioParam }).positionY.setValueAtTime(py, now);
      (panner as unknown as { positionZ: AudioParam }).positionZ.setValueAtTime(pz, now);
    } else {
      (panner as unknown as { setPosition?: (x: number, y: number, z: number) => void }).setPosition?.(
        px,
        py,
        pz
      );
    }

    envelope.connect(panner);
    out = panner;
  }

  const dryGain = ctx.createGain();
  const wetGain = ctx.createGain();
  dryGain.gain.value = 1 - wet;
  wetGain.gain.value = wet;

  out.connect(dryGain);
  dryGain.connect(e.dryBus);

  out.connect(wetGain);
  wetGain.connect(e.reverbIn);

  let ended = 0;
  const cleanup = () => {
    ended += 1;
    if (ended < 2) return;
    try {
      noise.disconnect();
      osc.disconnect();
      mix.disconnect();
      filter.disconnect();
      envelope.disconnect();
      dryGain.disconnect();
      wetGain.disconnect();
      if (out !== envelope) out.disconnect();
    } catch {
      // ignore
    }
  };

  noise.onended = cleanup;
  osc.onended = cleanup;

  noise.start();
  osc.start();
  noise.stop(now + dur + 0.02);
  osc.stop(now + dur + 0.02);
}
