'use client';

import { createTheme } from "@mui/material/styles";


export const muiTheme = createTheme({
    palette: {
        primary: {
            main: "rgb(94 234 212)"
        }
    },
    cssVariables: {

    },
    colorSchemes: {
        dark: {
            palette: {
                background: {
                    default: "rgb(15 23 42)",
                    paper: "rgb(15 23 42)",
                }
            }
        },
    },
})