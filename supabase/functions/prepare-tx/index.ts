import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ONEDELTA_API_KEY = Deno.env.get("ONEDELTA_API_KEY");
const BASE_URL = "https://portal.1delta.io/v1";

// ── 1delta API helpers ───────────────────────────────────────────────────────

async function deltaGet(endpoint: string, params: Record<string, any> = {}) {
  const url = new URL(BASE_URL + endpoint);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    url.searchParams.append(k, String(v));
  }
  const headers: Record<string, string> = {};
  if (ONEDELTA_API_KEY) headers["x-api-key"] = ONEDELTA_API_KEY;
  const res = await fetch(url.toString(), {
    headers,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`1delta ${endpoint} ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

// ── Token decimal table (no external calls needed for common assets) ─────────

const DECIMALS: Record<string, number> = {
  ETH: 18,
  WETH: 18,
  wstETH: 18,
  cbETH: 18,
  rETH: 18,
  ezETH: 18,
  weETH: 18,
  GHO: 18,
  DAI: 18,
  USDe: 18,
  sUSDe: 18,
  USDC: 6,
  USDT: 6,
  PYUSD: 6,
  EURC: 6,
  USDtb: 6,
  crvUSD: 18,
  WBTC: 8,
  cbBTC: 8,
  tBTC: 18,
};

/**
 * Convert a human-readable amount (e.g. 10.5) to base units (e.g. "10500000" for USDC).
 * Uses integer arithmetic to avoid floating-point rounding errors.
 */
function toBaseUnits(humanAmount: number, asset: string): string {
  const decimals = DECIMALS[asset] ?? 18;
  // Split on decimal point to avoid float precision loss
  const [intPart, fracPart = ""] = humanAmount.toFixed(decimals).split(".");
  const fracPadded = (fracPart + "0".repeat(decimals)).slice(0, decimals);
  const result = BigInt(intPart) * BigInt(10 ** decimals) + BigInt(fracPadded);
  return result.toString();
}

// ── Transaction step extraction from 1delta response ────────────────────────

interface TxStep {
  description: string;
  to: string;
  data: string;
  value: string;
  chainId?: number;
}

function extractSteps(body: any, chainId?: number): TxStep[] {
  // 1delta API can return actions under body.actions, body.data, or flat on body.
  // Try each location in order of likelihood.
  const actions =
    (body?.actions && (body.actions.permissions || body.actions.transactions))
      ? body.actions
      : (body?.data && (body.data.permissions || body.data.transactions))
      ? body.data
      : body;

  const safeChainId = Number.isFinite(chainId) ? chainId : undefined;
  const toStep = (item: any, desc: string): TxStep | null =>
    item?.to && item?.data
      ? {
          description: desc,
          to: item.to,
          data: item.data,
          value: item.value ?? "0x0",
          ...(safeChainId !== undefined && { chainId: safeChainId }),
        }
      : null;
  return [
    ...(actions.permissions ?? []).map((p: any) =>
      toStep(p, p.info ?? "approve"),
    ),
    ...(actions.transactions ?? []).map((t: any) =>
      toStep(t, t.info ?? "execute"),
    ),
  ].filter((s): s is TxStep => s !== null);
}

function extractQuote(body: any): Record<string, any> | undefined {
  const { actions: _a, success: _s, data, ...rest } = body ?? {};
  const dataObj =
    data && typeof data === "object" && !Array.isArray(data) ? data : {};
  const q = { ...dataObj, ...rest };
  return Object.keys(q).length > 0 ? q : undefined;
}

// ── ERC4626 vault calldata builders ─────────────────────────────────────────

function buildVaultDeposit(
  vaultAddress: string,
  assetAddress: string,
  amountBn: string,
  operator: string,
  chainId?: number,
): TxStep[] {
  // approve(address spender, uint256 amount) — max uint256
  const approveData =
    "0x095ea7b3" +
    vaultAddress.replace("0x", "").padStart(64, "0") +
    "f".repeat(64);

  // deposit(uint256 assets, address receiver)
  const amountHex = BigInt(amountBn).toString(16).padStart(64, "0");
  const receiverHex = operator.replace("0x", "").padStart(64, "0");
  const depositData = "0x6e553f65" + amountHex + receiverHex;

  return [
    {
      description: "approve",
      to: assetAddress,
      data: approveData,
      value: "0x0",
      ...(chainId && { chainId }),
    },
    {
      description: "deposit",
      to: vaultAddress,
      data: depositData,
      value: "0x0",
      ...(chainId && { chainId }),
    },
  ];
}

function buildVaultWithdraw(
  vaultAddress: string,
  amountBn: string,
  operator: string,
  chainId?: number,
): TxStep[] {
  // withdraw(uint256 assets, address receiver, address owner)
  const amtHex = BigInt(amountBn).toString(16).padStart(64, "0");
  const addrHex = operator.replace("0x", "").padStart(64, "0");
  const withdrawData = "0xb460af94" + amtHex + addrHex + addrHex;

  return [
    {
      description: "withdraw",
      to: vaultAddress,
      data: withdrawData,
      value: "0x0",
      ...(chainId && { chainId }),
    },
  ];
}

// ── Composer contract addresses by chain ID ──────────────────────────────────

const COMPOSER_ADDRESSES: Record<number, string> = {
  1:      "0x8e24cfc19c6c00c524353cb8816f5f1c2f33c201",
  10:     "0xCDef0A216fcEF809258aA4f341dB1A5aB296ea72",
  25:     "0xcB6Eb8df68153cebF60E1872273Ef52075a5C297",
  40:     "0xcB6Eb8df68153cebF60E1872273Ef52075a5C297",
  50:     "0xcB6Eb8df68153cebF60E1872273Ef52075a5C297",
  56:     "0x816EBC5cb8A5651C902Cb06659907A93E574Db0B",
  100:    "0xcb6eb8df68153cebf60e1872273ef52075a5c297",
  130:    "0xcB6Eb8df68153cebF60E1872273Ef52075a5C297",
  137:    "0xFd245e732b40b6BF2038e42b476bD06580585326",
  143:    "0x8E24CfC19c6C00c524353CB8816f5f1c2F33c201",
  146:    "0x8E24CfC19c6C00c524353CB8816f5f1c2F33c201",
  169:    "0xcB6Eb8df68153cebF60E1872273Ef52075a5C297",
  250:    "0x816EBC5cb8A5651C902Cb06659907A93E574Db0B",
  999:    "0xcb6eb8df68153cebf60e1872273ef52075a5c297",
  1088:   "0xCe434378adacC51d54312c872113D687Ac19B516",
  1116:   "0x816EBC5cb8A5651C902Cb06659907A93E574Db0B",
  1284:   "0x8E24CfC19c6C00c524353CB8816f5f1c2F33c201",
  1329:   "0x8E24CfC19c6C00c524353CB8816f5f1c2F33c201",
  1868:   "0x8E24CfC19c6C00c524353CB8816f5f1c2F33c201",
  2818:   "0xcB6Eb8df68153cebF60E1872273Ef52075a5C297",
  5000:   "0x5c019a146758287c614fe654caec1ba1caf05f4e",
  8217:   "0x8E24CfC19c6C00c524353CB8816f5f1c2F33c201",
  8453:   "0xB7ea94340e65CC68d1274aE483dfBE593fD6f21e",
  9745:   "0x8E24CfC19c6C00c524353CB8816f5f1c2F33c201",
  34443:  "0x8E24CfC19c6C00c524353CB8816f5f1c2F33c201",
  42161:  "0x05f3f58716a88A52493Be45aA0871c55b3748f18",
  43111:  "0x79f4061BF049c5c6CAC6bfe2415c2460815F4ac7",
  43114:  "0x8E24CfC19c6C00c524353CB8816f5f1c2F33c201",
  59144:  "0x816EBC5cb8A5651C902Cb06659907A93E574Db0B",
  80094:  "0xcB6Eb8df68153cebF60E1872273Ef52075a5C297",
  81457:  "0x816EBC5cb8A5651C902Cb06659907A93E574Db0B",
  167000: "0x594cE4B82A81930cC637f1A59afdFb0D70054232",
  534352: "0x8E24CfC19c6C00c524353CB8816f5f1c2F33c201",
  747474: "0x8E24CfC19c6C00c524353CB8816f5f1c2F33c201",
};

const CALL_FORWARDER = "0xfCa1154C643C32638AEe9a43eeE7f377f515c801";

// ── Action → 1delta endpoint map ────────────────────────────────────────────

/** Single-market actions (uses marketUid) */
const LENDING_ACTION_ENDPOINTS: Record<string, string> = {
  deposit:  "/actions/lending/deposit",
  withdraw: "/actions/lending/withdraw",
  borrow:   "/actions/lending/borrow",
  repay:    "/actions/lending/repay",
};

/** Dual-market margin actions (uses marketUidIn + marketUidOut) */
const LOOP_ACTION_ENDPOINTS: Record<string, string> = {
  leverage:        "/actions/loop/leverage",
  close:           "/actions/loop/close",
  "collateral-swap": "/actions/loop/collateral-swap",
  "debt-swap":     "/actions/loop/debt-swap",
};

const ALL_ACTIONS = new Set([
  ...Object.keys(LENDING_ACTION_ENDPOINTS),
  ...Object.keys(LOOP_ACTION_ENDPOINTS),
  "vault-deposit",
  "vault-withdraw",
]);

// ── HTTP handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const {
      action,           // "deposit" | "withdraw" | "borrow" | "repay" |
                        // "leverage" | "close" | "collateral-swap" | "debt-swap"
      marketId,         // e.g. "morpho-vault:1:0xBeef..." or "AAVE_V3:1:0xAbc..."
      marketUid,        // vault address for vaults, or lending market UID (single-market ops)
      marketUidIn,      // debt market UID  (dual-market margin ops)
      marketUidOut,     // collateral market UID (dual-market margin ops)
      amount,           // human-readable amount string, e.g. "10" or "10.5"
      asset,            // asset symbol, e.g. "USDC"
      operator,         // wallet address
      chainId,          // numeric chain ID (number or string)
      slippage,         // slippage tolerance as percentage string, e.g. "0.5"
      tokenAddress,     // underlying ERC20 address (required for vault deposits)
      leverage,         // optional: target leverage multiplier for leverage op
      isAll,            // optional: boolean — close/repay full position
    } = body;

    // ── Validation ────────────────────────────────────────────────────────
    const isMarginOp = action in LOOP_ACTION_ENDPOINTS;
    const hasMarket  = isMarginOp ? (marketUidIn || marketUidOut) : marketUid;
    if (!action || !hasMarket || !amount || !operator) {
      return new Response(
        JSON.stringify({
          error: isMarginOp
            ? "Missing required fields: action, marketUidIn/Out, amount, operator"
            : "Missing required fields: action, marketUid, amount, operator",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid amount — must be a positive number" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const numericChainId =
      typeof chainId === "number" ? chainId : parseInt(String(chainId ?? "1"), 10);

    const amountBn = toBaseUnits(parsedAmount, asset);

    // ── Detect vault vs lending pool ─────────────────────────────────────
    const mid = (marketId ?? "").toLowerCase();
    // Only MetaMorpho (morpho-vault:) vaults use ERC4626 direct calldata.
    // Euler Finance is a lending protocol — its markets are accessed via the
    // 1delta lending action endpoints, not via ERC4626 vault calls.
    const isVault = mid.startsWith("morpho-vault:");

    // ── Vault path (ERC4626 direct calldata — MetaMorpho only) ───────────
    if (isVault) {
      // marketUid IS the vault contract address for morpho-vault markets.
      let vaultAddress = marketUid;

      // Safety: if marketUid is in "PREFIX:chainId:0xAddress" form, extract the address
      const parts = (marketUid as string).split(":");
      if (parts.length === 3 && parts[2].startsWith("0x")) {
        vaultAddress = parts[2];
      }

      if (action === "deposit") {
        if (!tokenAddress) {
          return new Response(
            JSON.stringify({
              error:
                "tokenAddress (underlying ERC20) is required for vault deposits",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        const transactions = buildVaultDeposit(
          vaultAddress,
          tokenAddress,
          amountBn,
          operator,
          numericChainId,
        );
        return new Response(JSON.stringify({ transactions }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "withdraw") {
        const transactions = buildVaultWithdraw(
          vaultAddress,
          amountBn,
          operator,
          numericChainId,
        );
        return new Response(JSON.stringify({ transactions }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          error: `Action "${action}" is not supported for vaults`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Shared slippage conversion: "0.5" % → 50 bps
    const slippageBps = slippage ? Math.round(parseFloat(slippage) * 100) : 50;

    // ── Margin / loop operations (dual-market) ────────────────────────────
    if (isMarginOp) {
      const endpoint = LOOP_ACTION_ENDPOINTS[action];

      const params: Record<string, any> = {
        operator,
        simulate: true,
        slippage: slippageBps,
      };

      if (marketUidIn)  params.marketUidIn  = marketUidIn;
      if (marketUidOut) params.marketUidOut = marketUidOut;

      // Amount field differs per operation
      if (action === "leverage") {
        params.debtAmount = amountBn;
        if (leverage) params.leverage = Number(leverage);
        params.lendingMode = "2";
      } else {
        params.amount = amountBn;
      }

      if (action === "debt-swap") {
        params.irModeIn  = "2";
        params.irModeOut = "2";
      }

      if (isAll) params.isMaxIn = true;

      const result = await deltaGet(endpoint, params);
      const transactions = extractSteps(result, numericChainId);
      const quote = extractQuote(result);

      if (transactions.length === 0) {
        console.error("prepare-tx margin: 0 steps — raw keys:", Object.keys(result ?? {}), "success:", result?.success, "error:", result?.error);
        return new Response(
          JSON.stringify({ error: "The protocol returned no transaction steps — check market liquidity, health factor, or try adjusting the amount.", _debug: { responseKeys: Object.keys(result ?? {}), success: result?.success } }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ transactions, ...(quote && { quote }) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Lending pool path (via 1delta) ────────────────────────────────────
    const endpoint = LENDING_ACTION_ENDPOINTS[action];
    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: `Unsupported action: "${action}"` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const params: Record<string, any> = {
      marketUid,
      amount: amountBn,
      operator,
      simulate: true,
    };

    // Slippage (mainly relevant for swaps, ignored for simple deposit/borrow)
    if (slippageBps > 0) params.slippage = slippageBps;

    // Always use variable rate mode for borrows and repays
    if (action === "borrow" || action === "repay") {
      params.lendingMode = "2";
    }

    const result = await deltaGet(endpoint, params);
    const transactions = extractSteps(result, numericChainId);
    const quote = extractQuote(result);

    if (transactions.length === 0) {
      // Log the raw response to help diagnose format mismatches
      console.error(
        "prepare-tx: 0 steps from 1delta — raw response keys:",
        Object.keys(result ?? {}),
        "| success:", result?.success,
        "| has actions:", !!result?.actions,
        "| has data:", !!result?.data,
        "| error field:", result?.error ?? result?.message,
      );
      return new Response(
        JSON.stringify({
          error:
            "The protocol returned no transaction steps — the market may be paused or the amount may be invalid.",
          _debug: { responseKeys: Object.keys(result ?? {}), success: result?.success },
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        transactions,
        ...(quote && { quote }),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("prepare-tx error:", err);

    // Surface useful error messages to the UI
    const msg: string = err?.message ?? "Failed to prepare transaction";
    const status = msg.includes("400") ? 400 : msg.includes("404") ? 404 : 500;

    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
