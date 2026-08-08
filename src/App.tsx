import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Providers from "@nabous.dev/providers";
import Home from "@nabous.dev/app/page";
import "@nabous.dev/styles/globals.css";

function PointerGradientVars() {
  useEffect(() => {
    const root = document.documentElement;
    const SMOOTH = 0.9;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

    const setVars = (nx: number, ny: number) => {
      x = x + (nx - x) * SMOOTH;
      y = y + (ny - y) * SMOOTH;
      root.style.setProperty("--mouse-x", `${x}px`);
      root.style.setProperty("--mouse-y", `${y}px`);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        requestAnimationFrame(() => setVars(e.clientX, e.clientY));
      }
    };

    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      const MAX_GAMMA = 35;
      const MAX_BETA = 35;
      const gx = clamp01((e.gamma + MAX_GAMMA) / (2 * MAX_GAMMA));
      const gy = clamp01((e.beta + MAX_BETA) / (2 * MAX_BETA));
      setVars(gx * window.innerWidth, gy * window.innerHeight);
    };

    const startOrientation = () => {
      window.addEventListener("deviceorientation", onOrientation, {
        passive: true,
      });
    };

    const doe = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied" | string>;
    };

    const needsPermission =
      typeof window.DeviceOrientationEvent !== "undefined" &&
      typeof doe.requestPermission === "function";

    const requestAndStart = async () => {
      try {
        const res = await doe.requestPermission?.();
        if (res === "granted") startOrientation();
      } catch {
        // ignore; pointer fallback still works
      }
    };

    const unlock = () => {
      requestAndStart();
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchend", unlock);
    };

    if (needsPermission) {
      window.addEventListener("click", unlock, { once: true });
      window.addEventListener("touchend", unlock, { once: true });
    } else {
      startOrientation();
    }

    root.style.setProperty("--mouse-x", `${x}px`);
    root.style.setProperty("--mouse-y", `${y}px`);

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchend", unlock);
      window.removeEventListener("deviceorientation", onOrientation);
    };
  }, []);

  return null;
}

function PlaceholderPage() {
  return (
    <div className="min-h-screen flex items-center justify-center text-white bg-[var(--colors__background)]">
      <div className="glassmorph glassmorph-border px-6 py-4 rounded-lg shadow-lg">
        <p className="text-sm">Future route placeholder.</p>
      </div>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Providers>
        <PointerGradientVars />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<PlaceholderPage />} />
        </Routes>
      </Providers>
    </BrowserRouter>
  );
}

export default App;
