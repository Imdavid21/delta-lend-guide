import { useState, useMemo } from "react";
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Skeleton,
} from "@mui/material";
import { useMarkets, useVaults } from "@/hooks/useMarkets";
import { formatPercent, formatUSD } from "@/lib/marketTypes";
import { AssetIcon, ProtocolIcon } from "@/components/icons/MarketIcons";
import MarketActionButton from "../markets/MarketActionButton";

export default function AssetCompare() {
  const { data: lending, isLoading: ll } = useMarkets();
  const { data: vaults, isLoading: vl } = useVaults();

  // Group all assets with their best opportunities
  const assetData = useMemo(() => {
    const assetMap = new Map<string, {
      lending: { apy: number; protocol: string; marketUid: string } | null;
      vault: { apy: number; name: string; id: string } | null;
    }>();

    // Process lending
    lending?.forEach((m) => {
      const existing = assetMap.get(m.asset) || { lending: null, vault: null };
      if (!existing.lending || m.supplyAPY > existing.lending.apy) {
        existing.lending = { apy: m.supplyAPY, protocol: m.protocolName, marketUid: m.marketUid };
      }
      assetMap.set(m.asset, existing);
    });

    // Process vaults
    vaults?.forEach((v) => {
      const existing = assetMap.get(v.asset) || { lending: null, vault: null };
      if (!existing.vault || v.apy > existing.vault.apy) {
        existing.vault = { apy: v.apy, name: v.name, id: v.id };
      }
      assetMap.set(v.asset, existing);
    });

    // Convert to array and sort by best overall APY
    return [...assetMap.entries()]
      .map(([asset, data]) => ({
        asset,
        ...data,
        bestAPY: Math.max(
          data.lending?.apy || 0,
          data.vault?.apy || 0,
        ),
      }))
      .sort((a, b) => b.bestAPY - a.bestAPY);
  }, [lending, vaults]);

  const isLoading = ll || vl;

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={800}>
            Asset Comparison
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Best yields for each asset across all market types
          </Typography>
        </Box>
      </Box>

      <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Asset</TableCell>
              <TableCell align="right">Best Lending</TableCell>
              <TableCell align="right">Best Vault</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <TableCell key={j}><Skeleton width={60} /></TableCell>
                    ))}
                  </TableRow>
                ))
              : assetData.slice(0, 30).map((row) => (
                  <TableRow key={row.asset}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <AssetIcon symbol={row.asset} size={20} />
                        <Typography fontSize={13} fontWeight={700}>{row.asset}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      {row.lending ? (
                        <Box>
                          <Typography
                            fontSize={13}
                            fontWeight={700}
                            sx={{ fontVariantNumeric: "tabular-nums", color: row.lending.apy > 5 ? "#22c55e" : "text.primary" }}
                          >
                            {formatPercent(row.lending.apy)}
                          </Typography>
                          <Typography fontSize={10} color="text.secondary">{row.lending.protocol}</Typography>
                        </Box>
                      ) : (
                        <Typography fontSize={12} color="text.disabled">—</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {row.vault ? (
                        <Box>
                          <Typography
                            fontSize={13}
                            fontWeight={700}
                            sx={{ fontVariantNumeric: "tabular-nums", color: row.vault.apy > 5 ? "#22c55e" : "text.primary" }}
                          >
                            {formatPercent(row.vault.apy)}
                          </Typography>
                          <Typography fontSize={10} color="text.secondary" noWrap sx={{ maxWidth: 100 }}>
                            {row.vault.name}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography fontSize={12} color="text.disabled">—</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {row.lending && (
                        <MarketActionButton
                          label="Deposit"
                          prompt={`Deposit ${row.asset} into ${row.lending.protocol} (marketUid: ${row.lending.marketUid})`}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
