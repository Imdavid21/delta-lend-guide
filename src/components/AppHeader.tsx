import { AppBar, Toolbar, Typography, Box, IconButton, Divider, Button } from "@mui/material";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import WalletButton from "./WalletButton";
import klyroLogo from "@/assets/klyro-logo.png";
import type { TabId } from "./AppShell";

const tabs: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "lending", label: "Lending" },
  { id: "vaults", label: "Vaults" },
  { id: "fixed", label: "Fixed Yield" },
  { id: "chat", label: "Chat" },
];

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  mode: "light" | "dark";
  onToggle: () => void;
}

export default function AppHeader({ activeTab, onTabChange, mode, onToggle }: Props) {
  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={0}
      sx={{ zIndex: (t) => t.zIndex.drawer + 1, backdropFilter: "blur(12px)", bgcolor: "background.default" }}
    >
      <Toolbar variant="dense" sx={{ gap: 0.5, minHeight: 48 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mr: 3, cursor: "pointer" }} onClick={() => onTabChange("overview")}>
          <img src={klyroLogo} alt="Klyro" style={{ width: 24, height: 24, filter: mode === "dark" ? "none" : "invert(1)" }} />
          <Typography
            variant="subtitle1"
            fontWeight={800}
            sx={{ letterSpacing: "-0.03em", fontSize: "1.1rem" }}
          >
            Klyro
          </Typography>
        </Box>
        {tabs.map((t) => (
          <Button
            key={t.id}
            size="small"
            onClick={() => onTabChange(t.id)}
            sx={{
              textTransform: "none",
              fontWeight: activeTab === t.id ? 700 : 500,
              color: activeTab === t.id ? "text.primary" : "text.secondary",
              borderBottom: activeTab === t.id ? "2px solid" : "2px solid transparent",
              borderColor: activeTab === t.id ? "text.primary" : "transparent",
              borderRadius: 0,
              px: 1.5,
              py: 0.75,
              minWidth: 0,
              fontSize: "0.8125rem",
              transition: "all 200ms ease",
              "&:hover": {
                color: "text.primary",
                bgcolor: "transparent",
              },
            }}
          >
            {t.label}
          </Button>
        ))}
        <Box sx={{ flex: 1 }} />
        <WalletButton />
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <IconButton size="small" onClick={onToggle} sx={{ color: "text.secondary" }}>
          {mode === "dark" ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
