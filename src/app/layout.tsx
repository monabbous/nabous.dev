import Providers from "@nabous.dev/providers";
import "@nabous.dev/styles/globals.css";

export { metadata } from "@nabous.dev/constants/metadata";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
@property --glassmorphism-bg__position-x {
  syntax: "<length-percentage>";
  inherits: true;
  initial-value: calc(var(--mouse-x, -100vmax));
}

@property --glassmorphism-bg__position-y {
  syntax: "<length-percentage>";
  inherits: true;
  initial-value: calc(var(--mouse-y, -100vmax));
}

@property --glassmorphism-bg__opacity {
  syntax: "<number>";
  inherits: true;
  initial-value: 0.5;
}

@property --glassmorphism-bg__extent {
  syntax: "<length-percentage>";
  inherits: true;
  initial-value: 30%;
}           
            `,
          }}
        ></style>
      </head>
      <body className={`antialiased !bg-[var(--colors__background)]`}>
        <Providers>{children}</Providers>
        <script>{`
  const root = document.documentElement;

  // --- smoothing (0 = none, 0.15-0.3 feels nice) ---
  const SMOOTH = 0.9;
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;

  function setVars(nx, ny) {
    x = x + (nx - x) * SMOOTH;
    y = y + (ny - y) * SMOOTH;
    root.style.setProperty("--mouse-x", x + "px");
    root.style.setProperty("--mouse-y", y + "px");
  }

  // Pointer fallback (desktop + touch)
  window.addEventListener("pointermove", (e) => {
    requestAnimationFrame(() => {
      if (e.pointerType === "mouse") {
        setVars(e.clientX, e.clientY);
      }
    });
  }, { passive: true });

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  // Tilt -> virtual cursor mapping
  function onOrientation(e) {
    if (e.gamma == null || e.beta == null) return;

    // Tweak sensitivity
    const MAX_GAMMA = 35; // left-right tilt range
    const MAX_BETA  = 35; // front-back tilt range

    const gx = clamp01((e.gamma + MAX_GAMMA) / (2 * MAX_GAMMA));
    const gy = clamp01((e.beta  + MAX_BETA)  / (2 * MAX_BETA));

    setVars(gx * window.innerWidth, gy * window.innerHeight);
  }

  function startOrientation() {
    window.addEventListener("deviceorientation", onOrientation, { passive: true });
  }

  // iOS permission requirement (iOS 13+)
  const needsPermission =
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function";

  async function requestAndStart() {
    try {
      const res = await DeviceOrientationEvent.requestPermission();
      if (res === "granted") startOrientation();
    } catch (err) {
      // If denied or unsupported, pointer fallback still works
    }
  }

  if (needsPermission) {
    // must be triggered by user gesture
    const unlock = () => {
      requestAndStart();
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchend", unlock);
    };
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("touchend", unlock, { once: true });
  } else {
    startOrientation();
  }

  // init
  setVars(x, y);
`}</script>
      </body>
    </html>
  );
}
