import { describe, expect, it, vi } from "vitest";

import { detectRendererSupport } from "./rendererSupport";

describe("detectRendererSupport", () => {
  it("returns false when document is missing", () => {
    expect(detectRendererSupport()).toEqual({ webgpu: false, webgl: false });
  });

  it("detects webgpu+webgl when globals are stubbed", () => {
    const originals = {
      document: (globalThis as unknown as { document?: unknown }).document,
      navigator: (globalThis as unknown as { navigator?: unknown }).navigator,
    };

    const fakeCanvas = {
      getContext: vi.fn((type: string) => {
        if (type === "webgl") return {};
        if (type === "experimental-webgl") return {};
        return null;
      }),
    };

    const fakeDocument = {
      createElement: vi.fn((tagName: string) => {
        if (tagName !== "canvas") throw new Error(`unexpected tag: ${tagName}`);
        return fakeCanvas;
      }),
    };

    Object.defineProperty(globalThis, "document", {
      value: fakeDocument,
      configurable: true,
    });

    Object.defineProperty(globalThis, "navigator", {
      value: { gpu: {} },
      configurable: true,
    });

    expect(detectRendererSupport()).toEqual({ webgpu: true, webgl: true });

    Object.defineProperty(globalThis, "document", {
      value: originals.document,
      configurable: true,
    });

    Object.defineProperty(globalThis, "navigator", {
      value: originals.navigator,
      configurable: true,
    });
  });
});
