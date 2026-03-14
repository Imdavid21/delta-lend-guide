import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMarkets, useVaults, usePendle } from "@/hooks/useMarkets";
import { formatPercent, formatUSD, formatProtocolLabel } from "@/lib/marketTypes";
import { AssetIcon, ProtocolIcon, ChainIcon, parseChainFromLabel } from "@/components/icons/MarketIcons";

interface Props {
  viewMode?: "lending" | "borrow";
  onAction: (prompt: string) => void;
}

interface YieldItem {
  id: string;
  label: string;
  protocolName?: string; // shown with ProtocolIcon (lending rows)
  chain?: string | null; // shown with ChainIcon
  sub: string;
  apy: string;
  icon: React.ReactNode;
}

function SkeletonRow() {
  return (
    <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 14, height: 14, borderRadius: 3, background: "rgba(255,255,255,0.06)" }} />
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 12, width: "60%", borderRadius: 4, background: "rgba(255,255,255,0.06)", marginBottom: 5 }} />
        <div style={{ height: 10, width: "40%", borderRadius: 4, background: "rgba(255,255,255,0.06)" }} />
      </div>
      <div style={{ width: 44, height: 14, borderRadius: 4, background: "rgba(255,255,255,0.06)" }} />
    </div>
  );
}

function YieldCard({
  title,
  items,
  loading,
  onSeeAll,
  accentColor = "#00FF9D",
}: {
  title: string;
  items: YieldItem[] | null;
  loading: boolean;
  onSeeAll?: () => void;
  accentColor?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(67,72,78,0.3)",
        borderRadius: 12,
        overflow: "hidden",
        background: "#0e1419",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid rgba(67,72,78,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{
          fontWeight: 800,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          fontSize: 10,
          color: "#a7abb2",
          fontFamily: "Inter, sans-serif",
        }}>
          {title}
        </span>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            style={{
              fontSize: 10,
              fontWeight: 700,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#a7abb2",
              fontFamily: "Inter, sans-serif",
              padding: "2px 4px",
              transition: "color 150ms ease",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = accentColor)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#a7abb2")}
          >
            See All →
          </button>
        )}
      </div>

      {/* Items */}
      <div style={{ flex: 1 }}>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          : items?.map((item, i) => (
              <div
                key={item.id}
                style={{
                  padding: "11px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  borderBottom: i < (items.length - 1) ? "1px solid rgba(67,72,78,0.18)" : "none",
                  transition: "background 150ms ease",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
              >
                {/* Rank */}
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "rgba(167,171,178,0.4)",
                  width: 14,
                  flexShrink: 0,
                  fontVariantNumeric: "tabular-nums" as const,
                  fontFamily: "Inter, sans-serif",
                }}>
                  {i + 1}
                </span>

                {/* Icon circle */}
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "#141a20",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "1px solid rgba(67,72,78,0.25)",
                }}>
                  {item.icon}
                </div>

                {/* Label */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    overflow: "hidden",
                  }}>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#eaeef5",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap" as const,
                      fontFamily: "Inter, sans-serif",
                      flexShrink: 1,
                      minWidth: 0,
                    }}>
                      {item.label}
                    </span>
                    {item.protocolName && (
                      <>
                        <span style={{ color: "rgba(167,171,178,0.3)", fontSize: 10, flexShrink: 0 }}>·</span>
                        <ProtocolIcon name={item.protocolName} size={13} />
                      </>
                    )}
                    {item.chain && (
                      <ChainIcon chainName={item.chain} size={13} />
                    )}
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: "rgba(167,171,178,0.6)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap" as const,
                    fontFamily: "Inter, sans-serif",
                  }}>
                    {item.sub}
                  </div>
                </div>

                {/* APY */}
                <span style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: accentColor,
                  fontVariantNumeric: "tabular-nums" as const,
                  flexShrink: 0,
                  letterSpacing: "-0.02em",
                  fontFamily: "Inter, sans-serif",
                }}>
                  {item.apy}
                </span>
              </div>
            ))}
      </div>
    </div>
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
      .map((m) => {
        const { name: protoName, chain } = parseChainFromLabel(formatProtocolLabel(m));
        return {
          id: m.id,
          label: m.asset,
          protocolName: protoName,
          chain,
          sub: `${formatUSD(m.totalSupplyUSD)} TVL`,
          apy: formatPercent(isLending ? m.supplyAPY : m.borrowAPR),
          icon: <AssetIcon symbol={m.asset} size={16} />,
        };
      });
  }, [lending, isLending]);

  const topVaults = useMemo(() => {
    if (!vaults) return null;
    return [...vaults]
      .sort((a, b) => b.apy - a.apy)
      .slice(0, 5)
      .map((v) => {
        const { name: vaultName, chain } = parseChainFromLabel(v.name);
        return {
          id: v.id,
          label: vaultName,
          chain,
          sub: `${v.curator || v.protocol} · ${formatUSD(v.tvl)}`,
          apy: formatPercent(v.apy),
          icon: <ProtocolIcon name={v.protocol} size={16} />,
        };
      });
  }, [vaults]);

  const topFixed = useMemo(() => {
    if (!pendle) return null;
    return [...pendle]
      .sort((a, b) => b.impliedAPY - a.impliedAPY)
      .slice(0, 5)
      .map((p) => {
        const { name: marketName, chain } = parseChainFromLabel(p.name);
        return {
          id: p.id,
          label: marketName,
          chain,
          sub: `${p.daysToMaturity}d to maturity · ${formatUSD(p.tvl)}`,
          apy: formatPercent(p.impliedAPY),
          icon: <AssetIcon symbol={p.asset} size={16} />,
        };
      });
  }, [pendle]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isLending ? "1fr 1fr 1fr" : "1fr",
        gap: 12,
      }}
    >
      <YieldCard
        title={isLending ? "Top Lending Yields" : "Lowest Borrow Rates"}
        items={topLending}
        loading={ll}
        onSeeAll={() => navigate(isLending ? "/lending/markets" : "/borrow/markets")}
        accentColor="#00FF9D"
      />
      {isLending && (
        <>
          <YieldCard
            title="Top Vault Yields"
            items={topVaults}
            loading={vl}
            onSeeAll={() => navigate("/lending/vaults")}
            accentColor="#64f9c3"
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
    </div>
  );
}
