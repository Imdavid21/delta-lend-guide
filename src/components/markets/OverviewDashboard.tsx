import { Box, Paper, Typography, Skeleton } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import LockClockIcon from "@mui/icons-material/LockClock";
import { useMarkets, useVaults, usePendle } from "@/hooks/useMarkets";
import { formatUSD, formatPercent } from "@/lib/marketTypes";
import type { TabId } from "../AppShell";

interface Props {
  onNavigate: (tab: TabId) => void;
}

function StatCard({
  title,
  value,
  sub,
  icon,
  onClick,
}: {
  title: string;
  value: string | null;
  sub?: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Paper
      variant="outlined"
      onClick={onClick}
      sx={{
        p: 2.5,
        cursor: onClick ? "pointer" : "default",
        transition: "all 200ms ease",
        borderRadius: 3,
        borderColor: "divider",
        "&:hover": onClick
          ? { transform: "translateY(-2px)", borderColor: "text.primary" }
          : undefined,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
        <Box sx={{ color: "text.secondary" }}>{icon}</Box>
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={600}
          sx={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
        >
          {title}
        </Typography>
      </Box>
      {value === null ? (
        <Skeleton width={80} height={32} />
      ) : (
        <Typography variant="h5" fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums" }}>
          {value}
        </Typography>
      )}
      {sub && (
        <Typography variant="caption" color="text.secondary">
          {sub}
        </Typography>
      )}
    </Paper>
  );
}

export default function OverviewDashboard({ onNavigate }: Props) {
  const { data: lending } = useMarkets();
  const { data: vaults } = useVaults();
  const { data: pendle } = usePendle();

  const bestLendingAPY = lending?.length ? Math.max(...lending.map((m) => m.supplyAPY)) : null;
  const bestLendingAsset = lending?.length
    ? lending.reduce((a, b) => (a.supplyAPY > b.supplyAPY ? a : b))
    : null;
  const bestVaultAPY = vaults?.length ? Math.max(...vaults.map((v) => v.apy)) : null;
  const bestVault = vaults?.length ? vaults.reduce((a, b) => (a.apy > b.apy ? a : b)) : null;
  const bestFixedAPY = pendle?.length ? Math.max(...pendle.map((m) => m.impliedAPY)) : null;

  const totalLendingTVL = lending?.reduce((s, m) => s + m.totalSupplyUSD, 0) ?? null;
  const totalVaultsTVL = vaults?.reduce((s, v) => s + v.tvl, 0) ?? null;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: "-0.02em" }}>
          Ethereum Yield Overview
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Real-time rates across lending, vaults, and fixed yield protocols
        </Typography>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }, gap: 2 }}>
        <StatCard
          title="Best Lending APY"
          value={bestLendingAPY !== null ? formatPercent(bestLendingAPY) : null}
          sub={bestLendingAsset ? `${bestLendingAsset.asset} on ${bestLendingAsset.protocolName}` : undefined}
          icon={<TrendingUpIcon />}
          onClick={() => onNavigate("lending")}
        />
        <StatCard
          title="Best Vault APY"
          value={bestVaultAPY !== null ? formatPercent(bestVaultAPY) : null}
          sub={bestVault ? `${bestVault.name}` : undefined}
          icon={<AccountBalanceIcon />}
          onClick={() => onNavigate("vaults")}
        />
        <StatCard
          title="Best Fixed Yield"
          value={bestFixedAPY !== null ? formatPercent(bestFixedAPY) : null}
          sub="Pendle on Ethereum"
          icon={<LockClockIcon />}
          onClick={() => onNavigate("fixed")}
        />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 2, mt: 2 }}>
        <StatCard
          title="Lending Markets"
          value={lending ? String(lending.length) : null}
          sub={totalLendingTVL !== null ? `${formatUSD(totalLendingTVL)} TVL` : undefined}
          icon={<TrendingUpIcon />}
          onClick={() => onNavigate("lending")}
        />
        <StatCard
          title="Vaults"
          value={vaults ? String(vaults.length) : null}
          sub={totalVaultsTVL !== null ? `${formatUSD(totalVaultsTVL)} TVL` : undefined}
          icon={<AccountBalanceIcon />}
          onClick={() => onNavigate("vaults")}
        />
        <StatCard
          title="Fixed Markets"
          value={pendle ? String(pendle.length) : null}
          sub="Pendle markets"
          icon={<LockClockIcon />}
          onClick={() => onNavigate("fixed")}
        />
      </Box>
    </Box>
  );
}
