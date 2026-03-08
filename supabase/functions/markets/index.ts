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

/* ── Morpho vault names from GraphQL API ── */

async function fetchMorphoVaultNames(): Promise<Map<string, string>> {
  const nameMap = new Map<string, string>();
  try {
    const query = `{
      markets(first: 500, where: { chainId_in: [1], whitelisted: true }) {
        items {
          uniqueKey
          loanAsset { symbol }
          collateralAsset { symbol }
          morphoBlue { chain { id } }
        }
      }
      vaultV2s(first: 200, where: { chainId_in: [1] }) {
        items {
          address
          name
          symbol
          asset { symbol }
        }
      }
    }`;
    const res = await fetch("https://blue-api.morpho.org/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return nameMap;
    const json = await res.json();

    // Map market uniqueKeys to descriptive names
    for (const m of json?.data?.markets?.items ?? []) {
      const loan = m.loanAsset?.symbol ?? "";
      const coll = m.collateralAsset?.symbol ?? "";
      if (m.uniqueKey) {
        nameMap.set(m.uniqueKey.toLowerCase(), `${loan}/${coll}`);
      }
    }

    // Map vault addresses to vault names
    for (const v of json?.data?.vaultV2s?.items ?? []) {
      if (v.address && v.name) {
        nameMap.set(v.address.toLowerCase(), v.name);
      }
    }
  } catch (e) {
    console.log(`Morpho GraphQL error: ${(e as Error).message}`);
  }
  return nameMap;
}

function morphoVaultDisplayName(pool: any, asset: string, morphoNames: Map<string, string>): string {
  // Try by marketUid — extract the unique key hex from the lender key
  const lk = pool.lenderKey ?? "";
  const hexMatch = lk.match(/MORPHO_BLUE_([A-F0-9]+)/i);
  if (hexMatch) {
    const uk = "0x" + hexMatch[1].toLowerCase();
    const graphqlName = morphoNames.get(uk);
    if (graphqlName) return `Morpho ${graphqlName}`;
  }

  // Try pool name if it's descriptive enough (not just "Loan X" / "Collateral X")
  const rawName = pool.name ?? "";
  if (rawName && !rawName.startsWith("Loan ") && !rawName.startsWith("Collateral ")) {
    return rawName;
  }

  // Fallback: "Morpho Blue <asset> (supply|collateral)"
  const isLoan = rawName.startsWith("Loan ");
  return `Morpho Blue ${asset} ${isLoan ? "Supply" : "Collateral"}`;
}

async function fetchVaults(hdrs: Record<string, string>) {
  const [items1delta, morphoNames] = await Promise.all([
    fetch1DeltaPools(hdrs),
    fetchMorphoVaultNames(),
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
    const name = isMorpho
      ? morphoVaultDisplayName(pool, asset, morphoNames)
      : (pool.name || `Euler ${asset}`);

    vaults.push({
      id: pool.marketUid ?? `${source}:1:${asset}`,
      name,
      protocol,
      asset,
      apy: parseFloat(pool.depositRate) || 0,
      tvl,
      source,
    });
  }

  // NOTE: Yearn vaults are intentionally excluded from the API response for now.
  // The fetching code is preserved below for future re-enablement.
  // if (yearnRaw && Array.isArray(yearnRaw)) { ... }

  return vaults;
}

async function fetchPendle() {
  // Use /all endpoint directly (paginated /markets was removed by Pendle)
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

  const isArr = Array.isArray(raw);
  const keys = !isArr ? Object.keys(raw).slice(0, 5) : [];
  console.log(`Pendle raw: isArray=${isArr}, keys=${JSON.stringify(keys)}, type=${typeof raw}`);
  const items: any[] = isArr ? raw : (raw.results ?? raw.data ?? raw.markets ?? []);
  console.log(`Pendle: ${items.length} raw markets fetched`);

  // Debug: log first item structure
  if (items.length > 0) {
    const sample = items[0];
    console.log(`Pendle sample keys: ${Object.keys(sample).join(", ")}`);
    console.log(`Pendle sample liquidity: ${JSON.stringify(sample.liquidity)}, totalLiquidity: ${sample.totalLiquidity}, tvl: ${sample.tvl}`);
    console.log(`Pendle sample details: ${JSON.stringify(sample.details ?? {})}`);
    console.log(`Pendle sample pt: ${JSON.stringify(sample.pt ?? {})}`);
    console.log(`Pendle sample underlyingAsset: ${JSON.stringify(sample.underlyingAsset ?? {})}`);
    console.log(`Pendle sample: name=${sample.name}, impliedApy=${sample.impliedApy}, expiry=${sample.expiry}`);
  }

  const now = Date.now();
  return items
    .filter((m: any) => {
      const liq = m.liquidity?.usd ?? m.totalLiquidity ?? m.tvl ?? m.liquidityUsd ?? 0;
      return liq >= 10000;
    })
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
        tvl: m.liquidity?.usd ?? m.totalLiquidity ?? 0,
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
