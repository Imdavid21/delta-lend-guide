import { AppBar, Toolbar, Box, IconButton, Divider, ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { useAccount } from "wagmi";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import WalletButton from "./WalletButton";
import nebulaLogo from "@/assets/nebula-logo.png";

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

  const activeSection =
    location.pathname.startsWith("/borrow") ? "borrow" : "lending";

  const isDark = mode === "dark";

  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={0}
      sx={{
        zIndex: (t) => t.zIndex.drawer + 1,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        height: 64,
      }}
    >
      <Toolbar
        sx={{
          gap: 1,
          minHeight: "64px !important",
          px: { xs: 2, md: 3 },
          justifyContent: "space-between",
        }}
      >
        {/* Left: Logo + Nav */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
          {/* Logo */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                bgcolor: isDark ? "primary.main" : "primary.dark",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: isDark ? "0 0 16px rgba(0,255,157,0.3)" : "none",
              }}
            >
              <img
                src={nebulaLogo}
                alt="Nebula"
                style={{
                  width: 18,
                  height: 18,
                  filter: "invert(1) brightness(0) saturate(100%)",
                }}
              />
            </Box>
            <Box
              component="span"
              sx={{
                fontWeight: 900,
                fontSize: "1.1rem",
                letterSpacing: "-0.04em",
                color: "text.primary",
                fontFamily: "Inter, sans-serif",
              }}
            >
              NEBULA
            </Box>
          </Box>

          {/* Nav toggle */}
          <ToggleButtonGroup
            value={activeSection}
            exclusive
            onChange={(_, val) => { if (val) navigate(`/${val}`); }}
            size="small"
          >
            <ToggleButton value="lending" disableRipple sx={{ px: 2.5, py: 0.6 }}>
              Lending
            </ToggleButton>
            <ToggleButton value="borrow" disableRipple sx={{ px: 2.5, py: 0.6 }}>
              Borrow
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Right: Actions */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {isConnected && (
            <Tooltip title={location.pathname === "/account" ? "Back to dashboard" : "Account & settings"}>
              <IconButton
                size="small"
                onClick={() => navigate(location.pathname === "/account" ? "/" : "/account")}
                sx={{
                  color: location.pathname === "/account" ? "primary.main" : "text.secondary",
                  bgcolor: location.pathname === "/account" ? "rgba(0,255,157,0.08)" : "transparent",
                  borderRadius: 2,
                  "&:hover": { bgcolor: "action.hover", color: "text.primary" },
                }}
              >
                {location.pathname === "/account" ? (
                  <HomeOutlinedIcon fontSize="small" />
                ) : (
                  <AccountCircleOutlinedIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          )}

          <WalletButton />

          <Divider orientation="vertical" flexItem sx={{ mx: 0.75, height: 20, alignSelf: "center" }} />

          <Tooltip title={chatOpen ? "Close AI assistant" : "Open AI assistant"}>
            <IconButton
              size="small"
              onClick={onToggleChat}
              sx={{
                color: chatOpen ? "primary.main" : "text.secondary",
                bgcolor: chatOpen ? "rgba(0,255,157,0.08)" : "transparent",
                borderRadius: 2,
                "&:hover": { bgcolor: "action.hover", color: "primary.main" },
              }}
            >
              <SmartToyOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
            <IconButton
              size="small"
              onClick={onToggle}
              sx={{
                color: "text.secondary",
                borderRadius: 2,
                "&:hover": { bgcolor: "action.hover", color: "text.primary" },
              }}
            >
              {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
