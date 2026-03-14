import { Box, Typography, Skeleton } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import LockClockOutlinedIcon from "@mui/icons-material/LockClockOutlined";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import { useMarkets, useVaults, usePendle } from "@/hooks/useMarkets";
import { formatUSD, formatPercent, formatProtocolLabel } from "@/lib/marketTypes";

interface StatProps {
  label: string;
  value: string | null;
  sub?: string;
  icon: React.ReactNode;
  accentColor?: string;
  kineticGradient?: boolean;
}

function Stat({ label, value, sub, icon, accentColor = "text.primary", kineticGradient }: StatProps) {
  return (
    <Box
      sx={{
        px: 2.5,
        py: 2.25,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        minWidth: 0,
        flex: 1,
        position: "relative",
        overflow: "hidden",
        transition: "border-color 200ms ease, transform 200ms ease",
        "&:hover": {
          borderColor: "rgba(0,255,157,0.25)",
          transform: "translateY(-1px)",
        },
        ...(kineticGradient && {
          background: (t) =>
            t.palette.mode === "dark"
              ? "linear-gradient(135deg, rgba(0, 255, 157, 0.04) 0%, transparent 60%), #0e1419"
              : "linear-gradient(135deg, rgba(0, 109, 64, 0.04) 0%, transparent 60%), #f8fafc",
        }),
      }}
    >
      {/* Icon top-right */}
      <Box
        sx={{
          position: "absolute",
          top: 12,
          right: 12,
          opacity: 0.35,
          color: accentColor,
          "& svg": { fontSize: 20 },
        }}
      >
        {icon}
      </Box>

      <Typography
        sx={{
          color: "text.secondary",
          fontSize: "0.625rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          display: "block",
          mb: 0.75,
        }}
      >
        {label}
      </Typography>

      {value === null ? (
        <Skeleton width={80} height={30} sx={{ borderRadius: 1 }} />
      ) : (
        <Typography
          sx={{
            fontWeight: 800,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.03em",
            color: accentColor,
            fontSize: "1.4rem",
            lineHeight: 1.1,
          }}
        >
          {value}
        </Typography>
      )}

      {sub && (
        <Typography
          sx={{
            color: "text.disabled",
            fontSize: "0.625rem",
            mt: 0.5,
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {sub}
        </Typography>
      )}
    </Box>
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
        icon={<TrendingUpIcon />}
        accentColor="primary.main"
        kineticGradient
      />
      <Stat
        label="Best Vault APY"
        value={bestVault ? formatPercent(bestVault.apy) : null}
        sub={bestVault ? bestVault.name : undefined}
        icon={<ShowChartIcon />}
        accentColor="secondary.main"
      />
      <Stat
        label="Best Fixed Yield"
        value={bestFixed ? formatPercent(bestFixed.impliedAPY) : null}
        sub={bestFixed ? bestFixed.name : undefined}
        icon={<LockClockOutlinedIcon />}
        accentColor="#78dfff"
      />
      <Stat
        label={isLending ? "Total TVL" : "Aggregate Liquidity"}
        value={totalTVL !== null ? formatUSD(totalTVL) : null}
        sub="Across all protocols"
        icon={<AccountBalanceWalletOutlinedIcon />}
        accentColor="text.primary"
      />
      <Stat
        label="Markets Tracked"
        value={marketCount !== null ? String(marketCount) : null}
        sub={isLending ? "Lending · Vaults · Fixed" : "Borrow Markets"}
        icon={<LayersOutlinedIcon />}
        accentColor="text.primary"
      />
    </Box>
  );
}
