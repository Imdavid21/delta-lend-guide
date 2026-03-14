import { useState, useMemo, useRef, useEffect } from "react";
import { useAccount } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import {
  ArrowDown, ChevronDown, Clock, Fuel, Info, Lock, Settings,
} from "lucide-react";
import { useMarkets, useVaults, usePendle } from "@/hooks/useMarkets";
import { formatPercent, formatUSD } from "@/lib/marketTypes";
import { AssetIcon, ProtocolIcon, ChainIcon, parseChainFromLabel } from "@/components/icons/MarketIcons";

/* ─── Types ─────────────────────────────────────────────── */

type ExecMode = "lend" | "borrow";
type LendSubMode = "lending" | "vault" | "fixed";

const LEND_SUBMODES: { id: LendSubMode; label: string; btnLabel: string; fromLabel: string; toLabel: string }[] = [
  { id: "lending", label: "Lending",     btnLabel: "Deposit",    fromLabel: "Deposit Asset", toLabel: "You Receive"    },
  { id: "vault",   label: "Vault",       btnLabel: "Deposit",    fromLabel: "Deposit Asset", toLabel: "Vault Strategy" },
  { id: "fixed",   label: "Fixed Yield", btnLabel: "Lock Yield", fromLabel: "Source Asset",  toLabel: "Fixed Token"    },
];

/* ─── Chain config ─────────────────────────────────────── */

interface ChainOption { id: string | null; label: string; color: string; letter: string }
const CHAINS: ChainOption[] = [
  { id: null,         label: "Any Chain", color: "#627EEA", letter: "A" },
  { id: "Ethereum",   label: "Ethereum",  color: "#627EEA", letter: "E" },
  { id: "Base",       label: "Base",      color: "#0052ff", letter: "B" },
];

const GREEN = "#86efac";
const AMBER = "#fbbf24";

interface ExecRoute {
  id: string;
  protocol: string;
  chain: string | null;
  outputLabel: string;
  returnValue: number;
  returnLabel: string;
  tvlLabel: string;
  tvlRaw: number;
  gasEst: string;
  timeEst: string;
}

/* ─── Health Factor Gauge ───────────────────────────────── */

function HealthGauge({ value }: { value: number }) {
  const clamped = Math.max(1.0, Math.min(3.5, value));
  const pct = ((clamped - 1.0) / 2.5) * 100;
  const color = value >= 2.0 ? GREEN : value >= 1.5 ? AMBER : "#ef4444";
  const statusLabel = value >= 2.0 ? "Safe" : value >= 1.5 ? "Caution" : value > 1.0 ? "Danger" : "Liquidation";
  const total = 125.7;
  const fill = (pct / 100) * total;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width="110" height="66" viewBox="0 0 110 66">
        <path d="M10 60 A45 45 0 0 1 100 60" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" strokeLinecap="round"/>
        <path d="M10 60 A45 45 0 0 1 100 60" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${fill} ${total}`}/>
        <text x="55" y="53" textAnchor="middle" fontSize="17" fontWeight="800" fill={color} fontFamily="Inter, sans-serif">
          {value >= 9.99 ? "—" : value.toFixed(2)}
        </text>
        <text x="55" y="64" textAnchor="middle" fontSize="8" fill="#a7abb2" fontFamily="Inter, sans-serif">HEALTH FACTOR</text>
      </svg>
      <span style={{
        fontSize: 9, fontWeight: 800, color, background: `${color}18`,
        borderRadius: 4, padding: "1px 7px", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em",
      }}>
        {statusLabel}
      </span>
    </div>
  );
}

/* ─── Asset Dropdown ────────────────────────────────────── */

function AssetDropdown({ asset, onChange, assets }: {
  asset: string; onChange: (a: string) => void; assets: string[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? assets.filter(a => a.toLowerCase().includes(q)) : assets;
  }, [assets, search]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(""); }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "#141a20", border: "1px solid rgba(67,72,78,0.4)",
          borderRadius: 10, padding: "7px 10px", cursor: "pointer",
          color: "#eaeef5", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700,
          transition: "border-color 150ms", minWidth: 100,
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(67,72,78,0.4)")}
      >
        <AssetIcon symbol={asset} size={16} />
        <span style={{ flex: 1 }}>{asset || "Select"}</span>
        <ChevronDown size={11} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0,
          background: "#0e1419", border: "1px solid rgba(67,72,78,0.4)",
          borderRadius: 12, zIndex: 200, minWidth: 170,
          boxShadow: "0 16px 40px rgba(0,0,0,0.6)", overflow: "hidden",
        }}>
          <div style={{ padding: "8px 8px 4px" }}>
            <input
              autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search assets..."
              style={{
                width: "100%", background: "#141a20", border: "1px solid rgba(67,72,78,0.3)",
                borderRadius: 7, padding: "5px 9px", color: "#eaeef5", fontSize: 12,
                fontFamily: "Inter, sans-serif", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtered.length > 0 ? filtered.map(a => (
              <button
                key={a}
                onClick={() => { onChange(a); setOpen(false); setSearch(""); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "8px 12px",
                  background: a === asset ? "rgba(255,255,255,0.05)" : "transparent",
                  border: "none", cursor: "pointer", color: "#eaeef5",
                  fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, textAlign: "left",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                onMouseLeave={e => (e.currentTarget.style.background = a === asset ? "rgba(255,255,255,0.05)" : "transparent")}
              >
                <AssetIcon symbol={a} size={16} />
                {a}
                {a === asset && <span style={{ marginLeft: "auto", color: GREEN, fontSize: 10 }}>✓</span>}
              </button>
            )) : (
              <div style={{ padding: 12, color: "#a7abb2", fontSize: 11, textAlign: "center" }}>No assets found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Route Card ────────────────────────────────────────── */

function RouteCard({ route, selected, onSelect, isBest, accent }: {
  route: ExecRoute; selected: boolean; onSelect: () => void; isBest: boolean; accent: string;
}) {
  const { name: protoDisplay } = parseChainFromLabel(route.protocol);

  return (
    <div
      onClick={onSelect}
      style={{
        border: selected ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(67,72,78,0.3)",
        borderRadius: 12, padding: "14px 16px", cursor: "pointer",
        background: selected ? "rgba(255,255,255,0.04)" : "#0e1419",
        transition: "all 150ms ease", position: "relative",
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(67,72,78,0.3)"; }}
    >
      {isBest && (
        <div style={{
          position: "absolute", top: -1, left: 14, fontSize: 9, fontWeight: 800,
          color: "#0a0f14", background: "#eaeef5", borderRadius: "0 0 6px 6px",
          padding: "1px 8px", letterSpacing: "0.08em",
          fontFamily: "Inter, sans-serif", textTransform: "uppercase",
        }}>
          Best Route
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: isBest ? 6 : 0 }}>
        <div style={{
          width: 34, height: 34, borderRadius: "50%", background: "#141a20",
          border: "1px solid rgba(67,72,78,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <ProtocolIcon name={protoDisplay} size={18} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#eaeef5", fontFamily: "Inter, sans-serif" }}>
                {protoDisplay}
              </span>
              {route.chain && (
                <span style={{ marginLeft: 5, fontSize: 10, color: "#a7abb2", fontFamily: "Inter, sans-serif" }}>
                  · {route.chain}
                </span>
              )}
            </div>
            <div style={{
              fontSize: 17, fontWeight: 800,
              color: selected ? accent : "#eaeef5",
              fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
              fontFamily: "Inter, sans-serif", flexShrink: 0,
            }}>
              {route.returnLabel}
            </div>
          </div>

          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: "#a7abb2", fontFamily: "Inter, sans-serif" }}>
              {route.outputLabel}
            </span>
            <span style={{ fontSize: 10, color: "rgba(167,171,178,0.35)" }}>·</span>
            <span style={{ fontSize: 10, color: "#a7abb2", fontFamily: "Inter, sans-serif" }}>
              {route.tvlLabel}
            </span>
          </div>

          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#a7abb2", fontSize: 10, fontFamily: "Inter, sans-serif" }}>
              <Fuel size={11} /> {route.gasEst}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#a7abb2", fontSize: 10, fontFamily: "Inter, sans-serif" }}>
              <Clock size={11} /> {route.timeEst}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Field Row ─────────────────────────────────────────── */

function FieldRow({ label, value, accent, tooltip }: { label: string; value: string; accent?: string; tooltip?: string }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "6px 0", borderBottom: "1px solid rgba(67,72,78,0.12)",
    }}>
      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#a7abb2", fontFamily: "Inter, sans-serif" }}>
        {label}
        {tooltip && <span title={tooltip} style={{ opacity: 0.5, cursor: "help" }}><Info size={11} /></span>}
      </span>
      <span style={{ fontSize: 11, fontWeight: 700, color: accent ?? "#eaeef5", fontFamily: "Inter, sans-serif" }}>
        {value}
      </span>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────── */

export default function ExecutionPanel() {
  const { isConnected } = useAccount();
  const { open: openWallet } = useAppKit();
  const { data: markets } = useMarkets();
  const { data: vaults } = useVaults();
  const { data: pendle } = usePendle();

  const [mode, setMode] = useState<ExecMode>("lend");
  const [lendSubMode, setLendSubMode] = useState<LendSubMode>("lending");
  const [amount, setAmount] = useState("");
  const [fromAsset, setFromAsset] = useState("USDC");
  const [toAsset, setToAsset] = useState("USDC");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [slippage, setSlippage] = useState("0.5");
  const [chainId, setChainId] = useState<string | null>(null); // null = Any Chain
  const [showChainPicker, setShowChainPicker] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const chainRef = useRef<HTMLDivElement>(null);

  const selectedChain = CHAINS.find(c => c.id === chainId) ?? CHAINS[0];

  const subCfg = LEND_SUBMODES.find(s => s.id === lendSubMode)!;
  const accent = mode === "borrow" ? AMBER : GREEN;

  // Button label + "from/to" labels
  const fromLabel = mode === "borrow" ? "Collateral" : subCfg.fromLabel;
  const toLabel   = mode === "borrow" ? "Borrow Asset" : subCfg.toLabel;
  const execBtnLabel = mode === "borrow" ? "Borrow" : subCfg.btnLabel;

  // Reset route selection when mode/submode/asset/chain changes
  useEffect(() => { setSelectedRouteId(null); }, [mode, lendSubMode, fromAsset, toAsset, chainId]);

  // Close popovers on outside click
  useEffect(() => {
    if (!showSettings && !showChainPicker) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setShowSettings(false);
      if (chainRef.current && !chainRef.current.contains(e.target as Node)) setShowChainPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSettings, showChainPicker]);

  // ── Asset lists ──────────────────────────────────────────
  const lendingAssets = useMemo(() => [...new Set((markets ?? []).map(m => m.asset))].sort(), [markets]);
  const vaultAssets   = useMemo(() => [...new Set((vaults  ?? []).map(v => v.asset))].sort(), [vaults]);
  const pendleAssets  = useMemo(() => [...new Set((pendle  ?? []).map(p => p.asset))].sort(), [pendle]);
  const borrowableAssets = useMemo(() =>
    [...new Set((markets ?? []).filter(m => m.borrowAPR != null && m.borrowAPR > 0).map(m => m.asset))].sort(),
  [markets]);

  const fromAssets = useMemo(() => {
    const fallback = ["USDC", "ETH", "WBTC", "USDT"];
    if (mode === "lend") {
      if (lendSubMode === "vault")  return vaultAssets.length  ? vaultAssets  : fallback;
      if (lendSubMode === "fixed")  return pendleAssets.length ? pendleAssets : ["USDe", "USDC", "ETH"];
      return lendingAssets.length ? lendingAssets : fallback;
    }
    return lendingAssets.length ? lendingAssets : fallback;
  }, [mode, lendSubMode, lendingAssets, vaultAssets, pendleAssets]);

  const validFromAsset = fromAssets.includes(fromAsset) ? fromAsset : (fromAssets[0] ?? "USDC");

  // ── Routes ───────────────────────────────────────────────
  const routes = useMemo((): ExecRoute[] => {
    const asset = validFromAsset;

    if (mode === "borrow") {
      return (markets ?? [])
        .filter(m => m.asset === toAsset && m.borrowAPR != null && m.borrowAPR > 0)
        .sort((a, b) => (a.borrowAPR ?? 999) - (b.borrowAPR ?? 999))
        .slice(0, 6)
        .map(m => {
          const { chain } = parseChainFromLabel(m.protocolName);
          return {
            id: m.id, protocol: m.protocolName, chain,
            outputLabel: `${m.asset} variable debt`,
            returnValue: m.borrowAPR!,
            returnLabel: formatPercent(m.borrowAPR) + " APR",
            tvlLabel: formatUSD(m.availableLiquidityUSD) + " available",
            tvlRaw: m.availableLiquidityUSD,
            gasEst: "<$0.01", timeEst: "~20s",
          };
        });
    }

    // lend mode — differentiate by sub-mode
    if (lendSubMode === "lending") {
      return (markets ?? [])
        .filter(m => m.asset === asset && m.supplyAPY > 0)
        .sort((a, b) => b.supplyAPY - a.supplyAPY)
        .slice(0, 6)
        .map(m => {
          const { chain } = parseChainFromLabel(m.protocolName);
          const prefix = m.protocol.startsWith("AAVE") ? "a" : m.protocol.startsWith("COMPOUND") ? "c" : "";
          return {
            id: m.id, protocol: m.protocolName, chain,
            outputLabel: `${prefix}${m.asset} — receipt token`,
            returnValue: m.supplyAPY,
            returnLabel: formatPercent(m.supplyAPY) + " APY",
            tvlLabel: formatUSD(m.totalSupplyUSD) + " TVL",
            tvlRaw: m.totalSupplyUSD,
            gasEst: "<$0.01", timeEst: "~15s",
          };
        });
    }

    if (lendSubMode === "vault") {
      return (vaults ?? [])
        .filter(v => v.asset === asset && v.apy > 0)
        .sort((a, b) => b.apy - a.apy)
        .slice(0, 6)
        .map(v => {
          const { name: vaultDisplay, chain } = parseChainFromLabel(v.name);
          return {
            id: v.id, protocol: v.protocol, chain,
            outputLabel: vaultDisplay,
            returnValue: v.apy,
            returnLabel: formatPercent(v.apy) + " APY",
            tvlLabel: formatUSD(v.tvl) + " TVL",
            tvlRaw: v.tvl,
            gasEst: "<$0.01", timeEst: "~15s",
          };
        });
    }

    // fixed
    return (pendle ?? [])
      .filter(p => p.asset === asset || p.name.toLowerCase().includes(asset.toLowerCase()))
      .sort((a, b) => b.impliedAPY - a.impliedAPY)
      .slice(0, 6)
      .map(p => {
        const { chain } = parseChainFromLabel(p.name);
        return {
          id: p.id, protocol: "Pendle", chain,
          outputLabel: `PT-${p.asset} · ${p.daysToMaturity}d maturity`,
          returnValue: p.impliedAPY,
          returnLabel: formatPercent(p.impliedAPY) + " Fixed APY",
          tvlLabel: formatUSD(p.tvl) + " TVL",
          tvlRaw: p.tvl,
          gasEst: "<$0.01", timeEst: "~15s",
        };
      });
  }, [mode, lendSubMode, validFromAsset, toAsset, markets, vaults, pendle]);

  // Filter routes by selected chain (null route.chain = Ethereum mainnet)
  const filteredRoutes = useMemo(() => {
    if (!chainId) return routes; // Any Chain — show all
    return routes.filter(r => {
      const routeChain = r.chain ?? "Ethereum";
      return routeChain === chainId;
    });
  }, [routes, chainId]);

  const selectedRoute = filteredRoutes.find(r => r.id === selectedRouteId) ?? filteredRoutes[0] ?? null;

  // ── Borrow calculations ──────────────────────────────────
  const amountNum = parseFloat(amount) || 0;
  const COLLATERAL_PRICES: Record<string, number> = {
    ETH: 3000, WETH: 3000, WBTC: 65000, USDC: 1, USDT: 1, DAI: 1, wstETH: 3300,
  };
  const LTV_RATIOS: Record<string, number> = {
    ETH: 0.80, WETH: 0.80, WBTC: 0.75, USDC: 0.87, USDT: 0.87, DAI: 0.87, wstETH: 0.78,
  };
  const collateralPrice = COLLATERAL_PRICES[validFromAsset] ?? 1;
  const ltv = LTV_RATIOS[validFromAsset] ?? 0.75;
  const maxBorrow = amountNum * collateralPrice * ltv;
  const healthFactor = amountNum > 0 && selectedRoute
    ? (amountNum * collateralPrice * ltv) / Math.min(amountNum * collateralPrice * ltv * 0.8, amountNum)
    : 9.99;
  const liquidationPrice = amountNum > 0 && selectedRoute
    ? (amountNum * 0.5) / (amountNum * ltv)
    : 0;

  // ── Button state ─────────────────────────────────────────
  type BtnState = "connect" | "enter" | "exec";
  const btnState: BtnState = !isConnected ? "connect" : !amountNum ? "enter" : "exec";
  const btnLabels: Record<BtnState, string> = {
    connect: "Connect Wallet",
    enter:   "Enter Amount",
    exec:    execBtnLabel,
  };
  const btnDisabled = btnState === "enter";

  const handleButton = () => {
    if (btnState === "connect") openWallet();
  };

  const inputBg = "#141a20";
  const sectionBorder = "1px solid rgba(67,72,78,0.25)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* ── Mode tabs ── */}
      <div style={{ display: "flex", gap: 4 }}>
        {(["lend", "borrow"] as ExecMode[]).map(m => {
          const active = mode === m;
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: "6px 20px", borderRadius: 8,
                border: active ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(67,72,78,0.3)",
                background: active ? "rgba(255,255,255,0.07)" : "transparent",
                color: active ? "#eaeef5" : "#a7abb2",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                fontFamily: "Inter, sans-serif", letterSpacing: "-0.01em",
                transition: "all 150ms ease",
              }}
            >
              {m === "lend" ? "Lend" : "Borrow"}
            </button>
          );
        })}
      </div>

      {/* ── Two-panel layout ── */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>

        {/* ═══ LEFT PANEL ═══ */}
        <div style={{
          background: "#0e1419", border: "1px solid rgba(67,72,78,0.3)",
          borderRadius: 16, padding: 16, width: 370, flexShrink: 0, minWidth: 300,
        }}>
          {/* Panel header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            {/* Lend sub-mode tabs */}
            {mode === "lend" ? (
              <div style={{ display: "flex", gap: 2, background: "#141a20", borderRadius: 8, padding: 2, border: "1px solid rgba(67,72,78,0.3)" }}>
                {LEND_SUBMODES.map(s => {
                  const active = lendSubMode === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setLendSubMode(s.id)}
                      style={{
                        padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                        fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700,
                        background: active ? "#1f262e" : "transparent",
                        color: active ? "#eaeef5" : "#a7abb2",
                        transition: "all 150ms",
                      }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <span style={{ fontSize: 13, fontWeight: 700, color: "#eaeef5", fontFamily: "Inter, sans-serif" }}>
                Borrow
              </span>
            )}

            {/* Settings gear + popover */}
            <div ref={settingsRef} style={{ position: "relative" }}>
              <button
                onClick={() => setShowSettings(p => !p)}
                title="Transaction settings"
                style={{
                  width: 30, height: 30, borderRadius: 8,
                  border: showSettings ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(67,72,78,0.3)",
                  background: showSettings ? "rgba(255,255,255,0.05)" : "transparent",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#a7abb2", transition: "all 150ms",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "#eaeef5"; }}
                onMouseLeave={e => {
                  if (!showSettings) { e.currentTarget.style.borderColor = "rgba(67,72,78,0.3)"; e.currentTarget.style.color = "#a7abb2"; }
                }}
              >
                <Settings size={14} />
              </button>

              {showSettings && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", right: 0,
                  background: "#0e1419", border: "1px solid rgba(67,72,78,0.4)",
                  borderRadius: 12, padding: 14, zIndex: 300, width: 220,
                  boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#a7abb2", marginBottom: 10, fontFamily: "Inter, sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Transaction Settings
                  </div>
                  <div style={{ fontSize: 11, color: "#a7abb2", marginBottom: 6, fontFamily: "Inter, sans-serif" }}>Slippage Tolerance</div>
                  <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                    {["0.1", "0.5", "1.0"].map(s => (
                      <button key={s} onClick={() => setSlippage(s)} style={{
                        flex: 1, padding: "5px 0", borderRadius: 6, fontSize: 11, fontWeight: 700,
                        border: slippage === s ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(67,72,78,0.3)",
                        background: slippage === s ? "rgba(255,255,255,0.07)" : "transparent",
                        color: slippage === s ? "#eaeef5" : "#a7abb2",
                        cursor: "pointer", fontFamily: "Inter, sans-serif",
                      }}>{s}%</button>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: "#a7abb2", marginBottom: 6, fontFamily: "Inter, sans-serif" }}>MEV Protection</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {["Off", "On"].map(v => (
                      <button key={v} style={{
                        flex: 1, padding: "5px 0", borderRadius: 6, fontSize: 11, fontWeight: 700,
                        border: v === "Off" ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(67,72,78,0.3)",
                        background: v === "Off" ? "rgba(255,255,255,0.07)" : "transparent",
                        color: v === "Off" ? "#eaeef5" : "#a7abb2",
                        cursor: "pointer", fontFamily: "Inter, sans-serif",
                      }}>{v}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* FROM section */}
          <div style={{ background: inputBg, borderRadius: 12, padding: 12, marginBottom: 4, border: sectionBorder }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: "#a7abb2", marginBottom: 8,
              fontFamily: "Inter, sans-serif", textTransform: "uppercase", letterSpacing: "0.1em",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span>{fromLabel}</span>
              {mode === "borrow" && (
                <span style={{ display: "flex", alignItems: "center", gap: 3, color: AMBER, fontSize: 9 }}>
                  <Lock size={9} /> Locked as collateral
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <AssetDropdown
                asset={validFromAsset}
                onChange={a => setFromAsset(a)}
                assets={fromAssets}
              />
              {/* Chain picker */}
              <div ref={chainRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setShowChainPicker(p => !p)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: showChainPicker ? "rgba(255,255,255,0.06)" : "#0a0f14",
                    border: showChainPicker ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(67,72,78,0.3)",
                    borderRadius: 8, padding: "5px 9px", fontSize: 11, fontWeight: 600,
                    color: "#eaeef5", fontFamily: "Inter, sans-serif", cursor: "pointer",
                    transition: "all 150ms",
                  }}
                  onMouseEnter={e => { if (!showChainPicker) e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
                  onMouseLeave={e => { if (!showChainPicker) e.currentTarget.style.borderColor = "rgba(67,72,78,0.3)"; }}
                >
                  {chainId ? (
                    <ChainIcon chainName={chainId} size={13} />
                  ) : (
                    <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#627EEA", fontSize: 7, color: "#fff", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>A</div>
                  )}
                  {selectedChain.label}
                  <ChevronDown size={9} />
                </button>

                {showChainPicker && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 4px)", right: 0,
                    background: "#0e1419", border: "1px solid rgba(67,72,78,0.4)",
                    borderRadius: 10, zIndex: 300, minWidth: 150,
                    boxShadow: "0 16px 40px rgba(0,0,0,0.6)", overflow: "hidden",
                    padding: 4,
                  }}>
                    {CHAINS.map(c => {
                      const active = chainId === c.id;
                      return (
                        <button
                          key={String(c.id)}
                          onClick={() => { setChainId(c.id); setShowChainPicker(false); }}
                          style={{
                            display: "flex", alignItems: "center", gap: 8, width: "100%",
                            padding: "7px 10px", border: "none", borderRadius: 7, cursor: "pointer",
                            background: active ? "rgba(255,255,255,0.07)" : "transparent",
                            color: active ? "#eaeef5" : "#a7abb2",
                            fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, textAlign: "left",
                            transition: "all 120ms",
                          }}
                          onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                          onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                        >
                          {c.id ? (
                            <ChainIcon chainName={c.id} size={15} />
                          ) : (
                            <div style={{ width: 15, height: 15, borderRadius: "50%", background: "#627EEA", fontSize: 7, color: "#fff", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>A</div>
                          )}
                          {c.label}
                          {active && <span style={{ marginLeft: "auto", color: "#86efac", fontSize: 10 }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Amount input */}
            <div style={{ position: "relative" }}>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                style={{
                  width: "100%", background: "transparent", border: "none",
                  fontSize: 28, fontWeight: 800, color: "#eaeef5",
                  fontFamily: "Inter, sans-serif", outline: "none",
                  paddingRight: 52, boxSizing: "border-box", letterSpacing: "-0.03em",
                }}
              />
              <button
                onClick={() => setAmount("1000")}
                style={{
                  position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
                  fontSize: 10, fontWeight: 800, color: "#eaeef5",
                  background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 5,
                  padding: "3px 7px", cursor: "pointer", fontFamily: "Inter, sans-serif",
                }}
              >
                MAX
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
              <span style={{ fontSize: 11, color: "#a7abb2", fontFamily: "Inter, sans-serif" }}>
                ≈ ${amountNum ? amountNum.toLocaleString("en", { maximumFractionDigits: 2 }) : "0.00"}
              </span>
              <span style={{ fontSize: 11, color: "#a7abb2", fontFamily: "Inter, sans-serif" }}>
                Balance: {isConnected ? "—" : <span style={{ color: "rgba(167,171,178,0.4)" }}>Connect wallet</span>}
              </span>
            </div>

            {/* Amount presets */}
            <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
              {["25%", "50%", "75%", "MAX"].map(p => (
                <button
                  key={p}
                  style={{
                    flex: 1, padding: "3px 0", fontSize: 10, fontWeight: 700,
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(67,72,78,0.25)",
                    borderRadius: 6, color: "#a7abb2", cursor: "pointer",
                    fontFamily: "Inter, sans-serif", transition: "all 150ms",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "#eaeef5"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(67,72,78,0.25)"; e.currentTarget.style.color = "#a7abb2"; }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Transform arrow */}
          <div style={{ display: "flex", justifyContent: "center", margin: "6px 0" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "#0a0f14", border: "1px solid rgba(67,72,78,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: mode === "borrow" ? AMBER : "#a7abb2",
            }}>
              {mode === "borrow" ? <Lock size={11} /> : <ArrowDown size={12} />}
            </div>
          </div>

          {/* TO section */}
          <div style={{ background: inputBg, borderRadius: 12, padding: 12, marginBottom: 12, border: sectionBorder }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a7abb2", marginBottom: 8, fontFamily: "Inter, sans-serif", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {toLabel}
            </div>

            {mode === "borrow" ? (
              <AssetDropdown
                asset={toAsset}
                onChange={a => setToAsset(a)}
                assets={borrowableAssets.length ? borrowableAssets : ["USDC", "USDT", "DAI", "ETH"]}
              />
            ) : selectedRoute ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: "50%", background: "#0a0f14",
                  border: "1px solid rgba(67,72,78,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <ProtocolIcon name={selectedRoute.protocol} size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#eaeef5", fontFamily: "Inter, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selectedRoute.outputLabel}
                  </div>
                  <div style={{ fontSize: 10, color: "#a7abb2", fontFamily: "Inter, sans-serif" }}>
                    via {parseChainFromLabel(selectedRoute.protocol).name}
                    {selectedRoute.chain ? ` · ${selectedRoute.chain}` : ""}
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: GREEN, letterSpacing: "-0.02em", fontFamily: "Inter, sans-serif", flexShrink: 0 }}>
                  {selectedRoute.returnLabel}
                </div>
              </div>
            ) : (
              <div style={{ color: "#a7abb2", fontSize: 12, fontFamily: "Inter, sans-serif" }}>
                {routes.length === 0 && markets ? "No routes — try another asset" : "Select an asset above"}
              </div>
            )}
          </div>

          {/* ── Dynamic fields by mode ── */}

          {/* BORROW: health factor + risk info */}
          {mode === "borrow" && amountNum > 0 && (
            <div style={{ marginBottom: 12, background: inputBg, borderRadius: 12, padding: 12, border: sectionBorder }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                <HealthGauge value={Math.min(9.99, healthFactor)} />
              </div>
              <FieldRow label="Max Borrow" value={formatUSD(maxBorrow)} tooltip="Maximum you can borrow with current collateral" />
              <FieldRow label="Borrow APR" value={selectedRoute ? selectedRoute.returnLabel : "Select route"} accent={selectedRoute ? AMBER : undefined} />
              <FieldRow label="LTV Ratio" value={`${(ltv * 100).toFixed(0)}%`} tooltip="Loan-to-value ratio for this collateral" />
              <FieldRow label="Liquidation Price" value={liquidationPrice > 0 ? `$${liquidationPrice.toLocaleString("en", { maximumFractionDigits: 2 })}` : "—"} tooltip="Price at which your position gets liquidated" />
              {healthFactor < 1.5 && healthFactor < 9.99 && (
                <div style={{ marginTop: 8, padding: "6px 8px", background: "rgba(239,68,68,0.06)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)" }}>
                  <span style={{ fontSize: 10, color: "#ef4444", fontFamily: "Inter, sans-serif" }}>
                    ⚠ Low health factor — add more collateral or reduce borrow amount
                  </span>
                </div>
              )}
            </div>
          )}

          {/* LEND: summary fields */}
          {mode === "lend" && selectedRoute && (
            <div style={{ marginBottom: 12 }}>
              <FieldRow
                label={lendSubMode === "fixed" ? "Fixed APY" : "Est. APY"}
                value={selectedRoute.returnLabel}
                accent={GREEN}
              />
              <FieldRow label="Protocol" value={parseChainFromLabel(selectedRoute.protocol).name} />
              <FieldRow label={lendSubMode === "vault" ? "Vault TVL" : "Pool TVL"} value={selectedRoute.tvlLabel} />
            </div>
          )}

          {/* Execute button */}
          <button
            disabled={btnDisabled}
            onClick={handleButton}
            style={{
              width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
              cursor: btnDisabled ? "not-allowed" : "pointer",
              background: btnDisabled
                ? "rgba(255,255,255,0.06)"
                : mode === "borrow" ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.1)",
              color: btnDisabled ? "#a7abb2" : "#eaeef5",
              fontSize: 14, fontWeight: 800, letterSpacing: "-0.01em",
              fontFamily: "Inter, sans-serif", transition: "all 200ms ease",
              border: btnDisabled ? "1px solid transparent" : "1px solid rgba(255,255,255,0.15)",
              opacity: btnDisabled ? 0.7 : 1,
            }}
            onMouseEnter={e => { if (!btnDisabled) { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.14)"; } }}
            onMouseLeave={e => { if (!btnDisabled) { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)"; } }}
          >
            {btnLabels[btnState]}
          </button>

          <div style={{ marginTop: 7, textAlign: "center", fontSize: 10, color: "rgba(167,171,178,0.4)", fontFamily: "Inter, sans-serif" }}>
            Slippage {slippage}% · Rates update every 60s
          </div>
        </div>

        {/* ═══ RIGHT PANEL (routes) ═══ */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#eaeef5", fontFamily: "Inter, sans-serif", letterSpacing: "-0.02em" }}>
              Best Routes
            </span>
            {filteredRoutes.length > 0 && (
              <span style={{ fontSize: 10, color: "#a7abb2", fontFamily: "Inter, sans-serif" }}>
                {filteredRoutes.length} option{filteredRoutes.length !== 1 ? "s" : ""} · sorted by best return
              </span>
            )}
          </div>

          {filteredRoutes.length === 0 ? (
            <div style={{
              background: "#0e1419", border: "1px solid rgba(67,72,78,0.3)",
              borderRadius: 12, padding: "40px 24px", textAlign: "center",
            }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#eaeef5", fontFamily: "Inter, sans-serif", marginBottom: 6 }}>
                No routes found
              </div>
              <div style={{ fontSize: 11, color: "#a7abb2", fontFamily: "Inter, sans-serif" }}>
                {!markets ? "Loading market data..." : chainId ? `No ${chainId} routes for this asset` : "Try selecting a different asset"}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredRoutes.map((route, i) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  selected={route.id === (selectedRoute?.id ?? filteredRoutes[0]?.id)}
                  onSelect={() => setSelectedRouteId(route.id)}
                  accent={accent}
                  isBest={i === 0}
                />
              ))}
            </div>
          )}

          {/* Info footer */}
          {filteredRoutes.length > 0 && (
            <div style={{
              marginTop: 12, padding: "10px 14px",
              background: "#0e1419", borderRadius: 10,
              border: "1px solid rgba(67,72,78,0.2)",
            }}>
              <div style={{ fontSize: 10, color: "rgba(167,171,178,0.6)", fontFamily: "Inter, sans-serif", lineHeight: 1.6 }}>
                Routes ranked by {mode === "borrow" ? "lowest APR" : "highest APY"}. All data sourced live from on-chain protocols.
                Gas estimates are approximations and may vary.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
