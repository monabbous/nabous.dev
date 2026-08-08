import { detectRendererSupport } from "./rendererSupport";
import type { RenderQuality, RendererKind } from "./types";

export type RuntimeState = {
  preferWebGPU: boolean;
  qualityRequested: RenderQuality;
  qualityCap: RenderQuality | null;

  rendererKind: Exclude<RendererKind, "none"> | null;
  rendererError: string | null;

  isSwitchingRenderer: boolean;
  controlsReady: boolean;
  canvasKey: string;

  support: { webgpu: boolean; webgl: boolean };
};

export type RuntimeAction =
  | { type: "CONFIG_UPDATED"; preferWebGPU: boolean; qualityRequested: RenderQuality }
  | { type: "SET_RENDERER_ERROR"; message: string | null }
  | { type: "BUMP_CANVAS_KEY"; baseKey: string; suffix: string }
  | { type: "SWITCH_START"; baseKey: string }
  | { type: "SWITCH_END" }
  | { type: "RENDERER_INIT_SUCCESS"; kind: Exclude<RendererKind, "none"> }
  | { type: "SET_QUALITY_CAP"; cap: RenderQuality | null }
  | { type: "SET_CONTROLS_READY"; ready: boolean };

export function makeBaseKey(preferWebGPU: boolean) {
  return preferWebGPU ? "canvas-webgpu-prefer" : "canvas-webgl-forced";
}

export function createInitialRuntimeState(
  preferWebGPU: boolean,
  qualityRequested: RenderQuality
): RuntimeState {
  return {
    preferWebGPU,
    qualityRequested,
    qualityCap: null,

    rendererKind: null,
    rendererError: null,

    isSwitchingRenderer: false,
    controlsReady: false,
    canvasKey: makeBaseKey(preferWebGPU),

    support: detectRendererSupport(),
  };
}

export function runtimeReducer(state: RuntimeState, action: RuntimeAction): RuntimeState {
  switch (action.type) {
    case "CONFIG_UPDATED": {
      return {
        ...state,
        preferWebGPU: action.preferWebGPU,
        qualityRequested: action.qualityRequested,
      };
    }
    case "SET_RENDERER_ERROR": {
      return { ...state, rendererError: action.message };
    }
    case "BUMP_CANVAS_KEY": {
      return { ...state, canvasKey: `${action.baseKey}-${action.suffix}-${Date.now()}` };
    }
    case "SWITCH_START": {
      return {
        ...state,
        isSwitchingRenderer: true,
        controlsReady: false,
        rendererKind: null,
        rendererError: null,
        canvasKey: `${action.baseKey}-switch-${Date.now()}`,
      };
    }
    case "SWITCH_END": {
      return { ...state, isSwitchingRenderer: false };
    }
    case "RENDERER_INIT_SUCCESS": {
      return { ...state, rendererKind: action.kind, rendererError: null };
    }
    case "SET_QUALITY_CAP": {
      return { ...state, qualityCap: action.cap };
    }
    case "SET_CONTROLS_READY": {
      return { ...state, controlsReady: action.ready };
    }
    default:
      return state;
  }
}
