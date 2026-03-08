import { AppBar, Toolbar, Typography, Box, IconButton, Divider } from "@mui/material";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import WalletButton from "./WalletButton";

interface Props {
  mode: "light" | "dark";
  onToggle: () => void;
}

export default function AppHeader({ mode, onToggle }: Props) {
  return (
    <AppBar position="static" color="default" elevation={1} sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
      <Toolbar variant="dense" sx={{ gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>Lending Agent</Typography>
          <Typography variant="caption" color="text.secondary">
            AI-powered lending assistant by 1delta
          </Typography>
        </Box>
        <WalletButton />
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <IconButton size="small" onClick={onToggle}>
          {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
