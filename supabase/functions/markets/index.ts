import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const BASE = "https://portal.1delta.io/v1";
const API_KEY = Deno.env.get("ONEDELTA_API_KEY") || "";

const LENDER_NAMES: Record<string, string> = {
  AAVE_V2: "Aave V2", AAVE_V3: "Aave V3", COMPOUND_V2: "Compound V2",
  COMPOUND_V3: "Compound V3", LENDLE: "Lendle", MORPHO: "Morpho",
  MORPHO_BLUE: "Morpho Blue", SPARK: "Spark", RADIANT: "Radiant",
  RADIANT_V2: "Radiant V2", VENUS: "Venus", SEAMLESS: "Seamless",
  ZEROLEND: "ZeroLend", LAYERBANK: "LayerBank", AURELIUS: "Aurelius",
  INIT: "Init Capital", MERIDIAN: "Meridian", IRONCLAD: "Ironclad",
  GRANARY: "Granary", YLDR: "Yldr", MOONWELL: "Moonwell",
  MENDI: "Mendi Finance", SILO: "Silo Finance", EULER: "Euler",
};

function resolveLenderName(key: string): string {
  if (LENDER_NAMES[key]) return LENDER_NAMES[key];
  if (key.startsWith("MORPHO_BLUE")) return "Morpho Blue";
  if (key.startsWith("COMPOUND_V3")) return "Compound V3";
  if (key.startsWith("AAVE_V3")) return "Aave V3";
  if (key.startsWith("AAVE_V2")) return "Aave V2";
  if (key.startsWith("SILO")) return "Silo Finance";
  if (key.startsWith("EULER")) return "Euler";
  if (key.startsWith("BENQI")) return "Benqi";
  const base = key.replace(/_[A-F0-9]{8,}$/i, "");
  return base.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractAsset(pool: any): string {
  let asset =
    pool.underlyingInfo?.asset?.assetGroup ??
    pool.underlyingInfo?.asset?.symbol ??
    pool.assetGroup ??
    pool.tokenSymbol ??
    pool.symbol ??
    "";
  if (asset.includes("::")) asset = asset.split("::").pop() ?? asset;
  return asset;
}

async function fetchJSON(url: string, headers: Record<string, string> = {}, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      console.log(`fetchJSON ${res.status} for ${url}`);
      return null;
    }
    return res.json();
  } catch (e) {
    clearTimeout(timer);
    console.log(`fetchJSON error for ${url}: ${(e as Error).message}`);
    return null;
  }
}

async function fetch1DeltaPools(hdrs: Record<string, string>) {
  const url = new URL(BASE + "/data/lending/pools");
  url.searchParams.set("chainId", "1");
  url.searchParams.set("count", "200");
  const raw = await fetchJSON(url.toString(), hdrs);
  if (!raw) return [];
  return raw?.data?.items ?? raw?.data ?? (Array.isArray(raw) ? raw : []);
}

async function fetchLending(hdrs: Record<string, string>) {
  const items = await fetch1DeltaPools(hdrs);
  return items
    .map((pool: any) => {
      const lenderKey = pool.lenderKey ?? pool.lender ?? "";
      if (lenderKey.startsWith("MORPHO_BLUE")) return null;

      const asset = extractAsset(pool);
      const tvl = parseFloat(pool.totalDepositsUsd) || 0;
      if (tvl < 10000) return null;
      const util = parseFloat(pool.utilization) || 0;

      return {
        id: pool.marketUid ?? `${lenderKey}:1:${asset}`,
        marketUid: pool.marketUid ?? "",
        protocol: lenderKey,
        protocolName: resolveLenderName(lenderKey),
        poolName: pool.name ?? "",
        asset,
        supplyAPY: parseFloat(pool.depositRate) || 0,
        borrowAPR:
          pool.variableBorrowRate != null
            ? parseFloat(pool.variableBorrowRate) || 0
            : null,
        totalSupplyUSD: tvl,
        availableLiquidityUSD: Math.round(tvl * (1 - util) * 100) / 100,
        utilizationRate: util * 100,
      };
    })
    .filter(Boolean);
}

async function fetchVaults(hdrs: Record<string, string>) {
  const [items1delta, yearnRaw] = await Promise.all([
    fetch1DeltaPools(hdrs),
    fetchJSON("https://ydaemon.yearn.fi/1/vaults/all", {}, 12000),
  ]);

  const vaults: any[] = [];

  // Morpho Blue + Euler vaults from 1delta
  for (const pool of items1delta) {
    const lk = pool.lenderKey ?? "";
    const isMorpho = lk.startsWith("MORPHO_BLUE");
    const isEuler = lk.startsWith("EULER");
    if (!isMorpho && !isEuler) continue;

    const tvl = parseFloat(pool.totalDepositsUsd) || 0;
    if (tvl < 10000) continue;
    const asset = extractAsset(pool);
    const protocol = isMorpho ? "Morpho Blue" : "Euler";
    const source = isMorpho ? "morpho" : "euler";

    vaults.push({
      id: pool.marketUid ?? `${source}:1:${asset}`,
      name: pool.name || `${protocol} ${asset}`,
      protocol,
      asset,
      apy: parseFloat(pool.depositRate) || 0,
      tvl,
      source,
    });
  }

  // Yearn V3 vaults
  if (yearnRaw && Array.isArray(yearnRaw)) {
    for (const v of yearnRaw) {
      const tvlUsd = v.tvl?.tvl ?? v.tvl?.totalAssets ?? 0;
      if (tvlUsd < 10000) continue;
      vaults.push({
        id: `yearn:${v.address}`,
        name: v.name ?? "Yearn Vault",
        protocol: "Yearn",
        asset: v.token?.symbol ?? "???",
        apy: (v.apr?.netAPR ?? v.apr?.forwardAPR?.netAPR ?? 0) * 100,
        tvl: tvlUsd,
        source: "yearn",
      });
    }
  }

  return vaults;
}

async function fetchPendle() {
  // Try paginated endpoint first
  const raw = await fetchJSON(
    "https://api-v2.pendle.finance/core/v1/markets?chainId=1&limit=100&order_by=name%3A1",
    {},
    12000,
  );

  let items: any[] = [];
  if (raw) {
    items = raw.results ?? raw.data ?? (Array.isArray(raw) ? raw : []);
  }

  if (items.length === 0) {
    // Fallback to /all endpoint
    const raw2 = await fetchJSON(
      "https://api-v2.pendle.finance/core/v1/markets/all?chainId=1",
      {},
      12000,
    );
    if (raw2) {
      items = raw2.results ?? raw2.data ?? (Array.isArray(raw2) ? raw2 : []);
    }
  }

  const now = Date.now();
  return items
    .filter((m: any) => (m.liquidity?.usd ?? 0) >= 10000)
    .map((m: any) => {
      const expiry = m.expiry ? new Date(m.expiry).getTime() : 0;
      const daysToMaturity = expiry > now ? Math.ceil((expiry - now) / 86400000) : 0;
      return {
        id: m.address ?? m.id ?? `pendle:${m.name}`,
        name: m.name ?? "",
        asset: m.underlyingAsset?.symbol ?? m.pt?.symbol ?? "",
        impliedAPY: (m.impliedApy ?? 0) * 100,
        expiry: m.expiry ?? "",
        daysToMaturity,
        tvl: m.liquidity?.usd ?? 0,
      };
    });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "lending";
    const hdrs: Record<string, string> = {};
    if (API_KEY) hdrs["x-api-key"] = API_KEY;

    let data: any[];
    switch (type) {
      case "vaults":
        data = await fetchVaults(hdrs);
        break;
      case "pendle":
        data = await fetchPendle();
        break;
      default:
        data = await fetchLending(hdrs);
    }

    // Deduplicate by id
    const seen = new Set<string>();
    const unique = data.filter((m: any) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

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
