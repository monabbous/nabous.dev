import { BusinessCard } from "@nabous.dev/components/BusinessCard";
import { ServerScene } from "@nabous.dev/components/ServerScene";
import { SVGGlassMorph } from "@nabous.dev/components/SVGGlassMorph";
import { SVGGlassMorphText } from "@nabous.dev/components/SVGGlassMorphText";
import { PauseScreen, SettingsScreen, TouchControls } from "@nabous.dev/app/home/HomeUI";
import {
  pauseAllAudio,
  playBackgroundMusic,
  resumeAllAudio,
  setMusicMode,
} from "@nabous.dev/components/ServerScene/audioEngine";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useLocalStorage from "use-local-storage";

export default function Home() {
  const CANVAS_ID = "server-scene-canvas";
  const [play, setPlay] = useState<boolean>(false);

  const [paused, setPaused] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [hasKeyboard, setHasKeyboard] = useState(false);
  const [hasGamepad, setHasGamepad] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [hasMousePointer, setHasMousePointer] = useState(false);
  const [needsLandscape, setNeedsLandscape] = useState(false);

  const [preferWebGPU, setPreferWebGPU] = useLocalStorage<boolean>(
    "prefer-webgpu",
    false
  );
  const [qualityChoice, setQualityChoice] = useLocalStorage<
    "auto" | "low" | "medium" | "high"
  >("render-quality", "auto");
  const touchMoveRef = useRef({ x: 0, z: 0 });
  const touchLookRef = useRef({ x: 0, y: 0 });
  const touchFireRef = useRef(false);

  const resolvedQuality = useMemo(() => {
    if (qualityChoice !== "auto") return qualityChoice;

    if (typeof window === "undefined") return "low" as const;

    const cores =
      typeof navigator !== "undefined" ? navigator.hardwareConcurrency ?? 4 : 4;
    // deviceMemory is non-standard but available on many browsers
    const mem =
      typeof (navigator as unknown as { deviceMemory?: number })
        ?.deviceMemory === "number"
        ? (navigator as unknown as { deviceMemory?: number }).deviceMemory!
        : 4;
    if (cores <= 2 || mem <= 2) return "low" as const;
    if (cores <= 4 || mem <= 4) return "medium" as const;
    return "high" as const;
  }, [qualityChoice]);

  const requestFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (document.fullscreenElement) return;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const requestPointerLock = useCallback(() => {
    // Only use pointer lock for mouse/trackpad (fine pointer).
    if (!hasMousePointer) return;
    const canvas = document.getElementById(
      CANVAS_ID
    ) as HTMLCanvasElement | null;
    canvas?.requestPointerLock?.();
  }, [CANVAS_ID, hasMousePointer]);

  const exitPointerLock = useCallback(() => {
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }, []);

  const handleEnterGame = useCallback(() => {
    // This click counts as a user gesture; start background music here.
    playBackgroundMusic("/Once in a Long, Long While.mp3");
    setMusicMode("game");
    setPaused(false);
    setPlay(true);
    requestFullscreen();
    requestPointerLock();
  }, [requestFullscreen, requestPointerLock, setPlay]);

  const pauseGame = useCallback(() => {
    setPaused(true);
    exitPointerLock();
    setMusicMode("paused");
  }, [exitPointerLock]);

  const resumeGame = useCallback(() => {
    if (!play) return;
    setPaused(false);
    setMusicMode("game");
    requestFullscreen();
    requestPointerLock();
  }, [play, requestFullscreen, requestPointerLock]);

  const quitToHome = useCallback(() => {
    setPaused(false);
    setPlay(false);
    exitFullscreen();
    exitPointerLock();
    // Keep music playing, but make it feel distant/ambient on home.
    setMusicMode("home");
  }, [exitFullscreen, exitPointerLock, setPlay]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(pointer: coarse)");
    const fineMq = window.matchMedia("(pointer: fine)");
    const updateTouch = () => {
      setIsTouchDevice(
        mq.matches ||
          (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0)
      );
    };

    const updateMouse = () => {
      setHasMousePointer(fineMq.matches);
    };

    const markKeyboard = (event: KeyboardEvent) => {
      if (event.isTrusted) setHasKeyboard(true);
    };
    const onGamepadConnected = () => setHasGamepad(true);
    const onGamepadDisconnected = () => setHasGamepad(false);

    updateTouch();
    updateMouse();

    window.addEventListener("keydown", markKeyboard, { passive: true });
    window.addEventListener("gamepadconnected", onGamepadConnected);
    window.addEventListener("gamepaddisconnected", onGamepadDisconnected);
    mq.addEventListener?.("change", updateTouch);
    fineMq.addEventListener?.("change", updateMouse);

    return () => {
      window.removeEventListener("keydown", markKeyboard);
      window.removeEventListener("gamepadconnected", onGamepadConnected);
      window.removeEventListener("gamepaddisconnected", onGamepadDisconnected);
      mq.removeEventListener?.("change", updateTouch);
      fineMq.removeEventListener?.("change", updateMouse);
    };
  }, []);

  useEffect(() => {
    const updateLandscape = () => {
      if (typeof window === "undefined") return;
      setNeedsLandscape(
        isTouchDevice && window.innerWidth < window.innerHeight
      );
    };

    updateLandscape();
    window.addEventListener("resize", updateLandscape, { passive: true });
    window.addEventListener("orientationchange", updateLandscape);

    return () => {
      window.removeEventListener("resize", updateLandscape);
      window.removeEventListener("orientationchange", updateLandscape);
    };
  }, [isTouchDevice]);

  useEffect(() => {
    if (!play) {
      setPaused(false);
      exitPointerLock();
    }
  }, [exitPointerLock, play]);

  useEffect(() => {
    const handleLockChange = () => {
      // Only treat pointer lock changes as pause/resume when we're actually using pointer lock.
      if (!play || !hasMousePointer) return;
      const locked = document.pointerLockElement;
      setPaused(!locked);
    };

    document.addEventListener("pointerlockchange", handleLockChange);
    return () => {
      document.removeEventListener("pointerlockchange", handleLockChange);
    };
  }, [hasMousePointer, play]);

  // Keep music processing in sync with pause state (Esc/pointer-lock can pause without calling pauseGame()).
  useEffect(() => {
    if (!play) return;
    setMusicMode(paused ? "paused" : "game");
  }, [paused, play]);

  // Pause all audio when the tab/window loses focus.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityOrFocus = () => {
      if (document.hidden) {
        pauseAllAudio();
        return;
      }

      // Best-effort resume when returning.
      resumeAllAudio();

      // Restore the correct processing mode for the current state.
      if (play) setMusicMode(paused ? "paused" : "game");
    };

    const handleBlur = () => {
      pauseAllAudio();
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, [paused, play]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!play) return;
      if (event.key === "Escape") {
        // If the user is paused (often due to Esc releasing pointer lock/fullscreen),
        // pressing Escape again should resume and re-enter fullscreen.
        if (paused) {
          event.preventDefault();
          resumeGame();
        }
        return;
      }
      if (event.key === "p" || event.key === "P") {
        event.preventDefault();
        if (paused) {
          resumeGame();
        } else {
          pauseGame();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pauseGame, paused, play, resumeGame]);

  const showTouchControls =
    play &&
    !paused &&
    !needsLandscape &&
    isTouchDevice &&
    !hasKeyboard &&
    !hasGamepad;

  const cycleQuality = useCallback(() => {
    setQualityChoice((prev) =>
      prev === "auto" ? "high" : prev === "high" ? "medium" : prev === "medium" ? "low" : "auto"
    );
  }, [setQualityChoice]);

  return (
    <>
      <div className="fixed -z-1 top-0 left-0 w-screen h-screen">
        <ServerScene
          play={play}
          paused={paused}
          preferWebGPU={preferWebGPU}
          quality={resolvedQuality}
          touchMoveRef={touchMoveRef}
          touchLookRef={touchLookRef}
          touchFireRef={touchFireRef}
        />
      </div>
      {!play && (
        <div className="fixed top-4 left-4 z-30 flex gap-2">
          <button
            type="button"
            aria-label="Settings"
            className="px-3 py-2 glassmorph glassmorph-border text-white text-xs backdrop-blur-md shadow-lg active:scale-95 transition-transform cursor-pointer hover:glassmorph-glow-opacity-30"
            onClick={() => setSettingsOpen(true)}
          >
            <i className="fa-solid fa-gear" />
          </button>
        </div>
      )}
      <div className="container mx-auto ">
        <div className="grid justify-center md:grid-cols-[1fr_1fr] lg:grid-cols-[1fr_2fr] max-md:grid-rows-[1fr_auto] px-2 md:px-4 min-h-screen">
          <BusinessCard play={play} />
          <button
            className={
              "m-auto flex items-center cursor-pointer max-md:row-[1/2] transition-opacity duration-300 p-6 rounded-lg gap-x-4" +
              (!play ? " opacity-100" : " opacity-0")
            }
            onClick={handleEnterGame}
          >
            {/* Play */}
            <SVGGlassMorphText className="h-40">Play</SVGGlassMorphText>
            <SVGGlassMorph>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 640"
                className="h-20"
              >
                <path d="M187.2 100.9C174.8 94.1 159.8 94.4 147.6 101.6C135.4 108.8 128 121.9 128 136L128 504C128 518.1 135.5 531.2 147.6 538.4C159.7 545.6 174.8 545.9 187.2 539.1L523.2 355.1C536 348.1 544 334.6 544 320C544 305.4 536 291.9 523.2 284.9L187.2 100.9z" />
              </svg>
            </SVGGlassMorph>
          </button>
        </div>
      </div>
      {play && !paused && !needsLandscape && (
        <button
          type="button"
          className="fixed top-4 right-4 z-20 px-4 py-2 glassmorph glassmorph-border hover:glassmorph-glow-opacity-30 text-white  text-sm backdrop-blur-md shadow-lg active:scale-95 transition-transform"
          onClick={pauseGame}
        >
          Pause
        </button>
      )}
      {/* {play && !paused && !needsLandscape && (
        <ShooterHud score={score} timeMs={timeAliveMs} />
      )} */}
      {/* {play && !paused && !needsLandscape && showTutorial && (
        <TutorialCard onClose={() => setShowTutorial(false)} isTouch={isTouchDevice} />
      )} */}
      {play && needsLandscape && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 text-white text-center px-6">
          <div className="space-y-3 max-w-md">
            <h2 className="text-2xl font-bold">Rotate to landscape</h2>
            <p className="text-sm text-white/80">
              For the best experience, rotate your device to landscape. Touch
              controls will reappear once landscape is detected.
            </p>
            <button
              type="button"
              className="mt-2 px-4 py-2 text-white text-sm glassmorph glassmorph-border hover:glassmorph-glow-opacity-30 cursor-pointer"
              onClick={quitToHome}
            >
              Back to home
            </button>
          </div>
        </div>
      )}
      {/* <div className="container mx-auto py-10 ">
        <div className="grid justify-center md:grid-cols-[1fr_1fr] lg:grid-cols-[1fr_2fr] px-2 md:px-4 min-h-screen">
          <div className="card glassmorphism w-full my-auto p-6">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Veritatis
            perferendis aliquid incidunt aperiam provident accusamus tempore,
            saepe nesciunt aspernatur hic eum expedita. Exercitationem provident
            minima reiciendis? Voluptas laborum neque adipisci?
          </div>
        </div>
      </div> */}
      <TouchControls
        visible={showTouchControls}
        onRequestPlay={handleEnterGame}
        touchMoveRef={touchMoveRef}
        touchLookRef={touchLookRef}
        touchFireRef={touchFireRef}
      />
      <PauseScreen
        visible={play && paused && !needsLandscape}
        onResume={resumeGame}
        onQuit={quitToHome}
        preferWebGPU={preferWebGPU}
        onToggleWebGPU={() => setPreferWebGPU((prev) => !prev)}
        qualityChoice={qualityChoice}
        resolvedQuality={resolvedQuality}
        onCycleQuality={cycleQuality}
        isMouse={!isTouchDevice && (hasKeyboard || !hasGamepad)}
      />

      <SettingsScreen
        visible={!play && settingsOpen}
        onClose={() => setSettingsOpen(false)}
        preferWebGPU={preferWebGPU}
        onToggleWebGPU={() => setPreferWebGPU((prev) => !prev)}
        qualityChoice={qualityChoice}
        resolvedQuality={resolvedQuality}
        onCycleQuality={cycleQuality}
      />
    </>
  );
}
