import {
  type HTMLAttributes,
  type MutableRefObject,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getAudioSettings,
  setMasterVolume,
  setMusicEnabled,
  setMusicVolume,
  setReverbSettings,
} from "@nabous.dev/components/ServerScene/audioEngine";

export function PauseScreen({
  visible,
  onResume,
  onQuit,
  preferWebGPU,
  onToggleWebGPU,
  qualityChoice,
  resolvedQuality,
  onCycleQuality,
  isMouse,
}: {
  visible: boolean;
  onResume: () => void;
  onQuit: () => void;
  preferWebGPU: boolean;
  onToggleWebGPU: () => void;
  qualityChoice: "auto" | "low" | "medium" | "high";
  resolvedQuality: "low" | "medium" | "high";
  onCycleQuality: () => void;
  isMouse?: boolean;
}) {
  if (!visible) return null;

  type Section = "controls" | "audio" | "graphics";
  const [section, setSection] = useState<Section>("controls");

  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    return Boolean(document.fullscreenElement);
  });

  const [{ master, reverbWet, reverbSeconds, reverbDecay, musicEnabled, musicVolume }, setAudio] =
    useState(() => getAudioSettings());

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFullscreen = () => {
    const el = document.documentElement;
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
      return;
    }
    el.requestFullscreen?.().catch(() => {});
  };

  const setMaster = (v: number) => {
    setAudio((cur) => ({ ...cur, master: v }));
    setMasterVolume(v);
  };

  const setMusicOn = (v: boolean) => {
    setAudio((cur) => ({ ...cur, musicEnabled: v }));
    setMusicEnabled(v);
  };

  const setMusicVol = (v: number) => {
    setAudio((cur) => ({ ...cur, musicVolume: v }));
    setMusicVolume(v);
  };

  const setReverbWet = (v: number) => {
    setAudio((cur) => ({ ...cur, reverbWet: v }));
    setReverbSettings({ wet: v });
  };

  const setReverbSeconds = (v: number) => {
    setAudio((cur) => ({ ...cur, reverbSeconds: v }));
    setReverbSettings({ seconds: v });
  };

  const setReverbDecay = (v: number) => {
    setAudio((cur) => ({ ...cur, reverbDecay: v }));
    setReverbSettings({ decay: v });
  };

  const SectionButton = ({
    id,
    label,
  }: {
    id: Section;
    label: string;
  }) => {
    const active = section === id;
    return (
      <button
        type="button"
        className={
          "px-3 py-2 text-xs font-semibold cursor-pointer glassmorph glassmorph-border hover:glassmorph-glow-opacity-30 " +
          (active ? "glassmorph-glow-opacity-60" : "")
        }
        onClick={() => setSection(id)}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-lg px-4"
      onPointerDown={() => {
        // Mouse-only affordance: click the screen to re-capture pointer lock.
        if (isMouse) onResume();
      }}
    >
      <div
        className="glassmorph glassmorph-border text-white w-[min(90vw,520px)] p-6 space-y-5"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Paused</h2>
          <button
            type="button"
            className="px-3 py-2 glassmorph glassmorph-border hover:glassmorph-glow-opacity-30 text-xs font-semibold cursor-pointer"
            onClick={onQuit}
          >
            Back to home
          </button>
        </div>

        <p className="text-sm text-white/80">
          Mouse is free. Press Resume to recapture the cursor. Press P anytime to toggle pause.
        </p>

        {isMouse && (
          <div className="glassmorph glassmorph-border p-3 text-sm text-white/85">
            Controls lost? Click anywhere to re-capture the mouse.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <SectionButton id="controls" label="Controls" />
          <SectionButton id="audio" label="Audio" />
          <SectionButton id="graphics" label="Graphics" />
        </div>

        {section === "controls" && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="glassmorph glassmorph-border p-3 space-y-1">
              <div className="text-xs uppercase tracking-wide text-white/60">
                Movement
              </div>
              <div>WASD / Left Stick</div>
              <div>Shift to sprint</div>
              <div>Space to jump</div>
            </div>
            <div className="glassmorph glassmorph-border p-3 space-y-1">
              <div className="text-xs uppercase tracking-wide text-white/60">
                Actions
              </div>
              <div>E / B to interact</div>
              <div>P to pause/resume</div>
              <div>Esc to release mouse</div>
            </div>
          </div>
        )}

        {section === "audio" && (
          <div className="space-y-4">
            <div className="glassmorph glassmorph-border p-3 space-y-2">
              <div className="text-xs uppercase tracking-wide text-white/60">
                Music
              </div>

              <button
                type="button"
                className="w-full px-3 py-2 glassmorph glassmorph-border hover:glassmorph-glow-opacity-30 text-xs font-semibold cursor-pointer"
                onClick={() => setMusicOn(!musicEnabled)}
              >
                Music: {musicEnabled ? "On" : "Off"}
              </button>

              <div className="flex items-center justify-between text-sm">
                <div>Volume</div>
                <div className="text-white/70 tabular-nums">
                  {musicVolume.toFixed(2)}
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={1.5}
                step={0.01}
                value={musicVolume}
                onChange={(e) => setMusicVol(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="glassmorph glassmorph-border p-3 space-y-2">
              <div className="text-xs uppercase tracking-wide text-white/60">
                Master
              </div>
              <div className="flex items-center justify-between text-sm">
                <div>Volume</div>
                <div className="text-white/70 tabular-nums">
                  {master.toFixed(2)}
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={1.5}
                step={0.01}
                value={master}
                onChange={(e) => setMaster(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="glassmorph glassmorph-border p-3 space-y-3">
              <div className="text-xs uppercase tracking-wide text-white/60">
                Reverb
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div>Amount</div>
                  <div className="text-white/70 tabular-nums">
                    {reverbWet.toFixed(2)}
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.01}
                  value={reverbWet}
                  onChange={(e) => setReverbWet(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div>Room size (seconds)</div>
                  <div className="text-white/70 tabular-nums">
                    {reverbSeconds.toFixed(2)}
                  </div>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={6}
                  step={0.05}
                  value={reverbSeconds}
                  onChange={(e) => setReverbSeconds(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div>Decay</div>
                  <div className="text-white/70 tabular-nums">
                    {reverbDecay.toFixed(2)}
                  </div>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={12}
                  step={0.1}
                  value={reverbDecay}
                  onChange={(e) => setReverbDecay(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {section === "graphics" && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <button
              type="button"
              className="px-3 py-3 glassmorph glassmorph-border hover:glassmorph-glow-opacity-30 text-xs font-semibold cursor-pointer"
              onClick={toggleFullscreen}
            >
              Fullscreen: {isFullscreen ? "On" : "Off"}
            </button>

            <button
              type="button"
              className="px-3 py-3 glassmorph glassmorph-border hover:glassmorph-glow-opacity-30 text-xs font-semibold cursor-pointer"
              onClick={onToggleWebGPU}
            >
              WebGPU (experimental): {preferWebGPU ? "On" : "Off"}
            </button>

            <button
              type="button"
              className="col-span-2 px-3 py-3 glassmorph glassmorph-border hover:glassmorph-glow-opacity-30 text-xs font-semibold cursor-pointer"
              onClick={onCycleQuality}
            >
              Quality: {qualityChoice} ({resolvedQuality})
            </button>
          </div>
        )}

        <div className="flex gap-3 justify-between items-center flex-wrap">
          <button
            type="button"
            className="px-4 py-2 glassmorph glassmorph-border hover:glassmorph-glow-opacity-30 text-sm font-semibold cursor-pointer"
            onClick={onQuit}
          >
            Quit
          </button>

          <button
            type="button"
            className="px-4 py-2 glassmorph glassmorph-border hover:glassmorph-glow-opacity-30 font-semibold shadow cursor-pointer"
            onClick={onResume}
          >
            Resume
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettingsScreen({
  visible,
  onClose,
  preferWebGPU,
  onToggleWebGPU,
  qualityChoice,
  resolvedQuality,
  onCycleQuality,
}: {
  visible: boolean;
  onClose: () => void;
  preferWebGPU: boolean;
  onToggleWebGPU: () => void;
  qualityChoice: "auto" | "low" | "medium" | "high";
  resolvedQuality: "low" | "medium" | "high";
  onCycleQuality: () => void;
}) {
  if (!visible) return null;

  type Section = "controls" | "audio" | "graphics";
  const [section, setSection] = useState<Section>("graphics");

  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    return Boolean(document.fullscreenElement);
  });

  const [{ master, reverbWet, reverbSeconds, reverbDecay, musicEnabled, musicVolume }, setAudio] =
    useState(() => getAudioSettings());

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFullscreen = () => {
    const el = document.documentElement;
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
      return;
    }
    el.requestFullscreen?.().catch(() => {});
  };

  const setMaster = (v: number) => {
    setAudio((cur) => ({ ...cur, master: v }));
    setMasterVolume(v);
  };

  const setReverbWet = (v: number) => {
    setAudio((cur) => ({ ...cur, reverbWet: v }));
    setReverbSettings({ wet: v });
  };

  const setReverbSeconds = (v: number) => {
    setAudio((cur) => ({ ...cur, reverbSeconds: v }));
    setReverbSettings({ seconds: v });
  };

  const setReverbDecay = (v: number) => {
    setAudio((cur) => ({ ...cur, reverbDecay: v }));
    setReverbSettings({ decay: v });
  };

  const setMusicOn = (v: boolean) => {
    setAudio((cur) => ({ ...cur, musicEnabled: v }));
    setMusicEnabled(v);
  };

  const setMusicVol = (v: number) => {
    setAudio((cur) => ({ ...cur, musicVolume: v }));
    setMusicVolume(v);
  };

  const SectionButton = ({ id, label }: { id: Section; label: string }) => {
    const active = section === id;
    return (
      <button
        type="button"
        className={
          "px-3 py-2 text-xs font-semibold cursor-pointer glassmorph glassmorph-border hover:glassmorph-glow-opacity-30 " +
          (active ? "glassmorph-glow-opacity-60" : "")
        }
        onClick={() => setSection(id)}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-lg px-4">
      <div className="glassmorph glassmorph-border text-white w-[min(90vw,520px)] p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Settings</h2>
          <button
            type="button"
            className="px-3 py-2 glassmorph glassmorph-border hover:glassmorph-glow-opacity-30 text-xs font-semibold cursor-pointer"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <SectionButton id="controls" label="Controls" />
          <SectionButton id="audio" label="Audio" />
          <SectionButton id="graphics" label="Graphics" />
        </div>

        {section === "controls" && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="glassmorph glassmorph-border p-3 space-y-1">
              <div className="text-xs uppercase tracking-wide text-white/60">Movement</div>
              <div>WASD / Left Stick</div>
              <div>Shift to sprint</div>
              <div>Space to jump</div>
            </div>
            <div className="glassmorph glassmorph-border p-3 space-y-1">
              <div className="text-xs uppercase tracking-wide text-white/60">Actions</div>
              <div>E / B to interact</div>
              <div>P to pause/resume</div>
              <div>Esc to release mouse</div>
            </div>
          </div>
        )}

        {section === "audio" && (
          <div className="space-y-4">
            <div className="glassmorph glassmorph-border p-3 space-y-2">
              <div className="text-xs uppercase tracking-wide text-white/60">Music</div>

              <button
                type="button"
                className="w-full px-3 py-2 glassmorph glassmorph-border hover:glassmorph-glow-opacity-30 text-xs font-semibold cursor-pointer"
                onClick={() => setMusicOn(!musicEnabled)}
              >
                Music: {musicEnabled ? "On" : "Off"}
              </button>

              <div className="flex items-center justify-between text-sm">
                <div>Volume</div>
                <div className="text-white/70 tabular-nums">{musicVolume.toFixed(2)}</div>
              </div>
              <input
                type="range"
                min={0}
                max={1.5}
                step={0.01}
                value={musicVolume}
                onChange={(e) => setMusicVol(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="glassmorph glassmorph-border p-3 space-y-2">
              <div className="text-xs uppercase tracking-wide text-white/60">Master</div>
              <div className="flex items-center justify-between text-sm">
                <div>Volume</div>
                <div className="text-white/70 tabular-nums">{master.toFixed(2)}</div>
              </div>
              <input
                type="range"
                min={0}
                max={1.5}
                step={0.01}
                value={master}
                onChange={(e) => setMaster(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="glassmorph glassmorph-border p-3 space-y-3">
              <div className="text-xs uppercase tracking-wide text-white/60">Reverb</div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div>Amount</div>
                  <div className="text-white/70 tabular-nums">{reverbWet.toFixed(2)}</div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.01}
                  value={reverbWet}
                  onChange={(e) => setReverbWet(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div>Room size (seconds)</div>
                  <div className="text-white/70 tabular-nums">{reverbSeconds.toFixed(2)}</div>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={6}
                  step={0.05}
                  value={reverbSeconds}
                  onChange={(e) => setReverbSeconds(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div>Decay</div>
                  <div className="text-white/70 tabular-nums">{reverbDecay.toFixed(2)}</div>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={12}
                  step={0.1}
                  value={reverbDecay}
                  onChange={(e) => setReverbDecay(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {section === "graphics" && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <button
              type="button"
              className="px-3 py-3 glassmorph glassmorph-border hover:glassmorph-glow-opacity-30 text-xs font-semibold cursor-pointer"
              onClick={toggleFullscreen}
            >
              Fullscreen: {isFullscreen ? "On" : "Off"}
            </button>

            <button
              type="button"
              className="px-3 py-3 glassmorph glassmorph-border hover:glassmorph-glow-opacity-30 text-xs font-semibold cursor-pointer"
              onClick={onToggleWebGPU}
            >
              WebGPU (experimental): {preferWebGPU ? "On" : "Off"}
            </button>

            <button
              type="button"
              className="col-span-2 px-3 py-3 glassmorph glassmorph-border hover:glassmorph-glow-opacity-30 text-xs font-semibold cursor-pointer"
              onClick={onCycleQuality}
            >
              Quality: {qualityChoice} ({resolvedQuality})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function TouchControls({
  visible,
  onRequestPlay,
  touchMoveRef,
  touchLookRef,
  touchFireRef,
}: {
  visible: boolean;
  onRequestPlay: () => void;
  touchMoveRef: MutableRefObject<{ x: number; z: number }>;
  touchLookRef: MutableRefObject<{ x: number; y: number }>;
  touchFireRef: MutableRefObject<boolean>;
}) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-20 select-none">
      <div className="absolute bottom-6 left-4 pointer-events-auto">
        <AnalogStick
          label="Move"
          onStart={onRequestPlay}
          onChange={(x, y) => {
            // x => strafe, y => forward/back (positive up)
            touchMoveRef.current = { x, z: -y };
          }}
          onEnd={() => {
            touchMoveRef.current = { x: 0, z: 0 };
          }}
        />
      </div>

      <div className="absolute bottom-6 right-4 pointer-events-auto flex flex-col gap-3 items-end">
        <AnalogStick
          label="Look"
          onStart={onRequestPlay}
          onChange={(x, y) => {
            touchLookRef.current = { x, y };
          }}
          onEnd={() => {
            touchLookRef.current = { x: 0, y: 0 };
          }}
        />

        <div className="flex gap-2">
          <TouchButton label="Jump" aria="Jump" wide {...bindKey(onRequestPlay, " ")} />
          <TouchButton label="Interact" aria="Interact" wide {...bindKey(onRequestPlay, "e")} />
          <TouchButton
            label="Fire"
            aria="Fire"
            wide
            onPointerDown={(e) => {
              e.preventDefault();
              onRequestPlay();
              touchFireRef.current = true;
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              touchFireRef.current = false;
            }}
            onPointerLeave={() => {
              touchFireRef.current = false;
            }}
            onPointerCancel={() => {
              touchFireRef.current = false;
            }}
          />
        </div>
      </div>
    </div>
  );
}

function TouchButton({
  label,
  aria,
  wide = false,
  ...rest
}: {
  label: string;
  aria: string;
  wide?: boolean;
} & HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={aria}
      className={`px-4 py-3 glassmorph glassmorph-border text-white text-xs uppercase tracking-wide backdrop-blur-md shadow-lg active:scale-95 transition-transform pointer-events-auto ${
        wide ? "min-w-21" : "min-w-16"
      }`}
      {...rest}
    >
      {label}
    </button>
  );
}

function bindKey(onRequestPlay: () => void, key: string) {
  const sendKey = (type: "keydown" | "keyup", pressed: string) => {
    const code = pressed === " " ? "Space" : pressed;
    window.dispatchEvent(new KeyboardEvent(type, { key: pressed, code }));
  };

  return {
    onPointerDown: (event: PointerEvent) => {
      event.preventDefault();
      onRequestPlay();
      sendKey("keydown", key);
    },
    onPointerUp: (event: PointerEvent) => {
      event.preventDefault();
      sendKey("keyup", key);
    },
    onPointerLeave: () => sendKey("keyup", key),
    onPointerCancel: () => sendKey("keyup", key),
  };
}

function AnalogStick({
  label,
  onChange,
  onEnd,
  onStart,
}: {
  label: string;
  onStart: () => void;
  onChange: (x: number, y: number) => void;
  onEnd: () => void;
}) {
  const pointerIdRef = useRef<number | null>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const radiusPx = 60;

  const reset = () => {
    pointerIdRef.current = null;
    setThumb({ x: 0, y: 0 });
    onEnd();
  };

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== null) return;
    e.preventDefault();
    pointerIdRef.current = e.pointerId;
    originRef.current = { x: e.clientX, y: e.clientY };
    setThumb({ x: 0, y: 0 });
    onStart();
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    const dx = e.clientX - originRef.current.x;
    const dy = e.clientY - originRef.current.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, radiusPx);
    const nx = dist > 0 ? (dx / dist) * (clampedDist / radiusPx) : 0;
    const ny = dist > 0 ? (dy / dist) * (clampedDist / radiusPx) : 0;
    setThumb({ x: nx * radiusPx, y: ny * radiusPx });
    onChange(nx, ny);
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    reset();
  };

  const handlePointerLeave = (_e: PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current === null) return;
    reset();
  };

  return (
    <div
      className="relative w-35 h-35 rounded-full bg-white/5 border border-white/15 backdrop-blur-xl text-white"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs uppercase tracking-wide text-white/60">
        {label}
      </div>
      <div className="absolute inset-2 rounded-full border border-white/15" />
      <div className="absolute inset-8 rounded-full border border-white/15" />
      <div
        className="absolute top-1/2 left-1/2 w-12 h-12 rounded-full bg-white/30 border border-white/40 shadow-lg pointer-events-none"
        style={{
          transform: `translate(calc(-50% + ${thumb.x}px), calc(-50% + ${thumb.y}px))`,
        }}
      />
    </div>
  );
}
