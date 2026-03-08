import { createTheme, alpha } from "@mui/material/styles";

export const getTheme = (mode: "light" | "dark") =>
  createTheme({
    palette: {
      mode,
      primary: { main: mode === "dark" ? "#fafafa" : "#171717" },
      secondary: { main: mode === "dark" ? "#262626" : "#f5f5f5" },
      success: { main: "#22c55e" },
      warning: { main: "#f59e0b" },
      error: { main: "#ef4444" },
      ...(mode === "dark"
        ? {
            background: { default: "#0a0a0a", paper: "#0a0a0a" },
            text: { primary: "#fafafa", secondary: "#a3a3a3" },
            divider: alpha("#fafafa", 0.08),
          }
        : {
            background: { default: "#ffffff", paper: "#ffffff" },
            text: { primary: "#0a0a0a", secondary: "#737373" },
            divider: alpha("#0a0a0a", 0.08),
          }),
    },
    typography: {
      fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
      h5: { fontWeight: 700, letterSpacing: "-0.02em" },
      h6: { fontWeight: 700, letterSpacing: "-0.01em" },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      body2: { fontSize: "0.8125rem" },
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
            fontWeight: 600,
            borderRadius: 16,
            transition: "all 200ms ease",
          },
          outlined: {
            borderColor: mode === "dark" ? alpha("#fafafa", 0.2) : alpha("#0a0a0a", 0.2),
            "&:hover": {
              borderColor: mode === "dark" ? "#fafafa" : "#0a0a0a",
              backgroundColor: mode === "dark" ? alpha("#fafafa", 0.05) : alpha("#0a0a0a", 0.03),
            },
          },
          contained: {
            backgroundColor: mode === "dark" ? "#fafafa" : "#0a0a0a",
            color: mode === "dark" ? "#0a0a0a" : "#fafafa",
            "&:hover": {
              backgroundColor: mode === "dark" ? "#e5e5e5" : "#262626",
              transform: "scale(1.02)",
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            transition: "background-color 200ms ease",
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: mode === "dark" ? alpha("#fafafa", 0.06) : alpha("#0a0a0a", 0.06),
            fontSize: "0.8125rem",
          },
          head: {
            fontWeight: 600,
            fontSize: "0.75rem",
            textTransform: "uppercase" as const,
            letterSpacing: "0.05em",
            color: mode === "dark" ? "#737373" : "#a3a3a3",
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: "background-color 150ms ease",
            "&:hover": {
              backgroundColor: mode === "dark" ? alpha("#fafafa", 0.03) : alpha("#0a0a0a", 0.02),
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
            transition: "all 200ms ease",
            borderRadius: 16,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: `1px solid ${mode === "dark" ? alpha("#fafafa", 0.06) : alpha("#0a0a0a", 0.06)}`,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${mode === "dark" ? alpha("#fafafa", 0.06) : alpha("#0a0a0a", 0.06)}`,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: 12,
              transition: "all 200ms ease",
            },
          },
        },
      },
    },
  });
