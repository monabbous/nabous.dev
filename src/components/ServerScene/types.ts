export type RenderQuality = "low" | "medium" | "high";

export type RendererKind = "webgpu" | "webgl" | "none";

export type RendererSupport = {
  webgpu: boolean;
  webgl: boolean;
};

export type RendererPhase = "loading" | "preparing" | "rendering" | "error";

export function capQuality(requested: RenderQuality, cap: RenderQuality | null) {
  if (!cap) return requested;
  const order = ["low", "medium", "high"] as const;
  const reqIdx = order.indexOf(requested);
  const capIdx = order.indexOf(cap);
  return order[Math.min(reqIdx, capIdx)];
}
