import { useState, useMemo } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Skeleton,
  TableSortLabel,
  Select,
  MenuItem,
  useTheme,
  Chip,
} from "@mui/material";
import { useMarkets, useVaults } from "@/hooks/useMarkets";
import { formatPercent, formatUSD, formatProtocolLabel } from "@/lib/marketTypes";
import { AssetIcon, ProtocolIcon, ChainIcon, parseChainFromLabel } from "@/components/icons/MarketIcons";
import MarketActionButton from "./MarketActionButton";
import { useShell } from "@/components/AppShell";

// ── Unified row type ──────────────────────────────────────────────────────────

type RowKind = "lending" | "vault";

interface UnifiedRow {
  id: string;
  rowKind: RowKind;
  asset: string;
  displayName: string;   // vault name for vaults; protocol name for lending
  subLabel: string;      // curator for vaults; chain label for lending
  chain: string | null;
  apy: number;
  borrowAPR: number | null;
  tvl: number;
  utilizationRate: number | null;
  marketUid: string;
  protocolKey: string;   // for filter (e.g. "Morpho Blue", "Aave V3")
  actionPrompt: string;
}

type SortKey = "displayName" | "asset" | "apy" | "borrowAPR" | "tvl" | "utilizationRate";

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractChain(protocolName: string): string | null {
  const m = protocolName.match(/\((\w+)\)$/);
  return m ? m[1] : null;
}

function extractProtocolBase(protocolName: string): string {
  return protocolName.replace(/\s*\([^)]+\)$/, "");
}

// ── Utilization bar ───────────────────────────────────────────────────────────

function UtilBar({ value }: { value: number }) {
  const theme = useTheme();
  const pct = Math.min(100, Math.max(0, value));
  const color = pct > 90 ? "#ff716c" : pct > 75 ? "#f59e0b" : "#86efac";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <span style={{
        fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums",
        color: theme.palette.text.primary, fontFamily: "Inter, sans-serif",
      }}>
        {formatPercent(value)}
      </span>
      <div style={{
        width: 80, height: 4, borderRadius: 2,
        background: theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
        overflow: "hidden",
      }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 400ms ease", opacity: 0.85 }} />
      </div>
    </div>
  );
}

// ── Best Borrow Banner ────────────────────────────────────────────────────────

function BestBorrowBanner({ markets }: { markets: ReturnType<typeof useMarkets>["data"] }) {
  const theme = useTheme();
  const { submitAction } = useShell();

  const best = useMemo(() => {
    if (!markets?.length) return null;
    const candidates = markets.filter((m) => m.borrowAPR != null && m.borrowAPR > 0);
    if (!candidates.length) return null;
    return candidates.reduce((a, b) => ((a.borrowAPR ?? 999) < (b.borrowAPR ?? 999) ? a : b));
  }, [markets]);

  if (!best) return null;

  const { name: protoName, chain } = parseChainFromLabel(formatProtocolLabel(best));
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        p: "10px 16px",
        mb: 2,
        borderRadius: 2,
        border: "1px solid",
        borderColor: isDark ? "rgba(251,191,36,0.25)" : "rgba(234,179,8,0.3)",
        bgcolor: isDark ? "rgba(251,191,36,0.05)" : "rgba(234,179,8,0.04)",
        flexWrap: "wrap",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: 10, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.1em", color: "#f59e0b", fontFamily: "Inter, sans-serif",
            whiteSpace: "nowrap",
          }}
        >
          Best Borrow Rate
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <AssetIcon symbol={best.asset} size={14} />
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.primary", fontFamily: "Inter, sans-serif" }}>
            {best.asset}
          </Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary", fontFamily: "Inter, sans-serif" }}>
            · {protoName}
          </Typography>
          {chain && <ChainIcon chainName={chain} size={12} />}
        </Box>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Typography sx={{
          fontSize: 15, fontWeight: 800, color: "#f59e0b",
          fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
          fontFamily: "Inter, sans-serif",
        }}>
          {formatPercent(best.borrowAPR)} APR
        </Typography>
        <MarketActionButton
          label="Borrow"
          prompt={`Borrow from ${formatProtocolLabel(best)} ${best.asset} market (marketUid: ${best.marketUid})`}
        />
      </Box>
    </Box>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function UnifiedMarketsTable() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const { data: lendingData, isLoading: lendingLoading, error: lendingError } = useMarkets();
  const { data: vaultsData, isLoading: vaultsLoading, error: vaultsError } = useVaults();

  const isLoading = lendingLoading || vaultsLoading;
  const error = lendingError ?? vaultsError;

  const [assetFilter, setAssetFilter] = useState("");
  const [chainFilter, setChainFilter] = useState("");
  const [protocolFilter, setProtocolFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("apy");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // ── Build unified rows ──────────────────────────────────────────────────────

  const allRows = useMemo((): UnifiedRow[] => {
    const rows: UnifiedRow[] = [];

    for (const m of lendingData ?? []) {
      const { name: protoName, chain } = parseChainFromLabel(formatProtocolLabel(m));
      rows.push({
        id: m.id,
        rowKind: "lending",
        asset: m.asset,
        displayName: protoName,
        subLabel: chain ?? "Ethereum",
        chain,
        apy: m.supplyAPY,
        borrowAPR: m.borrowAPR ?? null,
        tvl: m.totalSupplyUSD,
        utilizationRate: m.utilizationRate ?? null,
        marketUid: m.marketUid,
        protocolKey: extractProtocolBase(m.protocolName),
        actionPrompt: `Deposit into ${formatProtocolLabel(m)} ${m.asset} market (marketUid: ${m.marketUid})`,
      });
    }

    for (const v of vaultsData ?? []) {
      const { name: vaultName, chain } = parseChainFromLabel(v.name);
      rows.push({
        id: v.id,
        rowKind: "vault",
        asset: v.asset,
        displayName: vaultName,
        subLabel: v.curator ?? v.protocol,
        chain,
        apy: v.apy,
        borrowAPR: null,
        tvl: v.tvl,
        utilizationRate: null,
        marketUid: v.marketUid ?? v.id,
        protocolKey: v.protocol,
        actionPrompt: `Deposit into ${v.protocol} vault "${v.name}" for ${v.asset} (id: ${v.id}${v.marketUid ? `, marketUid: ${v.marketUid}` : ""})`,
      });
    }

    return rows;
  }, [lendingData, vaultsData]);

  // ── Filter option lists ─────────────────────────────────────────────────────

  const assets = useMemo(
    () => [...new Set(allRows.map((r) => r.asset))].sort(),
    [allRows],
  );

  const chains = useMemo(
    () => [...new Set(allRows.map((r) => r.chain).filter((c): c is string => !!c))].sort(),
    [allRows],
  );

  const protocols = useMemo(
    () => [...new Set(allRows.map((r) => r.protocolKey))].sort(),
    [allRows],
  );

  // ── Filtered + sorted rows ──────────────────────────────────────────────────

  const rows = useMemo(() => {
    let filtered = allRows;
    if (assetFilter) filtered = filtered.filter((r) => r.asset === assetFilter);
    if (chainFilter) filtered = filtered.filter((r) => r.chain === chainFilter);
    if (protocolFilter) filtered = filtered.filter((r) => r.protocolKey === protocolFilter);

    return [...filtered].sort((a, b) => {
      const av = (a as any)[sortKey] ?? (sortDir === "asc" ? Infinity : -Infinity);
      const bv = (b as any)[sortKey] ?? (sortDir === "asc" ? Infinity : -Infinity);
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [allRows, assetFilter, chainFilter, protocolFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  // ── Shared select sx (theme-aware) ─────────────────────────────────────────

  const selectSx = {
    fontSize: 12,
    fontWeight: 600,
    minWidth: 130,
    bgcolor: "background.default",
    border: "1px solid",
    borderColor: "divider",
    borderRadius: 2,
    color: "text.secondary",
    "& .MuiOutlinedInput-notchedOutline": { border: "none" },
    "& .MuiSelect-select": { py: "5px", px: "10px" },
    "& .MuiSelect-icon": { color: "text.secondary" },
  };

  const sortLabelSx = {
    fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "text.secondary !important" as any,
    "& .MuiTableSortLabel-icon": {
      opacity: 0.4,
      color: "primary.main !important" as any,
    },
    "&.Mui-active": {
      color: "text.primary !important" as any,
      "& .MuiTableSortLabel-icon": { opacity: 1 },
    },
    "&:hover": { color: "text.primary !important" as any },
  };

  const cols: { key: SortKey; label: string; align?: "right" }[] = [
    { key: "displayName", label: "Market" },
    { key: "apy", label: "APY", align: "right" },
    { key: "borrowAPR", label: "Borrow APR", align: "right" },
    { key: "tvl", label: "TVL", align: "right" },
    { key: "utilizationRate", label: "Utilization", align: "right" },
  ];

  return (
    <Box>
      {/* Best Borrow Banner */}
      <BestBorrowBanner markets={lendingData} />

      {/* Filters */}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
        <Select value={chainFilter} onChange={(e) => setChainFilter(e.target.value)} displayEmpty size="small" sx={selectSx}>
          <MenuItem value="">All Networks</MenuItem>
          {chains.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </Select>
        <Select value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)} displayEmpty size="small" sx={selectSx}>
          <MenuItem value="">All Assets</MenuItem>
          {assets.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
        </Select>
        <Select value={protocolFilter} onChange={(e) => setProtocolFilter(e.target.value)} displayEmpty size="small" sx={selectSx}>
          <MenuItem value="">All Protocols</MenuItem>
          {protocols.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </Select>
      </Box>

      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          Failed to load markets
        </Typography>
      )}

      {/* Table */}
      <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, overflow: "hidden", bgcolor: "background.paper" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "&:hover": { bgcolor: "transparent !important" } }}>
              {cols.map((c) => (
                <TableCell
                  key={c.key}
                  align={c.align}
                  sx={{ borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.default" }}
                >
                  <TableSortLabel
                    active={sortKey === c.key}
                    direction={sortKey === c.key ? sortDir : "asc"}
                    onClick={() => handleSort(c.key)}
                    sx={sortLabelSx}
                  >
                    {c.label}
                  </TableSortLabel>
                </TableCell>
              ))}
              {/* Action col header */}
              <TableCell sx={{ borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.default" }} />
            </TableRow>
          </TableHead>

          <TableBody>
            {isLoading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i} sx={{ "&:hover": { bgcolor: "transparent" } }}>
                    {cols.map((c) => (
                      <TableCell key={c.key} align={c.align} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
                        <Skeleton width={c.align === "right" ? 56 : 100} height={18} sx={{ bgcolor: "action.hover" }} />
                      </TableCell>
                    ))}
                    <TableCell sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
                      <Skeleton width={64} height={28} sx={{ borderRadius: 1, bgcolor: "action.hover" }} />
                    </TableCell>
                  </TableRow>
                ))
              : rows.map((row) => {
                  const apyHighlight = row.apy > 5;
                  return (
                    <TableRow
                      key={row.id}
                      sx={{
                        cursor: "pointer",
                        "&:hover": { bgcolor: "action.hover" },
                        "& td": { borderBottom: "1px solid", borderColor: "divider" },
                      }}
                    >
                      {/* Market column */}
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                          <Box sx={{
                            width: 32, height: 32, borderRadius: "50%",
                            bgcolor: isDark ? "#101820" : "action.selected",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            border: "1px solid", borderColor: "divider", flexShrink: 0,
                          }}>
                            {row.rowKind === "vault"
                              ? <ProtocolIcon name={row.protocolKey} size={18} />
                              : <AssetIcon symbol={row.asset} size={18} />
                            }
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                              <Typography sx={{
                                fontWeight: 700, fontSize: 13,
                                color: "text.primary", fontFamily: "Inter, sans-serif",
                              }} noWrap>
                                {row.rowKind === "vault" ? row.displayName : row.asset}
                              </Typography>
                              <Chip
                                label={row.rowKind === "vault" ? "Vault" : "Lending"}
                                size="small"
                                sx={{
                                  height: 16, fontSize: 9, fontWeight: 700,
                                  letterSpacing: "0.04em",
                                  bgcolor: row.rowKind === "vault"
                                    ? (isDark ? "rgba(120,223,255,0.12)" : "rgba(6,182,212,0.1)")
                                    : (isDark ? "rgba(134,239,172,0.12)" : "rgba(22,163,74,0.1)"),
                                  color: row.rowKind === "vault"
                                    ? (isDark ? "#78dfff" : "#0891b2")
                                    : (isDark ? "#86efac" : "#16a34a"),
                                  "& .MuiChip-label": { px: "5px" },
                                }}
                              />
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                              {row.rowKind === "lending" && (
                                <ProtocolIcon name={row.displayName} size={11} />
                              )}
                              <Typography sx={{ fontSize: 10, color: "text.secondary", fontFamily: "Inter, sans-serif" }} noWrap>
                                {row.rowKind === "vault"
                                  ? row.subLabel
                                  : row.displayName
                                }
                              </Typography>
                              {row.chain && <ChainIcon chainName={row.chain} size={11} />}
                            </Box>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* APY */}
                      <TableCell align="right">
                        <Typography sx={{
                          fontSize: 13, fontWeight: 800,
                          fontVariantNumeric: "tabular-nums",
                          letterSpacing: "-0.02em",
                          color: apyHighlight ? "#00FF9D" : "text.primary",
                          fontFamily: "Inter, sans-serif",
                        }}>
                          {formatPercent(row.apy)}
                        </Typography>
                      </TableCell>

                      {/* Borrow APR */}
                      <TableCell align="right">
                        {row.borrowAPR != null && row.borrowAPR > 0 ? (
                          <Typography sx={{
                            fontSize: 13, fontWeight: 600,
                            fontVariantNumeric: "tabular-nums",
                            color: "text.secondary", fontFamily: "Inter, sans-serif",
                          }}>
                            {formatPercent(row.borrowAPR)}
                          </Typography>
                        ) : (
                          <Typography sx={{ fontSize: 12, color: "text.disabled" }}>—</Typography>
                        )}
                      </TableCell>

                      {/* TVL */}
                      <TableCell align="right">
                        <Typography sx={{
                          fontSize: 13, fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          color: "text.primary", fontFamily: "Inter, sans-serif",
                        }}>
                          {formatUSD(row.tvl)}
                        </Typography>
                      </TableCell>

                      {/* Utilization */}
                      <TableCell align="right">
                        {row.utilizationRate != null
                          ? <UtilBar value={row.utilizationRate} />
                          : <Typography sx={{ fontSize: 12, color: "text.disabled" }}>—</Typography>
                        }
                      </TableCell>

                      {/* Action */}
                      <TableCell align="right">
                        <MarketActionButton label="Deposit" prompt={row.actionPrompt} />
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </TableContainer>

      {!isLoading && rows.length === 0 && (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <Typography variant="body2" color="text.secondary">No markets found</Typography>
        </Box>
      )}
    </Box>
  );
}
