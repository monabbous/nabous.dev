import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../public/theme-transition.js", import.meta.url), "utf8")
  .replace("export async function", "async function");

function browser({ reduced = false, supported = true, interrupted = false } = {}) {
  const dataset: Record<string, string> = {};
  let removed = false;
  const document = {
    hidden: false,
    documentElement: { dataset },
    body: { append() {} },
    createElement: () => ({ className: "", setAttribute() {}, animate: () => ({ finished: Promise.resolve() }), remove: () => { removed = true; } }),
    startViewTransition: supported ? (update: () => Promise<void>) => ({
      finished: Promise.resolve().then(update).then(() => { if (interrupted) throw new Error("Skipped"); }),
    }) : undefined,
  };
  const switchTheme = runInNewContext(source + "; switchThemeWithCRT;", {
    document, matchMedia: () => ({ matches: reduced }), setTimeout, clearTimeout,
    requestAnimationFrame: (callback: () => void) => setTimeout(callback, 0),
  }) as (apply: () => void) => Promise<boolean>;
  return { switchTheme, dataset, removed: () => removed };
}

test("CRT switches once and always clears temporary transition state", async () => {
  for (const options of [{}, { interrupted: true }, { supported: false }]) {
    const page = browser(options);
    let updates = 0;
    assert.equal(await page.switchTheme(() => updates++), true);
    assert.equal(updates, 1);
    assert.equal(page.dataset.themeTransition, undefined);
    if (options.supported === false) assert.equal(page.removed(), true);
  }
});

test("reduced motion changes the theme immediately without a CRT sequence", async () => {
  const page = browser({ reduced: true });
  let updates = 0;
  const result = page.switchTheme(() => updates++);
  assert.equal(updates, 1);
  assert.equal(page.dataset.themeTransition, undefined);
  await result;
});

test("rapid repeated activation cannot overlap power cycles", async () => {
  const page = browser();
  let updates = 0;
  const first = page.switchTheme(() => updates++);
  assert.equal(await page.switchTheme(() => updates++), false);
  await first;
  assert.equal(updates, 1);
  assert.equal(await page.switchTheme(() => updates++), true);
  assert.equal(updates, 2);
});
