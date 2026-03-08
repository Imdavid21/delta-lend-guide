import { AppBar, Toolbar, Typography, Box, IconButton, Divider, Badge } from "@mui/material";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import WalletButton from "./WalletButton";
import klyroLogo from "@/assets/klyro-logo.png";

interface Props {
  mode: "light" | "dark";
  onToggle: () => void;
  chatOpen: boolean;
  onToggleChat: () => void;
}

export default function AppHeader({ mode, onToggle, chatOpen, onToggleChat }: Props) {
  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={0}
      sx={{ zIndex: (t) => t.zIndex.drawer + 1, backdropFilter: "blur(12px)", bgcolor: "background.default" }}
    >
      <Toolbar variant="dense" sx={{ gap: 0.5, minHeight: 48 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mr: 2 }}>
          <img src={klyroLogo} alt="Klyro" style={{ width: 24, height: 24, filter: mode === "dark" ? "none" : "invert(1)" }} />
          <Typography
            variant="subtitle1"
            fontWeight={800}
            sx={{ letterSpacing: "-0.03em", fontSize: "1.1rem" }}
          >
            Klyro
          </Typography>
        </Box>

        <Typography variant="caption" sx={{ color: "text.disabled", fontSize: 11 }}>
          DeFi Yield Intelligence
        </Typography>

        <Box sx={{ flex: 1 }} />

        <WalletButton />
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <IconButton
          size="small"
          onClick={onToggleChat}
          sx={{
            color: chatOpen ? "text.primary" : "text.secondary",
            bgcolor: chatOpen ? "action.selected" : "transparent",
            borderRadius: 2,
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <ChatBubbleOutlineIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={onToggle} sx={{ color: "text.secondary" }}>
          {mode === "dark" ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
