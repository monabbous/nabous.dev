import assert from "node:assert/strict";
import test from "node:test";
import { chooseSceneQuality, sceneBudget } from "../src/components/ServerScene/quality";

test("only very constrained hardware or explicit low-power preferences start capped", () => {
  for (const hints of [{ cores: 2 }, { memory: 2 }, { saveData: true }]) {
    assert.equal(chooseSceneQuality(hints), "low");
  }
  assert.equal(chooseSceneQuality({ cores: 8, memory: 8 }), "standard");
  assert.equal(chooseSceneQuality({}), "standard");
  for (const hints of [{ cores: 4 }, { memory: 4 }, { coarsePointer: true }]) {
    assert.equal(chooseSceneQuality(hints), "balanced");
  }
});

test("desktops retain full quality and reduced motion never lowers graphics", () => {
  assert.equal(chooseSceneQuality({ desktop: true, cores: 2, memory: 2 }), "standard");
  assert.equal(chooseSceneQuality({ desktop: true, coarsePointer: true, memory: 4 }), "standard");
  assert.equal(chooseSceneQuality({ reducedMotion: true, cores: 16, memory: 8 }), "standard");
  assert.equal(chooseSceneQuality({ desktop: true, saveData: true }), "low");
});

test("low quality bounds pixels, shadows and debris without disabling physics", () => {
  const low = sceneBudget("low"), standard = sceneBudget("standard");
  assert.equal(low.frameRate, 30);
  assert.equal(low.dpr, 1);
  assert.equal(low.bloom, false);
  assert.ok(low.shadowSize > 0 && low.shadowSize < standard.shadowSize);
  assert.ok(low.debris > 0 && low.debris < standard.debris);
});

test("balanced graphics keep native refresh instead of capping capable phones", () => {
  const balanced = sceneBudget("balanced");
  assert.equal(balanced.frameRate, "native");
  assert.equal(balanced.dpr, 1);
  assert.equal(balanced.bloom, false);
  assert.equal(sceneBudget("standard").frameRate, "native");
});
