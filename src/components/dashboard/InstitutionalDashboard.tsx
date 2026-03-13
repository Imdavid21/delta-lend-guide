import { Box, Typography, Paper, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Skeleton, Card } from "@mui/material";
import { useEffect, useState } from "react";
import { BitGoService, BitGoWallet } from "../../services/bitgo";
import { useWalletMode } from "../../hooks/useWalletMode";
import { formatUSD, formatPercent } from "../../lib/marketTypes";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import GppGoodIcon from "@mui/icons-material/GppGood";

export default function InstitutionalDashboard() {
  const { bitgoToken, enterpriseId } = useWalletMode();
  const [wallets, setWallets] = useState<BitGoWallet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bitgoToken || !enterpriseId) return;

    const bitgo = new BitGoService(bitgoToken, enterpriseId);
    bitgo.getWallets().then((ws) => {
      setWallets(ws);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to fetch BitGo wallets", err);
      setLoading(false);
    });
  }, [bitgoToken, enterpriseId]);

  const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);

  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 3 }}>
        Institutional Overview
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
            <Typography variant="overline" color="text.secondary">Global BitGo Balance</Typography>
            <Typography variant="h4" fontWeight={800}>{formatUSD(totalBalance)}</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1 }}>
              <TrendingUpIcon sx={{ color: "success.main", fontSize: 18 }} />
              <Typography variant="body2" color="success.main" fontWeight={700}>+4.2% (7d)</Typography>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
            <Typography variant="overline" color="text.secondary">Portfolio APY</Typography>
            <Typography variant="h4" fontWeight={800}>{formatPercent(9.4)}</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>Aggregated across 8 protocols</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
            <Typography variant="overline" color="text.secondary">Risk Score</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h4" fontWeight={800}>72/100</Typography>
              <Chip icon={<GppGoodIcon />} label="Low Risk" color="success" size="small" />
            </Box>
            <Typography variant="body2" sx={{ mt: 1 }}>Health factor stable at 1.45</Typography>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>BitGo Wallets</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Label</TableCell>
              <TableCell>Asset</TableCell>
              <TableCell>Address</TableCell>
              <TableCell align="right">Balance</TableCell>
              <TableCell align="right">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                </TableRow>
              ))
            ) : (
              wallets.map((w) => (
                <TableRow key={w.id}>
                  <TableCell fontWeight={600}>{w.label}</TableCell>
                  <TableCell><Typography variant="body2">{w.coin.toUpperCase()}</Typography></TableCell>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{w.address}</TableCell>
                  <TableCell align="right">{formatUSD(w.balance)}</TableCell>
                  <TableCell align="right">
                    <Chip label="Protected" size="small" variant="outlined" sx={{ color: "info.main", borderColor: "info.soft" }} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
