import { useState, useMemo } from "react";
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Skeleton, TableSortLabel, Chip, Select, MenuItem,
} from "@mui/material";
import { usePendle } from "@/hooks/useMarkets";
import { formatPercent, formatUSD } from "@/lib/marketTypes";
import { AssetIcon, ProtocolIcon, ChainIcon, parseChainFromLabel } from "@/components/icons/MarketIcons";

type SortKey = "asset" | "impliedAPY" | "tvl" | "daysToMaturity" | "name";

const selectSx = {
  fontSize: 12,
  fontWeight: 600,
  minWidth: 130,
  bgcolor: "#0a0f14",
  border: "1px solid rgba(67,72,78,0.4)",
  borderRadius: 2,
  color: "#a7abb2",
  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
  "& .MuiSelect-select": { py: "5px", px: "10px" },
  "& .MuiSelect-icon": { color: "#a7abb2" },
};

export default function FixedYieldTable({ showTitle = true }: { showTitle?: boolean }) {
  const { data, isLoading, error } = usePendle();
  const [assetFilter, setAssetFilter] = useState<string>("");
  const [chainFilter, setChainFilter] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("impliedAPY");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const assets = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map((m) => m.asset))].sort();
  }, [data]);

  const chains = useMemo(() => {
    if (!data) return [];
    const cs = data.map((m) => {
      const match = m.name.match(/\((\w+)\)$/);
      return match ? match[1] : null;
    }).filter(Boolean) as string[];
    return [...new Set(cs)].sort();
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    let filtered = data;
    if (assetFilter) filtered = filtered.filter((m) => m.asset === assetFilter);
    if (chainFilter) filtered = filtered.filter((m) => { const match = m.name.match(/\((\w+)\)$/); return match ? match[1] === chainFilter : false; });
    return [...filtered].sort((a, b) => {
      const av = (a as any)[sortKey] ?? 0;
      const bv = (b as any)[sortKey] ?? 0;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, assetFilter, chainFilter, sortKey, sortDir]);

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
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
        {showTitle && (
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: "#eaeef5", fontFamily: "Inter, sans-serif" }}>
            Fixed Rate Markets
          </div>
        )}
        <Box sx={{ display: "flex", gap: 1 }}>
          <Select
            value={chainFilter}
            onChange={(e) => setChainFilter(e.target.value)}
            displayEmpty
            size="small"
            sx={selectSx}
          >
            <MenuItem value="">All Networks</MenuItem>
            {chains.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
          <Select
            value={assetFilter}
            onChange={(e) => setAssetFilter(e.target.value)}
            displayEmpty
            size="small"
            sx={selectSx}
          >
            <MenuItem value="">All Assets</MenuItem>
            {assets.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </Select>
        </Box>
      </Box>

      {error && <Typography color="error" variant="body2">Failed to load Pendle markets</Typography>}

      <TableContainer sx={{ border: "1px solid rgba(67,72,78,0.3)", borderRadius: 3, overflow: "hidden", background: "#0e1419" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "&:hover": { bgcolor: "transparent !important" } }}>
              {cols.map((c) => (
                <TableCell key={c.key} align={c.align} sx={{ borderBottom: "1px solid rgba(67,72,78,0.25)", bgcolor: "#0a0f14" }}>
                  <TableSortLabel
                    active={sortKey === c.key}
                    direction={sortKey === c.key ? sortDir : "asc"}
                    onClick={() => handleSort(c.key)}
                    sx={{
                      fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                      color: "#a7abb2 !important",
                      "& .MuiTableSortLabel-icon": { opacity: sortKey === c.key ? 1 : 0.3, color: "#00FF9D !important" },
                      "&.Mui-active": { color: "#eaeef5 !important" },
                      "&:hover": { color: "#eaeef5 !important" },
                    }}
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
                  <TableRow
                    key={m.id}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.025) !important" },
                      "& td": { borderBottom: "1px solid rgba(67,72,78,0.15)" },
                    }}
                  >
                    <TableCell>
                      {(() => {
                        const { name: marketName, chain } = parseChainFromLabel(m.name);
                        return (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                            <ProtocolIcon name="Pendle" size={16} />
                            <Typography fontSize={13} fontWeight={500} sx={{ maxWidth: 280 }} noWrap>
                              {marketName}
                            </Typography>
                            {chain && <ChainIcon chainName={chain} size={14} />}
                          </Box>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <AssetIcon symbol={m.asset} size={18} />
                        <Typography fontWeight={700} fontSize={13} sx={{ fontVariantNumeric: "tabular-nums", color: "#eaeef5" }}>{m.asset}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        fontSize={13}
                        fontWeight={700}
                        sx={{ fontVariantNumeric: "tabular-nums", color: m.impliedAPY > 5 ? "#00FF9D" : "#eaeef5" }}
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
                            fontSize: 11, height: 22, fontWeight: 600,
                            borderColor: m.daysToMaturity < 30 ? "#f59e0b" : "rgba(67,72,78,0.4)",
                            color: m.daysToMaturity < 30 ? "#f59e0b" : "#a7abb2",
                          }}
                        />
                      ) : (
                        <Typography fontSize={12} color="text.secondary">Expired</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontSize={13} sx={{ fontVariantNumeric: "tabular-nums", color: "#eaeef5" }}>{formatUSD(m.tvl)}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableContainer>

      {!isLoading && rows.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <span style={{ fontSize: 14, color: "#a7abb2", fontFamily: "Inter, sans-serif" }}>No fixed yield markets found</span>
        </div>
      )}
    </Box>
  );
}
