import { useState, useMemo } from "react";
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Skeleton, TableSortLabel, Chip, Autocomplete, TextField,
} from "@mui/material";
import { useVaults } from "@/hooks/useMarkets";
import { formatPercent, formatUSD } from "@/lib/marketTypes";
import { AssetIcon, ProtocolIcon } from "@/components/icons/MarketIcons";
import AssetFilter from "./AssetFilter";
import MarketActionButton from "./MarketActionButton";

type SortKey = "asset" | "protocol" | "apy" | "tvl" | "name" | "curator";

export default function VaultsTable() {
  const { data, isLoading, error } = useVaults();
  const [assetFilter, setAssetFilter] = useState<string | null>(null);
  const [curatorFilter, setCuratorFilter] = useState<string | null>(null);
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

  const rows = useMemo(() => {
    if (!data) return [];
    let filtered = data;
    if (assetFilter) filtered = filtered.filter((v) => v.asset === assetFilter);
    if (curatorFilter) filtered = filtered.filter((v) => v.curator === curatorFilter);
    return [...filtered].sort((a, b) => {
      const av = (a as any)[sortKey] ?? "";
      const bv = (b as any)[sortKey] ?? "";
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, assetFilter, curatorFilter, sortKey, sortDir]);

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
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, gap: 1.5 }}>
        <Typography variant="h6" fontWeight={800}>Vaults</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Autocomplete
            size="small"
            options={curators}
            value={curatorFilter}
            onChange={(_, v) => setCuratorFilter(v)}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Filter curator…"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    fontSize: 13,
                  },
                }}
              />
            )}
            sx={{ width: 200 }}
            clearOnEscape
          />
          <AssetFilter assets={assets} value={assetFilter} onChange={setAssetFilter} />
        </Box>
      </Box>
      {error && <Typography color="error" variant="body2">Failed to load vaults</Typography>}
      <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {cols.map((c) => (
                <TableCell key={c.key} align={c.align}>
                  <TableSortLabel
                    active={sortKey === c.key}
                    direction={sortKey === c.key ? sortDir : "asc"}
                    onClick={() => handleSort(c.key)}
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
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {cols.map((c) => <TableCell key={c.key}><Skeleton width={60} /></TableCell>)}
                    <TableCell><Skeleton width={50} /></TableCell>
                  </TableRow>
                ))
              : rows.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <ProtocolIcon name={v.protocol} size={16} />
                        <Typography fontSize={13} fontWeight={500} sx={{ maxWidth: 260 }} noWrap>
                          {v.name}
                        </Typography>
                      </Box>
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
                          color: v.apy > 5 ? "#22c55e" : "text.primary",
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
