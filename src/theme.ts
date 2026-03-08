import { createTheme, alpha } from "@mui/material/styles";

export const getTheme = (mode: "light" | "dark") =>
  createTheme({
    palette: {
      mode,
      primary: { main: mode === "dark" ? "#5865F2" : "#4f46e5" },
      secondary: { main: "#2dd4bf" },
      success: { main: "#2dd4bf" },
      warning: { main: "#f59e0b" },
      error: { main: "#ef4444" },
      ...(mode === "dark"
        ? {
            background: { default: "#0d0d0e", paper: "#16161a" },
            text: { primary: "#e4e4e7", secondary: "#a1a1aa" },
            divider: alpha("#e4e4e7", 0.08),
          }
        : {
            background: { default: "#f4f4f5", paper: "#ffffff" },
            text: { primary: "#18181b", secondary: "#71717a" },
            divider: alpha("#18181b", 0.08),
          }),
    },
    typography: {
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
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
            scrollbarWidth: "thin",
            "&::-webkit-scrollbar": { width: 6 },
            "&::-webkit-scrollbar-thumb": {
              borderRadius: 3,
              backgroundColor: mode === "dark" ? "#3f3f46" : "#d4d4d8",
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
            transition: "all 200ms ease",
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
            borderColor: mode === "dark" ? alpha("#e4e4e7", 0.06) : alpha("#18181b", 0.06),
            fontSize: "0.8125rem",
          },
          head: {
            fontWeight: 600,
            fontSize: "0.75rem",
            textTransform: "uppercase" as const,
            letterSpacing: "0.05em",
            color: mode === "dark" ? "#71717a" : "#a1a1aa",
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: "background-color 150ms ease",
            "&:hover": {
              backgroundColor:
                mode === "dark" ? alpha("#5865F2", 0.04) : alpha("#4f46e5", 0.03),
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 500, transition: "all 200ms ease" },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight:
              mode === "dark"
                ? `1px solid ${alpha("#e4e4e7", 0.06)}`
                : `1px solid ${alpha("#18181b", 0.06)}`,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            borderBottom:
              mode === "dark"
                ? `1px solid ${alpha("#e4e4e7", 0.06)}`
                : `1px solid ${alpha("#18181b", 0.06)}`,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              transition: "all 200ms ease",
            },
          },
        },
      },
    },
  });
