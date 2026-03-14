import { useMarkets, useVaults, usePendle } from "@/hooks/useMarkets";
import { formatPercent, formatUSD, formatProtocolLabel } from "@/lib/marketTypes";

function SkeletonRect({ width, height }: { width: number; height: number }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 4,
        background: "rgba(255,255,255,0.06)",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

interface StatProps {
  label: string;
  value: string | null;
  sub?: string;
  accent?: boolean;
}

function Stat({ label, value, sub, accent }: StatProps) {
  return (
    <div
      style={{
        padding: "18px 20px",
        borderRadius: 12,
        border: "1px solid rgba(67,72,78,0.3)",
        background: "#0e1419",
        minWidth: 0,
        flex: 1,
        transition: "border-color 200ms ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,255,157,0.2)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(67,72,78,0.3)";
      }}
    >
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase" as const,
        letterSpacing: "0.12em",
        color: "#a7abb2",
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
          fontVariantNumeric: "tabular-nums" as const,
          letterSpacing: "-0.03em",
          color: accent ? "#86efac" : "#eaeef5",
          fontSize: 22,
          lineHeight: 1.1,
          fontFamily: "Inter, sans-serif",
        }}>
          {value}
        </div>
      )}

      {sub && (
        <div style={{
          color: "rgba(167,171,178,0.6)",
          fontSize: 10,
          marginTop: 5,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap" as const,
          fontFamily: "Inter, sans-serif",
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
  const { data: pendle } = usePendle();

  const isLending = viewMode === "lending";

  // ── Lending-specific ──────────────────────────────────────
  const bestSupply = lending?.length
    ? lending.reduce((a, b) => (a.supplyAPY > b.supplyAPY ? a : b))
    : null;

  const bestVault = vaults?.length
    ? vaults.reduce((a, b) => (a.apy > b.apy ? a : b))
    : null;

  const bestFixed = pendle?.length
    ? pendle.reduce((a, b) => (a.impliedAPY > b.impliedAPY ? a : b))
    : null;

  // Cap individual values to guard against API returning raw token units instead of USD.
  // No single lending pool or vault can realistically hold more than $30B.
  const MAX_ITEM_TVL = 30_000_000_000;
  const totalTVL =
    lending && vaults
      ? lending.reduce((s, m) => s + Math.min(m.totalSupplyUSD, MAX_ITEM_TVL), 0) +
        vaults.reduce((s, v) => s + Math.min(v.tvl, MAX_ITEM_TVL), 0)
      : null;

  const lendingMarketCount =
    lending && vaults && pendle
      ? lending.length + vaults.length + pendle.length
      : null;

  // ── Borrow-specific ───────────────────────────────────────
  const borrowMarkets = lending?.filter((m) => m.borrowAPR != null && m.borrowAPR > 0) ?? [];

  const lowestBorrow = borrowMarkets.length
    ? borrowMarkets.reduce((a, b) => ((a.borrowAPR ?? 999) < (b.borrowAPR ?? 999) ? a : b))
    : null;

  const avgBorrowAPR =
    borrowMarkets.length
      ? borrowMarkets.reduce((s, m) => s + (m.borrowAPR ?? 0), 0) / borrowMarkets.length
      : null;

  // Most liquid = highest available liquidity for borrowing
  const mostLiquid = borrowMarkets.length
    ? borrowMarkets.reduce((a, b) =>
        (a.availableLiquidityUSD ?? 0) > (b.availableLiquidityUSD ?? 0) ? a : b
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {isLending ? (
          <>
            <Stat
              label="Best Lending APY"
              value={bestSupply ? formatPercent(bestSupply.supplyAPY) : null}
              sub={bestSupply ? `${bestSupply.asset} · ${formatProtocolLabel(bestSupply)}` : undefined}
              accent
            />
            <Stat
              label="Best Vault APY"
              value={bestVault ? formatPercent(bestVault.apy) : null}
              sub={bestVault ? bestVault.name : undefined}
            />
            <Stat
              label="Best Fixed Yield"
              value={bestFixed ? formatPercent(bestFixed.impliedAPY) : null}
              sub={bestFixed ? bestFixed.name : undefined}
            />
            <Stat
              label="Total TVL"
              value={totalTVL !== null ? formatUSD(totalTVL) : null}
              sub="Across all tracked protocols"
            />
            <Stat
              label="Markets Tracked"
              value={lendingMarketCount !== null ? String(lendingMarketCount) : null}
              sub="Lending · Vaults · Fixed Yield"
            />
          </>
        ) : (
          <>
            <Stat
              label="Lowest Borrow APR"
              value={lowestBorrow ? formatPercent(lowestBorrow.borrowAPR) : null}
              sub={lowestBorrow ? `${lowestBorrow.asset} · ${formatProtocolLabel(lowestBorrow)}` : undefined}
              accent
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
