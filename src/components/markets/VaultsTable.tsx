import { useState, useMemo } from "react";
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Skeleton, TableSortLabel, Chip,
} from "@mui/material";
import { useVaults } from "@/hooks/useMarkets";
import { formatPercent, formatUSD } from "@/lib/marketTypes";
import AssetFilter from "./AssetFilter";
import MarketActionButton from "./MarketActionButton";

type SortKey = "asset" | "protocol" | "apy" | "tvl" | "name";

const SOURCE_COLORS: Record<string, string> = {
  morpho: "#5865F2",
  yearn: "#006ae3",
  euler: "#e5484d",
};

export default function VaultsTable() {
  const { data, isLoading, error } = useVaults();
  const [assetFilter, setAssetFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("apy");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const assets = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map((v) => v.asset))].sort();
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    let filtered = assetFilter ? data.filter((v) => v.asset === assetFilter) : data;
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
    { key: "name", label: "Vault" },
    { key: "asset", label: "Asset" },
    { key: "protocol", label: "Protocol" },
    { key: "apy", label: "APY", align: "right" },
    { key: "tvl", label: "TVL", align: "right" },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">Vaults</Typography>
        <AssetFilter assets={assets} value={assetFilter} onChange={setAssetFilter} />
      </Box>
      {error && <Typography color="error" variant="body2">Failed to load vaults</Typography>}
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
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {cols.map((c) => <TableCell key={c.key}><Skeleton width={60} /></TableCell>)}
                    <TableCell><Skeleton width={50} /></TableCell>
                  </TableRow>
                ))
              : rows.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <Typography fontSize={13} fontWeight={500} sx={{ maxWidth: 260 }} noWrap>
                        {v.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600} fontSize={13} fontFamily="monospace">{v.asset}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={v.protocol}
                        size="small"
                        sx={{
                          fontSize: 11,
                          height: 22,
                          bgcolor: `${SOURCE_COLORS[v.source] ?? "#5865F2"}18`,
                          color: SOURCE_COLORS[v.source] ?? "#5865F2",
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        fontSize={13}
                        fontFamily="monospace"
                        fontWeight={600}
                        sx={{ color: v.apy > 5 ? "success.main" : "text.primary" }}
                      >
                        {formatPercent(v.apy)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontSize={13} fontFamily="monospace">{formatUSD(v.tvl)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <MarketActionButton
                        label="Deposit"
                        prompt={`Deposit into ${v.protocol} vault "${v.name}" for ${v.asset}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableContainer>
      {!isLoading && rows.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
          No vaults found
        </Typography>
      )}
    </Box>
  );
}
