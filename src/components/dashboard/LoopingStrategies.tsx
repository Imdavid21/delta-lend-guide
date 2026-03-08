import { useState, useMemo } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Card,
  Tooltip,
  IconButton,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { useMarkets } from "../../hooks/useMarkets";
import { formatPercent, formatUSD } from "../../lib/marketTypes";
import { useShell } from "../AppShell";

interface LoopStrategy {
  id: string;
  asset: string;
  protocol: string;
  supplyAPY: number;
  borrowAPR: number;
  maxLeverage: number;
  netAPY: number;
  totalSupplyUSD: number;
  utilizationRate: number;
  riskLevel: "Low" | "Medium" | "High";
}

export default function LoopingStrategies() {
  const [assetFilter, setAssetFilter] = useState<"eth" | "stablecoin" | "all">("all");
  const { data: markets, isLoading } = useMarkets();
  const { submitAction } = useShell();

  const loopStrategies = useMemo(() => {
    if (!markets) return [];

    return markets
      .filter((market) => market.borrowAPR !== null && market.supplyAPY > 0)
      .map((market): LoopStrategy => {
        const borrowAPR = market.borrowAPR || 0;
        const supplyAPY = market.supplyAPY;
        
        // Calculate maximum safe leverage (conservative estimate)
        const utilizationThreshold = 0.8; // 80% max utilization for safety
        const maxLeverage = Math.min(5, 1 / (1 - utilizationThreshold));
        
        // Calculate net APY with leverage
        // Net APY = (Supply APY * Leverage) - (Borrow APR * (Leverage - 1))
        const netAPY = (supplyAPY * maxLeverage) - (borrowAPR * (maxLeverage - 1));
        
        // Determine risk level
        let riskLevel: "Low" | "Medium" | "High" = "Medium";
        if (market.utilizationRate && market.utilizationRate > 85) riskLevel = "High";
        else if (market.utilizationRate && market.utilizationRate < 50) riskLevel = "Low";
        
        return {
          id: market.id,
          asset: market.asset,
          protocol: market.protocolName || market.protocol,
          supplyAPY,
          borrowAPR,
          maxLeverage,
          netAPY,
          totalSupplyUSD: market.totalSupplyUSD,
          utilizationRate: market.utilizationRate || 0,
          riskLevel,
        };
      })
      .filter((strategy) => {
        if (assetFilter === "all") return true;
        if (assetFilter === "eth") return ["ETH", "WETH", "stETH", "wstETH"].includes(strategy.asset);
        if (assetFilter === "stablecoin") return ["USDC", "USDT", "DAI", "FRAX", "GHO"].includes(strategy.asset);
        return true;
      })
      .filter((strategy) => strategy.netAPY > 0) // Only profitable strategies
      .sort((a, b) => b.netAPY - a.netAPY); // Sort by net APY descending
  }, [markets, assetFilter]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "Low": return "success";
      case "Medium": return "warning";
      case "High": return "error";
      default: return "default";
    }
  };

  const handleStrategyClick = (strategy: LoopStrategy) => {
    const prompt = `Create a ${strategy.maxLeverage.toFixed(1)}x leverage loop strategy for ${strategy.asset} on ${strategy.protocol}. Supply APY: ${formatPercent(strategy.supplyAPY)}, Borrow APR: ${formatPercent(strategy.borrowAPR)}, Expected Net APY: ${formatPercent(strategy.netAPY)}. Please provide the exact 1delta transaction steps.`;
    submitAction(prompt);
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Loading looping strategies...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
            Leverage Loop Strategies
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Automated strategies to amplify yields through borrowing and re-depositing
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={assetFilter}
          exclusive
          onChange={(_, value) => value && setAssetFilter(value)}
          size="small"
        >
          <ToggleButton value="all">All Assets</ToggleButton>
          <ToggleButton value="eth">ETH Variants</ToggleButton>
          <ToggleButton value="stablecoin">Stablecoins</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Card variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Asset / Protocol</TableCell>
                <TableCell align="right">Supply APY</TableCell>
                <TableCell align="right">Borrow APR</TableCell>
                <TableCell align="right">
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                    Max Leverage
                    <Tooltip title="Conservative estimate based on 80% max utilization">
                      <IconButton size="small" sx={{ ml: 0.5 }}>
                        <InfoIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                    Net APY
                    <Tooltip title="Estimated APY after borrowing costs with max leverage">
                      <IconButton size="small" sx={{ ml: 0.5 }}>
                        <InfoIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell align="right">TVL</TableCell>
                <TableCell align="center">Risk</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loopStrategies.map((strategy) => (
                <TableRow
                  key={strategy.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => handleStrategyClick(strategy)}
                >
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {strategy.asset}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {strategy.protocol}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="success.main" fontWeight={600}>
                      {formatPercent(strategy.supplyAPY)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="error.main">
                      {formatPercent(strategy.borrowAPR)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600}>
                      {strategy.maxLeverage.toFixed(1)}x
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography 
                      variant="body2" 
                      fontWeight={700}
                      color={strategy.netAPY > 5 ? "success.main" : strategy.netAPY > 0 ? "warning.main" : "error.main"}
                    >
                      {formatPercent(strategy.netAPY)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatUSD(strategy.totalSupplyUSD)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={strategy.riskLevel}
                      size="small"
                      color={getRiskColor(strategy.riskLevel) as any}
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {loopStrategies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No profitable looping strategies available for {assetFilter === "all" ? "any assets" : assetFilter === "eth" ? "ETH variants" : "stablecoins"}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Box sx={{ mt: 2, p: 2, bgcolor: "action.hover", borderRadius: 2 }}>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
          How Looping Works:
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          1. Deposit collateral → 2. Borrow asset → 3. Re-deposit borrowed asset → 4. Repeat for desired leverage
        </Typography>
        <Typography variant="caption" color="text.secondary">
          ⚠️ Higher leverage increases both potential returns and liquidation risk. Start with lower multipliers.
        </Typography>
      </Box>
    </Box>
  );
}