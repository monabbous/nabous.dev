import { describe, expect, it, vi } from "vitest";

vi.mock("./rendererSupport", () => ({
  detectRendererSupport: () => ({ webgpu: true, webgl: true }),
}));

import {
  createInitialRuntimeState,
  makeBaseKey,
  runtimeReducer,
} from "./runtimeState";

describe("runtimeState", () => {
  it("creates initial state with base key", () => {
    const s = createInitialRuntimeState(true, "high");
    expect(s.preferWebGPU).toBe(true);
    expect(s.qualityRequested).toBe("high");
    expect(s.canvasKey).toBe(makeBaseKey(true));
    expect(s.support).toEqual({ webgpu: true, webgl: true });
  });

  it("handles CONFIG_UPDATED", () => {
    const s0 = createInitialRuntimeState(true, "high");
    const s1 = runtimeReducer(s0, {
      type: "CONFIG_UPDATED",
      preferWebGPU: false,
      qualityRequested: "low",
    });
    expect(s1.preferWebGPU).toBe(false);
    expect(s1.qualityRequested).toBe("low");
  });

  it("handles SWITCH_START deterministically", () => {
    vi.spyOn(Date, "now").mockReturnValue(123);

    const s0 = createInitialRuntimeState(true, "high");
    const s1 = runtimeReducer(s0, {
      type: "SWITCH_START",
      baseKey: "canvas-webgl-forced",
    });

    expect(s1.isSwitchingRenderer).toBe(true);
    expect(s1.controlsReady).toBe(false);
    expect(s1.rendererKind).toBeNull();
    expect(s1.rendererError).toBeNull();
    expect(s1.canvasKey).toBe("canvas-webgl-forced-switch-123");
  });

  it("handles BUMP_CANVAS_KEY deterministically", () => {
    vi.spyOn(Date, "now").mockReturnValue(456);

    const s0 = createInitialRuntimeState(true, "high");
    const s1 = runtimeReducer(s0, {
      type: "BUMP_CANVAS_KEY",
      baseKey: "canvas-webgpu-prefer",
      suffix: "lost",
    });

    expect(s1.canvasKey).toBe("canvas-webgpu-prefer-lost-456");
  });
});
