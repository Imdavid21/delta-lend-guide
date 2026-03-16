const G = "#00FF9D";
const border = "rgba(67,72,78,0.3)";
const subtle = "rgba(67,72,78,0.15)";

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 14, fontWeight: 800, color: "#eaeef5", fontFamily: "Inter, sans-serif", letterSpacing: "-0.02em", margin: "0 0 12px" }}>
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 13, color: "#a7abb2", fontFamily: "Inter, sans-serif", lineHeight: 1.65, margin: "0 0 8px" }}>
      {children}
    </p>
  );
}

function Chip({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <span style={{
      display: "inline-block", fontSize: 11, fontWeight: 700,
      color: accent ?? G, background: accent ? `${accent}18` : "rgba(0,255,157,0.08)",
      border: `1px solid ${accent ? `${accent}30` : "rgba(0,255,157,0.2)"}`,
      borderRadius: 6, padding: "2px 8px", fontFamily: "Inter, sans-serif",
      marginRight: 4, marginBottom: 4,
    }}>
      {children}
    </span>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#0e1419", border: `1px solid ${border}`, borderRadius: 12, padding: "20px 22px" }}>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", borderBottom: `1px solid ${subtle}` }}>
      <span style={{ fontSize: 12, color: "#a7abb2", fontFamily: "Inter, sans-serif" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#eaeef5", fontFamily: "Inter, sans-serif" }}>{value}</span>
    </div>
  );
}

function CommandRow({ cmd, desc }: { cmd: string; desc: string }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 0", borderBottom: `1px solid ${subtle}` }}>
      <code style={{ fontSize: 11, fontWeight: 700, color: G, background: "rgba(0,255,157,0.07)", borderRadius: 5, padding: "2px 8px", fontFamily: "monospace", flexShrink: 0 }}>
        {cmd}
      </code>
      <span style={{ fontSize: 12, color: "#a7abb2", fontFamily: "Inter, sans-serif", lineHeight: 1.5 }}>{desc}</span>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Hero */}
      <div style={{ paddingBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" fill={G} />
            <path d="M14 5L15.5 11.5L22 14L15.5 16.5L14 23L12.5 16.5L6 14L12.5 11.5L14 5Z" fill="#004527" fillRule="evenodd" />
          </svg>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#eaeef5", fontFamily: "Inter, sans-serif", letterSpacing: "-0.04em", margin: 0 }}>
            Nebula Docs
          </h1>
        </div>
        <P>DeFi lending intelligence — find the best yields, execute on-chain, and manage positions across 30+ EVM chains.</P>
      </div>

      {/* What is Nebula */}
      <Card>
        <H2>What is Nebula?</H2>
        <P>
          Nebula is a DeFi aggregator for lending and borrowing across 30+ EVM chains. It queries live data from every major protocol, ranks markets by yield, and lets you execute deposits, borrows, withdrawals, and repayments directly from the interface — either through the Trade panel or the AI chat.
        </P>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
          <Chip>Aave V3</Chip><Chip>Compound V3</Chip><Chip>Morpho Blue</Chip><Chip>Spark</Chip>
          <Chip>Moonwell</Chip><Chip>Seamless</Chip><Chip>Silo</Chip><Chip>Euler</Chip><Chip>Granary</Chip>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
          <Chip accent="#a78bfa">Ethereum</Chip><Chip accent="#a78bfa">Base</Chip><Chip accent="#a78bfa">Arbitrum</Chip>
          <Chip accent="#a78bfa">Optimism</Chip><Chip accent="#a78bfa">Polygon</Chip><Chip accent="#a78bfa">BSC</Chip>
          <Chip accent="#a78bfa">Avalanche</Chip><Chip accent="#a78bfa">Linea</Chip><Chip accent="#a78bfa">Scroll</Chip>
          <Chip accent="#a78bfa">Blast</Chip><Chip accent="#a78bfa">Mantle</Chip><Chip accent="#a78bfa">Berachain</Chip>
          <Chip accent="#a78bfa">+20 more</Chip>
        </div>
      </Card>

      {/* Pages */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        <Card>
          <H2>📈 Trade</H2>
          <P>Execute lend and borrow operations in one place.</P>
          <Row label="Lend → Lending" value="Deposit into a lending pool" />
          <Row label="Lend → Vault" value="Deposit into a curated vault (Morpho, Euler)" />
          <Row label="Borrow" value="Borrow against your collateral" />
          <Row label="Routes" value="Auto-sorted by best APY / lowest APR" />
          <Row label="Filters" value="Protocol, chain, min TVL" />
          <div style={{ marginTop: 10 }}>
            <P>Connect wallet → pick asset → enter amount → select route → click Execute. The AI prepares the transaction calldata and sends it to your wallet.</P>
          </div>
        </Card>

        <Card>
          <H2>📊 Markets</H2>
          <P>Browse all lending pools and vaults live.</P>
          <Row label="Lending table" value="Supply APY, borrow APR, TVL, utilization" />
          <Row label="Vaults table" value="Vault APY, TVL, curator (Gauntlet, Steakhouse…)" />
          <Row label="Refresh" value="Every 60 seconds" />
          <Row label="Min TVL" value="$10M (vaults), $10K (lending)" />
          <div style={{ marginTop: 10 }}>
            <P>Click any market row or click the market card in chat to pre-fill the Trade panel.</P>
          </div>
        </Card>

        <Card>
          <H2>👛 Portfolio</H2>
          <P>Live view of all your open positions.</P>
          <Row label="Protocols scanned" value="9+ protocols" />
          <Row label="Chains" value="30+ EVM chains" />
          <Row label="Shows" value="Supply APY, borrow APR, health factor" />
          <Row label="Net APY" value="Weighted avg across all positions" />
          <Row label="Refresh" value="Every 30 seconds" />
          <div style={{ marginTop: 10 }}>
            <P>Requires a connected wallet. Data is pulled from the 1delta aggregator API.</P>
          </div>
        </Card>

        <Card>
          <H2>⚙️ Settings</H2>
          <P>Adjust execution preferences.</P>
          <Row label="Slippage" value="Default 0.5%" />
          <Row label="MEV Protection" value="Toggle on/off" />
          <Row label="Theme" value="Dark / Light" />
        </Card>

      </div>

      {/* AI Chat */}
      <Card>
        <H2>🤖 AI Chat — Ask AI</H2>
        <P>
          The AI (GPT-4o) has real-time access to all market data and can prepare transactions for you. Open it with the <strong style={{ color: G }}>Ask AI</strong> button in the header.
        </P>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 4 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#a7abb2", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontFamily: "Inter, sans-serif" }}>
              Informational
            </div>
            <CommandRow cmd="best USDC yield" desc="Top USDC markets across all protocols and chains" />
            <CommandRow cmd="ETH lending rates" desc="Current supply APY for ETH on Ethereum and Base" />
            <CommandRow cmd="compare Aave vs Morpho" desc="Side-by-side yield comparison" />
            <CommandRow cmd="vitalik.eth positions" desc="Fetch any ENS name or 0x address's positions (public data)" />
            <CommandRow cmd="looping strategies" desc="Best recursive yield opportunities right now" />
            <CommandRow cmd="what chains are supported" desc="List all supported chains and protocols" />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#a7abb2", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8, fontFamily: "Inter, sans-serif" }}>
              Execution (wallet required)
            </div>
            <CommandRow cmd="deposit 1000 USDC" desc="Auto-selects best yield, builds and sends transaction" />
            <CommandRow cmd="deposit ETH" desc="Finds best ETH market, asks for amount" />
            <CommandRow cmd="borrow 500 USDC" desc="Picks lowest borrow APR, prepares calldata" />
            <CommandRow cmd="withdraw my USDC" desc="Fetches positions first, then withdraws" />
            <CommandRow cmd="repay USDC debt" desc="Repays outstanding borrow on best terms" />
            <CommandRow cmd="open 2x ETH loop" desc="Flash loan leverage: deposit wstETH, borrow USDC" />
          </div>
        </div>

        <div style={{ marginTop: 16, padding: "12px 14px", background: "rgba(0,255,157,0.04)", border: "1px solid rgba(0,255,157,0.12)", borderRadius: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: G, fontFamily: "Inter, sans-serif", marginBottom: 4 }}>Tips</div>
          <P>You don't need to specify a protocol or chain — the AI picks the best option and tells you which one it chose. After showing your positions, it always suggests top USDC and ETH opportunities automatically.</P>
        </div>
      </Card>

      {/* Execution flow */}
      <Card>
        <H2>⚡ How Transactions Work</H2>
        <P>All transactions go through the <strong style={{ color: "#eaeef5" }}>1delta aggregator</strong>, which composes calldata for Aave, Compound, Morpho, and others into a single atomic call.</P>
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 8, flexWrap: "wrap" }}>
          {[
            "1. Select market",
            "→ AI builds calldata",
            "→ Review & confirm",
            "→ Wallet signs",
            "→ On-chain",
          ].map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <span style={{
                fontSize: 11, fontWeight: i === 0 ? 700 : 600,
                color: i === 0 ? "#eaeef5" : i === 4 ? G : "#a7abb2",
                fontFamily: "Inter, sans-serif", padding: "4px 0",
              }}>
                {step}
              </span>
              {i < 4 && <span style={{ color: "#3a4048", margin: "0 6px", fontSize: 11 }}></span>}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <Row label="ERC20 tokens" value="Approve + action (2 txs)" />
          <Row label="Native ETH" value="Single transaction" />
          <Row label="Vault deposits" value="ERC4626 approve + deposit" />
          <Row label="Leveraged positions" value="Flash loan → borrow → swap → deposit (1 atomic tx)" />
        </div>
      </Card>

      {/* Rates & Data */}
      <Card>
        <H2>📡 Data Sources</H2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <Row label="Lending rates" value="1delta aggregator API" />
            <Row label="Morpho vaults" value="Morpho Blue GraphQL API" />
            <Row label="Asset prices" value="CoinGecko (60s refresh)" />
            <Row label="Market data refresh" value="60 seconds" />
            <Row label="Position data refresh" value="30 seconds" />
          </div>
          <div>
            <Row label="ENS resolution" value="ENS Ideas API" />
            <Row label="Protocol research" value="DeFiLlama" />
            <Row label="Tx simulation" value="1delta simulate=true" />
            <Row label="AI model" value="GPT-4o" />
            <Row label="Context window" value="Last 20 messages" />
          </div>
        </div>
      </Card>

      {/* Footer */}
      <div style={{ textAlign: "center", paddingBottom: 20 }}>
        <span style={{ fontSize: 11, color: "#3a4048", fontFamily: "Inter, sans-serif" }}>
          Nebula · DeFi Intelligence Platform · Powered by 1delta + Morpho + Aave
        </span>
      </div>

    </div>
  );
}
