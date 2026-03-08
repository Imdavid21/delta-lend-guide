import { useState, useMemo } from "react";
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Skeleton, Chip,
} from "@mui/material";
import { useMarkets, useVaults } from "@/hooks/useMarkets";
import { formatPercent, formatUSD } from "@/lib/marketTypes";
import { AssetIcon, ProtocolIcon } from "@/components/icons/MarketIcons";
import AssetFilter from "../markets/AssetFilter";
import MarketActionButton from "../markets/MarketActionButton";

export default function ProtocolCompare() {
  const { data: lending, isLoading: ll } = useMarkets();
  const { data: vaults, isLoading: vl } = useVaults();

  const allAssets = useMemo(() => {
    const set = new Set<string>();
    lending?.forEach((m) => set.add(m.asset));
    vaults?.forEach((v) => set.add(v.asset));
    return [...set].sort();
  }, [lending, vaults]);

  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  // Auto-select USDC if available
  const asset = selectedAsset ?? (allAssets.includes("USDC") ? "USDC" : allAssets[0] ?? null);

  const lendingRows = useMemo(() => {
    if (!lending || !asset) return [];
    return lending
      .filter((m) => m.asset === asset)
      .sort((a, b) => b.supplyAPY - a.supplyAPY);
  }, [lending, asset]);

  const vaultRows = useMemo(() => {
    if (!vaults || !asset) return [];
    return vaults
      .filter((v) => v.asset === asset)
      .sort((a, b) => b.apy - a.apy);
  }, [vaults, asset]);

  const isLoading = ll || vl;

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {asset && <AssetIcon symbol={asset} size={24} />}
            <Typography variant="h6" fontWeight={800}>
              Protocol Comparison
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Compare {asset || "asset"} rates across protocols
          </Typography>
        </Box>
        <AssetFilter assets={allAssets} value={selectedAsset} onChange={setSelectedAsset} />
      </Box>

      {/* Lending comparison */}
      {lendingRows.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontSize: 10,
              color: "text.secondary",
              mb: 1,
              display: "block",
            }}
          >
            Lending Markets
          </Typography>
          <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Protocol</TableCell>
                  <TableCell align="right">Supply APY</TableCell>
                  <TableCell align="right">Borrow APR</TableCell>
                  <TableCell align="right">TVL</TableCell>
                  <TableCell align="right">Utilization</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}><Skeleton width={60} /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : lendingRows.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                            <ProtocolIcon name={m.protocolName} size={16} />
                            <Typography fontSize={13} fontWeight={600}>{m.protocolName}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            fontSize={13}
                            fontWeight={700}
                            sx={{
                              fontVariantNumeric: "tabular-nums",
                              color: m.supplyAPY > 5 ? "#22c55e" : "text.primary",
                            }}
                          >
                            {formatPercent(m.supplyAPY)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontSize={13} sx={{ fontVariantNumeric: "tabular-nums" }}>
                            {formatPercent(m.borrowAPR)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontSize={13} sx={{ fontVariantNumeric: "tabular-nums" }}>
                            {formatUSD(m.totalSupplyUSD)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontSize={13} sx={{ fontVariantNumeric: "tabular-nums" }}>
                            {formatPercent(m.utilizationRate)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <MarketActionButton
                            label="Deposit"
                            prompt={`Deposit into ${m.protocolName} ${m.asset} market (marketUid: ${m.marketUid})`}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Vault comparison */}
      {vaultRows.length > 0 && (
        <Box>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontSize: 10,
              color: "text.secondary",
              mb: 1,
              display: "block",
            }}
          >
            Vaults
          </Typography>
          <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Vault</TableCell>
                  <TableCell>Protocol</TableCell>
                  <TableCell align="right">APY</TableCell>
                  <TableCell align="right">TVL</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {vaultRows.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <Box>
                        <Typography fontSize={13} fontWeight={500} noWrap>
                          {v.name}
                        </Typography>
                        {v.curator && (
                          <Typography fontSize={10} color="text.secondary" noWrap>
                            {v.curator}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={v.protocol}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: 11, height: 22, borderColor: "divider" }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        fontSize={13}
                        fontWeight={700}
                        sx={{
                          fontVariantNumeric: "tabular-nums",
                          color: v.apy > 5 ? "#22c55e" : "text.primary",
                        }}
                      >
                        {formatPercent(v.apy)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontSize={13} sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatUSD(v.tvl)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <MarketActionButton
                        label="Deposit"
                        prompt={`Deposit into ${v.protocol} vault "${v.name}" for ${v.asset} (id: ${v.id})`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {!isLoading && lendingRows.length === 0 && vaultRows.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 6 }}>
          {asset ? `No markets found for ${asset}` : "Select an asset to compare"}
        </Typography>
      )}
    </Box>
  );
}
