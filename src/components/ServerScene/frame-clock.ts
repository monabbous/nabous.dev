/** Keep the display's native cadence except in the explicit low-power tier.
 * Carry fractional frame debt forward so 75/90/144 Hz displays don't underrun.
 */
export function createSceneClock(frameRate: "native" | number) {
  let lastTick: number | undefined;
  let lastRender = 0;
  let accumulated = 0;
  const interval = frameRate === "native" ? 0 : 1000 / frameRate;
  return {
    reset() { lastTick = undefined; lastRender = 0; accumulated = 0; },
    tick(now: number): number | null {
      if (lastTick === undefined) {
        lastTick = lastRender = now;
        return 1 / 60;
      }
      accumulated += Math.min(Math.max(0, now - lastTick), 100);
      lastTick = now;
      if (interval && accumulated + .2 < interval) return null;
      if (interval) accumulated = Math.max(0, accumulated - interval);
      else accumulated = 0;
      const delta = Math.min(Math.max(0, now - lastRender), 100) / 1000;
      lastRender = now;
      return delta;
    },
  };
}
