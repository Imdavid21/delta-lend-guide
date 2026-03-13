import { AppBar, Toolbar, Typography, Box, IconButton, Divider, Badge, Tooltip, Button } from "@mui/material";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAccount } from "wagmi";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import HomeIcon from "@mui/icons-material/Home";
import WalletButton from "./WalletButton";
import klyroLogo from "@/assets/klyro-logo.png";

interface Props {
  mode: "light" | "dark";
  onToggle: () => void;
  chatOpen: boolean;
  onToggleChat: () => void;
}

export default function AppHeader({ mode, onToggle, chatOpen, onToggleChat }: Props) {
  const { isConnected } = useAccount();
  const navigate = useNavigate();
  const location = useLocation();
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
            variant="h6"
            sx={{
              fontWeight: 800,
              letterSpacing: -0.5,
              background: (t) => `linear-gradient(45deg, ${t.palette.primary.main}, ${t.palette.primary.light})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mr: 2
            }}
          >
            Financial Intelligence
          </Typography>
        </Box>

        <Box sx={{ display: "flex", ml: 4, gap: 1 }}>
          <Button
            component={Link}
            to="/lending"
            size="small"
            sx={{
              textTransform: "none",
              fontWeight: 700,
              color: location.pathname.startsWith("/lending") || location.pathname === "/" ? "primary.main" : "text.secondary",
              bgcolor: location.pathname.startsWith("/lending") || location.pathname === "/" ? "action.selected" : "transparent",
              "&:hover": { bgcolor: "action.hover" }
            }}
          >
            Lending
          </Button>
          <Button
            component={Link}
            to="/borrow"
            size="small"
            sx={{
              textTransform: "none",
              fontWeight: 700,
              color: location.pathname.startsWith("/borrow") ? "primary.main" : "text.secondary",
              bgcolor: location.pathname.startsWith("/borrow") ? "action.selected" : "transparent",
              "&:hover": { bgcolor: "action.hover" }
            }}
          >
            Borrow
          </Button>
        </Box>

        <Box sx={{ flex: 1 }} />

        {isConnected && (
          <IconButton
            size="small"
            onClick={() => navigate(location.pathname === "/account" ? "/" : "/account")}
            sx={{
              color: location.pathname === "/account" ? "text.primary" : "text.secondary",
              bgcolor: location.pathname === "/account" ? "action.selected" : "transparent",
              borderRadius: 2,
              "&:hover": { bgcolor: "action.hover" },
              mr: 1
            }}
          >
            {location.pathname === "/account" ? (
              <HomeIcon fontSize="small" />
            ) : (
              <AccountCircleIcon fontSize="small" />
            )}
          </IconButton>
        )}
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
