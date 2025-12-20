"use client";
import React from "react";

const COLOR_KEYS = ["background", "primary", "accent"] as const;

type ColorsObject = Partial<Record<(typeof COLOR_KEYS)[number], string>>;

const CssVarsProviderContext = React.createContext<{
  colors: ColorsObject;
} | null>(null);

export function CssVarsProvider({ children }: { children: React.ReactNode }) {
  const [colors, setColors] = React.useState<ColorsObject>({});

  React.useLayoutEffect(() => {
    function getWindowBgColor() {
      if (typeof window !== "undefined") {
        requestAnimationFrame(() => {
          const computedBgColor = getComputedStyle(document.documentElement);

          const newColors: Record<string, string> = {};
          COLOR_KEYS.forEach((key) => {
            newColors[key] =
              computedBgColor.getPropertyValue(`--colors__${key}`)?.trim() ||
              "";
          });
          setColors(newColors);
        });
      }
    }

    const interval = setInterval(getWindowBgColor, 16.67);
    getWindowBgColor();
    return () => clearInterval(interval);
  }, []);

  return (
    <CssVarsProviderContext.Provider value={{ colors }}>
      {children}
    </CssVarsProviderContext.Provider>
  );
}

export const useCssVarsColors = () => {
  const context = React.useContext(CssVarsProviderContext);
  if (!context) {
    throw new Error("useCssVarsColors must be used within a CssVarsProvider");
  }
  return context.colors;
};
