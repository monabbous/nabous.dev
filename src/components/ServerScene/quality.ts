export type SceneQuality = "low" | "balanced" | "standard";
export type DeviceHints = { cores?: number; memory?: number; saveData?: boolean; reducedMotion?: boolean; coarsePointer?: boolean; desktop?: boolean };

export function chooseSceneQuality(hints: DeviceHints): SceneQuality {
  if (hints.saveData) return "low";
  // Accessibility preferences aren't GPU capability signals. Desktops retain
  // full quality; only mobile profiles use conservative hardware hints.
  if (hints.desktop) return "standard";
  if (
    (hints.cores !== undefined && hints.cores <= 2) ||
    (hints.memory !== undefined && hints.memory <= 2)) return "low";
  if (hints.coarsePointer || (hints.cores !== undefined && hints.cores <= 4) ||
    (hints.memory !== undefined && hints.memory <= 4)) return "balanced";
  return "standard";
}

export function sceneBudget(quality: SceneQuality) {
  if (quality === "low") return { dpr: 1, shadowSize: 512, debris: 1, bloom: false, frameRate: 30 as const };
  if (quality === "balanced") return { dpr: 1, shadowSize: 512, debris: 1, bloom: false, frameRate: "native" as const };
  return { dpr: 1.25, shadowSize: 1024, debris: 2, bloom: true, frameRate: "native" as const };
}
