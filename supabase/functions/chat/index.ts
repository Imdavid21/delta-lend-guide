import OpenAI from "https://esm.sh/openai@4.58.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const ONEDELTA_API_KEY = Deno.env.get("ONEDELTA_API_KEY");
const BASE = "https://portal.1delta.io/v1";

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

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

function slimPools(raw: any, minTvlUsd = 10000) {
  const items = raw?.data?.items ?? raw?.data ?? (Array.isArray(raw) ? raw : []);
  const all = items.map((m: any) => {
    const tvl = parseFloat(m.totalDepositsUsd) || 0;
    const util = parseFloat(m.utilization) || 0;
    return {
      marketUid: m.marketUid,
      symbol: m.assetGroup ?? m.symbol ?? m.tokenSymbol,
      depositRate: m.depositRate,
      variableBorrowRate: m.variableBorrowRate,
      totalDepositsUsd: tvl,
      availableLiquidityUsd: Math.round(tvl * (1 - util) * 100) / 100,
      utilization: util,
    };
  });
  const markets = all.filter((m: any) => m.totalDepositsUsd >= minTvlUsd);
  return { markets, filteredCount: all.length - markets.length };
}

async function dispatchTool(name: string, input: any): Promise<string> {
  switch (name) {
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
      return JSON.stringify(slimPools(await deltaGet("/data/lending/pools", rest), minTvlUsd ?? 10000));
    }
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
    case "get_deposit_calldata":
      return JSON.stringify(await deltaGet("/actions/lending/deposit", { ...input, simulate: true }));
    case "get_withdraw_calldata":
      return JSON.stringify(await deltaGet("/actions/lending/withdraw", { ...input, simulate: true }));
    case "get_borrow_calldata":
      return JSON.stringify(await deltaGet("/actions/lending/borrow", { ...input, simulate: true }));
    case "get_repay_calldata":
      return JSON.stringify(await deltaGet("/actions/lending/repay", { ...input, simulate: true }));
    default:
      return JSON.stringify({ error: "Unknown tool" });
  }
}

const ACTION_TOOLS = new Set([
  "get_deposit_calldata",
  "get_withdraw_calldata",
  "get_borrow_calldata",
  "get_repay_calldata",
]);

function extractAction(toolName: string, rawJson: string, input: any) {
  try {
    const body = JSON.parse(rawJson);
    const actions = body?.actions ?? body;
    const baseDesc = toolName.replace("get_", "").replace("_calldata", "");
    const chainId =
      typeof input.marketUid === "string"
        ? parseInt(input.marketUid.split(":")[1], 10) || undefined
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

const TOOLS: any[] = [
  {
    type: "function",
    function: {
      name: "find_market",
      description: "Find a lending market's marketUid by token/protocol. Use before deposit/withdraw/borrow/repay.",
      parameters: {
        type: "object",
        properties: {
          chainId: { type: "string", description: "Numeric chain ID e.g. '42161' for Arbitrum" },
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
      name: "get_user_positions",
      description: "Get lending/borrowing positions for a wallet.",
      parameters: {
        type: "object",
        properties: {
          account: { type: "string", description: "Wallet address 0x-" },
          chains: { type: "string", description: "Comma-separated chain IDs e.g. '1,42161'" },
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
  {
    type: "function",
    function: {
      name: "get_deposit_calldata",
      description: "Build calldata to deposit into a lending pool.",
      parameters: {
        type: "object",
        properties: {
          marketUid: { type: "string", description: "lender:chainId:tokenAddress" },
          amount: { type: "string", description: "Base units integer string, no decimals. E.g. 1 USDC = '1000000'" },
          operator: { type: "string", description: "Wallet address" },
          receiver: { type: "string" },
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
          isAll: { type: "boolean" },
          lendingMode: { type: "string", enum: ["0", "1", "2"] },
          mode: { type: "string", enum: ["direct", "proxy"] },
        },
        required: ["marketUid", "amount", "operator"],
      },
    },
  },
];

const SYSTEM_PROMPT = `You are a helpful DeFi lending assistant. Use the provided tools to answer all
questions about lending markets, rates, positions, and DeFi actions.

TOOL-USE STRATEGY:
1. Chain IDs and lender IDs must be exact — use the references below or call get_supported_chains / get_lender_ids.
2. Use find_market (chainId + lender + assetGroup) to get a marketUid before any action.
3. Call get_user_positions ONLY when user explicitly asks about their positions.
4. For action tools: get token decimals first via get_token_info, then amount = tokens × 10^decimals as integer string.

CHAIN ID REFERENCE:
Ethereum:1, OP Mainnet:10, Cronos:25, Telos:40, XDC:50, BNB:56, Gnosis:100, Unichain:130,
Polygon:137, Monad:143, Sonic:146, Manta:169, Fantom:250, Metis:1088, Core DAO:1116,
Moonbeam:1284, Sei:1329, Soneium:1868, Morph:2818, Mantle:5000, Klaytn:8217, Base:8453,
Plasma:9745, Mode:34443, Arbitrum:42161, Hemi:43111, Avalanche:43114, Linea:59144,
Berachain:80094, Blast:81457, Taiko:167000, Scroll:534352, Katana:747474

LENDER ID REFERENCE:
AAVE_V2, AAVE_V3, COMPOUND_V2, COMPOUND_V3, LENDLE, AURELIUS, MENDI, MOONWELL, SILO, RADIANT_V2

ASSET GROUPS: Use 'ETH' for WETH. All other tokens use their own symbol (USDC, WBTC, wstETH, etc.).

FORMATTING — render entities as special markdown links (the UI converts these to interactive chips):
- Token:    [SYMBOL](token:SYMBOL)               e.g. [USDC](token:USDC)
- Chain:    [Name](chain:CHAIN_ID)               e.g. [Arbitrum](chain:42161)
- Protocol: [Name](market:LENDER_ID:CHAIN_ID)   e.g. [Aave V3](market:AAVE_V3:42161)
Use these for EVERY token, chain, and protocol mention — never plain text.

APR RULES:
- depositRate = protocol APR only. True yield = intrinsic asset yield + depositRate.
- variableBorrowRate = cost to borrower. Frame as "you pay X% APR".
- $0 available liquidity = 100% utilization = maximum deposit yield. Never warn against depositing.

AFTER ACTION TOOLS: The UI renders a Simulation panel automatically.
Respond with ONE sentence only, e.g. "Depositing 1 ETH on [Aave V3](market:AAVE_V3:1)."
No summaries, no tables, no bullet points after actions.`;

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
