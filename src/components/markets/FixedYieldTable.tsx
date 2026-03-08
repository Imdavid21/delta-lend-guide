import { useState, useMemo } from "react";
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Skeleton, TableSortLabel, Chip,
} from "@mui/material";
import { usePendle } from "@/hooks/useMarkets";
import { formatPercent, formatUSD } from "@/lib/marketTypes";
import { AssetIcon, ProtocolIcon } from "@/components/icons/MarketIcons";
import AssetFilter from "./AssetFilter";

type SortKey = "asset" | "impliedAPY" | "tvl" | "daysToMaturity" | "name";

export default function FixedYieldTable() {
  const { data, isLoading, error } = usePendle();
  const [assetFilter, setAssetFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("impliedAPY");
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
    { key: "name", label: "Market" },
    { key: "asset", label: "Asset" },
    { key: "impliedAPY", label: "Fixed APY", align: "right" },
    { key: "daysToMaturity", label: "Maturity", align: "right" },
    { key: "tvl", label: "TVL", align: "right" },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={800}>Fixed Yield</Typography>
          <Typography variant="caption" color="text.secondary">Pendle markets on Ethereum</Typography>
        </Box>
        <AssetFilter assets={assets} value={assetFilter} onChange={setAssetFilter} />
      </Box>
      {error && <Typography color="error" variant="body2">Failed to load Pendle markets</Typography>}
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
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {cols.map((c) => <TableCell key={c.key}><Skeleton width={60} /></TableCell>)}
                  </TableRow>
                ))
              : rows.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Typography fontSize={13} fontWeight={500} sx={{ maxWidth: 300 }} noWrap>
                        {m.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={700} fontSize={13} sx={{ fontVariantNumeric: "tabular-nums" }}>{m.asset}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        fontSize={13}
                        fontWeight={700}
                        sx={{
                          fontVariantNumeric: "tabular-nums",
                          color: m.impliedAPY > 5 ? "#22c55e" : "text.primary",
                        }}
                      >
                        {formatPercent(m.impliedAPY)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {m.daysToMaturity > 0 ? (
                        <Chip
                          label={`${m.daysToMaturity}d`}
                          size="small"
                          variant="outlined"
                          sx={{
                            fontSize: 11,
                            height: 22,
                            fontWeight: 600,
                            borderColor: m.daysToMaturity < 30 ? "#f59e0b" : "divider",
                            color: m.daysToMaturity < 30 ? "#f59e0b" : "text.primary",
                          }}
                        />
                      ) : (
                        <Typography fontSize={12} color="text.secondary">Expired</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontSize={13} sx={{ fontVariantNumeric: "tabular-nums" }}>{formatUSD(m.tvl)}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableContainer>
      {!isLoading && rows.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
          No fixed yield markets found
        </Typography>
      )}
    </Box>
  );
}
