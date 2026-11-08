"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { COLOR_MODE_KEY } from "@nabous.dev/lib/color-mode";
import { switchThemeWithCRT } from "../../public/theme-transition.js";

type ColorMode = "light" | "dark";
const Context = createContext({ mode: "light" as ColorMode, toggle: () => {} });

export function ColorModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ColorMode>("light");
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      let saved;
      try { saved = localStorage.getItem(COLOR_MODE_KEY); } catch { /* Storage is optional. */ }
      const next = saved === "dark" || saved === "light" ? saved : media.matches ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      setMode(next);
    };
    const storage = (event: StorageEvent) => { if (event.key === COLOR_MODE_KEY || event.key === null) sync(); };
    sync();
    media.addEventListener("change", sync);
    window.addEventListener("storage", storage);
    return () => { media.removeEventListener("change", sync); window.removeEventListener("storage", storage); };
  }, []);
  function toggle() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    void switchThemeWithCRT(() => {
      document.documentElement.dataset.theme = next;
      setMode(next);
      try { localStorage.setItem(COLOR_MODE_KEY, next); } catch { /* Retain the session choice. */ }
    });
  }
  return <Context.Provider value={{ mode, toggle }}>{children}</Context.Provider>;
}

export const useColorMode = () => useContext(Context);
