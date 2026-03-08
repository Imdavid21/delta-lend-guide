import { AppBar, Toolbar, Typography, Box, IconButton, Divider, Button } from "@mui/material";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import WalletButton from "./WalletButton";
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
    <AppBar position="static" color="default" elevation={0} sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
      <Toolbar variant="dense" sx={{ gap: 0.5, minHeight: 48 }}>
        <Typography
          variant="subtitle1"
          fontWeight={800}
          sx={{
            mr: 3,
            background: "linear-gradient(135deg, #5865F2 0%, #2dd4bf 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.02em",
            fontSize: "1.1rem",
          }}
        >
          Klyro
        </Typography>
        {tabs.map((t) => (
          <Button
            key={t.id}
            size="small"
            onClick={() => onTabChange(t.id)}
            sx={{
              textTransform: "none",
              fontWeight: activeTab === t.id ? 700 : 500,
              color: activeTab === t.id ? "primary.main" : "text.secondary",
              borderBottom: activeTab === t.id ? "2px solid" : "2px solid transparent",
              borderColor: activeTab === t.id ? "primary.main" : "transparent",
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
