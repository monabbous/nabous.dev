"use client";

import { createTheme } from "@mui/material/styles";

// MUI requires concrete colors for its palette calculations; mirror palette.css.
export const muiTheme = createTheme({
  cssVariables: true,
  palette: {
    mode: "dark",
    primary: { main: "#ffaa71", contrastText: "#102729" },
    secondary: { main: "#80aaa3" },
    text: { primary: "#eee7dd", secondary: "#b3c3bd" },
    background: { default: "#102729", paper: "#1b3536" },
  },
});
