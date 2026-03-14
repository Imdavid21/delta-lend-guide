import { useState, useMemo } from "react";
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Skeleton, TableSortLabel, Chip,
} from "@mui/material";
import { useVaults } from "@/hooks/useMarkets";
import { formatPercent, formatUSD } from "@/lib/marketTypes";
import { AssetIcon, ProtocolIcon, ChainIcon, parseChainFromLabel } from "@/components/icons/MarketIcons";
import MarketActionButton from "./MarketActionButton";

type SortKey = "asset" | "protocol" | "apy" | "tvl" | "name" | "curator";

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 12px", borderRadius: 20,
        border: `1px solid ${active ? "#00FF9D" : "rgba(67,72,78,0.4)"}`,
        background: active ? "rgba(0,255,157,0.1)" : "transparent",
        color: active ? "#00FF9D" : "#a7abb2",
        fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif",
        transition: "all 150ms ease", whiteSpace: "nowrap" as const,
      }}
    >
      {label}
    </button>
  );
}

export default function VaultsTable() {
  const { data, isLoading, error } = useVaults();
  const [assetFilter, setAssetFilter] = useState<string | null>(null);
  const [curatorFilter, setCuratorFilter] = useState<string | null>(null);
  const [chainFilter, setChainFilter] = useState<string | null>(null);
  const [protocolFilter, setProtocolFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("apy");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const assets = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map((v) => v.asset))].sort();
  }, [data]);

  const curators = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map((v) => v.curator).filter(Boolean) as string[])].sort();
  }, [data]);

  const chains = useMemo(() => {
    if (!data) return [];
    const cs = data.map((v) => {
      const m = v.name.match(/\((\w+)\)$/);
      return m ? m[1] : null;
    }).filter(Boolean) as string[];
    return [...new Set(cs)].sort();
  }, [data]);

  const protocols = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map((v) => v.protocol.replace(/\s*\([^)]+\)$/, "")))].sort();
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    let filtered = data;
    if (assetFilter) filtered = filtered.filter((v) => v.asset === assetFilter);
    if (curatorFilter) filtered = filtered.filter((v) => v.curator === curatorFilter);
    if (chainFilter) filtered = filtered.filter((v) => { const m = v.name.match(/\((\w+)\)$/); return m ? m[1] === chainFilter : false; });
    if (protocolFilter) filtered = filtered.filter((v) => v.protocol.replace(/\s*\([^)]+\)$/, "") === protocolFilter);
    return [...filtered].sort((a, b) => {
      const av = (a as any)[sortKey] ?? "";
      const bv = (b as any)[sortKey] ?? "";
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, assetFilter, curatorFilter, chainFilter, protocolFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const cols: { key: SortKey; label: string; align?: "right" }[] = [
    { key: "name", label: "Vault" },
    { key: "curator", label: "Curator" },
    { key: "asset", label: "Asset" },
    { key: "apy", label: "APY", align: "right" },
    { key: "tvl", label: "TVL", align: "right" },
  ];

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
          <Box>
            <Typography variant="h6" fontWeight={800}>Vaults</Typography>
            <Typography variant="caption" color="text.secondary">APY via Morpho Blue API / 1Delta</Typography>
          </Box>
        </Box>
        {/* Filter bar */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {chains.map((c) => (
            <FilterChip key={c} label={c} active={chainFilter === c} onClick={() => setChainFilter(chainFilter === c ? null : c)} />
          ))}
          {chains.length > 0 && protocols.length > 0 && <div style={{ width: 1, height: 22, background: "rgba(67,72,78,0.3)", margin: "0 4px", alignSelf: "center" }} />}
          {protocols.map((p) => (
            <FilterChip key={p} label={p} active={protocolFilter === p} onClick={() => setProtocolFilter(protocolFilter === p ? null : p)} />
          ))}
          {protocols.length > 0 && assets.length > 0 && <div style={{ width: 1, height: 22, background: "rgba(67,72,78,0.3)", margin: "0 4px", alignSelf: "center" }} />}
          {assets.map((a) => (
            <FilterChip key={a} label={a} active={assetFilter === a} onClick={() => setAssetFilter(assetFilter === a ? null : a)} />
          ))}
          {curators.length > 0 && <div style={{ width: 1, height: 22, background: "rgba(67,72,78,0.3)", margin: "0 4px", alignSelf: "center" }} />}
          {curators.map((c) => (
            <FilterChip key={c} label={`Curator: ${c}`} active={curatorFilter === c} onClick={() => setCuratorFilter(curatorFilter === c ? null : c)} />
          ))}
          {(assetFilter || curatorFilter || chainFilter || protocolFilter) && (
            <button onClick={() => { setAssetFilter(null); setCuratorFilter(null); setChainFilter(null); setProtocolFilter(null); }}
              style={{ padding: "4px 10px", borderRadius: 20, border: "1px solid rgba(255,113,108,0.4)", background: "transparent", color: "#ff716c", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
              Clear ×
            </button>
          )}
        </div>
      </Box>
      {error && <Typography color="error" variant="body2">Failed to load vaults</Typography>}
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
              <TableCell sx={{ borderBottom: "1px solid rgba(67,72,78,0.25)", bgcolor: "#0a0f14" }} />
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
                      {(() => {
                        const { name: vaultName, chain } = parseChainFromLabel(v.name);
                        return (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                            <ProtocolIcon name={v.protocol} size={16} />
                            <Typography fontSize={13} fontWeight={500} sx={{ maxWidth: 260 }} noWrap>
                              {vaultName}
                            </Typography>
                            {chain && <ChainIcon chainName={chain} size={14} />}
                          </Box>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {v.curator ? (
                        <Chip
                          label={v.curator}
                          size="small"
                          variant="outlined"
                          onClick={() => setCuratorFilter(v.curator ?? null)}
                          sx={{ fontSize: 11, height: 22, borderColor: "divider", fontWeight: 600, cursor: "pointer" }}
                        />
                      ) : (
                        <Typography fontSize={12} color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <AssetIcon symbol={v.asset} size={18} />
                        <Typography fontWeight={700} fontSize={13} sx={{ fontVariantNumeric: "tabular-nums" }}>{v.asset}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        fontSize={13}
                        fontWeight={700}
                        sx={{
                          fontVariantNumeric: "tabular-nums",
                          color: v.apy > 5 ? "primary.main" : "text.primary",
                        }}
                      >
                        {formatPercent(v.apy)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontSize={13} sx={{ fontVariantNumeric: "tabular-nums" }}>{formatUSD(v.tvl)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <MarketActionButton
                        label="Deposit"
                        prompt={`Deposit into ${v.protocol} vault "${v.name}" for ${v.asset} (id: ${v.id}${v.marketUid ? `, marketUid: ${v.marketUid}` : ''})`}
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
