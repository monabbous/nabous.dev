// Shared by Next pages and standalone labs. No effect runs at initial load.
let busy = false;

/** @param {() => void} apply */
export async function switchThemeWithCRT(apply) {
  if (busy) return false;
  if (document.hidden || matchMedia("(prefers-reduced-motion: reduce), (forced-colors: active)").matches) {
    apply();
    return true;
  }
  busy = true;
  let applied = false;
  let overlay;
  const update = () => { if (!applied) { applied = true; apply(); } };
  document.documentElement.dataset.themeTransition = "crt";
  try {
    if (typeof document.startViewTransition === "function") {
      const transition = document.startViewTransition(async () => {
        update();
        // Allow inherited WebGL materials to catch up before taking the new
        // snapshot. The timeout also resolves if a tab is hidden mid-switch.
        await new Promise(resolve => {
          const timer = setTimeout(resolve, 80);
          requestAnimationFrame(() => requestAnimationFrame(() => { clearTimeout(timer); resolve(undefined); }));
        });
      });
      await transition.finished;
    } else {
      // Older browsers: a black shutter and phosphor line instead of snapshots.
      overlay = document.createElement("div");
      overlay.className = "crt-power-screen";
      overlay.setAttribute("aria-hidden", "true");
      document.body.append(overlay);
      await overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: "forwards", easing: "cubic-bezier(.55,0,.8,.2)" }).finished;
      update();
      await overlay.animate([{ opacity: 1, offset: 0 }, { opacity: 1, offset: .2 }, { opacity: 0, offset: 1 }],
        { duration: 520, fill: "forwards", easing: "cubic-bezier(.16,1,.3,1)" }).finished;
    }
  } catch {
    // Unsupported/interrupted transitions must never prevent a theme change.
    update();
  } finally {
    overlay?.remove();
    delete document.documentElement.dataset.themeTransition;
    busy = false;
  }
  return true;
}
