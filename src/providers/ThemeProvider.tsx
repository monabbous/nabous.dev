import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import { muiTheme } from "@nabous.dev/styles/muiTheme";
import React from "react";


export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppRouterCacheProvider>
        <MuiThemeProvider theme={muiTheme}>
          <CssBaseline />
          <ThemeProviderWrapper>{children}</ThemeProviderWrapper>
        </MuiThemeProvider>
      </AppRouterCacheProvider>
    </>
  );
}

function ThemeProviderWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
