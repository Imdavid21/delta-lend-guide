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

// UtilBar: utilizationRate from backend is already in percent (0-100)
function UtilBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value)); // NOT value*100 — field is already percent
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

function extractChain(protocolName: string): string | null {
  const match = protocolName.match(/\((\w+)\)$/);
  return match ? match[1] : null;
}

function extractProtocolBase(protocolName: string): string {
  return protocolName.replace(/\s*\([^)]+\)$/, "");
}

interface FilterBarProps {
  assets: string[];
  protocols: string[];
  chains: string[];
  assetFilter: string | null;
  protocolFilter: string | null;
  chainFilter: string | null;
  onAsset: (v: string | null) => void;
  onProtocol: (v: string | null) => void;
  onChain: (v: string | null) => void;
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 12px",
        borderRadius: 20,
        border: `1px solid ${active ? "#00FF9D" : "rgba(67,72,78,0.4)"}`,
        background: active ? "rgba(0,255,157,0.1)" : "transparent",
        color: active ? "#00FF9D" : "#a7abb2",
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "Inter, sans-serif",
        transition: "all 150ms ease",
        whiteSpace: "nowrap" as const,
      }}
    >
      {label}
    </button>
  );
}

function FilterBar({ assets, protocols, chains, assetFilter, protocolFilter, chainFilter, onAsset, onProtocol, onChain }: FilterBarProps) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
      {/* Chain pills */}
      {chains.map((c) => (
        <FilterChip
          key={c}
          label={c}
          active={chainFilter === c}
          onClick={() => onChain(chainFilter === c ? null : c)}
        />
      ))}

      {chains.length > 0 && protocols.length > 0 && (
        <div style={{ width: 1, height: 22, background: "rgba(67,72,78,0.3)", margin: "0 4px", alignSelf: "center" }} />
      )}

      {/* Protocol pills */}
      {protocols.map((p) => (
        <FilterChip
          key={p}
          label={p}
          active={protocolFilter === p}
          onClick={() => onProtocol(protocolFilter === p ? null : p)}
        />
      ))}

      {protocols.length > 0 && assets.length > 0 && (
        <div style={{ width: 1, height: 22, background: "rgba(67,72,78,0.3)", margin: "0 4px", alignSelf: "center" }} />
      )}

      {/* Asset pills */}
      {assets.map((a) => (
        <FilterChip
          key={a}
          label={a}
          active={assetFilter === a}
          onClick={() => onAsset(assetFilter === a ? null : a)}
        />
      ))}

      {(assetFilter || protocolFilter || chainFilter) && (
        <button
          onClick={() => { onAsset(null); onProtocol(null); onChain(null); }}
          style={{
            padding: "4px 10px",
            borderRadius: 20,
            border: "1px solid rgba(255,113,108,0.4)",
            background: "transparent",
            color: "#ff716c",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Clear ×
        </button>
      )}
    </div>
  );
}

export default function LendingTable({ viewMode = "lending" }: { viewMode?: "lending" | "borrow" }) {
  const { data, isLoading, error } = useMarkets();
  const [assetFilter, setAssetFilter] = useState<string | null>(null);
  const [protocolFilter, setProtocolFilter] = useState<string | null>(null);
  const [chainFilter, setChainFilter] = useState<string | null>(null);
  const isLending = viewMode === "lending";
  const [sortKey, setSortKey] = useState<SortKey>(isLending ? "supplyAPY" : "borrowAPR");
  const [sortDir, setSortDir] = useState<"asc" | "desc">(isLending ? "desc" : "asc");

  const assets = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map((m) => m.asset))].sort();
  }, [data]);

  const protocols = useMemo(() => {
    if (!data) return [];
    const bases = data.map((m) => extractProtocolBase(m.protocolName));
    return [...new Set(bases)].sort();
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
    if (protocolFilter) filtered = filtered.filter((m) => extractProtocolBase(m.protocolName) === protocolFilter);
    if (chainFilter) filtered = filtered.filter((m) => extractChain(m.protocolName) === chainFilter);
    return [...filtered].sort((a, b) => {
      const av = (a as any)[sortKey] ?? 0;
      const bv = (b as any)[sortKey] ?? 0;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, assetFilter, protocolFilter, chainFilter, sortKey, sortDir, isLending]);

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
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{
            fontSize: 10, fontWeight: 800, textTransform: "uppercase" as const,
            letterSpacing: "0.12em", color: "#00FF9D", marginBottom: 4, fontFamily: "Inter, sans-serif",
          }}>
            {isLending ? "Omnichain Protocol" : "Institutional Credit Layer"}
          </div>
          <div style={{
            fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: "#eaeef5",
            marginBottom: 2, fontFamily: "Inter, sans-serif",
          }}>
            {isLending ? "Lending Markets" : "Borrow Markets"}
          </div>
          <div style={{ fontSize: 11, color: "rgba(167,171,178,0.7)", fontFamily: "Inter, sans-serif" }}>
            Rates via 1Delta · Base rates only (excl. reward incentives)
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar
        assets={assets}
        protocols={protocols}
        chains={chains}
        assetFilter={assetFilter}
        protocolFilter={protocolFilter}
        chainFilter={chainFilter}
        onAsset={setAssetFilter}
        onProtocol={setProtocolFilter}
        onChain={setChainFilter}
      />

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
