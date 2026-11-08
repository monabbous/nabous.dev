import assert from "node:assert/strict";
import test from "node:test";
import { createSceneClock } from "../src/components/ServerScene/frame-clock";

test("native rendering doesn't skip frames on 60/75/90/120/144 Hz displays", () => {
  for (const refresh of [60, 75, 90, 120, 144]) {
    const clock = createSceneClock("native");
    for (let frame = 0; frame <= refresh; frame++) assert.notEqual(clock.tick(frame * 1000 / refresh), null);
  }
});
test("30 FPS fallback carries its remainder without high-refresh cadence drift", () => {
  for (const refresh of [60, 75, 90, 120, 144]) {
    const clock = createSceneClock(30);
    let frames = 0, simulated = 0;
    for (let frame = 0; frame <= refresh * 10; frame++) {
      const delta = clock.tick(frame * 1000 / refresh);
      if (delta !== null) { frames++; simulated += delta; }
    }
    assert.ok(Math.abs(frames - 301) <= 1, `${refresh} Hz produced ${frames} frames`);
    assert.ok(Math.abs(simulated - 10) < .05);
  }
});
test("restoring a hidden tab doesn't pass the inactive time to physics", () => {
  const clock = createSceneClock("native");
  clock.tick(0);
  clock.tick(16);
  clock.reset();
  assert.equal(clock.tick(60000), 1 / 60);
  assert.ok(clock.tick(60016)! < .02);
});
