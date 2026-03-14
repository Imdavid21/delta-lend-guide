import { useMemo } from "react";
import {
  Box, Typography, Skeleton, Button, alpha,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useMarkets, useVaults, usePendle } from "@/hooks/useMarkets";
import { formatPercent, formatUSD, formatProtocolLabel } from "@/lib/marketTypes";
import { AssetIcon, ProtocolIcon } from "@/components/icons/MarketIcons";

interface Props {
  viewMode?: "lending" | "borrow";
  onAction: (prompt: string) => void;
}

function YieldCard({
  title,
  items,
  loading,
  onSeeAll,
  accentColor = "primary.main",
}: {
  title: string;
  items: { id: string; label: string; sub: string; apy: string; icon: React.ReactNode }[] | null;
  loading: boolean;
  onSeeAll?: () => void;
  accentColor?: string;
}) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      {/* Card header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: (t) => t.palette.mode === "dark" ? "#1a2027" : "#f1f5f9",
        }}
      >
        <Typography
          sx={{
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontSize: "0.625rem",
            color: "text.secondary",
          }}
        >
          {title}
        </Typography>
        {onSeeAll && (
          <Button
            size="small"
            onClick={onSeeAll}
            sx={{
              fontSize: "0.625rem",
              fontWeight: 700,
              textTransform: "none",
              minWidth: 0,
              px: 1,
              py: 0,
              color: "text.secondary",
              "&:hover": { color: accentColor },
            }}
          >
            See All →
          </Button>
        )}
      </Box>

      {/* Items */}
      <Box>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Box key={i} sx={{ px: 2, py: 1.25, display: "flex", alignItems: "center", gap: 1.5 }}>
                <Skeleton width={14} height={16} />
                <Skeleton variant="circular" width={28} height={28} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="60%" height={14} />
                  <Skeleton width="40%" height={12} />
                </Box>
                <Skeleton width={48} height={16} />
              </Box>
            ))
          : items?.map((item, i) => (
              <Box
                key={item.id}
                sx={{
                  px: 2,
                  py: 1.25,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  cursor: "pointer",
                  transition: "background-color 150ms ease",
                  borderBottom: i < (items.length - 1) ? "1px solid" : "none",
                  borderColor: "divider",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                {/* Rank */}
                <Typography
                  sx={{
                    fontSize: "0.625rem",
                    fontWeight: 700,
                    color: "text.disabled",
                    width: 14,
                    flexShrink: 0,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {i + 1}
                </Typography>

                {/* Icon */}
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    bgcolor: (t) =>
                      t.palette.mode === "dark" ? "#1f262e" : "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  {item.icon}
                </Box>

                {/* Label */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "text.primary",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.625rem",
                      color: "text.disabled",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.sub}
                  </Typography>
                </Box>

                {/* APY */}
                <Typography
                  sx={{
                    fontSize: "0.8125rem",
                    fontWeight: 800,
                    color: accentColor,
                    fontVariantNumeric: "tabular-nums",
                    flexShrink: 0,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {item.apy}
                </Typography>
              </Box>
            ))}
      </Box>
    </Box>
  );
}

export default function TopYields({ viewMode = "lending", onAction }: Props) {
  const { data: lending, isLoading: ll } = useMarkets();
  const { data: vaults, isLoading: vl } = useVaults();
  const { data: pendle, isLoading: pl } = usePendle();
  const navigate = useNavigate();

  const isLending = viewMode === "lending";

  const topLending = useMemo(() => {
    if (!lending) return null;
    let filtered = lending;
    if (!isLending) filtered = filtered.filter((m) => m.borrowAPR != null && m.borrowAPR > 0);
    return [...filtered]
      .sort((a, b) => isLending ? (b.supplyAPY - a.supplyAPY) : ((a.borrowAPR ?? 999) - (b.borrowAPR ?? 999)))
      .slice(0, 5)
      .map((m) => ({
        id: m.id,
        label: `${m.asset} · ${formatProtocolLabel(m)}`,
        sub: `${formatUSD(m.totalSupplyUSD)} TVL`,
        apy: formatPercent(isLending ? m.supplyAPY : m.borrowAPR),
        icon: <AssetIcon symbol={m.asset} size={16} />,
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
        icon: <ProtocolIcon name={v.protocol} size={16} />,
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
        icon: <AssetIcon symbol={p.asset} size={16} />,
      }));
  }, [pendle]);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: isLending
          ? { xs: "1fr", md: "1fr 1fr 1fr" }
          : { xs: "1fr", md: "1fr" },
        gap: 1.5,
      }}
    >
      <YieldCard
        title={isLending ? "Top Lending Yields" : "Lowest Borrow Rates"}
        items={topLending}
        loading={ll}
        onSeeAll={() => navigate(isLending ? "/lending/markets" : "/borrow/markets")}
        accentColor="primary.main"
      />
      {isLending && (
        <>
          <YieldCard
            title="Top Vault Yields"
            items={topVaults}
            loading={vl}
            onSeeAll={() => navigate("/lending/vaults")}
            accentColor="secondary.main"
          />
          <YieldCard
            title="Top Fixed Yields"
            items={topFixed}
            loading={pl}
            onSeeAll={() => navigate("/lending/fixed")}
            accentColor="#78dfff"
          />
        </>
      )}
    </Box>
  );
}
