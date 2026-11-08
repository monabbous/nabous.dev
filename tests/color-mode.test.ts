import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { colorModeScript } from "../src/lib/color-mode";

function initialTheme(saved: string | null, darkSystem: boolean, blocked = false) {
  const dataset: Record<string, string> = {};
  runInNewContext(colorModeScript, {
    document: { documentElement: { dataset } },
    localStorage: { getItem: () => { if (blocked) throw new Error("Blocked"); return saved; } },
    matchMedia: () => ({ matches: darkSystem }),
  });
  return dataset.theme;
}

test("theme initializes before paint from an explicit saved preference", () => {
  assert.equal(initialTheme("light", true), "light");
  assert.equal(initialTheme("dark", false), "dark");
});
test("theme follows the system when storage is absent, invalid or blocked", () => {
  assert.equal(initialTheme(null, true), "dark");
  assert.equal(initialTheme(null, false), "light");
  assert.equal(initialTheme("invalid", false), "light");
  assert.equal(initialTheme(null, true, true), "dark");
});
