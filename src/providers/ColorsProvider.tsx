"use client";
import React from "react";

const COLOR_KEYS = ["background", "primary", "accent", "secondary", "highlight", "deep", "text", "ember"] as const;

type ColorsObject = Partial<Record<(typeof COLOR_KEYS)[number], string>>;

const CssVarsProviderContext = React.createContext<{
  colors: ColorsObject;
} | null>(null);

export function CssVarsProvider({ children }: { children: React.ReactNode }) {
  const [colors, setColors] = React.useState<ColorsObject>({});

  React.useLayoutEffect(() => {
    // The palette is static CSS. Read it once after mounting instead of
    // refreshing every scene consumer on every frame.
    const styles = getComputedStyle(document.documentElement);
    const palette: ColorsObject = {};
    for (const key of COLOR_KEYS) {
      palette[key] = styles.getPropertyValue(`--colors__${key}`).trim();
    }
    setColors(palette);
  }, []);

  const value = React.useMemo(() => ({ colors }), [colors]);

  return (
    <CssVarsProviderContext.Provider value={value}>
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
