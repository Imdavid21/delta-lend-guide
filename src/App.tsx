import { useState, useMemo } from "react";
import { ThemeProvider, CssBaseline, Box } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { getTheme } from "./theme";
import { config } from "./config/wagmi";
import AppHeader from "./components/AppHeader";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MarketsLayout from "./components/markets/MarketsLayout";
import MarketsHome from "./pages/MarketsHome";
import VariableMarkets from "./pages/VariableMarkets";
import VaultsPage from "./pages/VaultsPage";
import FixedMarketsPage from "./pages/FixedMarketsPage";

const queryClient = new QueryClient();

type Mode = "light" | "dark";

function getInitialMode(): Mode {
  const stored = localStorage.getItem("theme-mode");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const [mode, setMode] = useState<Mode>(getInitialMode);
  const theme = useMemo(() => getTheme(mode), [mode]);

  const toggle = () => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    localStorage.setItem("theme-mode", next);
  };

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <Routes>
              <Route
                path="/"
                element={
                  <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
                    <AppHeader mode={mode} onToggle={toggle} />
                    <Index />
                  </Box>
                }
              />
              <Route path="/markets" element={<MarketsLayout />}>
                <Route index element={<MarketsHome />} />
                <Route path="variable" element={<VariableMarkets />} />
                <Route path="vaults" element={<VaultsPage />} />
                <Route path="fixed" element={<FixedMarketsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
