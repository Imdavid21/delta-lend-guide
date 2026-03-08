import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const BASE = "https://portal.1delta.io/v1";
const API_KEY = Deno.env.get("ONEDELTA_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// Top chains by DeFi TVL
const CHAIN_IDS = ["1", "42161", "8453", "10", "137", "56", "43114", "534352", "59144", "5000"];

const CHAIN_NAMES: Record<string, string> = {
  "1": "Ethereum", "10": "Optimism", "25": "Cronos", "40": "Telos", "50": "XDC",
  "56": "BNB Chain", "100": "Gnosis", "130": "Unichain", "137": "Polygon", "143": "Monad",
  "146": "Sonic", "169": "Manta Pacific", "250": "Fantom", "1088": "Metis", "1116": "Core DAO",
  "1284": "Moonbeam", "1329": "Sei", "1868": "Soneium", "2818": "Morph", "5000": "Mantle",
  "8217": "Klaytn", "8453": "Base", "9745": "Plasma", "34443": "Mode", "42161": "Arbitrum",
  "43111": "Hemi", "43114": "Avalanche", "59144": "Linea", "80094": "Berachain",
  "81457": "Blast", "167000": "Taiko", "534352": "Scroll", "747474": "Katana",
};

const LENDER_NAMES: Record<string, string> = {
  "AAVE_V2": "Aave V2", "AAVE_V3": "Aave V3", "COMPOUND_V2": "Compound V2",
  "COMPOUND_V3": "Compound V3", "LENDLE": "Lendle", "MORPHO": "Morpho",
  "MORPHO_BLUE": "Morpho Blue", "SPARK": "Spark", "RADIANT": "Radiant",
  "RADIANT_V2": "Radiant V2", "VENUS": "Venus", "SEAMLESS": "Seamless",
  "ZEROLEND": "ZeroLend", "LAYERBANK": "LayerBank", "AURELIUS": "Aurelius",
  "INIT": "Init Capital", "MERIDIAN": "Meridian", "IRONCLAD": "Ironclad",
  "GRANARY": "Granary", "YLDR": "Yldr", "MOONWELL": "Moonwell",
  "MENDI": "Mendi Finance", "SILO": "Silo Finance",
};

function transformPool(pool: any) {
  const parts = (pool.marketUid ?? "").split(":");
  const chainId = String(pool.chainId ?? parts[1] ?? "");
  const lender = String(pool.lender ?? parts[0] ?? "");
  const asset = pool.assetGroup ?? pool.symbol ?? pool.underlying?.symbol ?? parts[2] ?? "";
  const tvl = parseFloat(pool.totalDepositsUsd) || 0;
  const util = parseFloat(pool.utilization) || 0;
  const depositRate = parseFloat(pool.depositRate) || 0;
  const borrowRate = pool.variableBorrowRate != null ? parseFloat(pool.variableBorrowRate) || 0 : null;
  // API returns rates already as percentages (e.g. 1.75 = 1.75%), no need to multiply by 100

  return {
    id: pool.marketUid ?? `${lender}:${chainId}:${asset}`,
    marketUid: pool.marketUid,
    chainId,
    chainName: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
    protocol: lender,
    protocolName: LENDER_NAMES[lender] || lender,
    asset,
    supplyAPY: depositRate * 100,
    supplyAPYWithIncentives: depositRate * 100,
    borrowAPR: borrowRate !== null ? borrowRate * 100 : null,
    totalSupplyUSD: tvl,
    availableLiquidityUSD: Math.round(tvl * (1 - util) * 100) / 100,
    utilizationRate: util * 100,
    updatedAt: Date.now(),
  };
}

async function fetchChainPools(chainId: string, hdrs: Record<string, string>): Promise<any[]> {
  const url = new URL(BASE + "/data/lending/pools");
  url.searchParams.set("chainId", chainId);
  url.searchParams.set("count", "30");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url.toString(), { headers: hdrs, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) { await res.text(); return []; }
    const raw = await res.json();
    return raw?.data?.items ?? raw?.data ?? (Array.isArray(raw) ? raw : []);
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const hdrs: Record<string, string> = {};
    if (API_KEY) hdrs["x-api-key"] = API_KEY;

    console.log("Fetching markets for chains:", CHAIN_IDS.join(","));

    const results = await Promise.all(
      CHAIN_IDS.map((cid) => fetchChainPools(cid, hdrs))
    );

    const allItems = results.flat();
    console.log("Total raw items:", allItems.length);

    const markets = allItems
      .map(transformPool)
      .filter((m) => m.totalSupplyUSD >= 10000);

    // Deduplicate
    const seen = new Set<string>();
    const unique = markets.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    console.log("Returning", unique.length, "markets");

    return new Response(JSON.stringify(unique), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Markets error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
