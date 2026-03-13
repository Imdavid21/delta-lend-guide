import { AppBar, Toolbar, Typography, Box, IconButton, Divider, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
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

  const activeSection =
    location.pathname.startsWith("/borrow") ? "borrow" : "lending";

  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={0}
      sx={{
        zIndex: (t) => t.zIndex.drawer + 1,
        backdropFilter: "blur(12px)",
        bgcolor: "background.default",
      }}
    >
      <Toolbar
        variant="dense"
        sx={{ gap: 0.5, minHeight: 48, position: "relative" }}
      >
        {/* Left: Logo + Brand */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <img
            src={klyroLogo}
            alt="Klyro"
            style={{ width: 24, height: 24, filter: mode === "dark" ? "none" : "invert(1)" }}
          />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              letterSpacing: -0.5,
              background: (t) =>
                `linear-gradient(45deg, ${t.palette.primary.main}, ${t.palette.primary.light})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Financial Intelligence
          </Typography>
        </Box>

        {/* Centre: Toggle navigation */}
        <Box
          sx={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <ToggleButtonGroup
            value={activeSection}
            exclusive
            onChange={(_, val) => {
              if (val) navigate(`/${val}`);
            }}
            size="small"
            sx={{
              bgcolor: "action.hover",
              borderRadius: "999px",
              p: "3px",
              "& .MuiToggleButtonGroup-grouped": {
                border: "none",
                borderRadius: "999px !important",
                px: 2,
                py: 0.4,
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.8rem",
                lineHeight: 1.5,
                color: "text.secondary",
                transition: "all 0.2s ease",
                "&.Mui-selected": {
                  bgcolor: "background.paper",
                  color: "text.primary",
                  boxShadow: 1,
                  "&:hover": { bgcolor: "background.paper" },
                },
                "&:hover": { bgcolor: "action.selected" },
              },
            }}
          >
            <ToggleButton value="lending" disableRipple>
              Lending
            </ToggleButton>
            <ToggleButton value="borrow" disableRipple>
              Borrow
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Right: Actions */}
        <Box sx={{ flex: 1 }} />

        {isConnected && (
          <IconButton
            size="small"
            onClick={() =>
              navigate(location.pathname === "/account" ? "/" : "/account")
            }
            sx={{
              color: location.pathname === "/account" ? "text.primary" : "text.secondary",
              bgcolor: location.pathname === "/account" ? "action.selected" : "transparent",
              borderRadius: 2,
              "&:hover": { bgcolor: "action.hover" },
              mr: 1,
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
          {mode === "dark" ? (
            <LightModeIcon fontSize="small" />
          ) : (
            <DarkModeIcon fontSize="small" />
          )}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
