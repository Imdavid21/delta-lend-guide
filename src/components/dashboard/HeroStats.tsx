import { Box, Paper, Typography, Skeleton } from "@mui/material";
import { useMarkets, useVaults, usePendle } from "@/hooks/useMarkets";
import { formatUSD, formatPercent, formatProtocolLabel } from "@/lib/marketTypes";

interface StatProps {
  label: string;
  value: string | null;
  sub?: string;
  accent?: boolean;
}

function Stat({ label, value, sub, accent }: StatProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        px: 2.5,
        py: 2,
        borderRadius: 3,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.default",
        minWidth: 0,
        flex: 1,
        transition: "all 200ms ease",
        "&:hover": { borderColor: "text.secondary" },
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          display: "block",
          mb: 0.5,
        }}
      >
        {label}
      </Typography>
      {value === null ? (
        <Skeleton width={72} height={28} />
      ) : (
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.02em",
            color: accent ? "#22c55e" : "text.primary",
            fontSize: "1.15rem",
          }}
        >
          {value}
        </Typography>
      )}
      {sub && (
        <Typography variant="caption" sx={{ color: "text.disabled", fontSize: 10 }}>
          {sub}
        </Typography>
      )}
    </Paper>
  );
}

export default function HeroStats({ viewMode = "lending" }: { viewMode?: "lending" | "borrow" }) {
  const { data: lending } = useMarkets();
  const { data: vaults } = useVaults();
  const { data: pendle } = usePendle();

  const isLending = viewMode === "lending";

  const bestLending = lending?.length
    ? lending
        .filter((m) => isLending ? true : (m.borrowAPR != null && m.borrowAPR > 0))
        .reduce((a, b) => {
          if (isLending) return a.supplyAPY > b.supplyAPY ? a : b;
          return (a.borrowAPR ?? 999) < (b.borrowAPR ?? 999) ? a : b;
        }, lending[0])
    : null;

  const bestVault = vaults?.length
    ? vaults.reduce((a, b) => (a.apy > b.apy ? a : b))
    : null;
  const bestFixed = pendle?.length
    ? pendle.reduce((a, b) => (a.impliedAPY > b.impliedAPY ? a : b))
    : null;

  const totalTVL =
    lending && vaults
      ? lending.reduce((s, m) => s + m.totalSupplyUSD, 0) +
        vaults.reduce((s, v) => s + v.tvl, 0)
      : null;

  const marketCount =
    lending && vaults && pendle
      ? lending.length + vaults.length + pendle.length
      : null;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr 1fr",
          md: "1fr 1fr 1fr 1fr 1fr",
        },
        gap: 1.5,
      }}
    >
      <Stat
        label={isLending ? "Best Lending APY" : "Lowest Borrow APR"}
        value={bestLending ? formatPercent(isLending ? bestLending.supplyAPY : bestLending.borrowAPR) : null}
        sub={bestLending ? `${bestLending.asset} · ${formatProtocolLabel(bestLending)}` : undefined}
        accent
      />
      <Stat
        label="Best Vault APY"
        value={bestVault ? formatPercent(bestVault.apy) : null}
        sub={bestVault ? `${bestVault.name}` : undefined}
        accent
      />
      <Stat
        label="Best Fixed Yield"
        value={bestFixed ? formatPercent(bestFixed.impliedAPY) : null}
        sub={bestFixed ? `${bestFixed.name}` : undefined}
        accent
      />
      <Stat
        label={isLending ? "Total TVL" : "Aggregate Liquidity"}
        value={totalTVL !== null ? formatUSD(totalTVL) : null}
        sub="Across all protocols"
      />
      <Stat
        label="Markets Tracked"
        value={marketCount !== null ? String(marketCount) : null}
        sub={isLending ? "Lending · Vaults · Fixed" : "Borrow Markets"}
      />
    </Box>
  );
}
