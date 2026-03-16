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
  LAYERBANK: "LayerBank", AURELIUS: "Aurelius",
  INIT: "Init Capital", MERIDIAN: "Meridian", IRONCLAD: "Ironclad",
  GRANARY: "Granary", YLDR: "Yldr", MOONWELL: "Moonwell",
  MENDI: "Mendi Finance", SILO: "Silo Finance", EULER: "Euler",
};

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  10: "Optimism",
  25: "Cronos",
  40: "Telos",
  50: "XDC",
  56: "BSC",
  100: "Gnosis",
  130: "Unichain",
  137: "Polygon",
  143: "Monad",
  146: "Sonic",
  169: "Manta",
  250: "Fantom",
  999: "HyperEVM",
  1088: "Metis",
  1116: "Core",
  1284: "Moonbeam",
  1329: "Sei",
  1868: "Soneium",
  2818: "Morph",
  5000: "Mantle",
  8217: "Kaia",
  8453: "Base",
  9745: "Plasma",
  34443: "Mode",
  42161: "Arbitrum",
  43111: "Hemi",
  43114: "Avalanche",
  59144: "Linea",
  80094: "Berachain",
  81457: "Blast",
  167000: "Taiko",
  534352: "Scroll",
  747474: "Katana",
};

function parseChainIdFromMarketUid(marketUid?: string): number | undefined {
  if (!marketUid) return undefined;
  const parts = marketUid.split(":");
  if (parts.length < 2) return undefined;
  const n = Number(parts[1]);
  return Number.isFinite(n) ? n : undefined;
}

function resolveChainId(pool: any): number | undefined {
  const direct = Number(pool?.chainId ?? pool?.chain ?? pool?.__chainId);
  if (Number.isFinite(direct) && direct > 0) return direct;
  return parseChainIdFromMarketUid(pool?.marketUid);
}

function resolveLenderName(key: string, poolName = "", chainId?: number): string {
  const withChain = (name: string) =>
    chainId ? `${name} (${CHAIN_NAMES[chainId] ?? `Chain ${chainId}`})` : name;

  const isHorizon = /horizon/i.test(poolName) || /HORIZON/i.test(key);
  const isPrime = /prime/i.test(poolName) || /PRIME/i.test(key);

  if (key.startsWith("AAVE_V3")) {
    if (isHorizon) return withChain("Aave V3 Horizon");
    if (isPrime) return withChain("Aave V3 Prime");
    return withChain("Aave V3 Core");
  }
  if (key.startsWith("AAVE_V2")) return withChain("Aave V2");
  if (key.startsWith("COMPOUND_V3")) return withChain(isPrime ? "Compound Prime" : "Compound Blue");

  if (LENDER_NAMES[key]) return withChain(LENDER_NAMES[key]);
  if (key.startsWith("MORPHO_BLUE")) return withChain("Morpho Blue");
  if (key.startsWith("SILO")) return withChain("Silo Finance");
  if (key.startsWith("EULER")) return withChain("Euler");
  if (key.startsWith("BENQI")) return withChain("Benqi");

  const base = key.replace(/_[A-F0-9]{8,}$/i, "");
  return withChain(base.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
}

function normalizeRatePercent(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : parseFloat(String(raw));
  if (!Number.isFinite(n)) return null;
  // 1Delta API returns rates already as percentages (e.g. 2.44 = 2.44%).
  // Do NOT multiply — just pass through.
  return n;
}

function normalizePercent(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : parseFloat(String(raw));
  if (!Number.isFinite(n)) return null;
  return Math.abs(n) <= 1 ? n * 100 : n;
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
  // All chains where 1delta has Composer contracts deployed.
  // The $10M TVL filter in callers will naturally exclude chains with no active protocols.
  const chainIds = [
    "1",      // Ethereum
    "10",     // Optimism
    "25",     // Cronos
    "40",     // Telos
    "50",     // XDC
    "56",     // BSC
    "100",    // Gnosis
    "130",    // Unichain
    "137",    // Polygon
    "143",    // Monad
    "146",    // Sonic
    "169",    // Manta Pacific
    "250",    // Fantom
    "999",    // HyperEVM
    "1088",   // Metis
    "1116",   // Core
    "1284",   // Moonbeam
    "1329",   // Sei
    "1868",   // Soneium
    "2818",   // Morph
    "5000",   // Mantle
    "8217",   // Kaia
    "8453",   // Base
    "9745",   // Plasma
    "34443",  // Mode
    "42161",  // Arbitrum
    "43111",  // Hemi
    "43114",  // Avalanche
    "59144",  // Linea
    "80094",  // Berachain
    "81457",  // Blast
    "167000", // Taiko
    "534352", // Scroll
    "747474", // Katana
  ];

  // Fetch all chains in parallel; use a shorter timeout per chain so slow
  // or unsupported chains don't block the overall response.
  const responses = await Promise.all(
    chainIds.map((chainId) => {
      const url = new URL(BASE + "/data/lending/pools");
      url.searchParams.set("chainId", chainId);
      url.searchParams.set("count", "200");
      return fetchJSON(url.toString(), hdrs, 12000);
    }),
  );

  const all: any[] = [];
  for (let i = 0; i < chainIds.length; i++) {
    const raw = responses[i];
    if (!raw) continue;
    const chainId = chainIds[i];
    const items = raw?.data?.items ?? raw?.data ?? (Array.isArray(raw) ? raw : []);
    all.push(
      ...items.map((item: any) => ({
        ...item,
        __chainId: item?.chainId ?? Number(chainId),
      })),
    );
  }

  return all;
}

async function fetchLending(hdrs: Record<string, string>) {
  const items = await fetch1DeltaPools(hdrs);
  return items
    .map((pool: any) => {
      const lenderKey = pool.lenderKey ?? pool.lender ?? "";
      if (lenderKey.startsWith("MORPHO_BLUE")) return null;
      if (lenderKey === "ZEROLEND") return null; // Removed from UI per product decision

      const chainId = resolveChainId(pool) ?? 1;
      const asset = extractAsset(pool);
      const tvl = parseFloat(pool.totalDepositsUsd) || 0;
      if (tvl < 10_000_000 || tvl > 100_000_000_000) return null; // filter <$10M and >$100B (data artifacts)
      const utilPct = normalizePercent(pool.utilization);
      const util = utilPct != null ? utilPct / 100 : 0;

      return {
        id: pool.marketUid ?? `${lenderKey}:${chainId}:${asset}`,
        marketUid: pool.marketUid ?? `${lenderKey}:${chainId}:${asset}`,
        protocol: lenderKey,
        protocolName: resolveLenderName(lenderKey, pool.name ?? "", chainId),
        poolName: pool.name ?? "",
        asset,
        supplyAPY: normalizeRatePercent(pool.depositRate) ?? 0,
        borrowAPR: normalizeRatePercent(pool.variableBorrowRate),
        totalSupplyUSD: tvl,
        availableLiquidityUSD: Math.round(tvl * (1 - util) * 100) / 100,
        utilizationRate: utilPct,
      };
    })
    .filter(Boolean);
}

/* ── Morpho vaults directly from Morpho GraphQL API ── */

async function fetchMorphoVaults(): Promise<any[]> {
  try {
    const query = `{
      vaults(first: 500, where: { chainId_in: [1, 10, 25, 56, 100, 130, 137, 146, 169, 250, 1088, 1116, 1284, 1329, 1868, 2818, 5000, 8217, 8453, 34443, 42161, 43114, 59144, 80094, 81457, 167000, 534352] }) {
        items {
          address
          name
          symbol
          chain { id }
          asset { symbol decimals priceUsd }
          metadata { curators { name } }
          state {
            totalAssets
            totalAssetsUsd
            apy
          }
        }
      }
    }`;
    const res = await fetch("https://blue-api.morpho.org/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const text = await res.text();
      console.log(`Morpho vault API status=${res.status} body=${text.slice(0, 500)}`);
      return [];
    }
    const json = await res.json();
    if (json.errors) {
      console.log(`Morpho GQL errors: ${JSON.stringify(json.errors[0])}`);
      return [];
    }
    const items = json?.data?.vaults?.items ?? [];
    console.log(`Morpho GraphQL: ${items.length} vaults`);

    return items
      .map((v: any) => {
        const asset = v.asset?.symbol ?? "";
        // Prefer totalAssetsUsd; if it looks like raw token units, normalize it
        const rawTvlUsd: number = v.state?.totalAssetsUsd ?? 0;
        const totalAssets: number = v.state?.totalAssets ?? 0;
        const decimals: number = v.asset?.decimals ?? 6;
        const priceUsd: number = v.asset?.priceUsd ?? 0;
        // If totalAssetsUsd looks implausible (> $10B per vault), recompute from raw amounts
        const computedTvl = priceUsd > 0 && totalAssets > 0
          ? (totalAssets / Math.pow(10, decimals)) * priceUsd
          : 0;
        const tvl = rawTvlUsd > 0 && rawTvlUsd < 10_000_000_000
          ? rawTvlUsd
          : computedTvl > 0 && computedTvl < 10_000_000_000
          ? computedTvl
          : 0;
        return { ...v, _tvl: tvl };
      })
      .filter((v: any) => {
        const tvl = v._tvl;
        if (tvl < 10_000_000) return false;   // $10M minimum
        // Filter out unrealistic APYs (>100%) — likely reward-gaming or data artifacts
        const apy = (v.state?.apy ?? 0) * 100;
        if (apy > 100) return false;
        return true;
      })
      .map((v: any) => {
        const asset = v.asset?.symbol ?? "";
        const tvl = v._tvl;
        const apy = (v.state?.apy ?? 0) * 100;
        const chainId = v.chain?.id ?? 1;
        const chainLabel = CHAIN_NAMES[chainId] ? ` (${CHAIN_NAMES[chainId]})` : "";
        const rawName = v.name ?? v.symbol ?? `Morpho ${asset}`;
        const displayName = chainLabel && !rawName.includes(chainLabel) ? `${rawName}${chainLabel}` : rawName;
        const curatorList = v.metadata?.curators ?? [];
        const curator = curatorList.length > 0 ? curatorList[0]?.name : undefined;

        return {
          id: `morpho-vault:${chainId}:${v.address}`,
          marketUid: v.address ?? "",
          name: displayName,
          protocol: "Morpho Blue",
          asset,
          apy,
          tvl,
          source: "morpho",
          ...(curator && { curator }),
        };
      });
  } catch (e) {
    console.log(`Morpho vaults error: ${(e as Error).message}`);
    return [];
  }
}

async function fetchVaults(hdrs: Record<string, string>) {
  const [morphoVaults, items1delta] = await Promise.all([
    fetchMorphoVaults(),
    fetch1DeltaPools(hdrs),
  ]);

  const eulerVaults: any[] = [];
  for (const pool of items1delta) {
    const lk = pool.lenderKey ?? "";
    if (!lk.startsWith("EULER")) continue;
    const tvl = parseFloat(pool.totalDepositsUsd) || 0;
    if (tvl < 10_000_000 || tvl > 50_000_000_000) continue; // $10M–$50B range for Euler vaults
    const chainId = resolveChainId(pool) ?? 1;
    const chainLabel = CHAIN_NAMES[chainId] ? ` (${CHAIN_NAMES[chainId]})` : "";
    const asset = extractAsset(pool);
    eulerVaults.push({
      id: pool.marketUid ?? `euler:${chainId}:${asset}`,
      marketUid: pool.marketUid ?? `euler:${chainId}:${asset}`,
      name: pool.name || `Euler ${asset}${chainLabel}`,
      protocol: `Euler${chainLabel}`,
      asset,
      apy: normalizeRatePercent(pool.depositRate) ?? 0,
      tvl,
      source: "euler",
    });
  }

  return [...morphoVaults, ...eulerVaults];
}


async function fetchPendleForChain(chainId: number): Promise<any[]> {
  const chainLabel = CHAIN_NAMES[chainId] ?? `Chain ${chainId}`;
  console.log(`Fetching Pendle markets for ${chainLabel}...`);
  const raw = await fetchJSON(
    `https://api-v2.pendle.finance/core/v1/markets/all?chainId=${chainId}`,
    {},
    20000,
  );

  if (!raw) {
    console.log(`Pendle API returned null for ${chainLabel}`);
    return [];
  }

  const items: any[] = raw.markets ?? (Array.isArray(raw) ? raw : (raw.results ?? raw.data ?? []));
  console.log(`Pendle ${chainLabel}: ${items.length} raw markets`);

  const now = Date.now();
  return items
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
      const suffix = chainId !== 1 ? ` (${chainLabel})` : "";
      return {
        id: m.address ?? `pendle:${chainId}:${m.name}`,
        name: `${m.name ?? ""}${suffix}`,
        asset,
        impliedAPY: normalizeRatePercent(details.impliedApy) ?? 0,
        expiry: m.expiry ?? "",
        daysToMaturity,
        tvl: details.liquidity ?? details.totalTvl ?? 0,
      };
    });
}

async function fetchPendle() {
  // All chains where Pendle has deployed markets
  const pendleChains = [1, 10, 56, 137, 5000, 8453, 42161, 146];
  const results = await Promise.all(pendleChains.map(c => fetchPendleForChain(c)));
  const all = results.flat();
  console.log(`Pendle: ${all.length} total active markets across ${pendleChains.length} chains`);
  return all;
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
