import { useTheme } from "@mui/material";
import { useMarkets, useVaults } from "@/hooks/useMarkets";
import { formatPercent, formatUSD, formatProtocolLabel } from "@/lib/marketTypes";

function SkeletonRect({ width, height }: { width: number; height: number }) {
  const theme = useTheme();
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 4,
        background: theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

interface StatProps {
  label: string;
  value: string | null;
  sub?: string;
  accent?: "green" | "amber";
}

function Stat({ label, value, sub, accent }: StatProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const accentColor = accent === "amber" ? "#f59e0b" : "#86efac";
  const borderHover = accent === "amber" ? "rgba(251,191,36,0.25)" : "rgba(0,255,157,0.2)";

  return (
    <div
      style={{
        padding: "18px 20px",
        borderRadius: 12,
        border: `1px solid ${isDark ? "rgba(67,72,78,0.3)" : "rgba(0,0,0,0.1)"}`,
        background: isDark ? "#0e1419" : theme.palette.background.paper,
        minWidth: 0,
        flex: 1,
        transition: "border-color 200ms ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = borderHover;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor =
          isDark ? "rgba(67,72,78,0.3)" : "rgba(0,0,0,0.1)";
      }}
    >
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: theme.palette.text.secondary,
        marginBottom: 8,
        fontFamily: "Inter, sans-serif",
      }}>
        {label}
      </div>

      {value === null ? (
        <SkeletonRect width={80} height={28} />
      ) : (
        <div style={{
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.03em",
          color: accent ? accentColor : theme.palette.text.primary,
          fontSize: 22,
          lineHeight: 1.1,
          fontFamily: "Inter, sans-serif",
        }}>
          {value}
        </div>
      )}

      {sub && (
        <div style={{
          color: theme.palette.text.secondary,
          fontSize: 10,
          marginTop: 5,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontFamily: "Inter, sans-serif",
          opacity: 0.7,
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function HeroStats({ viewMode = "lending" }: { viewMode?: "lending" | "borrow" }) {
  const { data: lending } = useMarkets();
  const { data: vaults } = useVaults();

  const isLending = viewMode === "lending";

  // ── Unified best yield (lending + vaults combined) ────────────────────────
  const bestLending = lending?.length
    ? lending.reduce((a, b) => (a.supplyAPY > b.supplyAPY ? a : b))
    : null;

  const bestVault = vaults?.length
    ? vaults.reduce((a, b) => (a.apy > b.apy ? a : b))
    : null;

  const bestYield = (() => {
    if (!bestLending && !bestVault) return null;
    if (!bestLending) return { value: bestVault!.apy, label: bestVault!.name, kind: "vault" as const };
    if (!bestVault) return { value: bestLending.supplyAPY, label: `${bestLending.asset} · ${formatProtocolLabel(bestLending)}`, kind: "lending" as const };
    return bestLending.supplyAPY >= bestVault.apy
      ? { value: bestLending.supplyAPY, label: `${bestLending.asset} · ${formatProtocolLabel(bestLending)}`, kind: "lending" as const }
      : { value: bestVault.apy, label: bestVault.name, kind: "vault" as const };
  })();

  // Best borrow rate
  const borrowMarkets = lending?.filter((m) => m.borrowAPR != null && m.borrowAPR > 0) ?? [];
  const lowestBorrow = borrowMarkets.length
    ? borrowMarkets.reduce((a, b) => ((a.borrowAPR ?? 999) < (b.borrowAPR ?? 999) ? a : b))
    : null;

  // Totals
  const MAX_ITEM_TVL = 30_000_000_000;
  const totalTVL =
    lending && vaults
      ? lending.reduce((s, m) => s + Math.min(m.totalSupplyUSD, MAX_ITEM_TVL), 0) +
        vaults.reduce((s, v) => s + Math.min(v.tvl, MAX_ITEM_TVL), 0)
      : null;

  const marketCount =
    lending && vaults ? lending.length + vaults.length : null;

  // ── Borrow-specific ───────────────────────────────────────────────────────
  const avgBorrowAPR =
    borrowMarkets.length
      ? borrowMarkets.reduce((s, m) => s + (m.borrowAPR ?? 0), 0) / borrowMarkets.length
      : null;

  const mostLiquid = borrowMarkets.length
    ? borrowMarkets.reduce((a, b) =>
        (a.availableLiquidityUSD ?? 0) > (b.availableLiquidityUSD ?? 0) ? a : b,
      )
    : null;

  const totalBorrowLiquidity = borrowMarkets.length
    ? borrowMarkets.reduce((s, m) => s + (m.availableLiquidityUSD ?? 0), 0)
    : null;

  const avgUtilization =
    borrowMarkets.length
      ? borrowMarkets.reduce((s, m) => s + (m.utilizationRate ?? 0), 0) / borrowMarkets.length
      : null;

  return (
    <>
      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`}</style>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {isLending ? (
          <>
            <Stat
              label="Best Yield"
              value={bestYield ? formatPercent(bestYield.value) : null}
              sub={bestYield?.label}
              accent="green"
            />
            <Stat
              label="Best Borrow Rate"
              value={lowestBorrow ? formatPercent(lowestBorrow.borrowAPR) : null}
              sub={lowestBorrow ? `${lowestBorrow.asset} · ${formatProtocolLabel(lowestBorrow)}` : undefined}
              accent="amber"
            />
            <Stat
              label="Total TVL"
              value={totalTVL !== null ? formatUSD(totalTVL) : null}
              sub="Across all tracked protocols"
            />
            <Stat
              label="Markets Tracked"
              value={marketCount !== null ? String(marketCount) : null}
              sub="Lending pools · Yield vaults"
            />
          </>
        ) : (
          <>
            <Stat
              label="Lowest Borrow APR"
              value={lowestBorrow ? formatPercent(lowestBorrow.borrowAPR) : null}
              sub={lowestBorrow ? `${lowestBorrow.asset} · ${formatProtocolLabel(lowestBorrow)}` : undefined}
              accent="amber"
            />
            <Stat
              label="Avg Borrow APR"
              value={avgBorrowAPR !== null ? formatPercent(avgBorrowAPR) : null}
              sub={borrowMarkets.length ? `Across ${borrowMarkets.length} markets` : undefined}
            />
            <Stat
              label="Most Liquid Market"
              value={mostLiquid ? formatUSD(mostLiquid.availableLiquidityUSD ?? 0) : null}
              sub={mostLiquid ? `${mostLiquid.asset} · ${formatProtocolLabel(mostLiquid)}` : undefined}
            />
            <Stat
              label="Total Borrow Capacity"
              value={totalBorrowLiquidity !== null ? formatUSD(totalBorrowLiquidity) : null}
              sub="Available across all markets"
            />
            <Stat
              label="Avg Utilization"
              value={avgUtilization !== null ? formatPercent(avgUtilization) : null}
              sub={`${borrowMarkets.length ?? 0} borrow markets`}
            />
          </>
        )}
      </div>
    </>
  );
}
