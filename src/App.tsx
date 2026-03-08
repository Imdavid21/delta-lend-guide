import { useState, useMemo } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { BrowserRouter } from "react-router-dom";
import { getTheme } from "./theme";
import { config } from "./config/wagmi";
import AppShell from "./components/AppShell";

const queryClient = new QueryClient();

type Mode = "light" | "dark";

function getInitialMode(): Mode {
  const stored = localStorage.getItem("theme-mode");
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

export default function App() {
  const [mode, setMode] = useState<Mode>(getInitialMode);
  const theme = useMemo(() => getTheme(mode), [mode]);

  const toggle = () => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    localStorage.setItem("theme-mode", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  // Sync class on mount
  useMemo(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, [mode]);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <AppShell mode={mode} onToggle={toggle} />
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
