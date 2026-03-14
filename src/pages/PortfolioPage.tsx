import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { useNavigate } from "react-router-dom";
import { useMarkets, useVaults, usePendle } from "@/hooks/useMarkets";
import { formatPercent, formatUSD } from "@/lib/marketTypes";
import { AssetIcon, ProtocolIcon, parseChainFromLabel } from "@/components/icons/MarketIcons";

function EmptyState({ title, sub, action, onAction }: {
  title: string; sub: string; action?: string; onAction?: () => void;
}) {
  return (
    <div style={{
      background: "#0e1419", border: "1px solid rgba(67,72,78,0.3)",
      borderRadius: 12, padding: "32px 24px", textAlign: "center",
    }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>📭</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#eaeef5", fontFamily: "Inter, sans-serif", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11, color: "#a7abb2", fontFamily: "Inter, sans-serif", marginBottom: action ? 14 : 0 }}>{sub}</div>
      {action && onAction && (
        <button onClick={onAction} style={{
          padding: "7px 18px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer",
          background: "rgba(255,255,255,0.08)", color: "#eaeef5", fontSize: 12, fontWeight: 800,
          fontFamily: "Inter, sans-serif",
        }}>
          {action}
        </button>
      )}
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: "#eaeef5", fontFamily: "Inter, sans-serif", letterSpacing: "-0.02em" }}>
        {title}
      </span>
      {count !== undefined && (
        <span style={{
          fontSize: 10, fontWeight: 700, color: "#a7abb2",
          background: "rgba(255,255,255,0.06)", borderRadius: 4, padding: "1px 6px",
          fontFamily: "Inter, sans-serif",
        }}>
          {count}
        </span>
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{
      background: "#0e1419", border: "1px solid rgba(67,72,78,0.3)",
      borderRadius: 12, padding: "16px 18px", flex: 1, minWidth: 0,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#a7abb2", marginBottom: 6, fontFamily: "Inter, sans-serif", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: accent ?? "#eaeef5", fontFamily: "Inter, sans-serif", letterSpacing: "-0.03em" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: "rgba(167,171,178,0.6)", marginTop: 4, fontFamily: "Inter, sans-serif" }}>{sub}</div>}
    </div>
  );
}

export default function PortfolioPage() {
  const { isConnected } = useAccount();
  const { open: openWallet } = useAppKit();

  if (!isConnected) {
    return (
      <div style={{ maxWidth: 520, margin: "80px auto", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👛</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#eaeef5", fontFamily: "Inter, sans-serif", letterSpacing: "-0.03em", marginBottom: 8 }}>
          Connect your wallet
        </div>
        <div style={{ fontSize: 13, color: "#a7abb2", fontFamily: "Inter, sans-serif", marginBottom: 24, lineHeight: 1.6 }}>
          Connect your wallet to view your active positions across lending markets, vaults, and fixed yield strategies.
        </div>
        <button
          onClick={() => openWallet()}
          style={{
            padding: "12px 32px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer",
            background: "rgba(255,255,255,0.1)", color: "#eaeef5", fontSize: 14, fontWeight: 800,
            fontFamily: "Inter, sans-serif",
          }}
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return <ConnectedPortfolio />;
}

// Rendered only when wallet is connected — API hooks only fire when needed.
function ConnectedPortfolio() {
  const navigate = useNavigate();
  const { data: markets } = useMarkets();
  const { data: vaults } = useVaults();
  usePendle(); // prefetch for when user navigates to fixed yield

  const topLending = useMemo(
    () => (markets ? [...markets].sort((a, b) => b.supplyAPY - a.supplyAPY).slice(0, 3) : []),
    [markets],
  );
  const topVaults = useMemo(
    () => (vaults ? [...vaults].sort((a, b) => b.apy - a.apy).slice(0, 3) : []),
    [vaults],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Summary bar */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#eaeef5", fontFamily: "Inter, sans-serif", letterSpacing: "-0.03em", marginBottom: 14 }}>
          Portfolio
        </h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <SummaryCard label="Net APY" value="—" sub="No active positions" accent="#86efac" />
          <SummaryCard label="Total Supplied" value="—" sub="Across all protocols" />
          <SummaryCard label="Total Borrowed" value="—" sub="Outstanding debt" />
          <SummaryCard label="Net Position" value="—" sub="Supplied − Borrowed" />
        </div>
      </div>

      {/* Lending positions */}
      <div>
        <SectionHeader title="Lending Positions" count={0} />
        <EmptyState
          title="No lending positions"
          sub="Earn yield by supplying assets to lending protocols"
          action="Explore Lending"
          onAction={() => navigate("/trade")}
        />
      </div>

      {/* Borrow positions */}
      <div>
        <SectionHeader title="Borrow Positions" count={0} />
        <EmptyState
          title="No borrow positions"
          sub="Use your assets as collateral to borrow other tokens"
          action="Start Borrowing"
          onAction={() => navigate("/trade")}
        />
      </div>

      {/* Vault positions */}
      <div>
        <SectionHeader title="Vault Positions" count={0} />
        <EmptyState
          title="No vault positions"
          sub="Deposit into curated vaults for optimized yield strategies"
          action="Browse Vaults"
          onAction={() => navigate("/trade")}
        />
      </div>

      {/* Fixed yield positions */}
      <div>
        <SectionHeader title="Fixed Yield Positions" count={0} />
        <EmptyState
          title="No fixed yield positions"
          sub="Lock in guaranteed APY through Pendle fixed-rate markets"
          action="Explore Fixed Yield"
          onAction={() => navigate("/trade")}
        />
      </div>

      {/* Opportunities based on top markets */}
      {(topLending.length > 0 || topVaults.length > 0) && (
        <div>
          <SectionHeader title="Top Opportunities Right Now" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
            {topLending.map(m => {
              const { name: protoName, chain } = parseChainFromLabel(m.protocolName);
              return (
                <div
                  key={m.id}
                  onClick={() => navigate("/trade")}
                  style={{
                    background: "#0e1419", border: "1px solid rgba(67,72,78,0.3)",
                    borderRadius: 12, padding: "14px 16px", cursor: "pointer",
                    transition: "border-color 150ms",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,255,157,0.25)"}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(67,72,78,0.3)"}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <AssetIcon symbol={m.asset} size={20} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#eaeef5", fontFamily: "Inter, sans-serif" }}>{m.asset}</div>
                      <div style={{ fontSize: 10, color: "#a7abb2", fontFamily: "Inter, sans-serif" }}>
                        {protoName}{chain ? ` · ${chain}` : ""}
                      </div>
                    </div>
                    <div style={{ marginLeft: "auto", fontSize: 16, fontWeight: 800, color: "#86efac", fontFamily: "Inter, sans-serif" }}>
                      {formatPercent(m.supplyAPY)}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: "#a7abb2", fontFamily: "Inter, sans-serif" }}>
                    {formatUSD(m.totalSupplyUSD)} TVL · Supply APY
                  </div>
                </div>
              );
            })}
            {topVaults.map(v => {
              const { name: vaultDisplay, chain } = parseChainFromLabel(v.name);
              return (
                <div
                  key={v.id}
                  onClick={() => navigate("/trade")}
                  style={{
                    background: "#0e1419", border: "1px solid rgba(67,72,78,0.3)",
                    borderRadius: 12, padding: "14px 16px", cursor: "pointer",
                    transition: "border-color 150ms",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(167,139,250,0.25)"}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(67,72,78,0.3)"}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#141a20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <ProtocolIcon name={v.protocol} size={14} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#eaeef5", fontFamily: "Inter, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {vaultDisplay}
                      </div>
                      <div style={{ fontSize: 10, color: "#a7abb2", fontFamily: "Inter, sans-serif" }}>
                        {v.asset}{chain ? ` · ${chain}` : ""}
                      </div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#a78bfa", fontFamily: "Inter, sans-serif" }}>
                      {formatPercent(v.apy)}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: "#a7abb2", fontFamily: "Inter, sans-serif" }}>
                    {formatUSD(v.tvl)} TVL · Vault APY
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
