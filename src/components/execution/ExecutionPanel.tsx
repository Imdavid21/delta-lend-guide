import { useState, useMemo, useRef, useEffect } from "react";
import { useAccount, useBalance, useReadContract, useSwitchChain } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import {
  ArrowDown, ChevronDown, Clock, Fuel, Info, Lock, Settings,
} from "lucide-react";
import { useMarkets, useVaults } from "@/hooks/useMarkets";
import { usePrices } from "@/hooks/usePrices";
import { formatPercent, formatUSD } from "@/lib/marketTypes";
import { CHAIN_CONFIGS, CHAIN_BY_NAME } from "@/lib/chains";
import { AssetIcon, ProtocolIcon, ChainIcon, parseChainFromLabel } from "@/components/icons/MarketIcons";
import TxExecutor from "@/components/TxExecutor";
import type { TxStep } from "@/hooks/useChats";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
const INITIAL_LIMIT = 6;

function chainGasEst(chain: string | null) {
  return CHAIN_BY_NAME[chain ?? ""]?.gasEst ?? "~$1–15";
}
function chainTimeEst(chain: string | null) {
  return CHAIN_BY_NAME[chain ?? ""]?.timeEst ?? "~15s";
}

const NATIVE_SYMBOLS = new Set(["ETH", "MATIC", "BNB", "AVAX"]);

const TOKEN_ADDRESSES: Record<string, Record<number, `0x${string}`>> = {
  USDC: {
    1:     "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    10:    "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    137:   "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    8453:  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    56:    "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    43114: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
  },
  USDT: {
    1:     "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    10:    "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    137:   "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    8453:  "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    42161: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    56:    "0x55d398326f99059fF775485246999027B3197955",
    43114: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
  },
  DAI: {
    1:     "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    10:    "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    8453:  "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    42161: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    137:   "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
  },
  WBTC: {
    1:     "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    42161: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    137:   "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
  },
  WETH: {
    1:     "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    10:    "0x4200000000000000000000000000000000000006",
    137:   "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    8453:  "0x4200000000000000000000000000000000000006",
    42161: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    43114: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
  },
  wstETH: {
    1:     "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
    10:    "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb",
    8453:  "0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452",
    42161: "0x5979D7b546E38E414F7E9822514be443A4800529",
  },
  cbBTC: { 8453: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf" },
  cbETH: {
    1:    "0xBe9895146f7AF43049ca1c1AE358B0541Ea49704",
    8453: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22",
  },
};

const ERC20_BALANCE_ABI = [
  { name: "balanceOf", type: "function", stateMutability: "view",
    inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "decimals", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint8" }] },
] as const;

/* ─── Types ─────────────────────────────────────────────── */

type ExecMode = "lend" | "borrow" | "margin";
type LendSubMode = "lending" | "withdraw" | "vault";
type BorrowSubMode = "borrow" | "repay";
type MarginSubMode = "leverage" | "close" | "collateral-swap" | "debt-swap";

const LEND_SUBMODES: { id: LendSubMode; label: string; btnLabel: string; fromLabel: string; toLabel: string }[] = [
  { id: "lending",  label: "Deposit",  btnLabel: "Deposit",  fromLabel: "Deposit Asset",  toLabel: "You Receive"    },
  { id: "withdraw", label: "Withdraw", btnLabel: "Withdraw", fromLabel: "Withdraw Asset", toLabel: "You Receive"    },
  { id: "vault",    label: "Vault",    btnLabel: "Deposit",  fromLabel: "Deposit Asset",  toLabel: "Vault Strategy" },
];

const BORROW_SUBMODES: { id: BorrowSubMode; label: string; btnLabel: string }[] = [
  { id: "borrow", label: "Borrow", btnLabel: "Borrow" },
  { id: "repay",  label: "Repay",  btnLabel: "Repay"  },
];

const MARGIN_SUBMODES: { id: MarginSubMode; label: string; btnLabel: string; desc: string }[] = [
  { id: "leverage",        label: "Leverage",        btnLabel: "Open Position",   desc: "Amplify exposure with borrowed funds" },
  { id: "close",           label: "Close",           btnLabel: "Close Position",  desc: "Close leveraged position atomically"  },
  { id: "collateral-swap", label: "Collateral Swap", btnLabel: "Swap Collateral", desc: "Switch to a different collateral asset" },
  { id: "debt-swap",       label: "Debt Swap",       btnLabel: "Swap Debt",       desc: "Switch to a different borrow asset"    },
];

const GREEN = "#86efac";
const AMBER = "#fbbf24";
const PURPLE = "#a78bfa";

interface ChainOption { id: string | null; label: string; chainId?: number }
const CHAINS: ChainOption[] = [
  { id: null, label: "Any Chain" },
  ...CHAIN_CONFIGS.map(c => ({ id: c.name, label: c.label, chainId: c.id })),
];
const CHAIN_NAME_TO_ID: Record<string, number> = Object.fromEntries(CHAIN_CONFIGS.map(c => [c.name, c.id]));
const CHAIN_ID_TO_NAME: Record<number, string> = Object.fromEntries(CHAIN_CONFIGS.map(c => [c.id, c.name]));

const TVL_OPTIONS = [
  { value: 0,            label: "Any TVL" },
  { value: 100_000,      label: ">$100K"  },
  { value: 1_000_000,    label: ">$1M"    },
  { value: 10_000_000,   label: ">$10M"   },
  { value: 100_000_000,  label: ">$100M"  },
];

interface ExecRoute {
  id: string;
  marketUid: string;
  protocol: string;
  chain: string | null;
  outputLabel: string;
  returnValue: number;
  returnLabel: string;
  tvlLabel: string;
  tvlRaw: number;
  availableLiquidityUSD: number;
  utilizationRate: number | null;
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

/* ─── Filter Pill ───────────────────────────────────────── */

function FilterPill<T>({ label, value, options, onChange, renderOption }: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  renderOption?: (o: { value: T; label: string }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = options.find(o => o.value === value) ?? options[0];
  const isFiltered = value !== options[0].value;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          background: isFiltered ? "rgba(255,255,255,0.08)" : "#0e1419",
          border: isFiltered ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(67,72,78,0.3)",
          borderRadius: 7, padding: "4px 9px", fontSize: 11, fontWeight: 600,
          color: isFiltered ? "#eaeef5" : "#a7abb2", fontFamily: "Inter, sans-serif",
          cursor: "pointer", transition: "all 150ms", whiteSpace: "nowrap",
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
        onMouseLeave={e => { if (!open && !isFiltered) e.currentTarget.style.borderColor = "rgba(67,72,78,0.3)"; }}
      >
        {renderOption ? renderOption(active) : null}
        {!renderOption && <span>{isFiltered ? active.label : label}</span>}
        <ChevronDown size={9} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0,
          background: "#0e1419", border: "1px solid rgba(67,72,78,0.4)",
          borderRadius: 10, zIndex: 300, minWidth: 150,
          boxShadow: "0 16px 40px rgba(0,0,0,0.6)", padding: 4,
        }}>
          {options.map(o => {
            const sel = o.value === value;
            return (
              <button
                key={String(o.value)}
                onClick={() => { onChange(o.value); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "7px 10px", border: "none", borderRadius: 7, cursor: "pointer",
                  background: sel ? "rgba(255,255,255,0.07)" : "transparent",
                  color: sel ? "#eaeef5" : "#a7abb2",
                  fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, textAlign: "left",
                  transition: "background 120ms",
                }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.background = "transparent"; }}
              >
                {renderOption ? renderOption(o) : o.label}
                {sel && <span style={{ marginLeft: "auto", color: GREEN, fontSize: 10 }}>✓</span>}
              </button>
            );
          })}
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
  const { isConnected, address, chainId: connectedChainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { open: openWallet } = useAppKit();
  const { data: markets } = useMarkets();
  const { data: vaults } = useVaults();
  const prices = usePrices();

  const [mode, setMode] = useState<ExecMode>("lend");
  const [lendSubMode, setLendSubMode] = useState<LendSubMode>("lending");
  const [borrowSubMode, setBorrowSubMode] = useState<BorrowSubMode>("borrow");
  const [marginSubMode, setMarginSubMode] = useState<MarginSubMode>("leverage");
  const [leverage, setLeverage] = useState("2");
  const [isAll, setIsAll] = useState(false);
  const [secondRouteId, setSecondRouteId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [fromAsset, setFromAsset] = useState("USDC");
  const [toAsset, setToAsset] = useState("USDC");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [slippage, setSlippage] = useState("0.5");
  const [mevProtection, setMevProtection] = useState(false);

  // Chain filter — seeded from the connected wallet's chain
  const [chainId, setChainId] = useState<string | null>(() =>
    connectedChainId ? (CHAIN_ID_TO_NAME[connectedChainId] ?? null) : null
  );
  const [filterProtocol, setFilterProtocol] = useState<string | null>(null);
  const [filterMinTvl, setFilterMinTvl] = useState(0);

  // Keep chain filter in sync when wallet switches chain externally
  useEffect(() => {
    if (connectedChainId) {
      const name = CHAIN_ID_TO_NAME[connectedChainId];
      if (name) setChainId(name);
    }
  }, [connectedChainId]);

  // Pagination
  const [showAll, setShowAll] = useState(false);

  // Transaction preparation
  const [txLoading, setTxLoading] = useState(false);
  const [txSteps, setTxSteps] = useState<TxStep[] | null>(null);
  const [txQuote, setTxQuote] = useState<any>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const settingsRef = useRef<HTMLDivElement>(null);

  // Chain selector: update filter + switch wallet chain
  const handleChainSelect = (name: string | null) => {
    setChainId(name);
    setSelectedRouteId(null);
    if (name && isConnected) {
      const targetId = CHAIN_NAME_TO_ID[name];
      if (targetId && connectedChainId !== targetId) {
        switchChain({ chainId: targetId });
      }
    }
  };

  const subCfg = LEND_SUBMODES.find(s => s.id === lendSubMode)!;
  const borrowCfg = BORROW_SUBMODES.find(s => s.id === borrowSubMode)!;
  const marginCfg = MARGIN_SUBMODES.find(s => s.id === marginSubMode)!;
  const accent = mode === "borrow" ? AMBER : mode === "margin" ? PURPLE : GREEN;
  const fromLabel = mode === "borrow"
    ? (borrowSubMode === "repay" ? "Repay Asset" : "Collateral")
    : mode === "margin"
    ? (marginSubMode === "collateral-swap" ? "Current Collateral" : marginSubMode === "debt-swap" ? "Current Debt" : "Debt Market")
    : subCfg.fromLabel;
  const toLabel = mode === "borrow"
    ? (borrowSubMode === "repay" ? "Market to Repay" : "Borrow Asset")
    : mode === "margin"
    ? (marginSubMode === "collateral-swap" ? "New Collateral" : marginSubMode === "debt-swap" ? "New Debt" : "Collateral Market")
    : subCfg.toLabel;
  const execBtnLabel = mode === "borrow"
    ? borrowCfg.btnLabel
    : mode === "margin"
    ? marginCfg.btnLabel
    : subCfg.btnLabel;

  // Reset when context changes
  useEffect(() => {
    setSelectedRouteId(null);
    setSecondRouteId(null);
    setShowAll(false);
    setTxSteps(null);
    setTxQuote(null);
    setTxError(null);
    setIsAll(false);
  }, [mode, lendSubMode, borrowSubMode, marginSubMode, fromAsset, toAsset, chainId, filterProtocol, filterMinTvl]);

  // Close settings popover on outside click
  useEffect(() => {
    if (!showSettings) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setShowSettings(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSettings]);

  // ── Asset lists ──────────────────────────────────────────
  const lendingAssets = useMemo(() => [...new Set((markets ?? []).map(m => m.asset))].sort(), [markets]);
  const vaultAssets   = useMemo(() => [...new Set((vaults  ?? []).map(v => v.asset))].sort(), [vaults]);
  const borrowableAssets = useMemo(() =>
    [...new Set((markets ?? []).filter(m => m.borrowAPR != null && m.borrowAPR > 0).map(m => m.asset))].sort(),
  [markets]);

  const fromAssets = useMemo(() => {
    const fallback = ["USDC", "ETH", "WBTC", "USDT"];
    if (mode === "lend") {
      if (lendSubMode === "vault") return vaultAssets.length ? vaultAssets : fallback;
      return lendingAssets.length ? lendingAssets : fallback;
    }
    return lendingAssets.length ? lendingAssets : fallback;
  }, [mode, lendSubMode, lendingAssets, vaultAssets]);

  // ── Second market (for margin ops) ──────────────────────
   const secondRoute = useMemo(() => {
    const routes = allLendingRoutesRef;
    return routes.find(r => r.id === secondRouteId) ?? routes[0] ?? null;
  }, [allLendingRoutesRef, secondRouteId]);

  const validFromAsset = fromAssets.includes(fromAsset) ? fromAsset : (fromAssets[0] ?? "USDC");

  // ── Wallet balance (must come after validFromAsset) ───────
  const isNative = NATIVE_SYMBOLS.has(validFromAsset);
  const erc20Address = useMemo(() =>
    connectedChainId ? TOKEN_ADDRESSES[validFromAsset]?.[connectedChainId] : undefined,
  [validFromAsset, connectedChainId]);

  const { data: nativeBalance } = useBalance({
    address,
    query: { enabled: isConnected && isNative && !!address },
  });
  const { data: erc20BalanceRaw } = useReadContract({
    address: erc20Address,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !isNative && !!erc20Address },
  });
  const { data: erc20Decimals } = useReadContract({
    address: erc20Address,
    abi: ERC20_BALANCE_ABI,
    functionName: "decimals",
    query: { enabled: isConnected && !isNative && !!erc20Address },
  });

  const walletBalanceNum = useMemo(() => {
    if (!isConnected) return 0;
    if (isNative && nativeBalance) {
      const n = parseFloat(nativeBalance.formatted);
      return isNaN(n) ? 0 : n;
    }
    if (!isNative && erc20BalanceRaw != null && erc20Decimals != null)
      return Number(erc20BalanceRaw) / 10 ** Number(erc20Decimals);
    return 0;
  }, [isConnected, isNative, nativeBalance, erc20BalanceRaw, erc20Decimals]);

  const walletBalanceLabel = useMemo(() => {
    if (!isConnected) return null;
    if (isNative && nativeBalance) {
      const n = parseFloat(nativeBalance.formatted);
      if (!isNaN(n)) return `${n.toFixed(4)} ${validFromAsset}`;
    }
    if (!isNative && erc20Address && erc20BalanceRaw != null && erc20Decimals != null)
      return `${(Number(erc20BalanceRaw) / 10 ** Number(erc20Decimals)).toFixed(4)} ${validFromAsset}`;
    if (!isNative && !erc20Address) return `— ${validFromAsset}`;
    return null; // loading
  }, [isConnected, isNative, nativeBalance, validFromAsset, erc20Address, erc20BalanceRaw, erc20Decimals]);

  // ── All routes (no slice) ────────────────────────────────
  const routes = useMemo((): ExecRoute[] => {
    const asset = validFromAsset;

    if (mode === "borrow" || mode === "margin") {
      // For repay/borrow/margin we show markets with borrow capability
      const filterAsset = mode === "borrow" ? toAsset : asset;
      return (markets ?? [])
        .filter(m => m.asset === filterAsset && m.borrowAPR != null && m.borrowAPR > 0)
        .sort((a, b) => (a.borrowAPR ?? 999) - (b.borrowAPR ?? 999))
        .map(m => {
          const { chain } = parseChainFromLabel(m.protocolName);
          return {
            id: m.id, marketUid: m.marketUid, protocol: m.protocolName, chain,
            outputLabel: `${m.asset} variable debt`,
            returnValue: m.borrowAPR!,
            returnLabel: formatPercent(m.borrowAPR) + " APR",
            tvlLabel: formatUSD(m.availableLiquidityUSD) + " available",
            tvlRaw: m.availableLiquidityUSD,
            availableLiquidityUSD: m.availableLiquidityUSD,
            utilizationRate: m.utilizationRate,
            gasEst: chainGasEst(chain), timeEst: chainTimeEst(chain),
          };
        });
    }

    if (lendSubMode === "lending" || lendSubMode === "withdraw") {
      return (markets ?? [])
        .filter(m => m.asset === asset && m.supplyAPY > 0)
        .sort((a, b) => b.supplyAPY - a.supplyAPY)
        .map(m => {
          const { chain } = parseChainFromLabel(m.protocolName);
          const prefix = m.protocol.startsWith("AAVE") ? "a" : m.protocol.startsWith("COMPOUND") ? "c" : "";
          return {
            id: m.id, marketUid: m.marketUid, protocol: m.protocolName, chain,
            outputLabel: `${prefix}${m.asset} — receipt token`,
            returnValue: m.supplyAPY,
            returnLabel: formatPercent(m.supplyAPY) + " APY",
            tvlLabel: formatUSD(m.totalSupplyUSD) + " TVL",
            tvlRaw: m.totalSupplyUSD,
            availableLiquidityUSD: m.availableLiquidityUSD,
            utilizationRate: m.utilizationRate,
            gasEst: chainGasEst(chain), timeEst: chainTimeEst(chain),
          };
        });
    }

    return (vaults ?? [])
      .filter(v => v.asset === asset && v.apy > 0)
      .sort((a, b) => b.apy - a.apy)
      .map(v => {
        const { name: vaultDisplay, chain } = parseChainFromLabel(v.name);
        return {
          id: v.id, marketUid: v.marketUid ?? v.id, protocol: v.protocol, chain,
          outputLabel: vaultDisplay,
          returnValue: v.apy,
          returnLabel: formatPercent(v.apy) + " APY",
          tvlLabel: formatUSD(v.tvl) + " TVL",
          tvlRaw: v.tvl,
          availableLiquidityUSD: v.tvl,
          utilizationRate: null,
          gasEst: chainGasEst(chain), timeEst: chainTimeEst(chain),
        };
      });
  }, [mode, lendSubMode, validFromAsset, toAsset, markets, vaults]);

  // ── All lending routes (used as second market pool for margin) ──
  const allLendingRoutes = useMemo((): ExecRoute[] =>
    (markets ?? [])
      .filter(m => m.supplyAPY > 0)
      .sort((a, b) => b.supplyAPY - a.supplyAPY)
      .map(m => {
        const { chain } = parseChainFromLabel(m.protocolName);
        return {
          id: m.id, marketUid: m.marketUid, protocol: m.protocolName, chain,
          outputLabel: `${m.asset}`,
          returnValue: m.supplyAPY,
          returnLabel: formatPercent(m.supplyAPY) + " APY",
          tvlLabel: formatUSD(m.totalSupplyUSD) + " TVL",
          tvlRaw: m.totalSupplyUSD,
          availableLiquidityUSD: m.availableLiquidityUSD,
          utilizationRate: m.utilizationRate,
          gasEst: chainGasEst(chain), timeEst: chainTimeEst(chain),
        };
      }),
  [markets]);

  // ── Available protocols for filter ───────────────────────
  const availableProtocols = useMemo(
    () => [...new Set(routes.map(r => parseChainFromLabel(r.protocol).name))].sort(),
    [routes],
  );

  // ── Apply filters ────────────────────────────────────────
  const filteredRoutes = useMemo(() => routes.filter(r => {
    if (chainId && (r.chain ?? "Ethereum") !== chainId) return false;
    if (filterProtocol && parseChainFromLabel(r.protocol).name !== filterProtocol) return false;
    if (filterMinTvl > 0 && r.tvlRaw < filterMinTvl) return false;
    return true;
  }), [routes, chainId, filterProtocol, filterMinTvl]);

  const displayRoutes = showAll ? filteredRoutes : filteredRoutes.slice(0, INITIAL_LIMIT);
  const hiddenCount = filteredRoutes.length - displayRoutes.length;

  const selectedRoute = filteredRoutes.find(r => r.id === selectedRouteId) ?? filteredRoutes[0] ?? null;

  // ── Borrow calculations ──────────────────────────────────
  const amountNum = parseFloat(amount) || 0;
  const LTV_RATIOS: Record<string, number> = {
    ETH: 0.80, WETH: 0.80, WBTC: 0.75, USDC: 0.87, USDT: 0.87, DAI: 0.87, wstETH: 0.78, cbBTC: 0.75, cbETH: 0.78,
  };
  const collateralPrice = prices[validFromAsset] ?? 1;
  const ltv = LTV_RATIOS[validFromAsset] ?? 0.75;
  const maxBorrow = amountNum * collateralPrice * ltv;
  const healthFactor = amountNum > 0 && selectedRoute
    ? (amountNum * collateralPrice * ltv) / Math.min(amountNum * collateralPrice * ltv * 0.8, amountNum)
    : 9.99;
  const liquidationPrice = amountNum > 0 && selectedRoute
    ? (amountNum * 0.5) / (amountNum * ltv)
    : 0;

  // ── Button / Exec state ──────────────────────────────────
  type BtnState = "connect" | "enter" | "exec";
  const btnState: BtnState = !isConnected ? "connect" : !amountNum ? "enter" : "exec";
  const btnDisabled = btnState === "enter" || txLoading;
  const btnLabel = txLoading
    ? "Preparing transaction…"
    : btnState === "connect" ? "Connect Wallet"
    : btnState === "enter"   ? "Enter Amount"
    : execBtnLabel;

  const handleExecute = async () => {
    if (btnState === "connect") { openWallet(); return; }
    if (btnState !== "exec" || !selectedRoute) return;

    // Address guard — wallet can be connected but address momentarily undefined
    if (!address) {
      setTxError("Wallet address unavailable. Please reconnect your wallet.");
      return;
    }

    setTxLoading(true);
    setTxSteps(null);
    setTxQuote(null);
    setTxError(null);

    try {
      let action: string;
      let asset: string;
      let body: Record<string, unknown>;

      if (mode === "margin") {
        action = marginSubMode;
        asset  = validFromAsset;
        body = {
          action,
          marketUid:    selectedRoute.marketUid,
          marketUidIn:  selectedRoute.marketUid,
          marketUidOut: secondRoute?.marketUid,
          amount:       String(amountNum),
          asset,
          operator:     address,
          chainId:      connectedChainId,
          slippage,
          ...(action === "leverage" && { leverage }),
          ...(isAll && { isAll: true }),
        };
      } else {
        if (mode === "borrow") {
          action = borrowSubMode; // "borrow" or "repay"
          asset  = toAsset;
        } else {
          action = lendSubMode === "withdraw" ? "withdraw" : "deposit";
          asset  = validFromAsset;
        }

        // Only MetaMorpho vaults use ERC4626 direct calldata
        const isVaultMarket = selectedRoute.id.startsWith("morpho-vault:");
        const tokenAddress  =
          isVaultMarket && connectedChainId
            ? TOKEN_ADDRESSES[asset]?.[connectedChainId]
            : undefined;

        body = {
          action,
          marketId:     selectedRoute.id,
          marketUid:    selectedRoute.marketUid,
          amount:       String(amountNum),
          asset,
          operator:     address,
          chainId:      connectedChainId,
          slippage,
          tokenAddress,
        };
      }

      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 30_000);

      let res: Response;
      try {
        res = await fetch(`${SUPABASE_URL}/functions/v1/prepare-tx`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? `Server error (${res.status})`);
      }

      if (data.transactions?.length) {
        setTxSteps(data.transactions);
        setTxQuote(data.quote ?? null);
      } else {
        setTxError("No transaction steps were returned. The market may be paused or unavailable.");
      }
    } catch (err: any) {
      const isTimeout = err.name === "AbortError" || err.name === "TimeoutError";
      setTxError(isTimeout
        ? "Request timed out — please try again."
        : (err.message ?? "Failed to prepare transaction"));
    } finally {
      setTxLoading(false);
    }
  };

  const inputBg = "#0d1520";
  const sectionBorder = "1px solid rgba(67,72,78,0.25)";

  // Protocol filter options with "All" first
  const protocolOptions = [
    { value: null as string | null, label: "All Protocols" },
    ...availableProtocols.map(p => ({ value: p as string | null, label: p })),
  ];

  // Chain filter options for FilterPill
  const chainOptions = CHAINS.map(c => ({ value: c.id as string | null, label: c.label }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* ── Mode tabs ── */}
      <div style={{ display: "flex", gap: 4 }}>
        {(["lend", "borrow", "margin"] as ExecMode[]).map(m => {
          const active = mode === m;
          const modeAccent = m === "borrow" ? AMBER : m === "margin" ? PURPLE : GREEN;
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: "6px 20px", borderRadius: 8,
                border: active ? `1px solid ${modeAccent}44` : "1px solid rgba(67,72,78,0.3)",
                background: active ? `${modeAccent}12` : "transparent",
                color: active ? modeAccent : "#a7abb2",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                fontFamily: "Inter, sans-serif", letterSpacing: "-0.01em",
                transition: "all 150ms ease",
              }}
            >
              {m === "lend" ? "Lend" : m === "borrow" ? "Borrow" : "Margin"}
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
          {/* Panel header: sub-mode tabs + settings gear */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
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
            ) : mode === "borrow" ? (
              <div style={{ display: "flex", gap: 2, background: "#141a20", borderRadius: 8, padding: 2, border: "1px solid rgba(67,72,78,0.3)" }}>
                {BORROW_SUBMODES.map(s => {
                  const active = borrowSubMode === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setBorrowSubMode(s.id)}
                      style={{
                        padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                        fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700,
                        background: active ? "#1f262e" : "transparent",
                        color: active ? AMBER : "#a7abb2",
                        transition: "all 150ms",
                      }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 2, background: "#141a20", borderRadius: 8, padding: 2, border: "1px solid rgba(67,72,78,0.3)" }}>
                {MARGIN_SUBMODES.map(s => {
                  const active = marginSubMode === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setMarginSubMode(s.id)}
                      title={s.desc}
                      style={{
                        padding: "4px 9px", borderRadius: 6, border: "none", cursor: "pointer",
                        fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700,
                        background: active ? "#1f262e" : "transparent",
                        color: active ? PURPLE : "#a7abb2",
                        transition: "all 150ms",
                      }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Settings gear */}
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
                    {(["Off", "On"] as const).map(v => {
                      const active = v === "On" ? mevProtection : !mevProtection;
                      return (
                        <button key={v} onClick={() => setMevProtection(v === "On")} style={{
                          flex: 1, padding: "5px 0", borderRadius: 6, fontSize: 11, fontWeight: 700,
                          border: active ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(67,72,78,0.3)",
                          background: active ? "rgba(255,255,255,0.07)" : "transparent",
                          color: active ? "#eaeef5" : "#a7abb2",
                          cursor: "pointer", fontFamily: "Inter, sans-serif",
                        }}>{v}</button>
                      );
                    })}
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
              {mode === "borrow" && borrowSubMode === "borrow" && (
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
                onClick={() => walletBalanceNum > 0 ? setAmount(walletBalanceNum.toFixed(6)) : undefined}
                disabled={walletBalanceNum <= 0}
                style={{
                  position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
                  fontSize: 10, fontWeight: 800, color: "#eaeef5",
                  background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 5,
                  padding: "3px 7px", cursor: walletBalanceNum > 0 ? "pointer" : "default",
                  fontFamily: "Inter, sans-serif", opacity: walletBalanceNum > 0 ? 1 : 0.4,
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
                Balance:{" "}
                {!isConnected
                  ? <span style={{ color: "rgba(167,171,178,0.4)" }}>Connect wallet</span>
                  : walletBalanceLabel != null
                    ? <span style={{ color: "#eaeef5" }}>{walletBalanceLabel}</span>
                    : <span style={{ color: "rgba(167,171,178,0.5)" }}>Loading…</span>}
              </span>
            </div>

            {/* Amount presets */}
            <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
              {["25%", "50%", "75%", "MAX"].map(p => {
                const pct = p === "MAX" ? 1 : parseInt(p) / 100;
                const disabled = walletBalanceNum <= 0;
                return (
                  <button
                    key={p}
                    onClick={() => {
                      if (disabled) return;
                      const val = walletBalanceNum * pct;
                      setAmount(val.toFixed(6));
                    }}
                    style={{
                      flex: 1, padding: "3px 0", fontSize: 10, fontWeight: 700,
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(67,72,78,0.25)",
                      borderRadius: 6, color: disabled ? "rgba(167,171,178,0.3)" : "#a7abb2",
                      cursor: disabled ? "default" : "pointer",
                      fontFamily: "Inter, sans-serif", transition: "all 150ms",
                    }}
                    onMouseEnter={e => { if (!disabled) { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "#eaeef5"; } }}
                    onMouseLeave={e => { if (!disabled) { e.currentTarget.style.borderColor = "rgba(67,72,78,0.25)"; e.currentTarget.style.color = "#a7abb2"; } }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transform arrow */}
          <div style={{ display: "flex", justifyContent: "center", margin: "6px 0" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "#0a0f14", border: "1px solid rgba(67,72,78,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: mode === "borrow" && borrowSubMode === "borrow" ? AMBER : mode === "margin" ? PURPLE : "#a7abb2",
            }}>
              {mode === "borrow" && borrowSubMode === "borrow" ? <Lock size={11} /> : <ArrowDown size={12} />}
            </div>
          </div>

          {/* TO section */}
          <div style={{ background: inputBg, borderRadius: 12, padding: 12, marginBottom: 12, border: sectionBorder }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#a7abb2", marginBottom: 8, fontFamily: "Inter, sans-serif", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {toLabel}
            </div>

            {mode === "borrow" ? (
              borrowSubMode === "borrow" ? (
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
                      {parseChainFromLabel(selectedRoute.protocol).name}
                    </div>
                    <div style={{ fontSize: 10, color: "#a7abb2", fontFamily: "Inter, sans-serif" }}>
                      {selectedRoute.chain ? selectedRoute.chain : ""}
                    </div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: AMBER, letterSpacing: "-0.02em", fontFamily: "Inter, sans-serif", flexShrink: 0 }}>
                    {selectedRoute.returnLabel}
                  </div>
                </div>
              ) : (
                <div style={{ color: "#a7abb2", fontSize: 12, fontFamily: "Inter, sans-serif" }}>Select a market above</div>
              )
            ) : mode === "margin" ? (
              /* Second market picker for margin ops */
              secondRoute ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", background: "#0a0f14",
                      border: "1px solid rgba(167,139,250,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <ProtocolIcon name={secondRoute.protocol} size={15} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#eaeef5", fontFamily: "Inter, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {secondRoute.outputLabel} — {parseChainFromLabel(secondRoute.protocol).name}
                      </div>
                      <div style={{ fontSize: 10, color: "#a7abb2", fontFamily: "Inter, sans-serif" }}>
                        {secondRoute.chain ?? ""}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {allLendingRoutes.slice(0, 6).map(r => {
                      const sel = r.id === (secondRoute?.id);
                      return (
                        <button
                          key={r.id}
                          onClick={() => setSecondRouteId(r.id)}
                          title={`${parseChainFromLabel(r.protocol).name} · ${r.chain ?? ""}`}
                          style={{
                            padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                            border: sel ? "1px solid rgba(167,139,250,0.4)" : "1px solid rgba(67,72,78,0.3)",
                            background: sel ? "rgba(167,139,250,0.1)" : "transparent",
                            color: sel ? PURPLE : "#a7abb2",
                            cursor: "pointer", fontFamily: "Inter, sans-serif",
                          }}
                        >
                          {r.outputLabel} · {r.chain ?? ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ color: "#a7abb2", fontSize: 12, fontFamily: "Inter, sans-serif" }}>
                  {markets ? "No markets available" : "Loading…"}
                </div>
              )
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

          {/* MARGIN: leverage input + isAll toggle */}
          {mode === "margin" && (
            <div style={{ marginBottom: 12, background: inputBg, borderRadius: 12, padding: 12, border: sectionBorder }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#a7abb2", marginBottom: 8, fontFamily: "Inter, sans-serif", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {marginCfg.desc}
              </div>
              {marginSubMode === "leverage" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: "#a7abb2", fontFamily: "Inter, sans-serif" }}>Target Leverage</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {["2", "3", "5", "10"].map(lv => (
                      <button
                        key={lv}
                        onClick={() => setLeverage(lv)}
                        style={{
                          padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                          border: leverage === lv ? `1px solid ${PURPLE}44` : "1px solid rgba(67,72,78,0.3)",
                          background: leverage === lv ? `${PURPLE}12` : "transparent",
                          color: leverage === lv ? PURPLE : "#a7abb2",
                          cursor: "pointer", fontFamily: "Inter, sans-serif",
                        }}
                      >{lv}×</button>
                    ))}
                  </div>
                </div>
              )}
              {(marginSubMode === "close" || marginSubMode === "repay" as any) && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={() => setIsAll(p => !p)}
                    style={{
                      padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                      border: isAll ? `1px solid ${PURPLE}44` : "1px solid rgba(67,72,78,0.3)",
                      background: isAll ? `${PURPLE}12` : "transparent",
                      color: isAll ? PURPLE : "#a7abb2",
                      cursor: "pointer", fontFamily: "Inter, sans-serif",
                    }}
                  >
                    {isAll ? "✓ Close Full Position" : "Close Full Position"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* BORROW: health factor + risk info */}
          {mode === "borrow" && borrowSubMode === "borrow" && amountNum > 0 && (
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

          {/* LEND: complementary stats (APY/protocol already shown above in TO section) */}
          {(mode === "lend" || (mode === "borrow" && borrowSubMode === "repay")) && selectedRoute && (
            <div style={{ marginBottom: 12 }}>
              <FieldRow
                label={mode === "lend" && lendSubMode === "vault" ? "Vault TVL" : "Pool TVL"}
                value={selectedRoute.tvlLabel}
              />
              <FieldRow
                label="Available"
                value={formatUSD(selectedRoute.availableLiquidityUSD)}
                tooltip="Liquidity available to deposit or borrow"
              />
              {selectedRoute.utilizationRate != null && (
                <FieldRow
                  label="Utilization"
                  value={formatPercent(selectedRoute.utilizationRate)}
                  tooltip="Current protocol utilization rate"
                />
              )}
            </div>
          )}

          {/* Execute button */}
          <button
            disabled={btnDisabled}
            onClick={handleExecute}
            style={{
              width: "100%", padding: "13px 0", borderRadius: 12,
              cursor: btnDisabled ? "not-allowed" : "pointer",
              background: btnDisabled ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.1)",
              color: btnDisabled ? "#a7abb2" : "#eaeef5",
              fontSize: 14, fontWeight: 800, letterSpacing: "-0.01em",
              fontFamily: "Inter, sans-serif", transition: "all 200ms ease",
              border: btnDisabled ? "1px solid transparent" : "1px solid rgba(255,255,255,0.15)",
              opacity: btnDisabled ? 0.7 : 1,
            }}
            onMouseEnter={e => { if (!btnDisabled) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.14)"; }}
            onMouseLeave={e => { if (!btnDisabled) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)"; }}
          >
            {btnLabel}
          </button>

          {/* Tx error */}
          {txError && (
            <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(239,68,68,0.06)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)" }}>
              <span style={{ fontSize: 10, color: "#ef4444", fontFamily: "Inter, sans-serif" }}>⚠ {txError}</span>
            </div>
          )}

          {/* TxExecutor */}
          {txSteps && txSteps.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <TxExecutor transactions={txSteps} quote={txQuote} />
            </div>
          )}

          <div style={{ marginTop: 7, textAlign: "center", fontSize: 10, color: "rgba(167,171,178,0.4)", fontFamily: "Inter, sans-serif" }}>
            Slippage {slippage}%{mevProtection ? " · MEV Protection ON" : ""} · Rates update every 60s
          </div>
        </div>

        {/* ═══ RIGHT PANEL (routes) ═══ */}
        <div style={{ flex: 1, minWidth: 260 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#eaeef5", fontFamily: "Inter, sans-serif", letterSpacing: "-0.02em" }}>
              {mode === "margin" ? "Primary Market" : "Best Routes"}
            </span>
            {filteredRoutes.length > 0 && (
              <span style={{ fontSize: 10, color: "#a7abb2", fontFamily: "Inter, sans-serif" }}>
                {filteredRoutes.length} option{filteredRoutes.length !== 1 ? "s" : ""} · sorted by best return
              </span>
            )}
          </div>

          {/* ── Filter bar ── */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            {/* Protocol filter */}
            <FilterPill
              label="Protocol"
              value={filterProtocol}
              options={protocolOptions}
              onChange={setFilterProtocol}
            />

            {/* TVL filter */}
            <FilterPill
              label="Min TVL"
              value={filterMinTvl}
              options={TVL_OPTIONS}
              onChange={setFilterMinTvl}
            />

            {/* Chain filter */}
            <FilterPill
              label="Chain"
              value={chainId}
              options={chainOptions}
              onChange={handleChainSelect}
              renderOption={o => (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {o.value ? (
                    <ChainIcon chainName={o.value} size={13} />
                  ) : (
                    <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#627EEA", fontSize: 7, color: "#fff", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>A</div>
                  )}
                  {o.label}
                </span>
              )}
            />

            {/* Clear filters */}
            {(chainId || filterProtocol || filterMinTvl > 0) && (
              <button
                onClick={() => { handleChainSelect(null); setFilterProtocol(null); setFilterMinTvl(0); }}
                style={{
                  padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(67,72,78,0.3)",
                  background: "transparent", color: "#a7abb2", fontSize: 10, fontWeight: 600,
                  cursor: "pointer", fontFamily: "Inter, sans-serif",
                }}
              >
                Clear filters ×
              </button>
            )}
          </div>

          {/* Routes list */}
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
                {!markets ? "Loading market data…" : "Try adjusting the filters or selecting a different asset"}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {displayRoutes.map((route, i) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  selected={route.id === (selectedRoute?.id ?? filteredRoutes[0]?.id)}
                  onSelect={() => setSelectedRouteId(route.id)}
                  accent={accent}
                  isBest={i === 0}
                />
              ))}

              {/* Show more / show less */}
              {hiddenCount > 0 && (
                <button
                  onClick={() => setShowAll(true)}
                  style={{
                    padding: "10px 0", borderRadius: 10,
                    border: "1px dashed rgba(67,72,78,0.4)",
                    background: "transparent", color: "#a7abb2",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    fontFamily: "Inter, sans-serif", transition: "all 150ms",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "#eaeef5"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(67,72,78,0.4)"; e.currentTarget.style.color = "#a7abb2"; }}
                >
                  Show {hiddenCount} more option{hiddenCount !== 1 ? "s" : ""}
                </button>
              )}
              {showAll && filteredRoutes.length > INITIAL_LIMIT && (
                <button
                  onClick={() => setShowAll(false)}
                  style={{
                    padding: "8px 0", borderRadius: 10, border: "none",
                    background: "transparent", color: "rgba(167,171,178,0.5)",
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  Show less ↑
                </button>
              )}
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
                Routes ranked by {mode === "borrow" ? "lowest APR" : mode === "margin" ? "lowest APR (debt market)" : "highest APY"}. All data sourced live from on-chain protocols.
                Gas estimates are approximations and may vary.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
