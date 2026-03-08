import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const BASE = "https://portal.1delta.io/v1";
const API_KEY = Deno.env.get("ONEDELTA_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(BASE + "/data/lending/pools");
    url.searchParams.set("count", "500");

    const headers: Record<string, string> = {};
    if (API_KEY) headers["x-api-key"] = API_KEY;

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) throw new Error(`1delta API ${res.status}`);
    const raw = await res.json();

    const items = raw?.data?.items ?? raw?.data ?? (Array.isArray(raw) ? raw : []);

    const markets = items
      .map((pool: any) => {
        const parts = (pool.marketUid ?? "").split(":");
        const chainId = String(pool.chainId ?? parts[1] ?? "");
        const lender = String(pool.lender ?? parts[0] ?? "");
        const asset = pool.assetGroup ?? pool.symbol ?? pool.underlying?.symbol ?? parts[2] ?? "";
        const tvl = parseFloat(pool.totalDepositsUsd) || 0;
        const util = parseFloat(pool.utilization) || 0;
        const depositRate = parseFloat(pool.depositRate) || 0;
        const borrowRate = pool.variableBorrowRate != null ? parseFloat(pool.variableBorrowRate) || 0 : null;

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
      })
      .filter((m: any) => m.totalSupplyUSD >= 10000);

    return new Response(JSON.stringify(markets), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
