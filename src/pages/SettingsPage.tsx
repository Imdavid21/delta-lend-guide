import { useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useAppKit } from "@reown/appkit/react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: "#a7abb2", marginBottom: 12,
        textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "Inter, sans-serif",
      }}>
        {title}
      </div>
      <div style={{
        background: "#0e1419", border: "1px solid rgba(67,72,78,0.3)",
        borderRadius: 12, overflow: "hidden",
      }}>
        {children}
      </div>
    </div>
  );
}

function SettingRow({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 16px", borderBottom: "1px solid rgba(67,72,78,0.2)",
      gap: 16,
    }}
      className="last-of-type:border-b-0"
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#eaeef5", fontFamily: "Inter, sans-serif" }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "#a7abb2", fontFamily: "Inter, sans-serif", marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function SegmentControl({ options, value, onChange, accent = "#86efac" }: {
  options: string[]; value: string; onChange: (v: string) => void; accent?: string;
}) {
  return (
    <div style={{ display: "flex", gap: 3, background: "#141a20", borderRadius: 8, padding: 3, border: "1px solid rgba(67,72,78,0.3)" }}>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700,
            fontFamily: "Inter, sans-serif",
            background: value === opt ? accent : "transparent",
            color: value === opt ? "#0a0f14" : "#a7abb2",
            transition: "all 150ms",
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { open: openWallet } = useAppKit();

  const [slippage, setSlippage] = useState("0.5");
  const [gasSpeed, setGasSpeed] = useState("Standard");
  const [currency, setCurrency] = useState("USD");
  const [healthAlert, setHealthAlert] = useState("1.3");
  const [rpcUrl, setRpcUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [mcpEndpoint, setMcpEndpoint] = useState("");
  const [apiStatus, setApiStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [apiStatusMsg, setApiStatusMsg] = useState("");

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

  const testApiConnection = async () => {
    setApiStatus("testing");
    setApiStatusMsg("");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/markets?type=lending`, {
        headers: { Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        setApiStatus("ok");
        setApiStatusMsg(`Connected · ${Array.isArray(data) ? data.length : 0} markets loaded`);
      } else {
        setApiStatus("error");
        setApiStatusMsg(`HTTP ${res.status} — check function deployment`);
      }
    } catch (e: any) {
      setApiStatus("error");
      setApiStatusMsg(e.message?.includes("timeout") ? "Timed out" : "Network error — function may not be deployed");
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{
        fontSize: 22, fontWeight: 800, color: "#eaeef5", fontFamily: "Inter, sans-serif",
        letterSpacing: "-0.03em", marginBottom: 24,
      }}>
        Settings
      </h1>

      {/* Wallet */}
      <Section title="Wallet">
        {isConnected && address ? (
          <>
            <SettingRow label="Connected Address" sub="Your active wallet">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#86efac", boxShadow: "0 0 6px rgba(0,255,157,0.5)" }} />
                <span style={{ fontFamily: "monospace", fontSize: 12, color: "#eaeef5" }}>
                  {address.slice(0, 6)}…{address.slice(-4)}
                </span>
              </div>
            </SettingRow>
            <SettingRow label="Manage Wallet" sub="View accounts, switch chains, or disconnect">
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => openWallet()} style={{
                  padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(67,72,78,0.4)",
                  background: "transparent", color: "#eaeef5", fontSize: 11, fontWeight: 700,
                  cursor: "pointer", fontFamily: "Inter, sans-serif",
                }}>
                  Manage
                </button>
                <button onClick={() => disconnect()} style={{
                  padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(239,68,68,0.3)",
                  background: "rgba(239,68,68,0.06)", color: "#ef4444", fontSize: 11, fontWeight: 700,
                  cursor: "pointer", fontFamily: "Inter, sans-serif",
                }}>
                  Disconnect
                </button>
              </div>
            </SettingRow>
          </>
        ) : (
          <SettingRow label="No wallet connected" sub="Connect to view positions and execute transactions">
            <button onClick={() => openWallet()} style={{
              padding: "7px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer",
              background: "rgba(255,255,255,0.08)", color: "#eaeef5", fontSize: 12, fontWeight: 800,
              fontFamily: "Inter, sans-serif",
            }}>
              Connect Wallet
            </button>
          </SettingRow>
        )}
      </Section>

      {/* Transaction */}
      <Section title="Transaction Defaults">
        <SettingRow label="Slippage Tolerance" sub="Maximum price movement accepted on execution">
          <SegmentControl options={["0.1%", "0.5%", "1.0%"]} value={slippage + "%"} onChange={v => setSlippage(v.replace("%", ""))} />
        </SettingRow>
        <SettingRow label="Gas Speed" sub="Higher speed = higher gas cost">
          <SegmentControl options={["Standard", "Fast", "Instant"]} value={gasSpeed} onChange={setGasSpeed} accent="#86efac" />
        </SettingRow>
      </Section>

      {/* Display */}
      <Section title="Display">
        <SettingRow label="Currency" sub="Used for USD-equivalent values">
          <SegmentControl options={["USD", "ETH", "BTC"]} value={currency} onChange={setCurrency} accent="#78dfff" />
        </SettingRow>
      </Section>

      {/* Risk alerts */}
      <Section title="Risk Alerts">
        <SettingRow label="Health Factor Alert Threshold" sub="Warn when borrow health factor drops below this value">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="number" min={1.0} max={3.0} step={0.1} value={healthAlert}
              onChange={e => setHealthAlert(e.target.value)}
              style={{
                width: 64, background: "#141a20", border: "1px solid rgba(67,72,78,0.4)",
                borderRadius: 7, padding: "4px 8px", color: "#eaeef5", fontSize: 12,
                fontFamily: "Inter, sans-serif", outline: "none", textAlign: "center",
              }}
            />
            <span style={{ fontSize: 11, color: "#a7abb2", fontFamily: "Inter, sans-serif" }}>HF</span>
          </div>
        </SettingRow>
        <SettingRow label="APY Drop Alert" sub="Notify when a deposited market's APY drops significantly">
          <SegmentControl options={["Off", "On"]} value="Off" onChange={() => {}} accent="#f59e0b" />
        </SettingRow>
      </Section>

      {/* API Configuration */}
      <Section title="API Configuration">
        <SettingRow label="Custom RPC URL" sub="Override default RPC endpoint for on-chain calls">
          <input
            type="text"
            value={rpcUrl}
            onChange={e => setRpcUrl(e.target.value)}
            placeholder="https://mainnet.infura.io/v3/..."
            style={{
              width: 240, background: "#141a20", border: "1px solid rgba(67,72,78,0.4)",
              borderRadius: 7, padding: "5px 9px", color: "#eaeef5", fontSize: 11,
              fontFamily: "monospace", outline: "none",
            }}
          />
        </SettingRow>
        <SettingRow label="API Key" sub="Optional key for higher rate limits on data providers">
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-..."
            style={{
              width: 160, background: "#141a20", border: "1px solid rgba(67,72,78,0.4)",
              borderRadius: 7, padding: "5px 9px", color: "#eaeef5", fontSize: 11,
              fontFamily: "monospace", outline: "none",
            }}
          />
        </SettingRow>
      </Section>

      {/* API & AI */}
      <Section title="API & AI Connection">
        <SettingRow label="Markets API" sub="Live market data from 1Delta and Morpho">
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {apiStatus !== "idle" && (
              <span style={{
                fontSize: 10, fontWeight: 600, fontFamily: "Inter, sans-serif",
                color: apiStatus === "ok" ? "#86efac" : apiStatus === "testing" ? "#a7abb2" : "#ef4444",
              }}>
                {apiStatus === "testing" ? "Testing…" : apiStatusMsg}
              </span>
            )}
            <button
              onClick={testApiConnection}
              disabled={apiStatus === "testing"}
              style={{
                padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(67,72,78,0.4)",
                background: "transparent", color: apiStatus === "ok" ? "#86efac" : "#eaeef5", fontSize: 11, fontWeight: 700,
                cursor: apiStatus === "testing" ? "default" : "pointer", fontFamily: "Inter, sans-serif",
              }}
            >
              {apiStatus === "ok" ? "✓ Online" : "Test Connection"}
            </button>
          </div>
        </SettingRow>
        <SettingRow label="AI Tools" sub="Tools available to the AI assistant">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {["search_markets", "get_user_positions", "get_deposit_calldata", "get_borrow_calldata", "vault_deposit", "resolve_ens_name"].map(tool => (
              <span key={tool} style={{
                fontSize: 10, fontWeight: 600, color: "#a7abb2",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(67,72,78,0.3)",
                borderRadius: 4, padding: "2px 7px", fontFamily: "monospace",
              }}>
                {tool}
              </span>
            ))}
          </div>
        </SettingRow>
      </Section>

      {/* About */}
      <Section title="About">
        <SettingRow label="Nebula" sub="DeFi intelligence terminal — v0.1.0">
          <span style={{ fontSize: 10, color: "rgba(167,171,178,0.5)", fontFamily: "Inter, sans-serif" }}>
            Built on Ethereum & Base
          </span>
        </SettingRow>
        <SettingRow label="Data Sources" sub="Market data refreshed every 60 seconds">
          <span style={{ fontSize: 10, color: "rgba(167,171,178,0.5)", fontFamily: "Inter, sans-serif" }}>
            1Delta · Morpho · Euler
          </span>
        </SettingRow>
      </Section>
    </div>
  );
}
