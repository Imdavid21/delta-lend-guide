import { useMarkets, useVaults, usePendle } from "@/hooks/useMarkets";
import { formatUSD, formatPercent, formatProtocolLabel } from "@/lib/marketTypes";

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
          color: accent ? "#00FF9D" : "#eaeef5",
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
    <>
      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`}</style>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12,
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
          sub={bestVault ? bestVault.name : undefined}
        />
        <Stat
          label="Best Fixed Yield"
          value={bestFixed ? formatPercent(bestFixed.impliedAPY) : null}
          sub={bestFixed ? bestFixed.name : undefined}
        />
        <Stat
          label={isLending ? "Total TVL" : "Aggregate Liquidity"}
          value={totalTVL !== null ? formatUSD(totalTVL) : null}
          sub="Across all tracked protocols"
        />
        <Stat
          label="Markets Tracked"
          value={marketCount !== null ? String(marketCount) : null}
          sub={isLending ? "Lending · Vaults · Fixed Yield" : "Borrow Markets"}
        />
      </div>
    </>
  );
}
