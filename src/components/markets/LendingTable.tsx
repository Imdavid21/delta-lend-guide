import { useState, useMemo } from "react";
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Skeleton, TableSortLabel, Chip, Select, MenuItem,
} from "@mui/material";
import { useMarkets } from "@/hooks/useMarkets";
import { formatPercent, formatUSD, formatProtocolLabel } from "@/lib/marketTypes";
import { AssetIcon, ProtocolIcon, ChainIcon, parseChainFromLabel } from "@/components/icons/MarketIcons";
import MarketActionButton from "./MarketActionButton";

type SortKey = "asset" | "protocolName" | "supplyAPY" | "borrowAPR" | "totalSupplyUSD" | "utilizationRate";

function UtilBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct > 90 ? "#ff716c" : pct > 75 ? "#f59e0b" : "#00FF9D";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums" as const, color: "#eaeef5", fontFamily: "Inter, sans-serif" }}>
        {formatPercent(value)}
      </span>
      <div style={{ width: 80, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 400ms ease", opacity: 0.85 }} />
      </div>
    </div>
  );
}

function extractChain(protocolName: string): string | null {
  const match = protocolName.match(/\((\w+)\)$/);
  return match ? match[1] : null;
}

function extractProtocolBase(protocolName: string): string {
  return protocolName.replace(/\s*\([^)]+\)$/, "");
}

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

export default function LendingTable({ viewMode = "lending", showTitle = true }: { viewMode?: "lending" | "borrow"; showTitle?: boolean }) {
  const { data, isLoading, error } = useMarkets();
  const [assetFilter, setAssetFilter] = useState<string>("");
  const [chainFilter, setChainFilter] = useState<string>("");
  const isLending = viewMode === "lending";
  const [sortKey, setSortKey] = useState<SortKey>(isLending ? "supplyAPY" : "borrowAPR");
  const [sortDir, setSortDir] = useState<"asc" | "desc">(isLending ? "desc" : "asc");

  const assets = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map((m) => m.asset))].sort();
  }, [data]);

  const chains = useMemo(() => {
    if (!data) return [];
    const cs = data.map((m) => extractChain(m.protocolName)).filter(Boolean) as string[];
    return [...new Set(cs)].sort();
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    let filtered = data;
    if (!isLending) filtered = filtered.filter((m) => m.borrowAPR != null && m.borrowAPR > 0);
    if (assetFilter) filtered = filtered.filter((m) => m.asset === assetFilter);
    if (chainFilter) filtered = filtered.filter((m) => extractChain(m.protocolName) === chainFilter);
    return [...filtered].sort((a, b) => {
      const av = (a as any)[sortKey] ?? 0;
      const bv = (b as any)[sortKey] ?? 0;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, assetFilter, chainFilter, sortKey, sortDir, isLending]);

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
    { key: "utilizationRate", label: "Utilization", align: "right" },
  ];

  return (
    <Box>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        {showTitle && (
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: "#eaeef5", fontFamily: "Inter, sans-serif" }}>
            {isLending ? "Lending Markets" : "Borrow Markets"}
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
      </div>

      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          Failed to load markets
        </Typography>
      )}

      <TableContainer
        sx={{
          border: "1px solid rgba(67,72,78,0.3)",
          borderRadius: 3,
          overflow: "hidden",
          background: "#0e1419",
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "&:hover": { bgcolor: "transparent !important" } }}>
              {cols.map((c) => (
                <TableCell
                  key={c.key}
                  align={c.align}
                  sx={{ borderBottom: "1px solid rgba(67,72,78,0.25)", bgcolor: "#0a0f14" }}
                >
                  <TableSortLabel
                    active={sortKey === c.key}
                    direction={sortKey === c.key ? sortDir : "asc"}
                    onClick={() => handleSort(c.key)}
                    sx={{
                      fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                      letterSpacing: "0.05em", color: "#a7abb2 !important",
                      "& .MuiTableSortLabel-icon": { opacity: sortKey === c.key ? 1 : 0.3, color: "#00FF9D !important" },
                      "&.Mui-active": { color: "#eaeef5 !important" },
                      "&:hover": { color: "#eaeef5 !important" },
                    }}
                  >
                    {c.label}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell sx={{ borderBottom: "1px solid rgba(67,72,78,0.25)", bgcolor: "#0a0f14" }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} sx={{ "&:hover": { bgcolor: "transparent" } }}>
                    {cols.map((c) => (
                      <TableCell key={c.key} align={c.align} sx={{ borderBottom: "1px solid rgba(67,72,78,0.15)" }}>
                        <Skeleton width={c.align === "right" ? 56 : 80} height={18} sx={{ bgcolor: "rgba(255,255,255,0.05)" }} />
                      </TableCell>
                    ))}
                    <TableCell sx={{ borderBottom: "1px solid rgba(67,72,78,0.15)" }}>
                      <Skeleton width={60} height={28} sx={{ borderRadius: 1, bgcolor: "rgba(255,255,255,0.05)" }} />
                    </TableCell>
                  </TableRow>
                ))
              : rows.map((m) => {
                  const { name: protoName, chain } = parseChainFromLabel(formatProtocolLabel(m));
                  const supplyHighlight = m.supplyAPY > 5;
                  return (
                    <TableRow
                      key={m.id}
                      sx={{
                        cursor: "pointer",
                        "&:hover": { bgcolor: "rgba(255,255,255,0.025) !important" },
                        "& td": { borderBottom: "1px solid rgba(67,72,78,0.15)" },
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                          <Box sx={{
                            width: 32, height: 32, borderRadius: "50%", bgcolor: "#141a20",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            border: "1px solid rgba(67,72,78,0.3)", flexShrink: 0,
                          }}>
                            <AssetIcon symbol={m.asset} size={18} />
                          </Box>
                          <Typography sx={{ fontWeight: 700, fontSize: 13, fontVariantNumeric: "tabular-nums", color: "#eaeef5" }}>
                            {m.asset}
                          </Typography>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          <ProtocolIcon name={m.protocolName} size={16} />
                          <Chip
                            label={protoName}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: 11, height: 22, fontWeight: 600, borderColor: "rgba(67,72,78,0.4)", color: "#a7abb2", bgcolor: "transparent" }}
                          />
                          {chain && <ChainIcon chainName={chain} size={13} />}
                        </Box>
                      </TableCell>

                      <TableCell align="right">
                        <Typography sx={{
                          fontSize: 13, fontWeight: 800, fontVariantNumeric: "tabular-nums",
                          color: supplyHighlight ? "#00FF9D" : "#eaeef5", letterSpacing: "-0.02em",
                        }}>
                          {formatPercent(m.supplyAPY)}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography sx={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "#a7abb2" }}>
                          {formatPercent(m.borrowAPR)}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography sx={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "#eaeef5" }}>
                          {formatUSD(m.totalSupplyUSD)}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <UtilBar value={m.utilizationRate ?? 0} />
                      </TableCell>

                      <TableCell align="right">
                        <MarketActionButton
                          label={isLending ? "Deposit" : "Borrow"}
                          prompt={`${isLending ? "Deposit into" : "Borrow from"} ${formatProtocolLabel(m)} ${m.asset} market (marketUid: ${m.marketUid})`}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </TableContainer>

      {!isLoading && rows.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <span style={{ fontSize: 14, color: "#a7abb2", fontFamily: "Inter, sans-serif" }}>No markets found</span>
        </div>
      )}
    </Box>
  );
}
