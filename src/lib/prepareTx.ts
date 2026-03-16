/**
 * prepareTx — client-side transaction preparation.
 *
 * Calls the 1delta REST API directly from the browser (no Supabase edge
 * function required). 1delta supports CORS so browser-direct calls work.
 *
 * The API key is optional; without it the public rate-limit applies.
 * Vaults (MetaMorpho / ERC4626) are handled with locally-built calldata.
 */

const ONEDELTA_BASE = "https://portal.1delta.io/v1";

export interface TxStep {
  description: string;
  to: string;
  data: string;
  value: string;
  chainId?: number;
}

export interface PrepareResult {
  transactions: TxStep[];
  quote?: Record<string, unknown>;
}

// ── Decimal table ─────────────────────────────────────────────────────────────

const DECIMALS: Record<string, number> = {
  ETH: 18, WETH: 18, wstETH: 18, cbETH: 18, rETH: 18,
  ezETH: 18, weETH: 18, GHO: 18, DAI: 18, USDe: 18, sUSDe: 18,
  crvUSD: 18, tBTC: 18,
  USDC: 6, USDT: 6, PYUSD: 6, EURC: 6, USDtb: 6,
  WBTC: 8, cbBTC: 8,
};

function toBaseUnits(human: number, asset: string): string {
  const dec = DECIMALS[asset] ?? 18;
  const [intPart, fracPart = ""] = human.toFixed(dec).split(".");
  const frac = (fracPart + "0".repeat(dec)).slice(0, dec);
  return (BigInt(intPart) * BigInt(10 ** dec) + BigInt(frac)).toString();
}

// ── Response normalisation ────────────────────────────────────────────────────

function extractSteps(body: unknown, chainId?: number): TxStep[] {
  const b = body as Record<string, unknown>;
  const actions =
    (b?.actions && (
      (b.actions as Record<string, unknown>).permissions ||
      (b.actions as Record<string, unknown>).transactions
    ))
      ? b.actions as Record<string, unknown>
      : (b?.data && (
        (b.data as Record<string, unknown>).permissions ||
        (b.data as Record<string, unknown>).transactions
      ))
      ? b.data as Record<string, unknown>
      : b;

  const safe = Number.isFinite(chainId) ? chainId : undefined;
  const toStep = (item: unknown, desc: string): TxStep | null => {
    const s = item as Record<string, string>;
    if (!s?.to || !s?.data) return null;
    return {
      description: desc,
      to: s.to,
      data: s.data,
      value: s.value ?? "0x0",
      ...(safe !== undefined && { chainId: safe }),
    };
  };

  const perms  = ((actions.permissions  ?? []) as unknown[]).map((p) => toStep(p, (p as Record<string, string>).info ?? "approve"));
  const txs    = ((actions.transactions ?? []) as unknown[]).map((t) => toStep(t, (t as Record<string, string>).info ?? "execute"));
  return [...perms, ...txs].filter((s): s is TxStep => s !== null);
}

function extractQuote(body: unknown): Record<string, unknown> | undefined {
  const b = body as Record<string, unknown>;
  const { actions: _a, success: _s, data, ...rest } = b ?? {};
  const dataObj = data && typeof data === "object" && !Array.isArray(data)
    ? data as Record<string, unknown>
    : {};
  const q = { ...dataObj, ...rest };
  return Object.keys(q).length > 0 ? q : undefined;
}

// ── ERC4626 vault calldata builders ──────────────────────────────────────────

function buildVaultDeposit(
  vaultAddress: string,
  assetAddress: string,
  amountBn: string,
  operator: string,
  chainId?: number,
): TxStep[] {
  const approveData =
    "0x095ea7b3" +
    vaultAddress.replace("0x", "").padStart(64, "0") +
    "f".repeat(64);
  const amtHex  = BigInt(amountBn).toString(16).padStart(64, "0");
  const rcvHex  = operator.replace("0x", "").padStart(64, "0");
  const depositData = "0x6e553f65" + amtHex + rcvHex;
  return [
    { description: "approve",  to: assetAddress,  data: approveData, value: "0x0", ...(chainId && { chainId }) },
    { description: "deposit",  to: vaultAddress,  data: depositData, value: "0x0", ...(chainId && { chainId }) },
  ];
}

function buildVaultWithdraw(
  vaultAddress: string,
  amountBn: string,
  operator: string,
  chainId?: number,
): TxStep[] {
  const amtHex  = BigInt(amountBn).toString(16).padStart(64, "0");
  const addrHex = operator.replace("0x", "").padStart(64, "0");
  const withdrawData = "0xb460af94" + amtHex + addrHex + addrHex;
  return [
    { description: "withdraw", to: vaultAddress, data: withdrawData, value: "0x0", ...(chainId && { chainId }) },
  ];
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function deltaGet(endpoint: string, params: Record<string, unknown>): Promise<unknown> {
  const url = new URL(ONEDELTA_BASE + endpoint);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    url.searchParams.append(k, String(v));
  }
  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`1delta ${endpoint} ${res.status}: ${txt.slice(0, 300)}`);
  }
  return res.json();
}

// ── Single-market lending endpoints ──────────────────────────────────────────

const LENDING_ENDPOINTS: Record<string, string> = {
  deposit:  "/actions/lending/deposit",
  withdraw: "/actions/lending/withdraw",
  borrow:   "/actions/lending/borrow",
  repay:    "/actions/lending/repay",
};

// ── Dual-market margin endpoints ──────────────────────────────────────────────

const MARGIN_ENDPOINTS: Record<string, string> = {
  leverage:          "/actions/loop/leverage",
  close:             "/actions/loop/close",
  "collateral-swap": "/actions/loop/collateral-swap",
  "debt-swap":       "/actions/loop/debt-swap",
};

// ── Public API ────────────────────────────────────────────────────────────────

export interface PrepareTxParams {
  action: string;
  /** Lending / vault market ID (e.g. "AAVE_V3:1:0x..." or "morpho-vault:1:0x...") */
  marketId?: string;
  /** Single-market UID */
  marketUid?: string;
  /** Debt / source market UID (margin ops) */
  marketUidIn?: string;
  /** Collateral / target market UID (margin ops) */
  marketUidOut?: string;
  /** Human-readable amount string, e.g. "10.5" */
  amount: string;
  /** Asset symbol, e.g. "USDC" */
  asset: string;
  /** Wallet address */
  operator: string;
  /** Numeric chain ID */
  chainId?: number;
  /** Slippage percentage string, e.g. "0.5" */
  slippage?: string;
  /** Underlying ERC20 address (required for vault deposits) */
  tokenAddress?: string;
  /** Target leverage multiplier (leverage op) */
  leverage?: string;
  /** Close/repay full position flag */
  isAll?: boolean;
}

export async function prepareTx(p: PrepareTxParams): Promise<PrepareResult> {
  const parsedAmount = parseFloat(p.amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new Error("Invalid amount — must be a positive number");
  }

  const chainId     = p.chainId;
  const amountBn    = toBaseUnits(parsedAmount, p.asset);
  const slippageBps = p.slippage ? Math.round(parseFloat(p.slippage) * 100) : 50;

  // ── ERC4626 vault path ────────────────────────────────────────────────────
  const mid = (p.marketId ?? "").toLowerCase();
  if (mid.startsWith("morpho-vault:")) {
    let vaultAddress = p.marketUid ?? "";
    const parts = vaultAddress.split(":");
    if (parts.length === 3 && parts[2].startsWith("0x")) vaultAddress = parts[2];

    if (p.action === "deposit") {
      if (!p.tokenAddress) throw new Error("tokenAddress required for vault deposits");
      return { transactions: buildVaultDeposit(vaultAddress, p.tokenAddress, amountBn, p.operator, chainId) };
    }
    if (p.action === "withdraw") {
      return { transactions: buildVaultWithdraw(vaultAddress, amountBn, p.operator, chainId) };
    }
    throw new Error(`Action "${p.action}" is not supported for vaults`);
  }

  // ── Margin / loop path ────────────────────────────────────────────────────
  if (p.action in MARGIN_ENDPOINTS) {
    const endpoint = MARGIN_ENDPOINTS[p.action];
    const params: Record<string, unknown> = {
      operator: p.operator,
      simulate: true,
      slippage: slippageBps,
    };
    if (p.marketUidIn)  params.marketUidIn  = p.marketUidIn;
    if (p.marketUidOut) params.marketUidOut = p.marketUidOut;
    if (p.action === "leverage") {
      params.debtAmount  = amountBn;
      params.lendingMode = "2";
      if (p.leverage) params.leverage = Number(p.leverage);
    } else {
      params.amount = amountBn;
    }
    if (p.action === "debt-swap") { params.irModeIn = "2"; params.irModeOut = "2"; }
    if (p.isAll) params.isMaxIn = true;

    const result = await deltaGet(endpoint, params);
    const transactions = extractSteps(result, chainId);
    if (transactions.length === 0) {
      throw new Error("The protocol returned no transaction steps. Check market liquidity, health factor, or try adjusting the amount.");
    }
    return { transactions, quote: extractQuote(result) };
  }

  // ── Lending pool path ─────────────────────────────────────────────────────
  const endpoint = LENDING_ENDPOINTS[p.action];
  if (!endpoint) throw new Error(`Unsupported action: "${p.action}"`);

  const params: Record<string, unknown> = {
    marketUid: p.marketUid,
    amount:    amountBn,
    operator:  p.operator,
    simulate:  true,
  };
  if (slippageBps > 0) params.slippage = slippageBps;
  if (p.action === "borrow" || p.action === "repay") params.lendingMode = "2";

  const result = await deltaGet(endpoint, params);
  const transactions = extractSteps(result, chainId);
  if (transactions.length === 0) {
    throw new Error("The protocol returned no transaction steps. The market may be paused or the amount may be too small.");
  }
  return { transactions, quote: extractQuote(result) };
}
