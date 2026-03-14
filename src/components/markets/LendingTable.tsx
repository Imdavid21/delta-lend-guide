import { useState, useMemo } from "react";
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Skeleton, TableSortLabel, Chip,
} from "@mui/material";
import { useMarkets } from "@/hooks/useMarkets";
import { formatPercent, formatUSD, formatProtocolLabel } from "@/lib/marketTypes";
import { AssetIcon, ProtocolIcon, ChainIcon, parseChainFromLabel } from "@/components/icons/MarketIcons";
import AssetFilter from "./AssetFilter";
import MarketActionButton from "./MarketActionButton";

type SortKey = "asset" | "protocolName" | "supplyAPY" | "borrowAPR" | "totalSupplyUSD" | "utilizationRate";

export default function LendingTable({ viewMode = "lending" }: { viewMode?: "lending" | "borrow" }) {
  const { data, isLoading, error } = useMarkets();
  const [assetFilter, setAssetFilter] = useState<string | null>(null);
  const isLending = viewMode === "lending";
  const [sortKey, setSortKey] = useState<SortKey>(isLending ? "supplyAPY" : "borrowAPR");
  const [sortDir, setSortDir] = useState<"asc" | "desc">(isLending ? "desc" : "asc");

  const assets = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map((m) => m.asset))].sort();
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    let filtered = assetFilter ? data.filter((m) => m.asset === assetFilter) : data;
    // In borrow view, hide collateral-only markets (0 or null borrow APR)
    if (!isLending) filtered = filtered.filter((m) => m.borrowAPR != null && m.borrowAPR > 0);
    return [...filtered].sort((a, b) => {
      const av = (a as any)[sortKey] ?? 0;
      const bv = (b as any)[sortKey] ?? 0;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, assetFilter, sortKey, sortDir, isLending]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const cols: { key: SortKey; label: string; align?: "right" }[] = [
    { key: "asset", label: "Asset" },
    { key: "protocolName", label: "Protocol" },
    { key: "supplyAPY", label: "Supply APY", align: "right" },
    { key: "borrowAPR", label: "Borrow APR", align: "right" },
    { key: "totalSupplyUSD", label: "TVL", align: "right" },
    { key: "utilizationRate", label: "Util.", align: "right" },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={800}>{isLending ? "Lending Markets" : "Borrow Markets"}</Typography>
          <Typography variant="caption" color="text.secondary">Rates via 1Delta · Base rates only (excl. reward incentives)</Typography>
        </Box>
        <AssetFilter assets={assets} value={assetFilter} onChange={setAssetFilter} />
      </Box>
      {error && <Typography color="error" variant="body2">Failed to load markets</Typography>}
      <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {cols.map((c) => (
                <TableCell key={c.key} align={c.align}>
                  <TableSortLabel
                    active={sortKey === c.key}
                    direction={sortKey === c.key ? sortDir : "asc"}
                    onClick={() => handleSort(c.key)}
                  >
                    {c.label}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {cols.map((c) => (
                      <TableCell key={c.key}><Skeleton width={60} /></TableCell>
                    ))}
                    <TableCell><Skeleton width={50} /></TableCell>
                  </TableRow>
                ))
              : rows.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <AssetIcon symbol={m.asset} size={20} />
                        <Typography fontWeight={700} fontSize={13} sx={{ fontVariantNumeric: "tabular-nums" }}>{m.asset}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const { name: protoName, chain } = parseChainFromLabel(formatProtocolLabel(m));
                        return (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                            <ProtocolIcon name={m.protocolName} size={16} />
                            <Chip label={protoName} size="small" variant="outlined" sx={{ fontSize: 11, height: 22, borderColor: "divider" }} />
                            {chain && <ChainIcon chainName={chain} size={14} />}
                          </Box>
                        );
                      })()}
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
                      <Typography fontSize={13} sx={{ fontVariantNumeric: "tabular-nums" }}>{formatUSD(m.totalSupplyUSD)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontSize={13} sx={{ fontVariantNumeric: "tabular-nums" }}>{formatPercent(m.utilizationRate)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <MarketActionButton
                        label={isLending ? "Deposit" : "Borrow"}
                        prompt={`${isLending ? "Deposit into" : "Borrow from"} ${formatProtocolLabel(m)} ${m.asset} market (marketUid: ${m.marketUid})`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableContainer>
      {!isLoading && rows.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
          No markets found
        </Typography>
      )}
    </Box>
  );
}
