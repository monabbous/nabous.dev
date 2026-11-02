import { trackPointer } from "/generated/lumenmorph-pointer.mjs";

// Keep host coordinates unsmoothed: hosted demos animate their own coordinate owner.
let stop = trackPointer();
window.addEventListener("pagehide", () => stop());
window.addEventListener("pageshow", event => {
  if (event.persisted) stop = trackPointer();
});
