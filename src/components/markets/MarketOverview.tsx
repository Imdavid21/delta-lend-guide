import { Box, Paper, Typography, Chip } from "@mui/material";
import type { Market } from "@/lib/marketTypes";
import { formatUSD } from "@/lib/marketTypes";

interface ProtocolGroup {
  name: string;
  tvl: number;
  chains: string[];
  assets: string[];
  pct: number;
}

export default function MarketOverview({ markets }: { markets: Market[] }) {
  if (!markets?.length) return null;

  const grouped = new Map<string, { tvl: number; chains: Set<string>; assets: Set<string> }>();
  for (const m of markets) {
    const g = grouped.get(m.protocolName) ?? { tvl: 0, chains: new Set(), assets: new Set() };
    g.tvl += m.totalSupplyUSD;
    g.chains.add(m.chainName);
    g.assets.add(m.asset);
    grouped.set(m.protocolName, g);
  }

  const totalTVL = Array.from(grouped.values()).reduce((s, g) => s + g.tvl, 0);

  const protocols: ProtocolGroup[] = Array.from(grouped.entries())
    .map(([name, g]) => ({
      name,
      tvl: g.tvl,
      chains: Array.from(g.chains).slice(0, 5),
      assets: Array.from(g.assets).slice(0, 6),
      pct: totalTVL > 0 ? (g.tvl / totalTVL) * 100 : 0,
    }))
    .sort((a, b) => b.tvl - a.tvl)
    .slice(0, 8);

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
      {protocols.map((p) => (
        <Paper
          key={p.name}
          elevation={0}
          sx={{
            flex: `1 1 ${Math.max(180, p.pct * 3)}px`,
            minWidth: 180,
            maxWidth: 400,
            p: 2,
            border: "1px solid",
            borderColor: "divider",
            transition: "all 0.2s",
            "&:hover": {
              borderColor: "#FF6600",
              transform: "translateY(-2px)",
              boxShadow: 2,
            },
          }}
        >
          <Typography fontWeight={700} gutterBottom>
            {p.name}
          </Typography>
          <Typography variant="h5" fontWeight={800} sx={{ color: "#FF6600" }}>
            {formatUSD(p.tvl)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {p.pct.toFixed(1)}% of total
          </Typography>
          <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {p.chains.map((c) => (
              <Chip
                key={c}
                label={c}
                size="small"
                sx={{
                  bgcolor: "#FF660020",
                  color: "#FF6600",
                  fontWeight: 600,
                  fontSize: "0.7rem",
                  height: 22,
                }}
              />
            ))}
          </Box>
          <Typography
            variant="caption"
            sx={{ mt: 1, display: "block", fontFamily: "monospace", color: "text.secondary" }}
          >
            {p.assets.join(", ")}
          </Typography>
        </Paper>
      ))}
    </Box>
  );
}
