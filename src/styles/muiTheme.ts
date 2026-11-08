"use client";

import { createTheme } from "@mui/material/styles";

// MUI requires concrete colors for its palette calculations; mirror palette.css.
export const muiTheme = createTheme({
  cssVariables: { colorSchemeSelector: '[data-theme="%s"]' },
  typography: { fontFamily: '"IBM Plex Mono", "Noto Kufi Arabic", monospace' },
  colorSchemes: {
    light: { palette: {
      primary: { main: "#a54117", contrastText: "#fffefa" },
      secondary: { main: "#ffd6a0", contrastText: "#1c1b17" },
      text: { primary: "#1c1b17", secondary: "#615e56" },
      background: { default: "#f7f6f2", paper: "#fffefa" },
    } },
    dark: { palette: {
      primary: { main: "#ffad76", contrastText: "#171715" },
      secondary: { main: "#ffd6a0", contrastText: "#171715" },
      text: { primary: "#f6f1e5", secondary: "#bbb4a6" },
      background: { default: "#171715", paper: "#292823" },
    } },
  },
});
