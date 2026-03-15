import OpenAI from "https://esm.sh/openai@4.58.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
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
  const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(12_000) });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`1delta ${res.status}: ${body}`);
  }
  return res.json();
}

async function deltaPost(endpoint: string, body: Record<string, any>) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ONEDELTA_API_KEY) headers["x-api-key"] = ONEDELTA_API_KEY;
  const res = await fetch(BASE + endpoint, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`1delta POST ${res.status}`);
  return res.json();
}

/* ── Internal markets endpoint (single source of truth) ── */

async function fetchMarketsEndpoint(type: "lending" | "vaults"): Promise<any[]> {
  const url = `${SUPABASE_URL}/functions/v1/markets?type=${type}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(20_000),
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
  try {
  switch (name) {
    case "search_markets": {
      const types: ("lending" | "vaults")[] = (input.types ?? ["lending", "vaults"]).filter((t: string) => t !== "pendle") as ("lending" | "vaults")[];
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
      const top = filtered.slice(0, input.limit ?? 50);
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
      if (!rest.count) rest.count = 500;
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
    // ERC4626 vault deposit (for MetaMorpho vaults)
    case "vault_deposit": {
      const { vaultAddress, assetAddress, amount, operator } = input;
      // ERC20 approve ABI: approve(address spender, uint256 amount)
      const approveSelector = "0x095ea7b3";
      const approveData = approveSelector +
        vaultAddress.slice(2).padStart(64, "0") +
        "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      // ERC4626 deposit ABI: deposit(uint256 assets, address receiver)
      const depositSelector = "0x6e553f65";
      const amountHex = BigInt(amount).toString(16).padStart(64, "0");
      const receiverHex = operator.slice(2).padStart(64, "0");
      const depositData = depositSelector + amountHex + receiverHex;
      const result = {
        actions: {
          permissions: [{ to: assetAddress, data: approveData, value: "0x0", info: `Approve ${vaultAddress} to spend tokens` }],
          transactions: [{ to: vaultAddress, data: depositData, value: "0x0", info: "Deposit into vault" }],
        },
        success: true,
      };
      return JSON.stringify(result);
    }
    // ERC4626 vault withdraw
    case "vault_withdraw": {
      const { vaultAddress, amount, operator } = input;
      // ERC4626 withdraw ABI: withdraw(uint256 assets, address receiver, address owner)
      const withdrawSelector = "0xb460af94";
      const amtHex = BigInt(amount).toString(16).padStart(64, "0");
      const addrHex = operator.slice(2).padStart(64, "0");
      const withdrawData = withdrawSelector + amtHex + addrHex + addrHex;
      const result = {
        actions: {
          permissions: [],
          transactions: [{ to: vaultAddress, data: withdrawData, value: "0x0", info: "Withdraw from vault" }],
        },
        success: true,
      };
      return JSON.stringify(result);
    }
    // Basic lending actions (via 1delta — for Aave, Compound, Spark, etc.)
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
    // ── ENS name resolution ──
    case "resolve_ens_name": {
      const { name } = input;
      if (!name) return JSON.stringify({ error: "name is required" });
      try {
        const res = await fetch(`https://api.ensideas.com/ens/resolve/${encodeURIComponent(name.toLowerCase())}`, {
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return JSON.stringify({ error: "ENS resolution failed" });
        const data = await res.json();
        return JSON.stringify(data);
      } catch {
        return JSON.stringify({ error: "Could not resolve ENS name — try a direct wallet address" });
      }
    }

    // ── DeFiLlama protocol search (for Alpha Scanner queries) ──
    case "search_defi_protocols": {
      const { query, category, minTvl, maxTvl, chain } = input;
      const res = await fetch("https://api.llama.fi/protocols", { signal: AbortSignal.timeout(12000) });
      if (!res.ok) return JSON.stringify({ error: "DeFiLlama API unavailable" });
      const allProtos: any[] = await res.json();

      let filtered = allProtos;
      if (category) filtered = filtered.filter((p: any) =>
        (p.category ?? "").toLowerCase().includes(category.toLowerCase())
      );
      if (chain) filtered = filtered.filter((p: any) =>
        (p.chains ?? []).some((c: string) => c.toLowerCase().includes(chain.toLowerCase()))
      );
      if (minTvl) filtered = filtered.filter((p: any) => (p.tvl ?? 0) >= minTvl);
      if (maxTvl) filtered = filtered.filter((p: any) => (p.tvl ?? 0) <= maxTvl);
      if (query) {
        const q = query.toLowerCase();
        filtered = filtered.filter((p: any) =>
          (p.name ?? "").toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q)
        );
      }

      const slim = filtered
        .sort((a: any, b: any) => (b.tvl ?? 0) - (a.tvl ?? 0))
        .slice(0, input.limit ?? 30)
        .map((p: any) => ({
          name: p.name,
          slug: p.slug,
          symbol: p.symbol,
          category: p.category,
          tvl: p.tvl,
          tvl1dChange: p.change_1d,
          tvl7dChange: p.change_7d,
          tvl30dChange: p.change_1m,
          mcap: p.mcap,
          chains: p.chains?.slice(0, 5),
          description: p.description?.slice(0, 200),
        }));
      return JSON.stringify({ count: slim.length, protocols: slim });
    }

    default:
      return JSON.stringify({ error: "Unknown tool" });
  }
  } catch (err: any) {
    console.error(`Tool ${name} failed:`, err.message);
    return JSON.stringify({ error: err.message ?? "Tool call failed" });
  }
}

const ACTION_TOOLS = new Set([
  "vault_deposit",
  "vault_withdraw",
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
            items: { type: "string", enum: ["lending", "vaults"] },
            description: "Which market types to search. Default: both.",
          },
          limit: { type: "number", description: "Max results to return, default 50. Use 100 for broad cross-protocol comparisons." },
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
      description: "PUBLIC read-only lookup. Returns lending/borrowing positions, deposits, debts, health factor, and net worth for ANY Ethereum address. No wallet connection required. Use this freely for any address or ENS-resolved address.",
      parameters: {
        type: "object",
        properties: {
          account: { type: "string", description: "Any Ethereum wallet address (0x...). Can be any address, not just the connected wallet." },
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
  // ── ERC4626 Vault actions (for MetaMorpho, Euler vaults) ──
  {
    type: "function",
    function: {
      name: "vault_deposit",
      description: "Deposit into an ERC4626 vault (MetaMorpho, Euler). Use this for vaults with id starting with 'morpho-vault:' or 'euler:'. Do NOT use get_deposit_calldata for these — it will fail.",
      parameters: {
        type: "object",
        properties: {
          vaultAddress: { type: "string", description: "The vault contract address (from marketUid field)" },
          assetAddress: { type: "string", description: "The underlying asset token address (e.g. USDC address)" },
          amount: { type: "string", description: "Amount in base units (e.g. 1 USDC = '1000000')" },
          operator: { type: "string", description: "Wallet address" },
        },
        required: ["vaultAddress", "assetAddress", "amount", "operator"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "vault_withdraw",
      description: "Withdraw from an ERC4626 vault (MetaMorpho, Euler). Use this for vaults with id starting with 'morpho-vault:' or 'euler:'.",
      parameters: {
        type: "object",
        properties: {
          vaultAddress: { type: "string", description: "The vault contract address" },
          amount: { type: "string", description: "Amount in base units to withdraw" },
          operator: { type: "string", description: "Wallet address" },
        },
        required: ["vaultAddress", "amount", "operator"],
      },
    },
  },
  // ── Basic lending actions (1delta — Aave, Compound, Spark) ──
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
  // ── ENS resolution ──
  {
    type: "function",
    function: {
      name: "resolve_ens_name",
      description: "Resolve an ENS name (e.g. 'vitalik.eth') to a wallet address, or reverse-resolve an address to its ENS name. Use this whenever the user provides a .eth name or asks about a specific ENS identity.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "ENS name (e.g. 'vitalik.eth') or Ethereum address (0x...)" },
        },
        required: ["name"],
      },
    },
  },
  // ── DeFiLlama protocol intelligence (Alpha Scanner) ──
  {
    type: "function",
    function: {
      name: "search_defi_protocols",
      description: "Search and analyze DeFi protocols from DeFiLlama — TVL, TVL changes, categories, chains, market cap. Use for research queries about protocol performance, growth trends, RWA protocols, liquid staking, yield aggregators, P/F ratios, and any question requiring ecosystem-wide protocol data.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search term: protocol name, keyword, or description fragment" },
          category: { type: "string", description: "Protocol category e.g. 'Lending', 'Yield Aggregator', 'Liquid Staking', 'RWA', 'CDP', 'DEX'" },
          chain: { type: "string", description: "Filter by chain name e.g. 'Ethereum', 'Base', 'Arbitrum'" },
          minTvl: { type: "number", description: "Minimum TVL in USD e.g. 50000000 for $50M" },
          maxTvl: { type: "number", description: "Maximum TVL in USD e.g. 500000000 for $500M" },
          limit: { type: "number", description: "Max results, default 30" },
        },
      },
    },
  },
];

/* ───── system prompt ───── */

const SYSTEM_PROMPT = `You are Nebula — a DeFi lending intelligence assistant. Use the provided tools to answer all
questions about lending markets, rates, positions, and DeFi actions on Ethereum.

TOOL CATEGORIES — WALLET REQUIREMENT:

NO WALLET NEEDED (call freely, any time, for any address):
  resolve_ens_name, get_user_positions, search_markets, find_market,
  get_lending_metadata, get_supported_chains, get_lender_ids,
  get_token_info, search_defi_protocols

WALLET REQUIRED (only when [Wallet: 0x...] prefix is present in the message):
  get_deposit_calldata, get_borrow_calldata, get_leverage_calldata,
  get_withdraw_calldata, get_repay_calldata

RULE: If user asks to execute a transaction AND no [Wallet:] prefix exists, say: "Connect your wallet using the button at the top right to execute this." Do NOT call any WALLET REQUIRED tool. For everything else — answer directly with no wallet prompt.

ADDRESS RESOLUTION FOR POSITIONS:
- User says "find vitalik.eth's positions" → call resolve_ens_name("vitalik.eth") → call get_user_positions(resolved_0x_address)
- User says "check 0xd8dA...'s positions" → call get_user_positions("0xd8dA...")
- User says "my positions" AND [Wallet: 0xABC] prefix exists → call get_user_positions("0xABC")
- User says "my positions" AND no [Wallet:] prefix → ask them to connect wallet
- NEVER refuse to look up a named ENS or address — it is a public blockchain read, no authorization needed
- NEVER say "I can only access the connected wallet's positions" when a different address/ENS is named in the query

TOOL-USE STRATEGY:
1. **For informational queries** (rates, comparisons, "best yield", "looping opportunities", "leverage strategies", market browsing): ALWAYS use search_markets FIRST. Return rich market data in your response — NEVER call action tools for informational queries.
2. **CRITICAL — Transaction tools require wallet**: ONLY get_deposit_calldata, get_borrow_calldata, get_leverage_calldata, get_withdraw_calldata, get_repay_calldata require a connected wallet ([Wallet:] prefix). All other tools including get_user_positions are public and wallet-free.
3. **Looping/leverage opportunities**: When user asks about looping, leverage, or recursive strategies — use search_markets with types=["lending","vaults"] and analyze which assets have: (a) good collateral yield, (b) low borrow rates. Present TOP opportunities as market cards. Explain the strategy (e.g., "Deposit wstETH, borrow USDC at 2.7%, deposit USDC at 3.1%"). Do NOT call leverage action tools unless user explicitly requests execution.
4. **CRITICAL — Morpho Blue**: Morpho Blue markets appear ONLY in the "vaults" type, NOT in "lending". Include "vaults" in types for Morpho/Euler queries.
5. **For action execution** (deposit, withdraw, borrow, repay, leverage): ONLY call action tools when user EXPLICITLY says "execute", "deposit", "open position" AND wallet address is available from the [Wallet:] prefix. Use the wallet address as the operator parameter automatically.
6. Chain IDs and lender IDs must be exact — use references below or call get_supported_chains / get_lender_ids.
7. get_user_positions is a public read-only tool — call it with any address. For ENS names: resolve_ens_name first, then get_user_positions. Never gate this on wallet connection.
8. For action tools: get token decimals via get_token_info first, then amount = tokens × 10^decimals as integer string.
9. For leveraged positions: you need TWO marketUids — marketUidIn (debt) and marketUidOut (collateral).
10. Use get_lending_metadata when user asks about protocol configs, risk parameters, supported assets.
11. **When showing opportunities, format as clickable market cards**: {{market:ID;;PROTOCOL;;ASSET;;APY;;TVL|Label}}. Each market on its own line.

ID-BASED MARKET MAPPING (CRITICAL):
- Every market from search_markets has an \`id\` field. This is the unique identifier across all market types.
- Lending markets also have a \`marketUid\` field (format: LENDER:chainId:tokenAddress) used for action tools.
- Vaults have an \`id\` that matches their marketUid.
- **When linking to a market, ALWAYS use the custom syntax**: \`{{market:MORPHO_BLUE_XXX:1:0xabc;;Morpho Blue;;USDC;;5.96;;8265748|Gauntlet USDC/wstETH}}\`
- **When a user clicks a market link or asks about a specific market by id**, use that id directly with find_market or action tools.
- If user message contains "(market id: ...)" or "(id: ...)", extract that id and use it for the action.

search_markets FIELD REFERENCE:
- Lending results: id, marketUid, protocolName, asset, supplyAPY (percentage), borrowAPR (percentage or null), totalSupplyUSD, availableLiquidityUSD, utilizationRate
- Vault results: id, marketUid, name, protocol, asset, apy (percentage), tvl, curator (optional — the vault curator/manager name, e.g. "Gauntlet", "Steakhouse", "RE7 Labs")
- Vault results: id, name, asset, apy (percentage), tvl, protocol, curator
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

FORMATTING — render entities as special markdown links (the UI converts these to interactive pill buttons):
- Token:    [SYMBOL](token:SYMBOL)               e.g. [USDC](token:USDC)
- Chain:    [Name](chain:CHAIN_ID)               e.g. [Ethereum](chain:1)
- Market:   Use this EXACT custom syntax (NOT a markdown link):
  {{market:ID;;PROTOCOL;;ASSET;;APY;;TVL;;ACTION|Label}}
  Example: {{market:MORPHO_BLUE_xxx:1:0xabc;;Morpho Blue;;USDC;;5.96;;8265748;;deposit|Gauntlet USDC/wstETH}}
  Borrow example: {{market:AAVE_V3:1:0xabc;;Aave V3;;USDC;;4.12;;1200000000;;borrow|USDC · Aave V3}}
  - ID = the market's \`id\` field
  - PROTOCOL = protocolName or protocol field (e.g. "Morpho Blue", "Aave V3")
  - ASSET = asset symbol (e.g. "USDC", "ETH")
  - APY = the APY/yield number WITHOUT % sign (e.g. "5.96")
  - TVL = total TVL in USD as number WITHOUT $ sign (e.g. "8265748")
  - ACTION = \`deposit\` or \`borrow\` (required; use \`borrow\` for lowest borrow rate recommendations)
  - Label = human-readable name (e.g. "Gauntlet USDC/wstETH")
  Use double-semicolon (;;) to separate fields inside the market: part. All 6 fields are REQUIRED.
  The double curly brace syntax is CRITICAL — do NOT use markdown link syntax [text](market:...) for markets.
  The UI renders these as rich clickable pill buttons with protocol icons.
  NEVER use plain text for markets — always use the {{market:...}} format.
  Each market tag should be on its OWN LINE. Do not add extra text like "- 5.96% APY, TVL: $8M" after it — it's already encoded.

RATE FORMATTING (CRITICAL):
- search_markets returns supplyAPY, apy, impliedAPY as PERCENTAGE values. Display them directly with a % sign.
- Example: supplyAPY=5.73 → "5.73% APY". Do NOT divide or multiply — they are already percentages.
- Results are pre-sorted by yield descending. The FIRST items are the BEST rates.
- When asked for "best" or "top" rates: use the first N items from the results. Exclude rates below 0.01%.
- When asked for lowest borrow rates: sort by borrow APR ascending and emit market tags with ACTION set to \`borrow\`.
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

VAULT vs LENDING DEPOSITS (CRITICAL — READ CAREFULLY):
- **MetaMorpho vaults** (id starts with "morpho-vault:") and **Euler vaults** (id starts with "euler:") are ERC4626 vault contracts.
  → Use **vault_deposit** / **vault_withdraw** for these. NEVER use get_deposit_calldata — it WILL FAIL with a 500 error.
  → The vaultAddress is the marketUid field (the 0x address).
  → You need the underlying asset's token address. Common addresses on Ethereum:
    USDC: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
    USDT: 0xdAC17F958D2ee523a2206206994597C13D831ec7
    WETH: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
    DAI:  0x6B175474E89094C44Da98b954EedeAC495271d0F
    WBTC: 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599
    wstETH: 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0
    PYUSD: 0x6c3ea9036406852006290770BEdFcAbA0e23A0e8
    cbBTC: 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf
    EURC: 0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c
    USDtb: 0xC139190f447E929f090eDeb554D95ABb8B18Ac1c
  → Example: To deposit 100 USDC into Steakhouse USDC vault (marketUid: 0xBEEF01735c132Ada46AA9aA4c54623cAA92A64CB):
    vault_deposit(vaultAddress="0xBEEF01735c132Ada46AA9aA4c54623cAA92A64CB", assetAddress="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", amount="100000000", operator="0xUSER...")
- **Lending pools** (Aave V3, Compound V3, Spark, etc.) with marketUid format "LENDER:chainId:tokenAddress":
  → Use **get_deposit_calldata** / **get_withdraw_calldata** for these.
- Yearn vaults are NOT displayed in the UI and are not supported for actions.
- Supported protocols: Aave V2/V3, Compound V2/V3, Spark, Morpho Blue, Euler, Silo, Moonwell, and more across Ethereum and Base.


ENS IDENTITY INTEGRATION:
- When a user mentions a .eth name (e.g. "vitalik.eth") or asks about another address, ALWAYS call resolve_ens_name first to get the canonical address and ENS name.
- Use the resolved address for get_user_positions and any position queries.
- Display the ENS name prominently: e.g. "Here are **vitalik.eth**'s positions:" — make it feel personal.
- If the ENS name has no registered address, reply: "I couldn't find a wallet registered to that ENS name."

ALPHA SCANNER — PROTOCOL RESEARCH QUERIES:
- When users ask about protocol ecosystems, TVL trends, P/F ratios, market cap, growing protocols, or DeFi categories (RWA, liquid staking, yield aggregators, etc.), use search_defi_protocols.
- search_defi_protocols returns: name, tvl, tvl1dChange/7dChange/30dChange (%), mcap, category, chains, description.
- For complex multi-step research: call search_defi_protocols, cross-reference with search_markets for yield data, then synthesize into a table.
- TVL growth signals: tvl30dChange > 20% = notable growth; < -20% = concern.
- Present results as a formatted markdown table with the most relevant columns.

BORROW MARKET RESPONSES (CRITICAL — ALWAYS USE MARKET CARDS):
- For ANY borrow query, ALWAYS format each market as: {{market:ID;;PROTOCOL;;ASSET;;APR;;TVL;;borrow|Label}}
- NEVER use plain text or bullet points alone for borrow markets. Every borrow market MUST have a card.
- Sort borrow markets by borrowAPR ascending (lowest cost first).
- Example: {{market:AAVE_V3:1:0xabc;;Aave V3 Core (Ethereum);;USDC;;4.12;;1200000000;;borrow|USDC · Aave V3}}

AFTER ACTION TOOLS: The UI renders a Simulation panel automatically.
Respond with ONE sentence only, e.g. "Opening 2x leveraged [ETH](token:ETH) position on Aave V3." or "Preparing to borrow [USDC](token:USDC) from Aave V3."
No summaries, no tables, no bullet points after actions.

HANDLING LAZY / INCOMPLETE PROMPTS — CRITICAL:
When the user gives vague or partial action commands, infer context intelligently — never say "please be more specific":

1. "deposit [ASSET]" with no amount or protocol:
   → Call search_markets(types=["lending","vaults"], query="{ASSET}"), find the highest APY option.
   → Reply: "The best market for [ASSET] right now is [Protocol] at X% APY on [Chain]. How much [ASSET] would you like to deposit?"
   → Do NOT call any action tool until the user gives an amount.

2. "borrow [ASSET]" / "borrow in [ASSET]" with no amount:
   → NEVER infer an amount from position data. ALWAYS ask explicitly.
   → Call search_markets, pick the lowest borrow APR.
   → Reply: "The cheapest [ASSET] borrow is [Protocol] at X% APR on [Chain]. How much [ASSET] would you like to borrow?"
   → Do NOT call any action tool until the user provides a specific number.

3. "deposit [AMOUNT] [ASSET]" — amount given, no protocol specified:
   → Auto-select the highest APY market across all chains, execute immediately.
   → State in response: "Depositing [AMOUNT] [ASSET] into [Protocol] on [Chain] at X% APY."

4. "borrow [AMOUNT] [ASSET]" — amount given, no protocol:
   → Auto-select lowest borrow APR market, execute immediately.

5. "lend" / "earn" / "best yield" / "where should I put my money" (no specific asset):
   → Call search_markets(types=["lending","vaults"]), show top 5 opportunities as market cards.

6. "withdraw" / "repay" (no specifics):
   → Call get_user_positions(account=wallet) first, then ask which position to act on.

7. "max" / "all" / "everything" as amount:
   → Use the wallet's full balance. If unknown, build the tx with amount="0" and note the user should edit.

8. "what chains are supported" / "which protocols" / "what can you do":
   → Use get_supported_chains or get_lender_ids respectively. Keep response concise.

AMOUNT-TO-WEI CONVERSION — BUILT-IN DECIMAL TABLE (do NOT call get_token_info for these):
ETH = 18 decimals   → 1 ETH = "1000000000000000000"
WETH = 18 decimals  → 1 WETH = "1000000000000000000"
wstETH = 18 dec     → 1 wstETH = "1000000000000000000"
cbETH = 18 dec      → same
DAI = 18 decimals   → 1000 DAI = "1000000000000000000000"
USDC = 6 decimals   → 100 USDC = "100000000"
USDT = 6 decimals   → 500 USDT = "500000000"
PYUSD = 6 dec       → same as USDC
EURC = 6 dec        → same
WBTC = 8 decimals   → 0.5 WBTC = "50000000"
cbBTC = 8 dec       → same as WBTC
Only call get_token_info for EXOTIC or UNKNOWN tokens not listed above.

AVOIDING UNNECESSARY TOOL ROUNDS (speed-critical — max 4 rounds total):
- If the user message contains "(market id: XXX:chainId:0xABC)", use that ID DIRECTLY — skip all lookup tools.
- If context from earlier messages already has a marketUid, reuse it without re-fetching.
- Combine multiple tool calls into ONE round whenever possible (parallel calls).
- For deposit/borrow/withdraw/repay with a KNOWN marketUid: call the action tool immediately in round 1.
- For vault deposits (MetaMorpho/Euler): call vault_deposit in round 1 using the vault address from search results.
- Never do a redundant search_markets if the user clicked a market card (market id is already in the message).

CHAIN AND PROTOCOL DEFAULTS:
- If no chain specified: search all chains, pick highest APY (for lending) or lowest APR (for borrowing).
- Always mention which chain you chose: "Using Aave V3 on [Base](chain:8453)…"
- Prefer these protocols in this order for reliability: Aave V3 > Morpho Blue > Compound V3 > Spark > others.
- For Ethereum mainnet: AAVE_V3 lender ID, chain 1.
- For Base: AAVE_V3 lender ID, chain 8453.
- For Arbitrum: AAVE_V3 lender ID, chain 42161.
- Morpho Blue vaults (id starts "morpho-vault:") → vault_deposit, NOT get_deposit_calldata.

MARKETUID CONSTRUCTION (when you need to build it manually):
- Format: "LENDER:chainId:tokenAddress"
- Aave V3 USDC on Ethereum: "AAVE_V3:1:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
- Aave V3 ETH on Ethereum: "AAVE_V3:1:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
- Aave V3 USDC on Base: "AAVE_V3:8453:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
- Aave V3 ETH on Base: "AAVE_V3:8453:0x4200000000000000000000000000000000000006"
- Compound V3 USDC on Ethereum: "COMPOUND_V3:1:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"

ERROR RECOVERY (when action tools fail):
- If get_deposit_calldata returns error "1delta 500" for a vault market → switch to vault_deposit.
- If get_deposit_calldata returns "1delta 400" → the marketUid is likely wrong; call find_market to get correct one.
- If search_markets returns 0 results → broaden: remove chain filter, include both types=["lending","vaults"].
- If ENS resolution fails → ask user for their 0x address directly.
- After one retry, if still failing: "I couldn't prepare this transaction — please try selecting the market from the Trade page instead."

POSITION AWARENESS:
- Always check get_user_positions before suggesting borrow/withdraw/repay to avoid recommending actions on empty positions.
- Health factor below 1.5 = dangerous. Warn the user before executing any borrow that would lower health factor below 1.5.
- A health factor below 1.0 = liquidatable. REFUSE to execute borrows that would cause this.

AFTER SHOWING POSITIONS — ALWAYS APPEND OPPORTUNITIES (CRITICAL):
After displaying any user's positions (whether they have positions or not), ALWAYS append 3–5 top opportunities.
The pre-fetched market data will be injected as a TOP OPPORTUNITIES system message — use that data directly.
Do NOT make an additional search_markets call for opportunities after positions — use the pre-fetched data.
Present them under the heading: "**💡 Top Opportunities on Ethereum & Base**"
Prioritize: USDC markets for users with stablecoin holdings, ETH markets for ETH/WETH holders.
Format each as a {{market:...}} card on its own line.

USDC QUERY OPTIMIZATION (most common query type):
When user asks about USDC: lending, borrowing, or depositing USDC:
- Always search both types=["lending","vaults"] to include Morpho Blue USDC vaults
- Top USDC lending markets typically: Aave V3 Core (Ethereum & Base), Compound V3, Spark, Moonwell (Base)
- Top USDC vault markets: Gauntlet USDC, Steakhouse USDC, Re7 USDC (all Morpho Blue)
- Morpho USDC vaults on Ethereum generally yield 2–3x higher APY than direct Aave V3 USDC lending
- For "best USDC yield": always include both lending AND vault results — vaults almost always win on APY
- USDC decimals = 6. 1000 USDC = "1000000000". Always use this — never call get_token_info for USDC.
- Ethereum USDC address: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
- Base USDC address: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

ETH QUERY OPTIMIZATION (second most common):
When user asks about ETH: depositing ETH, borrowing against ETH, ETH yield:
- Use asset group "ETH" for WETH in action tools (1delta uses ETH as the group key for WETH)
- Top ETH lending: Aave V3 Prime/Core (Ethereum), Aave V3 (Base), Compound Blue (Ethereum & Base)
- Top ETH vaults: wstETH Morpho vaults (highest ETH-correlated yield), cbETH Morpho vaults on Base
- For "best ETH yield": include ETH + wstETH + cbETH results — sometimes LSD vaults > direct ETH lending
- ETH/WETH decimals = 18. 1 ETH = "1000000000000000000". Never call get_token_info for ETH.
- Ethereum WETH: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
- Base WETH: 0x4200000000000000000000000000000000000006
- When user says "deposit ETH" they almost always mean the native asset or WETH — use ETH asset group.
- Looping strategy: deposit wstETH, borrow USDC at low rate, deposit USDC → good base-rate amplification.

MARKET COVERAGE — ETHEREUM & BASE (both chains always searched):
The search_markets tool queries BOTH Ethereum (chain 1) AND Base (chain 8453) simultaneously.
- Ethereum: Aave V3 Core, Aave V3 Prime, Compound Blue, Spark, Morpho Blue vaults, Euler vaults, Granary
- Base: Aave V3 Core, Compound Blue (Base), Moonwell, Seamless, Morpho Blue vaults
- When user asks about a specific chain, filter in your response — but always fetch all chains.
- Morpho Blue vaults (id starts "morpho-vault:") appear in "vaults" type — always include vaults type for Morpho queries.`;

/* ───── agent loop ───── */

async function runAgent(query: string, userAddress?: string, history: any[] = []) {
  // ── Pre-flight: resolve ENS / address lookups BEFORE hitting the AI ─────
  // This bypasses model refusals entirely — the tool is called in code, not by the model.
  const ENS_PATTERN = /\b([a-zA-Z0-9][a-zA-Z0-9-]*\.eth)\b/i;
  const ADDR_PATTERN = /\b(0x[a-fA-F0-9]{40})\b/;
  // Narrow pattern: only unambiguous "show me my portfolio" phrases — NOT action words like
  // deposit/borrow/lend which match simple market queries and trigger expensive pre-flights.
  const POSITION_KEYWORDS = /\b(position|portfolio|hold(ing)?|net.?worth|my\s+(balance|wallet|account|deposit|borrow))\b/i;

  let preResolvedAddress: string | undefined;
  let preResolvedLabel: string | undefined;
  let preResolvedPositions: string | undefined;
  let preFetchedOpportunities: string | undefined;

  const ensMatch = query.match(ENS_PATTERN);
  const addrMatch = query.match(ADDR_PATTERN);
  const isPositionQuery = POSITION_KEYWORDS.test(query);

  // Resolve ENS or raw address for third-party position lookups
  if (isPositionQuery && (ensMatch || addrMatch)) {
    if (ensMatch) {
      const name = ensMatch[1].toLowerCase();
      try {
        const r = await fetch(`https://api.ensideas.com/ens/resolve/${encodeURIComponent(name)}`, {
          signal: AbortSignal.timeout(8000),
        });
        if (r.ok) {
          const d = await r.json();
          if (d.address) { preResolvedAddress = d.address; preResolvedLabel = `${name} (${d.address})`; }
        }
      } catch { /* fall through */ }
    } else if (addrMatch) {
      const addr = addrMatch[1];
      if (!userAddress || addr.toLowerCase() !== userAddress.toLowerCase()) {
        preResolvedAddress = addr;
        preResolvedLabel = addr;
      }
    }

    if (preResolvedAddress) {
      try {
        preResolvedPositions = await dispatchTool("get_user_positions", {
          account: preResolvedAddress,
          chains: "1,8453,42161,10",
        });
      } catch { /* fall through to AI */ }
    }
  }

  // For any position query (own wallet or third-party), pre-fetch top USDC + ETH markets
  // so the AI can immediately suggest opportunities without an extra tool round.
  // Only pre-fetch opportunities when there's a connected wallet (otherwise no positions to supplement)
  if (userAddress && (isPositionQuery || /\bportfolio\b/i.test(query))) {
    try {
      const [lendingRaw, vaultsRaw] = await Promise.all([
        fetchMarketsEndpoint("lending"),
        fetchMarketsEndpoint("vaults"),
      ]);
      const all = [...lendingRaw, ...vaultsRaw];

      const byAPY = (a: any, b: any) =>
        (b.supplyAPY ?? b.apy ?? 0) - (a.supplyAPY ?? a.apy ?? 0);

      const usdcTop = all
        .filter((m: any) => (m.asset ?? "").toUpperCase() === "USDC")
        .sort(byAPY)
        .slice(0, 3);

      const ethTop = all
        .filter((m: any) => ["ETH", "WETH"].includes((m.asset ?? "").toUpperCase()))
        .sort(byAPY)
        .slice(0, 2);

      const top = [...usdcTop, ...ethTop].map((m: any) => ({
        id: m.id ?? m.marketUid,
        marketUid: m.marketUid ?? m.id,
        protocol: m.protocolName ?? m.protocol ?? m.name,
        asset: m.asset,
        apy: +(m.supplyAPY ?? m.apy ?? 0).toFixed(2),
        tvl: Math.round(m.totalSupplyUSD ?? m.tvl ?? 0),
        action: "deposit",
      }));

      if (top.length > 0) {
        preFetchedOpportunities = JSON.stringify(top);
      }
    } catch { /* non-fatal */ }
  }

  const messages: any[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-20),
  ];

  // Inject pre-resolved position data so AI only needs to format it — no tool decision needed
  if (preResolvedAddress && preResolvedPositions) {
    messages.push({
      role: "system",
      content: `PUBLIC LOOKUP ALREADY COMPLETED: The user asked about ${preResolvedLabel}. The raw position data has been fetched directly from the blockchain data provider:\n\n${preResolvedPositions}\n\nPresent this data clearly and helpfully. Do NOT mention wallet connection.`,
    });
  }

  // Inject pre-fetched top USDC + ETH opportunities so the AI can suggest them without a tool round
  if (preFetchedOpportunities) {
    messages.push({
      role: "system",
      content: `TOP OPPORTUNITIES PRE-FETCHED (Ethereum & Base — use these, do NOT call search_markets again):\n${preFetchedOpportunities}\n\nAfter showing the user's positions, append a "**💡 Top Opportunities on Ethereum & Base**" section with 3–5 of these as {{market:...}} cards. Pick the most relevant ones based on the user's holdings.`,
    });
  }

  messages.push({ role: "user", content: userAddress ? `[Wallet: ${userAddress}]\n${query}` : query });
  const collectedSteps: any[] = [];
  let collectedQuote: any;

  const createCompletion = async (msgs: any[]) => {
    try {
      return await openai.chat.completions.create(
        {
          model: "gpt-4o",
          max_completion_tokens: 2048,
          tools: TOOLS,
          messages: msgs,
        },
        { signal: AbortSignal.timeout(38_000) }, // 38s per LLM call — leaves room for tool execution within 55s total
      );
    } catch (err: any) {
      console.error("OpenAI API error:", err.message);
      return {
        choices: [{
          finish_reason: "stop",
          message: { content: "I'm having trouble connecting right now. Please try again in a moment." },
        }],
      };
    }
  };

  let response = await createCompletion(messages);
  let toolRounds = 0;
  const MAX_TOOL_ROUNDS = 4; // Reduced from 5 — the built-in decimal table eliminates get_token_info round trips

  while (response.choices[0].finish_reason === "tool_calls" && toolRounds < MAX_TOOL_ROUNDS) {
    toolRounds++;
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
    response = await createCompletion(messages);
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
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured — OPENAI_API_KEY is missing. Please set this secret in your Supabase project dashboard under Settings > Edge Functions." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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
