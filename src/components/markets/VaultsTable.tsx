import { useState, useMemo } from "react";
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Skeleton, TableSortLabel, Chip, Select, MenuItem,
} from "@mui/material";
import { useVaults } from "@/hooks/useMarkets";
import { formatPercent, formatUSD } from "@/lib/marketTypes";
import { AssetIcon, ProtocolIcon, ChainIcon, parseChainFromLabel } from "@/components/icons/MarketIcons";
import MarketActionButton from "./MarketActionButton";

type SortKey = "asset" | "protocol" | "apy" | "tvl" | "name" | "curator";

const selectSx = {
  fontSize: 12,
  fontWeight: 600,
  minWidth: 130,
  bgcolor: "#060809",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 2,
  color: "#6b7280",
  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
  "& .MuiSelect-select": { py: "5px", px: "10px" },
  "& .MuiSelect-icon": { color: "#6b7280" },
};

export default function VaultsTable({ showTitle = true }: { showTitle?: boolean }) {
  const { data, isLoading, error } = useVaults();
  const [assetFilter, setAssetFilter] = useState<string>("");
  const [chainFilter, setChainFilter] = useState<string>("");
  const [curatorFilter, setCuratorFilter] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("apy");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const assets = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map((v) => v.asset))].sort();
  }, [data]);

  const chains = useMemo(() => {
    if (!data) return [];
    const cs = data.map((v) => {
      const m = v.name.match(/\((\w+)\)$/);
      return m ? m[1] : null;
    }).filter(Boolean) as string[];
    return [...new Set(cs)].sort();
  }, [data]);

  const curators = useMemo(() => {
    if (!data) return [];
    const cs = data.map((v) => v.curator).filter(Boolean) as string[];
    return [...new Set(cs)].sort();
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    let filtered = data;
    if (assetFilter) filtered = filtered.filter((v) => v.asset === assetFilter);
    if (chainFilter) filtered = filtered.filter((v) => { const m = v.name.match(/\((\w+)\)$/); return m ? m[1] === chainFilter : false; });
    if (curatorFilter) filtered = filtered.filter((v) => v.curator === curatorFilter);
    return [...filtered].sort((a, b) => {
      const av = (a as any)[sortKey] ?? "";
      const bv = (b as any)[sortKey] ?? "";
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, assetFilter, chainFilter, curatorFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  // Removed curator from table columns — it's now a filter
  const cols: { key: SortKey; label: string; align?: "right" }[] = [
    { key: "name", label: "Vault" },
    { key: "asset", label: "Asset" },
    { key: "apy", label: "APY", align: "right" },
    { key: "tvl", label: "TVL", align: "right" },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
        {showTitle && (
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: "#e0e4eb", fontFamily: "Inter, sans-serif" }}>
            Yield Vaults
          </div>
        )}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
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
            value={curatorFilter}
            onChange={(e) => setCuratorFilter(e.target.value)}
            displayEmpty
            size="small"
            sx={selectSx}
          >
            <MenuItem value="">All Curators</MenuItem>
            {curators.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
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

      {error && <Typography color="error" variant="body2">Failed to load vaults</Typography>}

      <TableContainer sx={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden", background: "#0a0d10" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "&:hover": { bgcolor: "transparent !important" } }}>
              {cols.map((c) => (
                <TableCell key={c.key} align={c.align} sx={{ borderBottom: "1px solid rgba(255,255,255,0.05)", bgcolor: "#060809" }}>
                  <TableSortLabel
                    active={sortKey === c.key}
                    direction={sortKey === c.key ? sortDir : "asc"}
                    onClick={() => handleSort(c.key)}
                    sx={{
                      fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                      color: "#6b7280 !important",
                      "& .MuiTableSortLabel-icon": { opacity: sortKey === c.key ? 1 : 0.3, color: "#00FF9D !important" },
                      "&.Mui-active": { color: "#e0e4eb !important" },
                      "&:hover": { color: "#e0e4eb !important" },
                    }}
                  >
                    {c.label}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell sx={{ borderBottom: "1px solid rgba(255,255,255,0.05)", bgcolor: "#060809" }} />
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
                  <TableRow
                    key={v.id}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.02) !important" },
                      "& td": { borderBottom: "1px solid rgba(255,255,255,0.04)" },
                    }}
                  >
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
                            {v.curator && (
                              <Chip
                                label={v.curator}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: 10, height: 20, borderColor: "rgba(255,255,255,0.08)", color: "#6b7280", fontWeight: 600, cursor: "default", ml: 0.5 }}
                              />
                            )}
                          </Box>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <AssetIcon symbol={v.asset} size={18} />
                        <Typography fontWeight={700} fontSize={13} sx={{ fontVariantNumeric: "tabular-nums", color: "#e0e4eb" }}>{v.asset}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        fontSize={13}
                        fontWeight={700}
                        sx={{ fontVariantNumeric: "tabular-nums", color: v.apy > 5 ? "#00FF9D" : "#e0e4eb" }}
                      >
                        {formatPercent(v.apy)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontSize={13} sx={{ fontVariantNumeric: "tabular-nums", color: "#e0e4eb" }}>{formatUSD(v.tvl)}</Typography>
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
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <span style={{ fontSize: 14, color: "#6b7280", fontFamily: "Inter, sans-serif" }}>No vaults found</span>
        </div>
      )}
    </Box>
  );
}
