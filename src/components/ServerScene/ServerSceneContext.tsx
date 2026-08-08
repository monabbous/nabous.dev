"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import type { Dpr, RootState } from "@react-three/fiber";
import * as THREE from "three";
import * as THREE_WEBGPU from "three/webgpu";
import { PCFSoftShadowMap } from "three";

import { capQuality, type RenderQuality, type RendererKind, type RendererPhase } from "./types";
import {
  createInitialRuntimeState,
  makeBaseKey,
  runtimeReducer,
  type RuntimeAction,
  type RuntimeState,
} from "./runtimeState";

type State = RuntimeState;
type Action = RuntimeAction;

export type ServerSceneRuntime = {
  preferWebGPU: boolean;
  support: { webgpu: boolean; webgl: boolean };

  rendererKind: Exclude<RendererKind, "none"> | null;
  rendererError: string | null;
  phase: RendererPhase;

  qualityRequested: RenderQuality;
  qualityCap: RenderQuality | null;
  qualityResolved: RenderQuality;

  isSwitchingRenderer: boolean;
  controlsReady: boolean;
  canvasKey: string;

  dpr: Dpr;
  shadowMap:
    | {
        enabled: true;
        type: typeof PCFSoftShadowMap;
      }
    | undefined;
  shadowMapSize: number;
  webgpuBloomConfig: { threshold: number; intensity: number; sigma: number };

  glFactory: (
    props: THREE.WebGLRendererParameters
  ) => Promise<THREE.WebGLRenderer | THREE_WEBGPU.WebGPURenderer>;
  onCanvasCreated: (state: RootState) => void;
};

type ContextValue = {
  runtime: ServerSceneRuntime;
};

const Ctx = createContext<ContextValue | null>(null);

export function ServerSceneProvider({
  children,
  preferWebGPU,
  quality,
}: {
  children: React.ReactNode;
  preferWebGPU: boolean;
  quality: RenderQuality;
}) {
  const [state, dispatch] = useReducer(runtimeReducer, undefined, () =>
    createInitialRuntimeState(preferWebGPU, quality)
  );

  const didMountRef = useRef(false);
  const initErrorReportedRef = useRef(false);

  // Keep config in sync (props -> reducer).
  useEffect(() => {
    dispatch({ type: "CONFIG_UPDATED", preferWebGPU, qualityRequested: quality });
  }, [preferWebGPU, quality]);

  // If WebGL is unavailable, fail fast (prevents Canvas repeatedly trying to init).
  useEffect(() => {
    if (state.support.webgl) return;
    if (initErrorReportedRef.current) return;
    initErrorReportedRef.current = true;
    dispatch({
      type: "SET_RENDERER_ERROR",
      message: "WebGL is unavailable or blocked on this device.",
    });
  }, [state.support.webgl]);

  // Context loss is often recoverable; clear the transient message after a short delay.
  useEffect(() => {
    if (!state.rendererError) return;
    if (!state.rendererError.toLowerCase().includes("context lost")) return;
    const t = window.setTimeout(() => {
      dispatch({ type: "SET_RENDERER_ERROR", message: null });
    }, 2500);
    return () => window.clearTimeout(t);
  }, [state.rendererError]);

  // Renderer switching UX (fade + remount).
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Skip first render: initial state already uses the correct base key.
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    const baseKey = makeBaseKey(preferWebGPU);
    dispatch({ type: "SWITCH_START", baseKey });

    const end = window.setTimeout(() => {
      dispatch({ type: "SWITCH_END" });
    }, 1400);

    return () => window.clearTimeout(end);
  }, [preferWebGPU]);

  // Controls readiness delay after renderer becomes available.
  useEffect(() => {
    dispatch({ type: "SET_CONTROLS_READY", ready: false });
    const t = window.setTimeout(() => {
      dispatch({ type: "SET_CONTROLS_READY", ready: true });
    }, 1000);
    return () => window.clearTimeout(t);
  }, [state.rendererKind, state.canvasKey]);

  const qualityResolved = useMemo(
    () => capQuality(state.qualityRequested, state.qualityCap),
    [state.qualityRequested, state.qualityCap]
  );

  const dpr = useMemo<Dpr>(() => {
    if (qualityResolved === "high") return [1, 1.6] as const;
    if (qualityResolved === "medium") return [1, 1.25] as const;
    return [1, 1] as const;
  }, [qualityResolved]);

  const webgpuBloomConfig = useMemo(() => {
    if (qualityResolved === "high") return { threshold: 0.6, intensity: 1.85, sigma: 5 } as const;
    if (qualityResolved === "medium") return { threshold: 0.64, intensity: 1.45, sigma: 4 } as const;
    return { threshold: 0.68, intensity: 1.15, sigma: 3 } as const;
  }, [qualityResolved]);

  const shadowMapSize = useMemo(() => {
    if (qualityResolved === "high") return 1536;
    if (qualityResolved === "medium") return 1024;
    return 0;
  }, [qualityResolved]);

  const shadowMap = useMemo(
    () =>
      state.rendererKind === "webgl" && qualityResolved !== "low"
        ? ({ enabled: true, type: PCFSoftShadowMap } as const)
        : undefined,
    [qualityResolved, state.rendererKind]
  );

  const phase: RendererPhase = useMemo(() => {
    if (state.rendererError) return "error";
    if (!state.rendererKind) return "loading";
    if (state.isSwitchingRenderer || !state.controlsReady) return "preparing";
    return "rendering";
  }, [state.controlsReady, state.isSwitchingRenderer, state.rendererError, state.rendererKind]);

  const reportInitErrorOnce = useCallback((message: string) => {
    if (initErrorReportedRef.current) return;
    initErrorReportedRef.current = true;
    // Defer to avoid state updates during renderer creation.
    void Promise.resolve().then(() => {
      dispatch({ type: "SET_RENDERER_ERROR", message });
    });
  }, []);

  const glFactory = useCallback(
    async (props: THREE.WebGLRendererParameters) => {
      const commonProps = {
        ...props,
        antialias: qualityResolved !== "low",
        powerPreference: "high-performance" as const,
        stencil: false,
      };

      type WebGPURendererCtorArg = ConstructorParameters<
        typeof THREE_WEBGPU.WebGPURenderer
      >[0];

      // Prefer WebGPU when requested + supported.
      if (state.preferWebGPU && state.support.webgpu) {
        try {
          const renderer = new THREE_WEBGPU.WebGPURenderer(
            commonProps as unknown as WebGPURendererCtorArg
          );
          await renderer.init();
          return renderer;
        } catch (err) {
          console.warn("WebGPU init failed, falling back to WebGL", err);
          // fall through to WebGL
        }
      }

      if (!state.support.webgl) {
        throw new Error("WebGL unsupported");
      }

      try {
        const renderer = new THREE.WebGLRenderer(commonProps);
        return renderer;
      } catch (err) {
        reportInitErrorOnce("WebGL renderer creation failed.");
        throw err;
      }
    },
    [qualityResolved, reportInitErrorOnce, state.preferWebGPU, state.support.webgl, state.support.webgpu]
  );

  const onCanvasCreated = useCallback((r3fState: RootState) => {
    const glUnknown = r3fState?.gl as unknown;
    const glInstance = glUnknown as {
      domElement?: HTMLCanvasElement;
      setSize?: (w: number, h: number, updateStyle?: boolean) => void;
      isWebGLRenderer?: boolean;
      isWebGPURenderer?: boolean;
    };

    let kind: Exclude<RendererKind, "none"> | null = null;
    if (glUnknown instanceof THREE_WEBGPU.WebGPURenderer) kind = "webgpu";
    else if (glUnknown instanceof THREE.WebGLRenderer) kind = "webgl";
    else if (glInstance.isWebGPURenderer) kind = "webgpu";
    else if (glInstance.isWebGLRenderer) kind = "webgl";

    if (!kind) {
      reportInitErrorOnce("Unknown renderer instance; cannot initialize scene.");
      return;
    }

    dispatch({ type: "RENDERER_INIT_SUCCESS", kind });

    // Context loss events only apply to WebGL.
    if (kind !== "webgl") return;

    const canvas = glInstance?.domElement;
    if (!canvas || typeof canvas.addEventListener !== "function") return;

    const onLost = (event: Event) => {
      if ("preventDefault" in event && typeof event.preventDefault === "function") event.preventDefault();
      // dispatch({ type: "SET_QUALITY_CAP", cap: "medium" });
      dispatch({ type: "SET_RENDERER_ERROR", message: "WebGL context lost; restarting renderer..." });
      dispatch({
        type: "BUMP_CANVAS_KEY",
        baseKey: makeBaseKey(state.preferWebGPU),
        suffix: "lost",
      });
      glInstance.setSize?.(canvas.clientWidth, canvas.clientHeight, false);
    };

    const onRestore = () => {
      dispatch({ type: "SET_RENDERER_ERROR", message: null });
      dispatch({
        type: "BUMP_CANVAS_KEY",
        baseKey: makeBaseKey(state.preferWebGPU),
        suffix: "restored",
      });
      glInstance.setSize?.(canvas.clientWidth, canvas.clientHeight, false);
    };

    canvas.addEventListener("webglcontextlost", onLost, { passive: false });
    canvas.addEventListener("webglcontextrestored", onRestore, { passive: true });
  }, [reportInitErrorOnce, state.preferWebGPU]);

  const runtime = useMemo<ServerSceneRuntime>(
    () => ({
      preferWebGPU: state.preferWebGPU,
      support: state.support,

      rendererKind: state.rendererKind,
      rendererError: state.rendererError,
      phase,

      qualityRequested: state.qualityRequested,
      qualityCap: state.qualityCap,
      qualityResolved,

      isSwitchingRenderer: state.isSwitchingRenderer,
      controlsReady: state.controlsReady,
      canvasKey: state.canvasKey,

      dpr,
      shadowMap,
      shadowMapSize,
      webgpuBloomConfig,

      glFactory,
      onCanvasCreated,
    }),
    [
      dpr,
      glFactory,
      onCanvasCreated,
      phase,
      qualityResolved,
      shadowMap,
      shadowMapSize,
      state.canvasKey,
      state.controlsReady,
      state.isSwitchingRenderer,
      state.preferWebGPU,
      state.qualityCap,
      state.qualityRequested,
      state.rendererError,
      state.rendererKind,
      state.support,
      webgpuBloomConfig,
    ]
  );

  return <Ctx.Provider value={{ runtime }}>{children}</Ctx.Provider>;
}

export function useServerSceneRuntime() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useServerSceneRuntime must be used within ServerSceneProvider");
  return ctx.runtime;
}
