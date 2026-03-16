import { useAccount } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material";
import { formatUSD } from "@/lib/marketTypes";
import { useUserPositions, type ProtocolPosition } from "@/hooks/useUserPositions";

/* ─── Theme helpers ──────────────────────────────────────── */

function useColors() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return {
    isDark,
    textPrimary: isDark ? "#eaeef5" : "#0a0a0a",
    textSecondary: isDark ? "#a7abb2" : "#737373",
    textMuted: isDark ? "rgba(167,171,178,0.6)" : "rgba(0,0,0,0.4)",
    cardBg: isDark ? "#0e1419" : "#f8fafc",
    cardBorder: isDark ? "rgba(67,72,78,0.3)" : "rgba(0,0,0,0.1)",
    chipBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    innerBg: isDark ? "#141a20" : "#f1f5f9",
    btnBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    btnBorder: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
    btnHover: isDark ? "rgba(134,239,172,0.06)" : "rgba(0,0,0,0.08)",
    pageBg: isDark ? "#060b10" : "#f4f6f9",
  };
}

/* ─── Shared sub-components ─────────────────────────────── */

function SectionHeader({ title, count }: { title: string; count?: number }) {
  const c = useColors();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: c.textPrimary, fontFamily: "Inter, sans-serif", letterSpacing: "-0.02em" }}>
        {title}
      </span>
      {count !== undefined && (
        <span style={{
          fontSize: 10, fontWeight: 700, color: c.textSecondary,
          background: c.chipBg, borderRadius: 4, padding: "1px 6px",
          fontFamily: "Inter, sans-serif",
        }}>
          {count}
        </span>
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  const c = useColors();
  return (
    <div style={{
      background: c.cardBg, border: `1px solid ${c.cardBorder}`,
      borderRadius: 12, padding: "16px 18px", flex: 1, minWidth: 0,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: c.textSecondary, marginBottom: 6, fontFamily: "Inter, sans-serif", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: accent ?? c.textPrimary, fontFamily: "Inter, sans-serif", letterSpacing: "-0.03em" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: c.textMuted, marginTop: 4, fontFamily: "Inter, sans-serif" }}>{sub}</div>}
    </div>
  );
}

function EmptyState({ title, sub, action, onAction }: {
  title: string; sub: string; action?: string; onAction?: () => void;
}) {
  const c = useColors();
  return (
    <div style={{
      background: c.cardBg, border: `1px solid ${c.cardBorder}`,
      borderRadius: 12, padding: "32px 24px", textAlign: "center",
    }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>📭</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary, fontFamily: "Inter, sans-serif", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11, color: c.textSecondary, fontFamily: "Inter, sans-serif", marginBottom: action ? 14 : 0 }}>{sub}</div>
      {action && onAction && (
        <button onClick={onAction} style={{
          padding: "7px 18px", borderRadius: 8, border: `1px solid ${c.btnBorder}`, cursor: "pointer",
          background: c.btnBg, color: c.textPrimary, fontSize: 12, fontWeight: 800,
          fontFamily: "Inter, sans-serif",
        }}>
          {action}
        </button>
      )}
    </div>
  );
}

function HealthBadge({ value }: { value: number }) {
  const color = value >= 2.0 ? "#86efac" : value >= 1.5 ? "#fbbf24" : "#ef4444";
  const label = value >= 2.0 ? "Safe" : value >= 1.5 ? "Caution" : "At Risk";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color,
      background: `${color}18`, borderRadius: 6, padding: "2px 8px",
      fontFamily: "Inter, sans-serif", whiteSpace: "nowrap",
    }}>
      HF {value >= 100 ? "∞" : value.toFixed(2)} · {label}
    </span>
  );
}

function RatePill({ value, type }: { value: number | null; type: "apy" | "apr" }) {
  if (value === null) return null;
  const color = type === "apy" ? "#86efac" : "#fbbf24";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color,
      background: `${color}12`, borderRadius: 5, padding: "1px 6px",
      fontFamily: "Inter, sans-serif",
    }}>
      {value.toFixed(2)}% {type.toUpperCase()}
    </span>
  );
}

function PositionCard({ pos, onManage }: { pos: ProtocolPosition; onManage: () => void }) {
  const c = useColors();
  const hasSupply = pos.supplyUSD >= 0.01;
  const hasBorrow = pos.borrowUSD >= 0.01;
  const borderColor = hasBorrow ? "rgba(251,191,36,0.25)" : c.cardBorder;

  return (
    <div style={{
      background: c.cardBg,
      border: `1px solid ${borderColor}`,
      borderRadius: 12,
      padding: "16px 18px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary, fontFamily: "Inter, sans-serif" }}>
            {pos.protocol}
          </div>
          <div style={{ fontSize: 10, color: c.textSecondary, fontFamily: "Inter, sans-serif", marginTop: 2 }}>
            {pos.asset} · {pos.chain}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          {pos.healthFactor != null && pos.borrowUSD >= 0.01 && (
            <HealthBadge value={pos.healthFactor} />
          )}
        </div>
      </div>

      {/* Supply row */}
      {hasSupply && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: c.innerBg, borderRadius: 8, padding: "9px 12px", marginBottom: hasBorrow ? 6 : 14,
        }}>
          <div>
            <div style={{ fontSize: 10, color: c.textSecondary, fontFamily: "Inter, sans-serif", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Supplied
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#86efac", fontFamily: "Inter, sans-serif" }}>
              {formatUSD(pos.supplyUSD)}
            </div>
          </div>
          <RatePill value={pos.supplyAPY} type="apy" />
        </div>
      )}

      {/* Borrow row */}
      {hasBorrow && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: c.innerBg, borderRadius: 8, padding: "9px 12px", marginBottom: 14,
        }}>
          <div>
            <div style={{ fontSize: 10, color: c.textSecondary, fontFamily: "Inter, sans-serif", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Borrowed
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fbbf24", fontFamily: "Inter, sans-serif" }}>
              {formatUSD(pos.borrowUSD)}
            </div>
          </div>
          <RatePill value={pos.borrowAPR} type="apr" />
        </div>
      )}

      <button onClick={onManage} style={{
        width: "100%", padding: "7px 0", borderRadius: 8,
        border: `1px solid ${c.btnBorder}`, cursor: "pointer",
        background: c.btnBg, color: c.textSecondary,
        fontSize: 11, fontWeight: 700, fontFamily: "Inter, sans-serif",
        transition: "background 150ms",
      }}
        onMouseEnter={e => (e.currentTarget.style.background = c.btnHover)}
        onMouseLeave={e => (e.currentTarget.style.background = c.btnBg)}
      >
        Manage Position
      </button>
    </div>
  );
}

/* ─── Loading skeleton ───────────────────────────────────── */

function LoadingCard() {
  const c = useColors();
  return (
    <div style={{
      background: c.cardBg, border: `1px solid ${c.cardBorder}`,
      borderRadius: 12, padding: "16px 18px", minHeight: 130,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{ fontSize: 12, color: c.textSecondary, fontFamily: "Inter, sans-serif" }}>
        Fetching positions…
      </span>
    </div>
  );
}

/* ─── Not connected ──────────────────────────────────────── */

export default function PortfolioPage() {
  const { isConnected } = useAccount();
  const { open: openWallet } = useAppKit();
  const c = useColors();

  if (!isConnected) {
    return (
      <div style={{ maxWidth: 520, margin: "80px auto", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👛</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: c.textPrimary, fontFamily: "Inter, sans-serif", letterSpacing: "-0.03em", marginBottom: 8 }}>
          Connect your wallet
        </div>
        <div style={{ fontSize: 13, color: c.textSecondary, fontFamily: "Inter, sans-serif", marginBottom: 24, lineHeight: 1.6 }}>
          Connect your wallet to view your active positions across all supported chains.
        </div>
        <button onClick={() => openWallet()} style={{
          padding: "12px 32px", borderRadius: 12, border: `1px solid ${c.btnBorder}`, cursor: "pointer",
          background: c.btnBg, color: c.textPrimary, fontSize: 14, fontWeight: 800,
          fontFamily: "Inter, sans-serif",
        }}>
          Connect Wallet
        </button>
      </div>
    );
  }

  return <ConnectedPortfolio />;
}

/* ─── Connected portfolio ────────────────────────────────── */

function ConnectedPortfolio() {
  const navigate = useNavigate();
  const { address } = useAccount();
  const { data: positions, isLoading } = useUserPositions(address);
  const c = useColors();

  const supplyPositions = (positions ?? []).filter(p => p.supplyUSD >= 0.01);
  const borrowPositions = (positions ?? []).filter(p => p.borrowUSD >= 0.01);

  const totalSupplied = supplyPositions.reduce((s, p) => s + p.supplyUSD, 0);
  const totalBorrowed = borrowPositions.reduce((s, p) => s + p.borrowUSD, 0);
  const netPosition = totalSupplied - totalBorrowed;

  // Weighted avg supply APY
  const weightedAPY = totalSupplied > 0
    ? supplyPositions.reduce((s, p) => s + (p.supplyAPY ?? 0) * p.supplyUSD, 0) / totalSupplied
    : null;

  // Unique protocols and chains
  const allPositions = supplyPositions.concat(borrowPositions);
  const protocolCount = new Set(allPositions.map(p => `${p.protocolKey}:${p.chainId}`)).size;
  const activeChains = [...new Set(allPositions.map(p => p.chain))];
  const chainsSub = activeChains.length > 0
    ? activeChains.length <= 3
      ? activeChains.join(" · ")
      : `${activeChains.length} chains`
    : "All supported chains";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Summary bar ── */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: c.textPrimary, fontFamily: "Inter, sans-serif", letterSpacing: "-0.03em", marginBottom: 14 }}>
          Portfolio
        </h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <SummaryCard
            label="Net APY"
            value={isLoading ? "…" : weightedAPY != null ? `${weightedAPY.toFixed(2)}%` : "—"}
            sub="Weighted avg supply"
            accent="#86efac"
          />
          <SummaryCard
            label="Total Supplied"
            value={isLoading ? "…" : totalSupplied > 0 ? formatUSD(totalSupplied) : "—"}
            sub={`Across ${chainsSub}`}
          />
          <SummaryCard
            label="Total Borrowed"
            value={isLoading ? "…" : totalBorrowed > 0 ? formatUSD(totalBorrowed) : "—"}
            sub="Outstanding debt"
            accent={totalBorrowed > 0 ? "#fbbf24" : undefined}
          />
          <SummaryCard
            label="Protocols"
            value={isLoading ? "…" : protocolCount > 0 ? String(protocolCount) : "—"}
            sub={netPosition > 0 ? `Net ${formatUSD(netPosition)}` : chainsSub}
          />
        </div>
      </div>

      {/* ── Supply positions ── */}
      <div>
        <SectionHeader title="Supply Positions" count={isLoading ? undefined : supplyPositions.length} />
        {isLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            <LoadingCard /><LoadingCard />
          </div>
        ) : supplyPositions.length === 0 ? (
          <EmptyState
            title="No supply positions found"
            sub="Supply assets to Aave, Compound, Morpho, Spark and others to earn yield"
            action="Explore Lending"
            onAction={() => navigate("/trade")}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {supplyPositions.map((pos, i) => (
              <PositionCard key={`supply-${i}`} pos={pos} onManage={() => navigate("/trade")} />
            ))}
          </div>
        )}
      </div>

      {/* ── Borrow positions ── */}
      <div>
        <SectionHeader title="Borrow Positions" count={isLoading ? undefined : borrowPositions.length} />
        {isLoading ? null : borrowPositions.length === 0 ? (
          <EmptyState
            title="No borrow positions found"
            sub="Use your supplied assets as collateral to borrow other tokens"
            action="Start Borrowing"
            onAction={() => navigate("/trade")}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {borrowPositions.map((pos, i) => (
              <PositionCard key={`borrow-${i}`} pos={pos} onManage={() => navigate("/trade")} />
            ))}
          </div>
        )}
      </div>

      {/* ── Protocols covered ── */}
      {!isLoading && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", flexWrap: "wrap",
          background: c.cardBg, border: `1px solid ${c.cardBorder}`,
          borderRadius: 10,
        }}>
          <span style={{ fontSize: 10, color: c.textSecondary, fontFamily: "Inter, sans-serif" }}>
            Scanning across:
          </span>
          {["Aave V3", "Compound V3", "Morpho Blue", "Spark", "Moonwell", "Seamless", "Silo", "Euler", "Granary"].map(p => (
            <span key={p} style={{
              fontSize: 10, fontWeight: 600, color: c.textPrimary,
              background: c.chipBg, borderRadius: 4, padding: "2px 7px",
              fontFamily: "Inter, sans-serif",
            }}>
              {p}
            </span>
          ))}
          <span style={{ fontSize: 10, color: c.textSecondary, fontFamily: "Inter, sans-serif", marginLeft: "auto" }}>
            30+ chains
          </span>
        </div>
      )}

    </div>
  );
}
