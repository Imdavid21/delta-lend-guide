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

/* ── Morpho vault + curator metadata from GraphQL API ── */

interface MorphoMeta {
  name: string;
  curator?: string;
}

async function fetchMorphoMetadata(): Promise<Map<string, MorphoMeta>> {
  const metaMap = new Map<string, MorphoMeta>();
  try {
    const query = `{
      markets(first: 500, where: { chainId_in: [1], whitelisted: true }) {
        items {
          uniqueKey
          loanAsset { symbol }
          collateralAsset { symbol }
        }
      }
      vaults(first: 200, where: { chainId_in: [1] }) {
        items {
          address
          name
          symbol
          asset { symbol }
          curator {
            name
            image
          }
          metadata {
            description
            image
          }
          state {
            totalAssetsUsd
          }
        }
      }
    }`;
    const res = await fetch("https://blue-api.morpho.org/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return metaMap;
    const json = await res.json();

    // Map market uniqueKeys to descriptive names
    for (const m of json?.data?.markets?.items ?? []) {
      const loan = m.loanAsset?.symbol ?? "";
      const coll = m.collateralAsset?.symbol ?? "";
      if (m.uniqueKey) {
        metaMap.set(m.uniqueKey.toLowerCase(), { name: `${loan}/${coll}` });
      }
    }

    // Map vault addresses to vault names + curator
    for (const v of json?.data?.vaults?.items ?? []) {
      if (v.address) {
        const curatorName = v.curator?.name ?? undefined;
        metaMap.set(v.address.toLowerCase(), {
          name: v.name ?? v.symbol ?? "",
          curator: curatorName,
        });
      }
    }
  } catch (e) {
    console.log(`Morpho GraphQL error: ${(e as Error).message}`);
  }
  return metaMap;
}

function morphoVaultDisplayName(pool: any, asset: string, morphoMeta: Map<string, MorphoMeta>): { name: string; curator?: string } {
  const lk = pool.lenderKey ?? "";
  const hexMatch = lk.match(/MORPHO_BLUE_([A-F0-9]+)/i);

  // Try to match vault by address from the GraphQL data
  // Also check if any vault metadata has a curator
  let curator: string | undefined;

  if (hexMatch) {
    const uk = "0x" + hexMatch[1].toLowerCase();
    const meta = morphoMeta.get(uk);
    if (meta) {
      curator = meta.curator;
      const displayName = curator
        ? `${curator} ${meta.name}`
        : `Morpho ${meta.name}`;
      return { name: displayName, curator };
    }
  }

  // Try pool name if descriptive
  const rawName = pool.name ?? "";
  if (rawName && !rawName.startsWith("Loan ") && !rawName.startsWith("Collateral ")) {
    return { name: rawName, curator };
  }

  // Fallback
  const isLoan = rawName.startsWith("Loan ");
  return { name: `Morpho Blue ${asset} ${isLoan ? "Supply" : "Collateral"}`, curator };
}

async function fetchVaults(hdrs: Record<string, string>) {
  const [items1delta, morphoMeta] = await Promise.all([
    fetch1DeltaPools(hdrs),
    fetchMorphoMetadata(),
  ]);

  const vaults: any[] = [];

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

    let name: string;
    let curator: string | undefined;

    if (isMorpho) {
      const result = morphoVaultDisplayName(pool, asset, morphoMeta);
      name = result.name;
      curator = result.curator;
    } else {
      name = pool.name || `Euler ${asset}`;
    }

    vaults.push({
      id: pool.marketUid ?? `${source}:1:${asset}`,
      marketUid: pool.marketUid ?? "",
      name,
      protocol,
      asset,
      apy: parseFloat(pool.depositRate) || 0,
      tvl,
      source,
      ...(curator && { curator }),
    });
  }

  return vaults;
}

async function fetchPendle() {
  console.log("Fetching Pendle markets...");
  const raw = await fetchJSON(
    "https://api-v2.pendle.finance/core/v1/markets/all?chainId=1",
    {},
    20000,
  );

  if (!raw) {
    console.log("Pendle API returned null");
    return [];
  }

  const items: any[] = raw.markets ?? (Array.isArray(raw) ? raw : (raw.results ?? raw.data ?? []));
  console.log(`Pendle: ${items.length} raw markets`);

  const now = Date.now();
  const results = items
    .filter((m: any) => {
      const details = m.details;
      if (!details) return false;
      const liq = details.liquidity ?? details.totalTvl ?? 0;
      if (liq < 10000) return false;
      const expiry = m.expiry ? new Date(m.expiry).getTime() : 0;
      if (expiry <= now) return false;
      return true;
    })
    .map((m: any) => {
      const details = m.details ?? {};
      const expiry = m.expiry ? new Date(m.expiry).getTime() : 0;
      const daysToMaturity = expiry > now ? Math.ceil((expiry - now) / 86400000) : 0;
      const nameParts = (m.name ?? "").split(" ");
      const asset = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : m.name ?? "";
      return {
        id: m.address ?? `pendle:${m.name}`,
        name: m.name ?? "",
        asset,
        impliedAPY: (details.impliedApy ?? 0) * 100,
        expiry: m.expiry ?? "",
        daysToMaturity,
        tvl: details.liquidity ?? details.totalTvl ?? 0,
      };
    });

  console.log(`Pendle: ${results.length} active markets after filtering`);
  return results;
}

/* ── In-memory cache (60s TTL) to avoid hammering upstream APIs ── */
const cache = new Map<string, { data: any[]; ts: number }>();
const CACHE_TTL = 60_000; // 60 seconds

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "lending";
    const hdrs: Record<string, string> = {};
    if (API_KEY) hdrs["x-api-key"] = API_KEY;

    // Check cache
    const cached = cache.get(type);
    const now = Date.now();
    if (cached && now - cached.ts < CACHE_TTL) {
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }

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

    const seen = new Set<string>();
    const unique = data.filter((m: any) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    // Update cache
    cache.set(type, { data: unique, ts: now });

    return new Response(JSON.stringify(unique), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "MISS" },
    });
  } catch (e) {
    console.error("Markets error:", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
