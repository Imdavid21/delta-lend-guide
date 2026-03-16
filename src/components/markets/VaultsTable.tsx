import { useState, useMemo } from "react";
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Skeleton, TableSortLabel, Select, MenuItem, useTheme,
} from "@mui/material";
import { useVaults } from "@/hooks/useMarkets";
import { formatPercent, formatUSD } from "@/lib/marketTypes";
import { AssetIcon, ProtocolIcon, ChainIcon, parseChainFromLabel } from "@/components/icons/MarketIcons";
import MarketActionButton from "./MarketActionButton";

type SortKey = "asset" | "protocol" | "apy" | "tvl" | "name";

export default function VaultsTable({ showTitle = true }: { showTitle?: boolean }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
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
    return [...new Set(data.map((v) => v.curator).filter(Boolean) as string[])].sort();
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
    { key: "name", label: "Vault" },
    { key: "asset", label: "Asset" },
    { key: "apy", label: "APY", align: "right" },
    { key: "tvl", label: "TVL", align: "right" },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
        {showTitle && (
          <div style={{
            fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em",
            color: theme.palette.text.primary, fontFamily: "Inter, sans-serif",
          }}>
            Yield Vaults
          </div>
        )}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Select value={chainFilter} onChange={(e) => setChainFilter(e.target.value)} displayEmpty size="small" sx={selectSx}>
            <MenuItem value="">All Networks</MenuItem>
            {chains.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
          <Select value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)} displayEmpty size="small" sx={selectSx}>
            <MenuItem value="">All Assets</MenuItem>
            {assets.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </Select>
          {curators.length > 0 && (
            <Select value={curatorFilter} onChange={(e) => setCuratorFilter(e.target.value)} displayEmpty size="small" sx={selectSx}>
              <MenuItem value="">All Curators</MenuItem>
              {curators.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          )}
        </Box>
      </Box>

      {error && <Typography color="error" variant="body2">Failed to load vaults</Typography>}

      <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 3, overflow: "hidden", bgcolor: "background.paper" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "&:hover": { bgcolor: "transparent !important" } }}>
              {cols.map((c) => (
                <TableCell key={c.key} align={c.align} sx={{ borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.default" }}>
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
              <TableCell sx={{ borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.default" }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {cols.map((c) => (
                      <TableCell key={c.key}>
                        <Skeleton width={60} sx={{ bgcolor: "action.hover" }} />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Skeleton width={50} sx={{ bgcolor: "action.hover" }} />
                    </TableCell>
                  </TableRow>
                ))
              : rows.map((v) => {
                  const { name: vaultName, chain } = parseChainFromLabel(v.name);
                  return (
                    <TableRow
                      key={v.id}
                      sx={{
                        cursor: "pointer",
                        "&:hover": { bgcolor: "action.hover" },
                        "& td": { borderBottom: "1px solid", borderColor: "divider" },
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          <ProtocolIcon name={v.protocol} size={16} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography fontSize={13} fontWeight={600} sx={{ maxWidth: 260, color: "text.primary" }} noWrap>
                              {vaultName}
                            </Typography>
                            {v.curator && (
                              <Typography fontSize={10} sx={{ color: "text.secondary" }} noWrap>
                                {v.curator}
                              </Typography>
                            )}
                          </Box>
                          {chain && <ChainIcon chainName={chain} size={14} />}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          <AssetIcon symbol={v.asset} size={18} />
                          <Typography fontWeight={700} fontSize={13} sx={{ fontVariantNumeric: "tabular-nums", color: "text.primary" }}>
                            {v.asset}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          fontSize={13}
                          fontWeight={700}
                          sx={{ fontVariantNumeric: "tabular-nums", color: v.apy > 5 ? "#00FF9D" : "text.primary" }}
                        >
                          {formatPercent(v.apy)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontSize={13} sx={{ fontVariantNumeric: "tabular-nums", color: "text.primary" }}>
                          {formatUSD(v.tvl)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <MarketActionButton
                          label="Deposit"
                          prompt={`Deposit into ${v.protocol} vault "${v.name}" for ${v.asset} (id: ${v.id}${v.marketUid ? `, marketUid: ${v.marketUid}` : ""})`}
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
          <Typography variant="body2" color="text.secondary">No vaults found</Typography>
        </Box>
      )}
    </Box>
  );
}
