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
  const actions = body?.actions ?? body;
  const toStep = (item: any, desc: string): TxStep | null =>
    item?.to && item?.data
      ? {
          description: desc,
          to: item.to,
          data: item.data,
          value: item.value ?? "0x0",
          ...(chainId && { chainId }),
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

// ── Action → 1delta endpoint map ────────────────────────────────────────────

const ACTION_ENDPOINTS: Record<string, string> = {
  deposit: "/actions/lending/deposit",
  withdraw: "/actions/lending/withdraw",
  borrow: "/actions/lending/borrow",
  repay: "/actions/lending/repay",
};

// ── HTTP handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const {
      action,          // "deposit" | "withdraw" | "borrow" | "repay"
      marketId,        // e.g. "morpho-vault:1:0xBeef..." or "AAVE_V3:1:0xAbc..."
      marketUid,       // vault address for vaults, or lending market UID
      amount,          // human-readable amount string, e.g. "10" or "10.5"
      asset,           // asset symbol, e.g. "USDC"
      operator,        // wallet address
      chainId,         // numeric chain ID (number or string)
      slippage,        // slippage tolerance as percentage string, e.g. "0.5"
      tokenAddress,    // underlying ERC20 address (required for vault deposits)
    } = body;

    // ── Validation ────────────────────────────────────────────────────────
    if (!action || !marketUid || !amount || !asset || !operator) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required fields: action, marketUid, amount, asset, operator",
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
    const isVault = mid.startsWith("morpho-vault:") || mid.startsWith("euler:");

    // ── Vault path (ERC4626 direct calldata) ──────────────────────────────
    if (isVault) {
      // For morpho-vault, marketUid IS the vault contract address.
      // For euler, marketUid is the 1delta market UID — extract the token address component
      // which for Euler Finance IS the vault contract.
      let vaultAddress = marketUid;

      // If marketUid looks like "EULER_xxx:chainId:0xAddress", extract the address
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

    // ── Lending pool path (via 1delta) ────────────────────────────────────
    const endpoint = ACTION_ENDPOINTS[action];
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

    // Convert slippage % to basis points (e.g. "0.5" → 50)
    if (slippage) {
      const bps = Math.round(parseFloat(slippage) * 100);
      if (bps > 0) params.slippage = bps;
    }

    // Always use variable rate mode for borrows
    if (action === "borrow") {
      params.lendingMode = "2";
    }

    const result = await deltaGet(endpoint, params);
    const transactions = extractSteps(result, numericChainId);
    const quote = extractQuote(result);

    if (transactions.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            "The protocol returned no transaction steps — the market may be paused or the amount may be invalid.",
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
