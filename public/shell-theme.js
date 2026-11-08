const key = "nabous-color-mode-v1";
const button = document.querySelector("[data-shell-theme]");
const media = matchMedia("(prefers-color-scheme: dark)");
function apply(mode) {
  document.documentElement.dataset.theme = mode;
  if (button) {
    button.textContent = `Dark mode: ${mode === "dark" ? "On" : "Off"}`;
    button.setAttribute("aria-pressed", String(mode === "dark"));
  }
}
function sync() {
  let saved;
  try { saved = localStorage.getItem(key); } catch { /* Optional storage. */ }
  apply(saved === "dark" || saved === "light" ? saved : media.matches ? "dark" : "light");
}
button?.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  void switchThemeWithCRT(() => {
    apply(next);
    try { localStorage.setItem(key, next); } catch { /* Session still works. */ }
  });
});
media.addEventListener("change", sync);
window.addEventListener("storage", event => { if (event.key === key || event.key === null) sync(); });
sync();
import { switchThemeWithCRT } from "/theme-transition.js";
