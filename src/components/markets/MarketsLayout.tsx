import { Outlet, Link, useLocation } from "react-router-dom";
import { AppBar, Toolbar, Typography, Box, Button } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const navItems = [
  { label: "Overview", path: "/markets" },
  { label: "Variable", path: "/markets/variable" },
  { label: "Vaults", path: "/markets/vaults" },
  { label: "Fixed", path: "/markets/fixed" },
];

export default function MarketsLayout() {
  const { pathname } = useLocation();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <AppBar position="static" elevation={1} sx={{ bgcolor: "background.paper" }}>
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          <Typography
            variant="subtitle1"
            fontWeight={800}
            sx={{ color: "#FF6600", mr: 2 }}
          >
            1delta Markets
          </Typography>
          {navItems.map((item) => (
            <Button
              key={item.path}
              component={Link}
              to={item.path}
              size="small"
              sx={{
                textTransform: "none",
                fontWeight: pathname === item.path ? 700 : 500,
                color: pathname === item.path ? "#FF6600" : "text.secondary",
                borderBottom: pathname === item.path ? "2px solid #FF6600" : "2px solid transparent",
                borderRadius: 0,
                px: 1.5,
              }}
            >
              {item.label}
            </Button>
          ))}
          <Box sx={{ flex: 1 }} />
          <Button
            component={Link}
            to="/"
            size="small"
            startIcon={<ArrowBackIcon />}
            sx={{ textTransform: "none", color: "text.secondary" }}
          >
            Chat
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1, overflow: "auto", bgcolor: "background.default", p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
