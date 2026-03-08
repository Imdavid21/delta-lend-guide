import { Box, Typography, Card, CardActionArea, CardContent, CircularProgress, Alert } from "@mui/material";
import { Link } from "react-router-dom";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import LockClockIcon from "@mui/icons-material/LockClock";
import MarketOverview from "@/components/markets/MarketOverview";
import { useMarkets } from "@/hooks/useMarkets";

const navCards = [
  { title: "Variable Markets", desc: "Live lending & borrowing rates", path: "/markets/variable", icon: <TrendingUpIcon sx={{ fontSize: 40, color: "#FF6600" }} /> },
  { title: "Vaults", desc: "Automated yield strategies", path: "/markets/vaults", icon: <AccountBalanceIcon sx={{ fontSize: 40, color: "#FF6600" }} /> },
  { title: "Fixed Yield", desc: "Fixed-rate opportunities", path: "/markets/fixed", icon: <LockClockIcon sx={{ fontSize: 40, color: "#FF6600" }} /> },
];

export default function MarketsHome() {
  const { data: markets, error, isLoading } = useMarkets();

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        DeFi Markets
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Real-time lending rates across protocols and chains
      </Typography>

      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress sx={{ color: "#FF6600" }} />
        </Box>
      )}
      {error && <Alert severity="error" sx={{ mb: 3 }}>Failed to load market data</Alert>}
      {markets && <MarketOverview markets={markets} />}

      <Box sx={{ display: "flex", gap: 2, mt: 4, flexWrap: "wrap" }}>
        {navCards.map((c) => (
          <Card
            key={c.path}
            elevation={0}
            sx={{
              flex: "1 1 280px",
              border: "1px solid",
              borderColor: "divider",
              transition: "all 0.2s",
              "&:hover": { borderColor: "#FF6600", transform: "translateY(-2px)", boxShadow: 2 },
            }}
          >
            <CardActionArea component={Link} to={c.path} sx={{ p: 2 }}>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                {c.icon}
                <Box>
                  <Typography fontWeight={700}>{c.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{c.desc}</Typography>
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
