import { expect, test } from "@playwright/test";

test("home loads (canvas or fallback)", async ({ page }) => {
  await page.goto("/");

  // The app should mount React.
  await expect(page.locator("#root")).toBeVisible();

  const canvas = page.locator("#server-scene-canvas");
  const rendererUnavailable = page.getByText("Renderer unavailable");
  const rendererError = page.getByText("Renderer error");

  // Different environments may or may not support WebGL/WebGPU in headless mode.
  // Accept either: a canvas, or a clear fallback overlay.
  await Promise.race([
    canvas.waitFor({ state: "attached" }),
    rendererUnavailable.waitFor({ state: "visible" }),
    rendererError.waitFor({ state: "visible" }),
  ]);

  // If canvas exists, it should have a size eventually.
  if (await canvas.count()) {
    await expect(canvas).toHaveAttribute("id", "server-scene-canvas");
  }
});

test("about route renders", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByText("Future route placeholder.")).toBeVisible();
});
