import type { RendererSupport } from "./types";

export function detectRendererSupport(): RendererSupport {
  if (typeof document === "undefined") return { webgpu: false, webgl: false };

  const nav = navigator as unknown as { gpu?: unknown };
  const webgpu = typeof navigator !== "undefined" && typeof nav.gpu !== "undefined";

  const canvas = document.createElement("canvas");
  const gl =
    canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  const webgl = !!gl;

  return { webgpu, webgl };
}
