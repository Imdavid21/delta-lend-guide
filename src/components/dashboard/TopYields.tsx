import { useMemo } from "react";
import {
  Box, Paper, Typography, Skeleton, List, ListItemButton, ListItemText, Chip,
} from "@mui/material";
import { useMarkets, useVaults, usePendle } from "@/hooks/useMarkets";
import { formatPercent, formatUSD } from "@/lib/marketTypes";
import { AssetIcon, ProtocolIcon } from "@/components/icons/MarketIcons";

interface Props {
  viewMode?: "lending" | "borrow";
  onAction: (prompt: string) => void;
}

function YieldCard({
  title,
  items,
  loading,
}: {
  title: string;
  items: { id: string; label: string; sub: string; apy: string; icon: React.ReactNode }[] | null;
  loading: boolean;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 3,
        overflow: "hidden",
        bgcolor: "background.default",
      }}
    >
      <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontSize: 10,
            color: "text.secondary",
          }}
        >
          {title}
        </Typography>
      </Box>
      <List dense disablePadding>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <ListItemButton key={i} sx={{ py: 1, px: 2 }}>
                <Skeleton width="100%" height={20} />
              </ListItemButton>
            ))
          : items?.map((item, i) => (
              <ListItemButton
                key={item.id}
                sx={{
                  py: 0.75,
                  px: 2,
                  gap: 1.5,
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Typography
                  sx={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "text.disabled",
                    width: 16,
                    flexShrink: 0,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {i + 1}
                </Typography>
                <Box sx={{ flexShrink: 0 }}>{item.icon}</Box>
                <ListItemText
                  primary={item.label}
                  secondary={item.sub}
                  primaryTypographyProps={{ fontSize: 12, fontWeight: 600, noWrap: true }}
                  secondaryTypographyProps={{ fontSize: 10, color: "text.disabled", noWrap: true }}
                  sx={{ minWidth: 0 }}
                />
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#22c55e",
                    fontVariantNumeric: "tabular-nums",
                    flexShrink: 0,
                  }}
                >
                  {item.apy}
                </Typography>
              </ListItemButton>
            ))}
      </List>
    </Paper>
  );
}

export default function TopYields({ viewMode = "lending", onAction }: Props) {
  const { data: lending, isLoading: ll } = useMarkets();
  const { data: vaults, isLoading: vl } = useVaults();
  const { data: pendle, isLoading: pl } = usePendle();

  const isLending = viewMode === "lending";

  const topLending = useMemo(() => {
    if (!lending) return null;
    return [...lending]
      .sort((a, b) => isLending ? (b.supplyAPY - a.supplyAPY) : ((a.borrowAPR ?? 999) - (b.borrowAPR ?? 999)))
      .slice(0, 5)
      .map((m) => ({
        id: m.id,
        label: `${m.asset} · ${m.protocolName}`,
        sub: `${formatUSD(m.totalSupplyUSD)} TVL`,
        apy: formatPercent(isLending ? m.supplyAPY : m.borrowAPR),
        icon: <AssetIcon symbol={m.asset} size={18} />,
      }));
  }, [lending, isLending]);

  const topVaults = useMemo(() => {
    if (!vaults) return null;
    return [...vaults]
      .sort((a, b) => b.apy - a.apy)
      .slice(0, 5)
      .map((v) => ({
        id: v.id,
        label: v.name,
        sub: `${v.curator || v.protocol} · ${formatUSD(v.tvl)}`,
        apy: formatPercent(v.apy),
        icon: <ProtocolIcon name={v.protocol} size={18} />,
      }));
  }, [vaults]);

  const topFixed = useMemo(() => {
    if (!pendle) return null;
    return [...pendle]
      .sort((a, b) => b.impliedAPY - a.impliedAPY)
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        label: p.name,
        sub: `${p.daysToMaturity}d to maturity · ${formatUSD(p.tvl)}`,
        apy: formatPercent(p.impliedAPY),
        icon: <AssetIcon symbol={p.asset} size={18} />,
      }));
  }, [pendle]);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: isLending ? { xs: "1fr", md: "1fr 1fr 1fr" } : { xs: "1fr", md: "1fr" },
        gap: 1.5,
      }}
    >
      <YieldCard title={isLending ? "Top Lending Yields" : "Lowest Borrow Rates"} items={topLending} loading={ll} />
      {isLending && (
        <>
          <YieldCard title="Top Vault Yields" items={topVaults} loading={vl} />
          <YieldCard title="Top Fixed Yields" items={topFixed} loading={pl} />
        </>
      )}
    </Box>
  );
}
