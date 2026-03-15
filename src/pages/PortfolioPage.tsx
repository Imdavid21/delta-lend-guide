import { useAccount, useReadContract } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { useNavigate } from "react-router-dom";
import { formatUSD } from "@/lib/marketTypes";

/* ─── Aave V3 Pool ABI (getUserAccountData only) ─────────── */

const AAVE_POOL_ABI = [
  {
    name: "getUserAccountData",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "totalCollateralBase", type: "uint256" },
      { name: "totalDebtBase",       type: "uint256" },
      { name: "availableBorrowsBase",            type: "uint256" },
      { name: "currentLiquidationThreshold",     type: "uint256" },
      { name: "ltv",                 type: "uint256" },
      { name: "healthFactor",        type: "uint256" },
    ],
  },
] as const;

const AAVE_V3_ETH  = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2" as `0x${string}`;
const AAVE_V3_BASE = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5" as `0x${string}`;

/* ─── Sub-components ─────────────────────────────────────── */

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

function HealthBadge({ value }: { value: number }) {
  const color = value >= 2.0 ? "#86efac" : value >= 1.5 ? "#fbbf24" : "#ef4444";
  const label = value >= 2.0 ? "Safe" : value >= 1.5 ? "Caution" : "At Risk";
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color,
      background: `${color}18`, borderRadius: 6, padding: "2px 8px",
      fontFamily: "Inter, sans-serif",
    }}>
      {value >= 100 ? "∞" : value.toFixed(2)} · {label}
    </span>
  );
}

interface AavePosition {
  collateral: number;
  debt: number;
  healthFactor: number;
  availableBorrow: number;
}

function parseAaveData(raw: readonly [bigint, bigint, bigint, bigint, bigint, bigint] | undefined): AavePosition | null {
  if (!raw) return null;
  const collateral = Number(raw[0]) / 1e8;
  if (collateral < 0.001) return null; // no meaningful position
  return {
    collateral,
    debt:           Number(raw[1]) / 1e8,
    availableBorrow: Number(raw[2]) / 1e8,
    healthFactor:   Number(raw[5]) / 1e18,
  };
}

function AavePositionCard({ chain, position, onAction }: {
  chain: string;
  position: AavePosition;
  onAction: () => void;
}) {
  const netAPY = "—"; // would need per-asset APY data
  return (
    <div style={{
      background: "#0e1419", border: "1px solid rgba(67,72,78,0.3)",
      borderRadius: 12, padding: "16px 18px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: "#141a20",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14,
          }}>
            {chain === "Ethereum" ? "⟠" : "🔵"}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#eaeef5", fontFamily: "Inter, sans-serif" }}>
              Aave V3 · {chain}
            </div>
            <div style={{ fontSize: 10, color: "#a7abb2", fontFamily: "Inter, sans-serif" }}>
              Active position
            </div>
          </div>
        </div>
        <HealthBadge value={position.healthFactor} />
      </div>

      {/* Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[
          { label: "Supplied", value: formatUSD(position.collateral), accent: "#86efac" },
          { label: "Borrowed", value: position.debt > 0 ? formatUSD(position.debt) : "—", accent: position.debt > 0 ? "#fbbf24" : "#a7abb2" },
          { label: "Available to Borrow", value: formatUSD(position.availableBorrow), accent: undefined },
          { label: "Net APY", value: netAPY, accent: "#86efac" },
        ].map(({ label, value, accent }) => (
          <div key={label} style={{
            background: "#141a20", borderRadius: 8, padding: "10px 12px",
          }}>
            <div style={{ fontSize: 10, color: "#a7abb2", fontFamily: "Inter, sans-serif", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {label}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: accent ?? "#eaeef5", fontFamily: "Inter, sans-serif" }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onAction}
        style={{
          width: "100%", padding: "8px 0", borderRadius: 8,
          border: "1px solid rgba(134,239,172,0.2)", cursor: "pointer",
          background: "rgba(134,239,172,0.06)", color: "#86efac",
          fontSize: 12, fontWeight: 700, fontFamily: "Inter, sans-serif",
        }}
      >
        Manage Position
      </button>
    </div>
  );
}

/* ─── Not-connected screen ───────────────────────────────── */

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
          Connect your wallet to view your active positions across lending markets and vaults.
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

/* ─── Connected portfolio ────────────────────────────────── */

function ConnectedPortfolio() {
  const navigate = useNavigate();
  const { address } = useAccount();

  // ── Aave V3 positions on Ethereum and Base ─────────────
  const { data: ethRaw, isLoading: ethLoading } = useReadContract({
    address: AAVE_V3_ETH,
    abi: AAVE_POOL_ABI,
    functionName: "getUserAccountData",
    args: address ? [address] : undefined,
    chainId: 1,
    query: { enabled: !!address },
  });

  const { data: baseRaw, isLoading: baseLoading } = useReadContract({
    address: AAVE_V3_BASE,
    abi: AAVE_POOL_ABI,
    functionName: "getUserAccountData",
    args: address ? [address] : undefined,
    chainId: 8453,
    query: { enabled: !!address },
  });

  const ethPos  = parseAaveData(ethRaw);
  const basePos = parseAaveData(baseRaw);

  const loading = ethLoading || baseLoading;

  const totalSupplied = (ethPos?.collateral ?? 0) + (basePos?.collateral ?? 0);
  const totalBorrowed = (ethPos?.debt ?? 0)       + (basePos?.debt ?? 0);
  const netPosition   = totalSupplied - totalBorrowed;

  const positions = [
    ethPos  ? { chain: "Ethereum", pos: ethPos  } : null,
    basePos ? { chain: "Base",     pos: basePos } : null,
  ].filter(Boolean) as { chain: string; pos: AavePosition }[];

  const supplyPositionCount = positions.length;
  const borrowPositionCount = positions.filter(p => p.pos.debt > 0).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Summary bar ── */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#eaeef5", fontFamily: "Inter, sans-serif", letterSpacing: "-0.03em", marginBottom: 14 }}>
          Portfolio
        </h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <SummaryCard
            label="Total Supplied"
            value={loading ? "…" : totalSupplied > 0 ? formatUSD(totalSupplied) : "—"}
            sub="Across Ethereum & Base"
            accent="#86efac"
          />
          <SummaryCard
            label="Total Borrowed"
            value={loading ? "…" : totalBorrowed > 0 ? formatUSD(totalBorrowed) : "—"}
            sub="Outstanding debt"
            accent={totalBorrowed > 0 ? "#fbbf24" : undefined}
          />
          <SummaryCard
            label="Net Position"
            value={loading ? "…" : totalSupplied > 0 ? formatUSD(netPosition) : "—"}
            sub="Supplied − Borrowed"
          />
          <SummaryCard
            label="Protocols"
            value={loading ? "…" : String(positions.length)}
            sub="Aave V3 · Ethereum · Base"
          />
        </div>
      </div>

      {/* ── Lending / Supply positions ── */}
      <div>
        <SectionHeader title="Supply Positions" count={supplyPositionCount} />
        {loading ? (
          <div style={{
            background: "#0e1419", border: "1px solid rgba(67,72,78,0.3)",
            borderRadius: 12, padding: "32px 24px", textAlign: "center",
            fontSize: 12, color: "#a7abb2", fontFamily: "Inter, sans-serif",
          }}>
            Fetching positions from Ethereum &amp; Base…
          </div>
        ) : positions.length === 0 ? (
          <EmptyState
            title="No supply positions"
            sub="Earn yield by supplying assets to lending protocols"
            action="Explore Lending"
            onAction={() => navigate("/trade")}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {positions.map(({ chain, pos }) => (
              <AavePositionCard key={chain} chain={chain} position={pos} onAction={() => navigate("/trade")} />
            ))}
          </div>
        )}
      </div>

      {/* ── Borrow positions ── */}
      <div>
        <SectionHeader title="Borrow Positions" count={borrowPositionCount} />
        {loading ? null : borrowPositionCount === 0 ? (
          <EmptyState
            title="No borrow positions"
            sub="Use your assets as collateral to borrow other tokens"
            action="Start Borrowing"
            onAction={() => navigate("/trade")}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {positions.filter(p => p.pos.debt > 0).map(({ chain, pos }) => (
              <div key={chain} style={{
                background: "#0e1419", border: "1px solid rgba(251,191,36,0.2)",
                borderRadius: 12, padding: "16px 18px",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#eaeef5", fontFamily: "Inter, sans-serif" }}>
                    Aave V3 · {chain}
                  </div>
                  <HealthBadge value={pos.healthFactor} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ background: "#141a20", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, color: "#a7abb2", fontFamily: "Inter, sans-serif", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Debt</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fbbf24", fontFamily: "Inter, sans-serif" }}>{formatUSD(pos.debt)}</div>
                  </div>
                  <div style={{ background: "#141a20", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, color: "#a7abb2", fontFamily: "Inter, sans-serif", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Collateral</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#86efac", fontFamily: "Inter, sans-serif" }}>{formatUSD(pos.collateral)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Vault positions (placeholder for future integration) ── */}
      <div>
        <SectionHeader title="Vault Positions" count={0} />
        <EmptyState
          title="No vault positions"
          sub="Deposit into curated vaults for optimized yield strategies"
          action="Browse Vaults"
          onAction={() => navigate("/trade")}
        />
      </div>

    </div>
  );
}
