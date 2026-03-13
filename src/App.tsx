import { useState, useMemo, useEffect } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { BrowserRouter } from "react-router-dom";
import { createAppKit } from "@reown/appkit/react";
import { getTheme } from "./theme";
import { config, wagmiAdapter, projectId, networks } from "./config/wagmi";
import AppShell from "./components/AppShell";

const queryClient = new QueryClient();

// Create AppKit instance
createAppKit({
  // @ts-ignore - network types are compatible at runtime
  adapters: [wagmiAdapter],
  projectId,
  networks,
  metadata: {
    name: "Klyro",
    description: "DeFi Intelligence Platform",
    url: window.location.origin,
    icons: [],
  },
  themeMode: "dark",
  features: {
    analytics: false,
  },
});

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
