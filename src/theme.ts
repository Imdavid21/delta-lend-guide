import { createTheme, alpha } from "@mui/material/styles";

// Nebula color palette (dark mode)
const nebula = {
  // Backgrounds / surfaces
  bg:        "#0a0f14",
  surface:   "#0e1419", // surface-container-low — cards
  surfaceMid: "#141a20", // surface-container
  surfaceHi: "#1a2027", // surface-container-high — table headers
  surfaceTop:"#1f262e", // surface-container-highest — hover states
  surfaceBright:"#252d35",

  // Accents
  primary:   "#00FF9D",  // bright green
  primaryDim:"#00ec91",
  secondary: "#64f9c3",  // teal
  tertiary:  "#78dfff",  // cyan

  // Text
  onSurface: "#eaeef5",
  onVariant: "#a7abb2",
  outline:   "#71767c",  // disabled text / divider text
  outlineVar:"rgba(67, 72, 78, 0.3)", // borders

  // Semantic
  error:     "#ff716c",
  success:   "#22c55e",
};

export const getTheme = (mode: "light" | "dark") => {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: {
        main:         isDark ? nebula.primary    : "#006d40",
        light:        isDark ? nebula.secondary  : "#00ec91",
        dark:         isDark ? nebula.primaryDim : "#004527",
        contrastText: isDark ? "#004527"         : "#ffffff",
      },
      secondary: {
        main:         isDark ? nebula.secondary  : "#006c4f",
        contrastText: isDark ? "#004733"         : "#ffffff",
      },
      success:  { main: nebula.success },
      warning:  { main: "#f59e0b" },
      error:    { main: isDark ? nebula.error : "#ef4444" },
      background: {
        default: isDark ? nebula.bg      : "#ffffff",
        paper:   isDark ? nebula.surface : "#f8fafc",
      },
      text: {
        primary:   isDark ? nebula.onSurface : "#0a0a0a",
        secondary: isDark ? nebula.onVariant : "#737373",
        disabled:  isDark ? nebula.outline   : "#9ca3af",
      },
      divider: isDark ? nebula.outlineVar : "rgba(10, 10, 10, 0.1)",
      action: {
        hover:    isDark ? "rgba(31, 38, 46, 0.7)" : "rgba(0, 0, 0, 0.04)",
        selected: isDark ? "rgba(31, 38, 46, 1.0)" : "rgba(0, 0, 0, 0.08)",
        active:   isDark ? nebula.onSurface         : "#0a0a0a",
      },
    },
    typography: {
      fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
      h4: { fontWeight: 800, letterSpacing: "-0.03em" },
      h5: { fontWeight: 800, letterSpacing: "-0.02em" },
      h6: { fontWeight: 700, letterSpacing: "-0.01em" },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      body2:   { fontSize: "0.8125rem" },
      caption: { fontSize: "0.75rem" },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 700,
            borderRadius: 10,
            transition: "all 200ms ease",
          },
          outlined: {
            borderColor: isDark ? nebula.outlineVar : alpha("#0a0a0a", 0.2),
            "&:hover": {
              borderColor: isDark ? alpha(nebula.primary, 0.6) : "#0a0a0a",
              backgroundColor: isDark ? alpha(nebula.primary, 0.06) : alpha("#0a0a0a", 0.03),
            },
          },
          contained: {
            backgroundColor: isDark ? nebula.primary : "#0a0a0a",
            color:           isDark ? "#004527"       : "#fafafa",
            "&:hover": {
              backgroundColor: isDark ? nebula.primaryDim : "#262626",
              transform: "translateY(-1px)",
              boxShadow: isDark ? `0 4px 20px ${alpha(nebula.primary, 0.3)}` : "none",
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            transition: "background-color 200ms ease, border-color 200ms ease",
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: isDark ? alpha("#fafafa", 0.05) : alpha("#0a0a0a", 0.06),
            fontSize: "0.8125rem",
          },
          head: {
            fontWeight: 700,
            fontSize: "0.6875rem",
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: isDark ? nebula.onVariant : "#a3a3a3",
            backgroundColor: isDark ? nebula.surfaceHi : "#f1f5f9",
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: "background-color 150ms ease",
            "&:hover": {
              backgroundColor: isDark ? nebula.surfaceTop : alpha("#0a0a0a", 0.02),
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            transition: "all 200ms ease",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            borderBottom: `1px solid ${isDark ? nebula.outlineVar : alpha("#0a0a0a", 0.07)}`,
            backgroundColor: isDark ? alpha(nebula.surfaceMid, 0.7) : "rgba(255,255,255,0.8)",
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: 12,
              transition: "all 200ms ease",
              "& fieldset": {
                borderColor: isDark ? nebula.outlineVar : alpha("#0a0a0a", 0.15),
              },
              "&:hover fieldset": {
                borderColor: isDark ? alpha(nebula.primary, 0.5) : alpha("#0a0a0a", 0.3),
              },
              "&.Mui-focused fieldset": {
                borderColor: isDark ? nebula.primary : "#006d40",
              },
            },
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 700,
            fontSize: "0.8125rem",
            border: "none",
            borderRadius: "8px !important",
            transition: "all 200ms ease",
            color: isDark ? nebula.onVariant : "#737373",
            "&.Mui-selected": {
              backgroundColor: isDark ? nebula.primary   : "#0a0a0a",
              color:           isDark ? "#004527"        : "#fafafa",
              "&:hover": {
                backgroundColor: isDark ? nebula.primaryDim : "#262626",
              },
            },
            "&:hover": {
              backgroundColor: isDark ? alpha(nebula.primary, 0.08) : "rgba(0,0,0,0.04)",
            },
          },
        },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? nebula.surfaceTop : "#f1f5f9",
            borderRadius: "10px",
            padding: "3px",
            border: `1px solid ${isDark ? nebula.outlineVar : alpha("#0a0a0a", 0.1)}`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: `1px solid ${isDark ? nebula.outlineVar : alpha("#0a0a0a", 0.06)}`,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? nebula.surface : "#ffffff",
            border: `1px solid ${isDark ? nebula.outlineVar : alpha("#0a0a0a", 0.08)}`,
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: isDark ? nebula.outlineVar : alpha("#0a0a0a", 0.08),
          },
        },
      },
    },
  });
};
