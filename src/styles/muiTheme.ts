"use client";

import { createTheme } from "@mui/material/styles";

// MUI requires concrete colors for its palette calculations; mirror palette.css.
export const muiTheme = createTheme({
  cssVariables: true,
  palette: {
    mode: "dark",
    primary: { main: "#69b4b0", contrastText: "#10333b" },
    secondary: { main: "#ffaa71" },
    text: { primary: "#e4eeee", secondary: "#a9c4c8" },
    background: { default: "#10333b", paper: "#1b424a" },
  },
});
