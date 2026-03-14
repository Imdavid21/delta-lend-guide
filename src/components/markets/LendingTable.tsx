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

function UtilBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value * 100));
  const color =
    pct > 90 ? "#ff716c"
    : pct > 75 ? "#f59e0b"
    : "#00FF9D";

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
    { key: "utilizationRate", label: "Utilization", align: "right" },
  ];

  return (
    <Box>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{
            fontSize: 10,
            fontWeight: 800,
            textTransform: "uppercase" as const,
            letterSpacing: "0.12em",
            color: "#00FF9D",
            marginBottom: 4,
            fontFamily: "Inter, sans-serif",
          }}>
            {isLending ? "Omnichain Protocol" : "Institutional Credit Layer"}
          </div>
          <div style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "#eaeef5",
            marginBottom: 2,
            fontFamily: "Inter, sans-serif",
          }}>
            {isLending ? "Lending Markets" : "Borrow Markets"}
          </div>
          <div style={{ fontSize: 11, color: "rgba(167,171,178,0.7)", fontFamily: "Inter, sans-serif" }}>
            Rates via 1Delta · Base rates only (excl. reward incentives)
          </div>
        </div>
        <AssetFilter assets={assets} value={assetFilter} onChange={setAssetFilter} />
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
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "#a7abb2 !important",
                      "& .MuiTableSortLabel-icon": {
                        opacity: sortKey === c.key ? 1 : 0.3,
                        color: "#00FF9D !important",
                      },
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
                      {/* Asset */}
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                          <Box sx={{
                            width: 32, height: 32, borderRadius: "50%",
                            bgcolor: "#141a20",
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

                      {/* Protocol */}
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          <ProtocolIcon name={m.protocolName} size={16} />
                          <Chip
                            label={protoName}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontSize: 11, height: 22, fontWeight: 600,
                              borderColor: "rgba(67,72,78,0.4)",
                              color: "#a7abb2",
                              bgcolor: "transparent",
                            }}
                          />
                          {chain && <ChainIcon chainName={chain} size={13} />}
                        </Box>
                      </TableCell>

                      {/* Supply APY */}
                      <TableCell align="right">
                        <Typography sx={{
                          fontSize: 13, fontWeight: 800,
                          fontVariantNumeric: "tabular-nums",
                          color: supplyHighlight ? "#00FF9D" : "#eaeef5",
                          letterSpacing: "-0.02em",
                        }}>
                          {formatPercent(m.supplyAPY)}
                        </Typography>
                      </TableCell>

                      {/* Borrow APR */}
                      <TableCell align="right">
                        <Typography sx={{
                          fontSize: 13, fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                          color: "#a7abb2",
                        }}>
                          {formatPercent(m.borrowAPR)}
                        </Typography>
                      </TableCell>

                      {/* TVL */}
                      <TableCell align="right">
                        <Typography sx={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "#eaeef5" }}>
                          {formatUSD(m.totalSupplyUSD)}
                        </Typography>
                      </TableCell>

                      {/* Utilization */}
                      <TableCell align="right">
                        <UtilBar value={m.utilizationRate} />
                      </TableCell>

                      {/* Action */}
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
