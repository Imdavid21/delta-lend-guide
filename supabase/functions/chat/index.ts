import OpenAI from "https://esm.sh/openai@4.58.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const ONEDELTA_API_KEY = Deno.env.get("ONEDELTA_API_KEY");
const BASE = "https://portal.1delta.io/v1";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/* ───── helpers ───── */

async function deltaGet(endpoint: string, params: Record<string, any> = {}) {
  const url = new URL(BASE + endpoint);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach((i: any) => url.searchParams.append(k, String(i)));
    else url.searchParams.append(k, String(v));
  }
  const headers: Record<string, string> = {};
  if (ONEDELTA_API_KEY) headers["x-api-key"] = ONEDELTA_API_KEY;
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`1delta ${res.status}`);
  return res.json();
}

async function deltaPost(endpoint: string, body: Record<string, any>) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ONEDELTA_API_KEY) headers["x-api-key"] = ONEDELTA_API_KEY;
  const res = await fetch(BASE + endpoint, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`1delta POST ${res.status}`);
  return res.json();
}

/* ── Internal markets endpoint (single source of truth) ── */

async function fetchMarketsEndpoint(type: "lending" | "vaults" | "pendle"): Promise<any[]> {
  const url = `${SUPABASE_URL}/functions/v1/markets?type=${type}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) return [];
  return res.json();
}

function slimPools(raw: any, minTvlUsd = 10000) {
  const items = raw?.data?.items ?? raw?.data ?? (Array.isArray(raw) ? raw : []);
  const all = items.map((m: any) => {
    const tvl = parseFloat(m.totalDepositsUsd) || 0;
    const util = parseFloat(m.utilization) || 0;
    const depositRate = parseFloat(m.depositRate) || 0;
    const borrowRate = parseFloat(m.variableBorrowRate) || 0;
    return {
      marketUid: m.marketUid,
      lender: m.lenderKey ?? m.lender ?? "",
      symbol: m.assetGroup ?? m.symbol ?? m.tokenSymbol,
      depositAPR_pct: +depositRate.toFixed(4),
      borrowAPR_pct: +borrowRate.toFixed(4),
      totalDepositsUsd: tvl,
      availableLiquidityUsd: Math.round(tvl * (1 - util) * 100) / 100,
      utilization: +(util * 100).toFixed(2),
    };
  });
  const markets = all
    .filter((m: any) => m.totalDepositsUsd >= minTvlUsd)
    .sort((a: any, b: any) => b.depositAPR_pct - a.depositAPR_pct);
  return { markets, filteredCount: all.length - markets.length };
}

/* ───── tool dispatch ───── */

async function dispatchTool(name: string, input: any): Promise<string> {
  switch (name) {
    case "search_markets": {
      const types: ("lending" | "vaults" | "pendle")[] = input.types ?? ["lending", "vaults", "pendle"];
      const results = await Promise.all(types.map(fetchMarketsEndpoint));
      const allItems: any[] = [];
      types.forEach((t, i) => {
        for (const item of results[i]) {
          allItems.push({ ...item, _type: t });
        }
      });
      // Filter by query terms
      const q = (input.query ?? "").toLowerCase();
      const filtered = q
        ? allItems.filter((m) => {
            const searchable = [
              m.asset, m.protocolName, m.protocol, m.name, m.poolName,
            ].filter(Boolean).join(" ").toLowerCase();
            return q.split(/\s+/).every((term: string) => searchable.includes(term));
          })
        : allItems;
      // Sort: lending by supplyAPY desc, vaults by apy desc, pendle by impliedAPY desc
      filtered.sort((a, b) => (b.supplyAPY ?? b.apy ?? b.impliedAPY ?? 0) - (a.supplyAPY ?? a.apy ?? a.impliedAPY ?? 0));
      const top = filtered.slice(0, input.limit ?? 20);
      return JSON.stringify({ count: filtered.length, markets: top });
    }
    case "find_market":
      return JSON.stringify(
        slimPools(
          await deltaGet("/data/lending/pools", {
            chainId: input.chainId,
            assetGroups: input.assetGroup,
            underlyings: input.tokenAddress,
            lender: input.lender,
            count: input.count ?? 10,
          }),
          input.minTvlUsd ?? 10000
        )
      );
    case "get_lending_markets": {
      const { minTvlUsd, ...rest } = input;
      if (!rest.count) rest.count = 100;
      return JSON.stringify(slimPools(await deltaGet("/data/lending/pools", rest), minTvlUsd ?? 10000));
    }
    case "get_lending_latest":
      return JSON.stringify(await deltaGet("/data/lending/latest", input));
    case "get_lending_metadata":
      return JSON.stringify(await deltaGet("/data/meta/lending/complete", input));
    case "get_user_positions":
      return JSON.stringify(await deltaGet("/data/lending/user-positions", input));
    case "get_supported_chains":
      return JSON.stringify(await deltaGet("/data/chains"));
    case "get_lender_ids":
      return JSON.stringify(await deltaGet("/data/lender-ids"));
    case "get_token_info":
      return JSON.stringify(await deltaGet("/data/token/available", input));
    case "get_token_price": {
      const raw = await deltaGet("/data/prices/latest", { assets: input.assets });
      const items = raw?.data?.items ?? raw;
      const filtered: any = {};
      for (const k of input.assets) if (items[k]) filtered[k] = items[k];
      return JSON.stringify({ prices: Object.keys(filtered).length ? filtered : items });
    }
    case "get_token_balances":
      return JSON.stringify(await deltaGet("/data/token/balances", input));
    // Basic lending actions
    case "get_deposit_calldata":
      return JSON.stringify(await deltaGet("/actions/lending/deposit", { ...input, simulate: true }));
    case "get_withdraw_calldata":
      return JSON.stringify(await deltaGet("/actions/lending/withdraw", { ...input, simulate: true }));
    case "get_borrow_calldata":
      return JSON.stringify(await deltaGet("/actions/lending/borrow", { ...input, simulate: true }));
    case "get_repay_calldata":
      return JSON.stringify(await deltaGet("/actions/lending/repay", { ...input, simulate: true }));
    // Leveraged / loop actions
    case "get_leverage_calldata":
      return JSON.stringify(await deltaGet("/actions/loop/leverage", { ...input, simulate: true }));
    case "get_close_leverage_calldata":
      return JSON.stringify(await deltaGet("/actions/loop/close", { ...input, simulate: true }));
    case "get_collateral_swap_calldata":
      return JSON.stringify(await deltaGet("/actions/loop/collateral-swap", { ...input, simulate: true }));
    case "get_debt_swap_calldata":
      return JSON.stringify(await deltaGet("/actions/loop/debt-swap", { ...input, simulate: true }));
    // Batch operations
    case "get_batch_calldata":
      return JSON.stringify(await deltaPost("/actions/allocate/multi-op", input));
    // Collateral & E-mode management
    case "enable_collateral":
      return JSON.stringify(await deltaGet("/actions/lending/enable-collateral", { ...input, simulate: true }));
    case "disable_collateral":
      return JSON.stringify(await deltaGet("/actions/lending/disable-collateral", { ...input, simulate: true }));
    case "switch_emode":
      return JSON.stringify(await deltaGet("/actions/lending/switch-emode", { ...input, simulate: true }));
    case "list_emode_categories":
      return JSON.stringify(await deltaGet("/data/lending/emode-categories", input));
    case "repay_with_atoken":
      return JSON.stringify(await deltaGet("/actions/lending/repay-with-atoken", { ...input, simulate: true }));
    default:
      return JSON.stringify({ error: "Unknown tool" });
  }
}

const ACTION_TOOLS = new Set([
  "get_deposit_calldata",
  "get_withdraw_calldata",
  "get_borrow_calldata",
  "get_repay_calldata",
  "get_leverage_calldata",
  "get_close_leverage_calldata",
  "get_collateral_swap_calldata",
  "get_debt_swap_calldata",
  "get_batch_calldata",
  "enable_collateral",
  "disable_collateral",
  "switch_emode",
  "repay_with_atoken",
]);

function extractAction(toolName: string, rawJson: string, input: any) {
  try {
    const body = JSON.parse(rawJson);
    const actions = body?.actions ?? body;
    const baseDesc = toolName.replace("get_", "").replace("_calldata", "");
    const chainId =
      typeof input.marketUid === "string"
        ? parseInt(input.marketUid.split(":")[1], 10) || undefined
        : typeof input.marketUidIn === "string"
        ? parseInt(input.marketUidIn.split(":")[1], 10) || undefined
        : undefined;
    const toStep = (item: any, desc: string) =>
      item?.to && item?.data
        ? { description: desc, to: item.to, data: item.data, value: item.value ?? "0x0", chainId }
        : null;
    const steps = [
      ...(actions.permissions ?? []).map((p: any) => toStep(p, p.info ?? "approve")),
      ...(actions.transactions ?? []).map((t: any) => toStep(t, baseDesc)),
    ].filter(Boolean);
    const { actions: _a, success: _s, data, ...rest } = body;
    const dataObj = data && typeof data === "object" && !Array.isArray(data) ? data : {};
    const quoteSource = { ...dataObj, ...rest };
    return { steps, quote: Object.keys(quoteSource).length ? quoteSource : undefined };
  } catch {
    return { steps: [] };
  }
}

/* ───── tool definitions ───── */

const TOOLS: any[] = [
  // ── Unified search (single source of truth — same data as UI tables) ──
  {
    type: "function",
    function: {
      name: "search_markets",
      description:
        "Search across ALL market types (lending, vaults, fixed-yield) using the same data the UI displays. Use for informational queries: comparing rates, finding best yields, answering questions about markets. Results include protocolName, asset, supplyAPY/apy/impliedAPY, TVL, etc.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search term: asset name, protocol name, or keyword e.g. 'USDC', 'Aave', 'ETH Morpho'",
          },
          types: {
            type: "array",
            items: { type: "string", enum: ["lending", "vaults", "pendle"] },
            description: "Which market types to search. Default: all three.",
          },
          limit: { type: "number", description: "Max results to return, default 20" },
        },
      },
    },
  },
  // ── Data tools (for action preparation — need marketUid) ──
  {
    type: "function",
    function: {
      name: "find_market",
      description: "Find a lending market's marketUid by token/protocol. Use before deposit/withdraw/borrow/repay.",
      parameters: {
        type: "object",
        properties: {
          chainId: { type: "string", description: "Numeric chain ID e.g. '1' for Ethereum" },
          assetGroup: { type: "string", description: "Asset name e.g. 'USDC', 'ETH' (use 'ETH' for WETH)" },
          tokenAddress: { type: "string" },
          lender: { type: "string", description: "e.g. 'AAVE_V3'" },
          count: { type: "number" },
          minTvlUsd: { type: "number" },
        },
        required: ["chainId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_lending_markets",
      description: "Browse lending markets. Use sortBy='depositRate' + sortDir='desc' for best yield.",
      parameters: {
        type: "object",
        properties: {
          chainId: { type: "string" },
          lender: { type: "string" },
          assetGroups: { type: "string", description: "Comma-separated e.g. 'USDC,ETH'" },
          minYield: { type: "number" },
          maxYield: { type: "number" },
          minTvlUsd: { type: "number" },
          sortBy: { type: "string", enum: ["depositRate", "variableBorrowRate", "utilization", "totalDepositsUsd"] },
          sortDir: { type: "string", enum: ["asc", "desc"] },
          count: { type: "number" },
        },
        required: ["chainId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_lending_latest",
      description: "Get latest rate snapshots with enriched price/yield data. Good for detailed market analysis.",
      parameters: {
        type: "object",
        properties: {
          chains: { type: "string", description: "Comma-separated chain IDs e.g. '1'" },
          lenders: { type: "string", description: "Comma-separated lender IDs" },
        },
        required: ["chains"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_lending_metadata",
      description: "Get comprehensive protocol metadata — supported assets, lender configs, risk parameters.",
      parameters: {
        type: "object",
        properties: {
          chainIds: { type: "string", description: "Comma-separated chain IDs" },
          lenders: { type: "string", description: "Comma-separated lender IDs" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_user_positions",
      description: "Get lending/borrowing positions for a wallet. Returns deposits, debts, health factor, net worth.",
      parameters: {
        type: "object",
        properties: {
          account: { type: "string", description: "Wallet address 0x-" },
          chains: { type: "string", description: "Comma-separated chain IDs e.g. '1'" },
          lenders: { type: "string" },
        },
        required: ["account", "chains"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_supported_chains",
      description: "Get list of supported chains.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_lender_ids",
      description: "Get list of supported lending protocol IDs.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_token_info",
      description: "Get token metadata (decimals, address). Call before action tools when decimals unknown.",
      parameters: {
        type: "object",
        properties: {
          chainId: { type: "string" },
          assetGroup: { type: "string" },
          symbol: { type: "string" },
          address: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_token_price",
      description: "Get USD prices for tokens. Use when user specifies amount in USD.",
      parameters: {
        type: "object",
        properties: {
          assets: { type: "array", items: { type: "string" }, description: "Asset group keys e.g. ['ETH','USDC']" },
        },
        required: ["assets"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_token_balances",
      description: "Get token balances for a wallet on a chain.",
      parameters: {
        type: "object",
        properties: {
          chainId: { type: "string" },
          account: { type: "string" },
          assets: { type: "string", description: "Comma-separated token addresses" },
        },
        required: ["chainId", "account", "assets"],
      },
    },
  },
  // ── Basic lending actions ──
  {
    type: "function",
    function: {
      name: "get_deposit_calldata",
      description: "Build calldata to deposit/supply into a lending pool.",
      parameters: {
        type: "object",
        properties: {
          marketUid: { type: "string", description: "lender:chainId:tokenAddress" },
          amount: { type: "string", description: "Base units integer string, no decimals. E.g. 1 USDC = '1000000'" },
          operator: { type: "string", description: "Wallet address" },
          receiver: { type: "string" },
          payAsset: { type: "string", description: "If paying with different token, its address" },
          mode: { type: "string", enum: ["direct", "proxy"] },
        },
        required: ["marketUid", "amount", "operator"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_withdraw_calldata",
      description: "Build calldata to withdraw from a lending pool.",
      parameters: {
        type: "object",
        properties: {
          marketUid: { type: "string" },
          amount: { type: "string" },
          operator: { type: "string" },
          receiver: { type: "string" },
          receiveAsset: { type: "string", description: "If receiving different token, its address" },
          isAll: { type: "boolean" },
          mode: { type: "string", enum: ["direct", "proxy"] },
        },
        required: ["marketUid", "amount", "operator"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_borrow_calldata",
      description: "Build calldata to borrow from a lending pool.",
      parameters: {
        type: "object",
        properties: {
          marketUid: { type: "string" },
          amount: { type: "string" },
          operator: { type: "string" },
          receiver: { type: "string" },
          receiveAsset: { type: "string" },
          lendingMode: { type: "string", enum: ["0", "1", "2"], description: "0=none 1=stable 2=variable" },
          mode: { type: "string", enum: ["direct", "proxy"] },
        },
        required: ["marketUid", "amount", "operator"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_repay_calldata",
      description: "Build calldata to repay borrowed assets.",
      parameters: {
        type: "object",
        properties: {
          marketUid: { type: "string" },
          amount: { type: "string" },
          operator: { type: "string" },
          payAsset: { type: "string", description: "If paying with different token, its address" },
          isAll: { type: "boolean" },
          lendingMode: { type: "string", enum: ["0", "1", "2"] },
          mode: { type: "string", enum: ["direct", "proxy"] },
        },
        required: ["marketUid", "amount", "operator"],
      },
    },
  },
  // ── Leveraged / loop actions ──
  {
    type: "function",
    function: {
      name: "get_leverage_calldata",
      description: "Open a leveraged position atomically (flash loan → borrow → swap → deposit). Use for looping strategies.",
      parameters: {
        type: "object",
        properties: {
          marketUidIn: { type: "string", description: "Debt market UID (lender:chainId:address)" },
          marketUidOut: { type: "string", description: "Collateral market UID (lender:chainId:address)" },
          debtAmount: { type: "string", description: "Base units integer string for debt amount" },
          slippage: { type: "number", description: "Slippage in basis points e.g. 50 = 0.5%" },
          leverage: { type: "number", description: "Target leverage multiplier e.g. 2.0" },
          operator: { type: "string", description: "Wallet address" },
          payAsset: { type: "string", description: "Optional: initial collateral token address if different" },
          payAmount: { type: "string", description: "Optional: initial collateral amount in base units" },
          lendingMode: { type: "string", enum: ["0", "1", "2"] },
          mode: { type: "string", enum: ["direct", "proxy"] },
        },
        required: ["marketUidIn", "marketUidOut", "debtAmount", "slippage", "operator"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_close_leverage_calldata",
      description: "Unwind/close a leveraged position atomically in one transaction (flash loan → repay → withdraw → swap).",
      parameters: {
        type: "object",
        properties: {
          marketUidIn: { type: "string", description: "Debt market UID" },
          marketUidOut: { type: "string", description: "Collateral market UID" },
          amount: { type: "string", description: "Amount to close in base units. Use max uint for full close." },
          slippage: { type: "number", description: "Slippage in bps e.g. 50 = 0.5%" },
          operator: { type: "string", description: "Wallet address" },
          receiveAsset: { type: "string" },
          lendingMode: { type: "string", enum: ["0", "1", "2"] },
          mode: { type: "string", enum: ["direct", "proxy"] },
        },
        required: ["marketUidIn", "marketUidOut", "amount", "slippage", "operator"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_collateral_swap_calldata",
      description: "Change collateral type without closing the position (e.g. swap ETH collateral to WBTC). Uses flash loan internally.",
      parameters: {
        type: "object",
        properties: {
          marketUidIn: { type: "string", description: "Current collateral market UID (to withdraw from)" },
          marketUidOut: { type: "string", description: "New collateral market UID (to deposit into)" },
          amount: { type: "string", description: "Amount in base units of current collateral to swap" },
          slippage: { type: "number", description: "Slippage in bps" },
          operator: { type: "string" },
          isMaxIn: { type: "boolean", description: "If true, swap entire collateral balance" },
          mode: { type: "string", enum: ["direct", "proxy"] },
        },
        required: ["marketUidIn", "marketUidOut", "amount", "slippage", "operator"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_debt_swap_calldata",
      description: "Change debt type without affecting collateral (e.g. switch USDC debt to USDT). Uses flash loan internally.",
      parameters: {
        type: "object",
        properties: {
          marketUidIn: { type: "string", description: "Current debt market UID (to repay)" },
          marketUidOut: { type: "string", description: "New debt market UID (to borrow from)" },
          amount: { type: "string", description: "Amount in base units of current debt to swap" },
          slippage: { type: "number", description: "Slippage in bps" },
          operator: { type: "string" },
          isMaxOut: { type: "boolean", description: "If true, swap full debt" },
          irModeIn: { type: "string", enum: ["0", "1", "2"], description: "Interest rate mode of current debt" },
          irModeOut: { type: "string", enum: ["0", "1", "2"], description: "Interest rate mode for new debt" },
          mode: { type: "string", enum: ["direct", "proxy"] },
        },
        required: ["marketUidIn", "marketUidOut", "amount", "slippage", "operator"],
      },
    },
  },
  // ── Batch operations ──
  {
    type: "function",
    function: {
      name: "get_batch_calldata",
      description: "Batch multiple lending operations into a single atomic transaction via deltaCompose.",
      parameters: {
        type: "object",
        properties: {
          chainId: { type: "string" },
          operator: { type: "string" },
          operations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string", enum: ["deposit", "withdraw", "borrow", "repay"] },
                marketUid: { type: "string" },
                amount: { type: "string" },
              },
              required: ["action", "marketUid", "amount"],
            },
            description: "Array of lending operations to execute atomically",
          },
        },
        required: ["chainId", "operator", "operations"],
      },
    },
  },
  // ── Collateral management ──
  {
    type: "function",
    function: {
      name: "enable_collateral",
      description: "Enable a deposited asset as collateral for borrowing (Aave V2/V3).",
      parameters: {
        type: "object",
        properties: {
          marketUid: { type: "string", description: "Market UID of the deposited asset" },
          operator: { type: "string", description: "Wallet address" },
        },
        required: ["marketUid", "operator"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "disable_collateral",
      description: "Disable a deposited asset as collateral (Aave V2/V3). Reduces liquidation risk but lowers borrow capacity.",
      parameters: {
        type: "object",
        properties: {
          marketUid: { type: "string", description: "Market UID of the deposited asset" },
          operator: { type: "string", description: "Wallet address" },
        },
        required: ["marketUid", "operator"],
      },
    },
  },
  // ── E-Mode ──
  {
    type: "function",
    function: {
      name: "list_emode_categories",
      description: "List available E-Mode categories for an Aave V3 market. Returns category IDs, names, and parameters (LTV, liquidation threshold).",
      parameters: {
        type: "object",
        properties: {
          chainId: { type: "string" },
          lender: { type: "string", description: "e.g. 'AAVE_V3'" },
        },
        required: ["chainId", "lender"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "switch_emode",
      description: "Switch E-Mode category on Aave V3. Category 0 = disable E-Mode. Higher categories give better LTV for correlated assets.",
      parameters: {
        type: "object",
        properties: {
          marketUid: { type: "string", description: "Any Aave V3 market UID on the target chain" },
          categoryId: { type: "number", description: "E-Mode category ID (0 to disable)" },
          operator: { type: "string", description: "Wallet address" },
        },
        required: ["marketUid", "categoryId", "operator"],
      },
    },
  },
  // ── Repay with aToken ──
  {
    type: "function",
    function: {
      name: "repay_with_atoken",
      description: "Repay debt using collateral aToken directly (Aave V2/V3). Avoids needing to withdraw + swap first.",
      parameters: {
        type: "object",
        properties: {
          marketUid: { type: "string", description: "Market UID of the debt to repay" },
          amount: { type: "string", description: "Amount in base units. Use max uint for full repay." },
          operator: { type: "string", description: "Wallet address" },
          lendingMode: { type: "string", enum: ["0", "1", "2"], description: "0=none 1=stable 2=variable" },
        },
        required: ["marketUid", "amount", "operator"],
      },
    },
  },
];

/* ───── system prompt ───── */

const SYSTEM_PROMPT = `You are Klyro — a DeFi lending intelligence assistant. Use the provided tools to answer all
questions about lending markets, rates, positions, and DeFi actions on Ethereum.

TOOL-USE STRATEGY:
1. **For informational queries** (rates, comparisons, "best yield", "where to deposit", market browsing): ALWAYS use search_markets FIRST. It returns the same data the user sees in the UI tables — identical protocol names, asset names, APYs, and TVL. This is the single source of truth.
2. **CRITICAL — Morpho Blue**: Morpho Blue markets appear ONLY in the "vaults" type, NOT in "lending". When a user asks about Morpho opportunities, rates, or markets, you MUST include "vaults" in the types array. Use types=["lending","vaults"] or types=["vaults"] for Morpho queries. The same applies to Euler.
3. **For action preparation** (deposit, withdraw, borrow, repay): use find_market to get marketUid, then the action tool.
4. Chain IDs and lender IDs must be exact — use the references below or call get_supported_chains / get_lender_ids.
5. Call get_user_positions ONLY when user explicitly asks about their positions.
6. For action tools: get token decimals first via get_token_info, then amount = tokens × 10^decimals as integer string.
7. For leveraged positions: you need TWO marketUids — marketUidIn (debt side) and marketUidOut (collateral side).
8. Use get_lending_metadata when user asks about protocol configs, risk parameters, supported assets.
9. **When showing opportunities, ALWAYS format each one as a clickable market link using the market's id field.** Use format: [Market Name](market:MARKET_ID) where MARKET_ID is the exact \`id\` field from search_markets results. This makes the link clickable in the UI so the user can take action directly.

ID-BASED MARKET MAPPING (CRITICAL):
- Every market from search_markets has an \`id\` field. This is the unique identifier across all market types.
- Lending markets also have a \`marketUid\` field (format: LENDER:chainId:tokenAddress) used for action tools.
- Vaults have an \`id\` that matches their marketUid.
- **When linking to a market in markdown, ALWAYS use the id**: \`[Gauntlet USDC/wstETH](market:MORPHO_BLUE_XXX:1:0xabc)\`
- **When a user clicks a market link or asks about a specific market by id**, use that id directly with find_market or action tools.
- If user message contains "(market id: ...)" or "(id: ...)", extract that id and use it for the action.

search_markets FIELD REFERENCE:
- Lending results: id, marketUid, protocolName, asset, supplyAPY (percentage), borrowAPR (percentage or null), totalSupplyUSD, availableLiquidityUSD, utilizationRate
- Vault results: id, marketUid, name, protocol, asset, apy (percentage), tvl, curator (optional — the vault curator/manager name, e.g. "Gauntlet", "Steakhouse", "RE7 Labs")
- Pendle results: id, name, asset, impliedAPY (percentage), expiry, daysToMaturity, tvl
Display APY/APR values directly with % sign — they are already percentages.

MORPHO CURATOR INFO:
- Morpho Blue vaults often have a curator (risk manager) like Gauntlet, Steakhouse, RE7 Labs, Block Analitica, etc.
- When displaying Morpho vaults, include the curator name if available: e.g. "Gauntlet USDC/wstETH" or "Steakhouse USDC".
- The curator field is available in vault search results. Use it to give users context about who manages the vault's risk parameters.

CHAIN ID REFERENCE:
Ethereum:1, OP Mainnet:10, Cronos:25, Telos:40, XDC:50, BNB:56, Gnosis:100, Unichain:130,
Polygon:137, Monad:143, Sonic:146, Manta:169, Fantom:250, Metis:1088, Core DAO:1116,
Moonbeam:1284, Sei:1329, Soneium:1868, Morph:2818, Mantle:5000, Klaytn:8217, Base:8453,
Plasma:9745, Mode:34443, Arbitrum:42161, Hemi:43111, Avalanche:43114, Linea:59144,
Berachain:80094, Blast:81457, Taiko:167000, Scroll:534352, Katana:747474

LENDER ID REFERENCE:
AAVE_V2, AAVE_V3, COMPOUND_V2, COMPOUND_V3, LENDLE, AURELIUS, MENDI, MOONWELL, SILO, RADIANT_V2, MORPHO_BLUE

ASSET GROUPS: Use 'ETH' for WETH. All other tokens use their own symbol (USDC, WBTC, wstETH, etc.).

FORMATTING — render entities as special markdown links (the UI converts these to interactive chips/cards):
- Token:    [SYMBOL](token:SYMBOL)               e.g. [USDC](token:USDC)
- Chain:    [Name](chain:CHAIN_ID)               e.g. [Ethereum](chain:1)
- Market:   [Label](market:ID|PROTOCOL|ASSET|APY|TVL)
  Example: [Gauntlet USDC/wstETH](market:MORPHO_BLUE_xxx:1:0xabc|Morpho Blue|USDC|5.96|8265748)
  - ID = the market's \`id\` field
  - PROTOCOL = protocolName or protocol field (e.g. "Morpho Blue", "Aave V3")
  - ASSET = asset symbol (e.g. "USDC", "ETH")
  - APY = the APY/yield number WITHOUT % sign (e.g. "5.96")
  - TVL = total TVL in USD as number WITHOUT $ sign (e.g. "8265748")
  All 5 pipe-separated fields are REQUIRED. The UI renders these as rich clickable cards with icons.
  NEVER use plain text for markets — always link them with the full metadata format.
  Each market link should be on its OWN LINE (not inline with other text). Do not add extra text like "- 5.96% APY, TVL: $8M" after the link — it's already encoded in the link.

RATE FORMATTING (CRITICAL):
- search_markets returns supplyAPY, apy, impliedAPY as PERCENTAGE values. Display them directly with a % sign.
- Example: supplyAPY=5.73 → "5.73% APY". Do NOT divide or multiply — they are already percentages.
- Results are pre-sorted by yield descending. The FIRST items are the BEST rates.
- When asked for "best" or "top" rates: use the first N items from the results. Exclude rates below 0.01%.
- For find_market/get_lending_markets (raw 1delta data): depositAPR_pct and borrowAPR_pct are also percentages.
- Prefer Aave V3, Compound V3, Morpho Blue, Spark over deprecated V2 protocols unless user asks specifically.
- $0 available liquidity = 100% utilization = maximum deposit yield. Never warn against depositing.

LEVERAGED OPERATIONS (Loop Tools):
- get_leverage_calldata: Open a leveraged position. Flash loan → borrow → swap → deposit, all atomic.
  marketUidIn = debt market, marketUidOut = collateral market.
  Example: leverage ETH with USDC debt → marketUidIn=USDC market, marketUidOut=ETH market.
  Slippage in basis points (50 = 0.5%). Always use mode='proxy' for loop operations.
- get_close_leverage_calldata: Unwind a leveraged position. Flash loan → repay → withdraw → swap, all atomic.
  Same market convention: marketUidIn=debt, marketUidOut=collateral.
- get_collateral_swap_calldata: Change collateral without closing position. marketUidIn=old collateral, marketUidOut=new collateral.
- get_debt_swap_calldata: Change debt without affecting collateral. marketUidIn=old debt, marketUidOut=new debt.
  Supports interest rate mode switching via irModeIn/irModeOut.
- get_batch_calldata: Combine multiple deposit/withdraw/borrow/repay in one atomic tx via deltaCompose.

COLLATERAL & E-MODE MANAGEMENT:
- enable_collateral / disable_collateral: Toggle whether a deposited asset is used as collateral. Only for Aave V2/V3.
  Use find_market first to get the marketUid. Disabling collateral reduces liquidation risk but lowers borrow capacity.
- list_emode_categories: Query available E-Mode categories on Aave V3. Call before switch_emode.
- switch_emode: Switch E-Mode on Aave V3. Category 0 = disable. Higher categories (e.g. 1=stablecoins, 2=ETH correlated)
  give better LTV/liquidation thresholds for correlated asset pairs.
- repay_with_atoken: Repay debt using the collateral aToken directly (Aave only). Useful when the user wants to
  repay without withdrawing and swapping. The collateral balance decreases by the repaid amount.

All leveraged operations use flash loans internally (free from Morpho Blue) and execute through the deltaCompose(bytes) entry point — a single contract call that encodes all sub-operations atomically.

VAULT & PROTOCOL SUPPORT (CRITICAL):
- Action tools (deposit, withdraw, borrow, repay, leverage, etc.) ONLY work with 1delta-supported lending protocols: Aave V2/V3, Compound V2/V3, Spark, Morpho Blue, Radiant, Moonwell, Mendi, Silo, Euler, etc.
- Yearn vaults are NOT displayed in the UI and are not supported for actions.
- Pendle fixed-yield markets are displayed in the UI and available via search_markets for informational queries (APY, TVL, maturity). However, Pendle PT/YT trading execution is NOT supported yet via action tools. If a user asks to buy a Pendle PT or trade on Pendle, explain that execution isn't available yet but show them the market data.
- For Morpho Blue and Euler vaults shown in search_markets results, you CAN use find_market + action tools since they are backed by 1delta lending pools.

AFTER ACTION TOOLS: The UI renders a Simulation panel automatically.
Respond with ONE sentence only, e.g. "Opening 2x leveraged [ETH](token:ETH) position on [Aave V3](market:AAVE_V3:1)."
No summaries, no tables, no bullet points after actions.`;

/* ───── agent loop ───── */

async function runAgent(query: string, userAddress?: string, history: any[] = []) {
  const messages: any[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-10),
    { role: "user", content: userAddress ? `[Wallet: ${userAddress}]\n${query}` : query },
  ];
  const collectedSteps: any[] = [];
  let collectedQuote: any;

  let response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 4096,
    tools: TOOLS,
    messages,
  });

  while (response.choices[0].finish_reason === "tool_calls") {
    const toolCalls = response.choices[0].message.tool_calls ?? [];
    messages.push(response.choices[0].message);
    for (const tc of toolCalls) {
      if (tc.type !== "function") continue;
      const input = JSON.parse(tc.function.arguments);
      let result = await dispatchTool(tc.function.name, input);
      if (result.length > 6000) result = result.slice(0, 6000) + "[truncated]";
      if (ACTION_TOOLS.has(tc.function.name)) {
        const { steps, quote } = extractAction(tc.function.name, result, input);
        collectedSteps.push(...steps);
        if (quote) collectedQuote = quote;
      }
      messages.push({ role: "tool", tool_call_id: tc.id, content: result });
    }
    response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 4096,
      tools: TOOLS,
      messages,
    });
  }

  return {
    response: response.choices[0].message.content ?? "",
    ...(collectedSteps.length > 0 && { transactions: collectedSteps }),
    ...(collectedQuote && { quote: collectedQuote }),
  };
}

/* ───── HTTP handler ───── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, userAddress, history } = await req.json();
    const result = await runAgent(query, userAddress, history ?? []);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Chat error:", err);
    return new Response(JSON.stringify({ error: err.message ?? "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
