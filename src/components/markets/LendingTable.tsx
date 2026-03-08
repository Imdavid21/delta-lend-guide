import { useState, useMemo } from "react";
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Skeleton, TableSortLabel, Chip,
} from "@mui/material";
import { useMarkets } from "@/hooks/useMarkets";
import { formatPercent, formatUSD } from "@/lib/marketTypes";
import AssetFilter from "./AssetFilter";
import MarketActionButton from "./MarketActionButton";

type SortKey = "asset" | "protocolName" | "supplyAPY" | "borrowAPR" | "totalSupplyUSD" | "utilizationRate";

export default function LendingTable() {
  const { data, isLoading, error } = useMarkets();
  const [assetFilter, setAssetFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("supplyAPY");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const assets = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map((m) => m.asset))].sort();
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    let filtered = assetFilter ? data.filter((m) => m.asset === assetFilter) : data;
    return [...filtered].sort((a, b) => {
      const av = (a as any)[sortKey] ?? 0;
      const bv = (b as any)[sortKey] ?? 0;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, assetFilter, sortKey, sortDir]);

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
        <Typography variant="h6">Lending Markets</Typography>
        <AssetFilter assets={assets} value={assetFilter} onChange={setAssetFilter} />
      </Box>
      {error && <Typography color="error" variant="body2">Failed to load markets</Typography>}
      <TableContainer sx={{ bgcolor: "background.paper", borderRadius: 2 }}>
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
                      <Typography fontWeight={600} fontSize={13} fontFamily="monospace">{m.asset}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={m.protocolName} size="small" variant="outlined" sx={{ fontSize: 11, height: 22 }} />
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        fontSize={13}
                        fontFamily="monospace"
                        fontWeight={600}
                        sx={{ color: m.supplyAPY > 5 ? "success.main" : "text.primary" }}
                      >
                        {formatPercent(m.supplyAPY)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontSize={13} fontFamily="monospace">
                        {formatPercent(m.borrowAPR)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontSize={13} fontFamily="monospace">{formatUSD(m.totalSupplyUSD)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontSize={13} fontFamily="monospace">{formatPercent(m.utilizationRate)}</Typography>
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
      {!isLoading && rows.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
          No markets found
        </Typography>
      )}
    </Box>
  );
}
