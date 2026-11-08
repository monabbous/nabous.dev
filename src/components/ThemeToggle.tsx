"use client";
import { useColorMode } from "@nabous.dev/providers/ColorModeProvider";

export function ThemeToggle({ locale = "en" }: { locale?: "en" | "ar" }) {
  const { mode, toggle } = useColorMode();
  return <button type="button" className="theme-toggle col-span-2 sm:col-auto min-h-11 whitespace-nowrap rounded-glass px-3 py-2 lumenmorph lumenmorph-border"
    onClick={toggle} aria-pressed={mode === "dark"} aria-label={locale === "ar" ? "الوضع الداكن" : "Dark mode"}>
    <i className="fa-solid fa-circle-half-stroke" aria-hidden="true" />
    <span>{locale === "ar" ? "الوضع الداكن" : "Dark mode"}</span>
    <span className="theme-state-light" aria-hidden="true">{locale === "ar" ? "متوقف" : "Off"}</span>
    <span className="theme-state-dark" aria-hidden="true">{locale === "ar" ? "مفعّل" : "On"}</span>
  </button>;
}
