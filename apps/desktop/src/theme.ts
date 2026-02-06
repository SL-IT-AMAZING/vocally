import { createTheme, type Shadows } from "@mui/material/styles";

export const theme = createTheme({
  cssVariables: {
    cssVarPrefix: "app",
  },

  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#0A84FF", light: "#409CFF", dark: "#0071E3" },
        secondary: { main: "#6E6E73" },

        goldFg: "rgb(104, 48, 9)",
        goldBg: "rgba(255, 193, 7, 0.6)",
        shadow: "rgba(0, 0, 0, 0.08)",
        blue: "#0A84FF",
        blueHover: "#0071E3",
        blueActive: "#0060CC",
        onBlue: "#FFFFFF",

        level0: "#FFFFFF",
        level1: "#F5F5F7",
        level2: "#E8E8ED",
        level3: "#D2D2D7",
      },
    },
    dark: {
      palette: {
        primary: { main: "#0A84FF", light: "#409CFF", dark: "#0071E3" },
        secondary: { main: "#98989D" },

        goldFg: "#FFD700",
        goldBg: "rgba(255, 215, 0, 0.2)",
        shadow: "rgba(0, 0, 0, 0.36)",
        blue: "#0A84FF",
        blueHover: "#409CFF",
        blueActive: "#0071E3",
        onBlue: "#FFFFFF",

        level0: "#000000",
        level1: "#1C1C1E",
        level2: "#2C2C2E",
        level3: "#3A3A3C",
      },
    },
  },

  shape: { borderRadius: 10 },

  shadows: (() => {
    const s = Array(25).fill("none") as unknown as Shadows;
    s[1] = "0 1px 3px rgba(0,0,0,0.08)";
    s[2] = "0 2px 8px rgba(0,0,0,0.08)";
    s[4] = "0 4px 16px rgba(0,0,0,0.08)";
    s[8] = "0 8px 32px rgba(0,0,0,0.10)";
    return s;
  })(),

  typography: {
    fontFamily:
      '"Inter","Pretendard Variable","Pretendard",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    pxToRem: (px: number) => `${px / 16}rem`,

    displayLarge: {
      fontSize: 57,
      lineHeight: 1,
      fontWeight: 400,
      letterSpacing: "-0.025em",
    },
    displayMedium: {
      fontSize: 45,
      lineHeight: 1,
      fontWeight: 400,
      letterSpacing: "-0.025em",
    },
    displaySmall: {
      fontSize: 36,
      lineHeight: 1,
      fontWeight: 400,
      letterSpacing: "-0.02em",
    },

    headlineLarge: {
      fontSize: 32,
      lineHeight: 1,
      fontWeight: 400,
      letterSpacing: "-0.02em",
    },
    headlineMedium: {
      fontSize: 28,
      lineHeight: 1,
      fontWeight: 400,
      letterSpacing: "-0.015em",
    },
    headlineSmall: {
      fontSize: 24,
      lineHeight: 1,
      fontWeight: 400,
      letterSpacing: "-0.015em",
    },

    titleLarge: {
      fontSize: 24,
      lineHeight: 1,
      fontWeight: 400,
      letterSpacing: "-0.015em",
    },
    titleMedium: {
      fontSize: 18,
      lineHeight: 1,
      fontWeight: 500,
      letterSpacing: "-0.011em",
    },
    titleSmall: {
      fontSize: 16,
      lineHeight: 1,
      fontWeight: 500,
      letterSpacing: "-0.011em",
    },

    bodyLarge: {
      fontSize: 18,
      lineHeight: 1,
      fontWeight: 400,
      letterSpacing: "-0.011em",
    },
    bodyMedium: {
      fontSize: 16,
      lineHeight: 1,
      fontWeight: 400,
      letterSpacing: "-0.011em",
    },
    bodySmall: {
      fontSize: 14,
      lineHeight: 1,
      fontWeight: 400,
      letterSpacing: "-0.006em",
    },

    labelLarge: {
      fontSize: 16,
      lineHeight: 1,
      fontWeight: 500,
      letterSpacing: "-0.011em",
    },
    labelMedium: {
      fontSize: 14,
      lineHeight: 1,
      fontWeight: 500,
      letterSpacing: "-0.006em",
    },
    labelSmall: {
      fontSize: 13,
      lineHeight: 1,
      fontWeight: 500,
      letterSpacing: "-0.006em",
    },

    body1: {
      fontSize: 16,
      lineHeight: 1.5,
      fontWeight: 400,
      letterSpacing: "-0.011em",
    },
    body2: {
      fontSize: 14,
      lineHeight: 1.5,
      fontWeight: 400,
      letterSpacing: "-0.006em",
    },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: (themeParam) => ({
        body: {
          backgroundColor: themeParam.vars.palette.level0,
          color: themeParam.vars.palette.text?.primary,
          transition: "background-color 0.3s ease",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },
      }),
    },

    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: theme.vars.palette.level0,
        }),
      },
    },

    MuiDialogActions: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.spacing(3),
          paddingTop: theme.spacing(2),
          paddingBottom: theme.spacing(2),
        }),
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: ({ theme }) => ({
          fontSize: theme.typography.pxToRem(14),
          fontWeight: 500,
        }),
      },
    },

    MuiSwitch: {
      styleOverrides: {
        switchBase: ({ theme }) => ({
          "&.Mui-checked": {
            color: theme.vars.palette.blue,
            "& + .MuiSwitch-track": {
              backgroundColor: theme.vars.palette.blue,
            },
          },
        }),
        track: ({ theme }) => ({
          ".Mui-checked.Mui-checked + &": {
            backgroundColor: theme.vars.palette.blue,
          },
        }),
      },
    },

    MuiFab: {
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: "none",
          fontSize: theme.typography.pxToRem(20),
          borderRadius: 99,
          padding: theme.spacing(2, 3),
          letterSpacing: "-0.01em",
          "& .MuiSvgIcon-root": {
            fontSize: 28,
          },
          "&.MuiFab-info": {
            backgroundColor: theme.vars.palette.level2,
            color: theme.vars.palette.text.primary,
            "&:hover": {
              backgroundColor: theme.vars.palette.level3,
            },
          },
        }),
      },
    },

    MuiAccordion: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.vars.palette.level1,
          borderRadius: theme.shape.borderRadius,
          boxShadow: "none",
          "&:before": {
            display: "none",
          },
          "&.Mui-expanded": {
            margin: "auto",
          },
        }),
        rounded: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
        }),
      },
    },

    MuiPopover: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: theme.vars.palette.level1,
          boxShadow: `0 8px 32px ${theme.vars?.palette.shadow}`,
        }),
      },
    },

    MuiAccordionSummary: {
      styleOverrides: {
        root: ({ theme }) => ({
          fontSize: theme.typography.pxToRem(16),
          color: theme.vars.palette.text.primary,
        }),
      },
    },

    MuiAccordionDetails: {
      styleOverrides: {
        root: ({ theme }) => ({
          fontSize: theme.typography.pxToRem(16),
          color: theme.vars.palette.text.secondary,
        }),
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: "none",
          fontWeight: 500,
          borderRadius: theme.shape.borderRadius,
          fontSize: theme.typography.pxToRem(18),
          padding: theme.spacing(1, 2),
          letterSpacing: "-0.01em",
          "& .MuiSvgIcon-root": {
            fontSize: 24,
          },
        }),
        text: ({ theme }) => ({
          color: theme.vars.palette.primary.main,
          "&:hover": {
            backgroundColor: theme.vars.palette.level1,
          },
          "&:active": {
            backgroundColor: theme.vars.palette.level0,
          },
        }),
        contained: ({ theme }) => ({
          "&:hover": {
            backgroundColor: theme.vars.palette.primary.light,
          },
          "&:active": {
            backgroundColor: theme.vars.palette.primary.main,
          },
        }),
      },
      variants: [
        {
          props: { variant: "flat" },
          style: ({ theme }) => ({
            backgroundColor: theme.vars.palette.level1,
            color: theme.vars.palette.primary.main,
            "&:hover": {
              backgroundColor: theme.vars.palette.level2,
            },
            "&:active": {
              backgroundColor: theme.vars.palette.level3,
            },
            fontSize: theme.typography.pxToRem(18),
            "& .MuiButton-startIcon > .MuiSvgIcon-root, \
    & .MuiButton-endIcon  > .MuiSvgIcon-root": {
              fontSize: 24,
            },
          }),
        },
        {
          props: { variant: "blue" },
          style: ({ theme }) => ({
            backgroundColor: theme.vars.palette.blue,
            color: theme.vars.palette.onBlue,
            "&:hover": {
              backgroundColor: theme.vars.palette.blueHover,
            },
            "&:active": {
              backgroundColor: theme.vars.palette.blueActive,
            },
          }),
        },
      ],
    },

    MuiPaper: {
      defaultProps: { elevation: 0, variant: "flat" },
      styleOverrides: {
        outlined: ({ theme }) => ({
          backgroundColor: theme.vars.palette.level0,
          border: `1px solid ${theme.vars.palette.primary}`,
        }),
      },
      variants: [
        {
          props: { variant: "flat" },
          style: ({ theme }) => ({
            backgroundColor: theme.vars.palette.level1,
          }),
        },
      ],
    },

    MuiStepLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.vars.palette.level0,
          fontSize: theme.typography.pxToRem(18),
        }),
        vertical: ({ theme }) => ({
          backgroundColor: theme.vars.palette.level0,
          fontSize: theme.typography.pxToRem(18),
        }),
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.vars.palette.text.primary,
        }),
      },
    },

    MuiCard: {
      defaultProps: { variant: "flat" },
      variants: [
        {
          props: { variant: "flat" },
          style: ({ theme }) => ({
            backgroundColor: theme.vars.palette.level1,
          }),
        },
      ],
    },

    MuiListItemButton: {
      styleOverrides: {
        root: () => ({
          borderRadius: 10,
        }),
      },
    },

    MuiToggleButton: {
      styleOverrides: {
        root: () => ({
          textTransform: "none",
        }),
      },
    },
  },
});
