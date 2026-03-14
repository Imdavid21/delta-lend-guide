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
  bgcolor: "#0a0f14",
  border: "1px solid rgba(67,72,78,0.4)",
  borderRadius: 2,
  color: "#a7abb2",
  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
  "& .MuiSelect-select": { py: "5px", px: "10px" },
  "& .MuiSelect-icon": { color: "#a7abb2" },
};

export default function VaultsTable({ showTitle = true }: { showTitle?: boolean }) {
  const { data, isLoading, error } = useVaults();
  const [assetFilter, setAssetFilter] = useState<string>("");
  const [chainFilter, setChainFilter] = useState<string>("");
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

  const rows = useMemo(() => {
    if (!data) return [];
    let filtered = data;
    if (assetFilter) filtered = filtered.filter((v) => v.asset === assetFilter);
    if (chainFilter) filtered = filtered.filter((v) => { const m = v.name.match(/\((\w+)\)$/); return m ? m[1] === chainFilter : false; });
    return [...filtered].sort((a, b) => {
      const av = (a as any)[sortKey] ?? "";
      const bv = (b as any)[sortKey] ?? "";
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, assetFilter, chainFilter, sortKey, sortDir]);

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
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
        {showTitle && (
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: "#eaeef5", fontFamily: "Inter, sans-serif" }}>
            Yield Vaults
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
                      "& .MuiTableSortLabel-icon": { opacity: sortKey === c.key ? 1 : 0.3, color: "#86efac !important" },
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
                  <TableRow
                    key={v.id}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.025) !important" },
                      "& td": { borderBottom: "1px solid rgba(67,72,78,0.15)" },
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
                          sx={{ fontSize: 11, height: 22, borderColor: "rgba(67,72,78,0.4)", color: "#a7abb2", fontWeight: 600, cursor: "default" }}
                        />
                      ) : (
                        <Typography fontSize={12} color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <AssetIcon symbol={v.asset} size={18} />
                        <Typography fontWeight={700} fontSize={13} sx={{ fontVariantNumeric: "tabular-nums", color: "#eaeef5" }}>{v.asset}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        fontSize={13}
                        fontWeight={700}
                        sx={{ fontVariantNumeric: "tabular-nums", color: v.apy > 5 ? "#00FF9D" : "#eaeef5" }}
                      >
                        {formatPercent(v.apy)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontSize={13} sx={{ fontVariantNumeric: "tabular-nums", color: "#eaeef5" }}>{formatUSD(v.tvl)}</Typography>
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
          <span style={{ fontSize: 14, color: "#a7abb2", fontFamily: "Inter, sans-serif" }}>No vaults found</span>
        </div>
      )}
    </Box>
  );
}
