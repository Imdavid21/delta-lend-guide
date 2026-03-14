import { useState, useMemo } from "react";
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Skeleton, TableSortLabel, Chip, alpha,
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
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        {formatPercent(value)}
      </Typography>
      <Box
        sx={{
          width: 80,
          height: 4,
          borderRadius: "2px",
          bgcolor: (t) => t.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            height: "100%",
            width: `${pct}%`,
            bgcolor: color,
            borderRadius: "2px",
            transition: "width 400ms ease",
            opacity: 0.8,
          }}
        />
      </Box>
    </Box>
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
      {/* Table toolbar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2.5,
          flexWrap: "wrap",
          gap: 1.5,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: "0.625rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "primary.main",
              mb: 0.25,
            }}
          >
            {isLending ? "Omnichain Protocol" : "Institutional Credit Layer"}
          </Typography>
          <Typography variant="h5" fontWeight={800}>
            {isLending ? "Lending Markets" : "Borrow Markets"}
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.6875rem" }}>
            Rates via 1Delta · Base rates only (excl. reward incentives)
          </Typography>
        </Box>
        <AssetFilter assets={assets} value={assetFilter} onChange={setAssetFilter} />
      </Box>

      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          Failed to load markets
        </Typography>
      )}

      <TableContainer
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "&:hover": { bgcolor: "transparent !important" } }}>
              {cols.map((c) => (
                <TableCell key={c.key} align={c.align}>
                  <TableSortLabel
                    active={sortKey === c.key}
                    direction={sortKey === c.key ? sortDir : "asc"}
                    onClick={() => handleSort(c.key)}
                    sx={{
                      "& .MuiTableSortLabel-icon": {
                        opacity: sortKey === c.key ? 1 : 0.3,
                        color: "primary.main !important",
                      },
                      "&.Mui-active": { color: "primary.main" },
                      "&:hover": { color: "text.primary" },
                    }}
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
                      <TableCell key={c.key} align={c.align}>
                        <Skeleton width={c.align === "right" ? 56 : 80} height={18} />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Skeleton width={60} height={28} sx={{ borderRadius: 1 }} />
                    </TableCell>
                  </TableRow>
                ))
              : rows.map((m) => {
                  const { name: protoName, chain } = parseChainFromLabel(formatProtocolLabel(m));
                  const supplyHighlight = m.supplyAPY > 5;
                  return (
                    <TableRow key={m.id} sx={{ cursor: "pointer" }}>
                      {/* Asset */}
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              bgcolor: (t) => t.palette.mode === "dark" ? "#1f262e" : "#f1f5f9",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "1px solid",
                              borderColor: "divider",
                              flexShrink: 0,
                            }}
                          >
                            <AssetIcon symbol={m.asset} size={18} />
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 700, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
                              {m.asset}
                            </Typography>
                          </Box>
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
                              fontSize: 11,
                              height: 22,
                              fontWeight: 600,
                              borderColor: "divider",
                              bgcolor: "transparent",
                            }}
                          />
                          {chain && <ChainIcon chainName={chain} size={13} />}
                        </Box>
                      </TableCell>

                      {/* Supply APY */}
                      <TableCell align="right">
                        <Typography
                          sx={{
                            fontSize: 13,
                            fontWeight: 800,
                            fontVariantNumeric: "tabular-nums",
                            color: supplyHighlight ? "primary.main" : "text.primary",
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {formatPercent(m.supplyAPY)}
                        </Typography>
                      </TableCell>

                      {/* Borrow APR */}
                      <TableCell align="right">
                        <Typography
                          sx={{
                            fontSize: 13,
                            fontWeight: 600,
                            fontVariantNumeric: "tabular-nums",
                            color: "text.secondary",
                          }}
                        >
                          {formatPercent(m.borrowAPR)}
                        </Typography>
                      </TableCell>

                      {/* TVL */}
                      <TableCell align="right">
                        <Typography sx={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                          {formatUSD(m.totalSupplyUSD)}
                        </Typography>
                      </TableCell>

                      {/* Utilization with progress bar */}
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
        <Box sx={{ textAlign: "center", py: 6 }}>
          <Typography variant="body2" color="text.secondary">
            No markets found
          </Typography>
        </Box>
      )}
    </Box>
  );
}
