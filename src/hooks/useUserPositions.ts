import useSWR from "swr";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

export interface ProtocolPosition {
  protocol: string;       // e.g. "Aave V3 Core"
  protocolKey: string;    // e.g. "AAVE_V3"
  chain: string;          // e.g. "Ethereum"
  chainId: number;
  asset: string;          // e.g. "USDC"
  supplyUSD: number;
  borrowUSD: number;
  supplyAPY: number | null;
  borrowAPR: number | null;
  healthFactor?: number;
}

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum", 8453: "Base", 42161: "Arbitrum", 10: "Optimism",
};

const LENDER_DISPLAY: Record<string, string> = {
  AAVE_V3: "Aave V3",
  AAVE_V3_PRIME: "Aave V3 Prime",
  AAVE_V3_HORIZON: "Aave V3 Horizon",
  AAVE_V2: "Aave V2",
  COMPOUND_V3: "Compound V3",
  COMPOUND_V2: "Compound V2",
  MORPHO_BLUE: "Morpho Blue",
  SPARK: "Spark",
  MOONWELL: "Moonwell",
  SEAMLESS: "Seamless",
  SILO: "Silo Finance",
  EULER: "Euler",
  GRANARY: "Granary",
};

function lenderDisplayName(key: string): string {
  for (const [prefix, name] of Object.entries(LENDER_DISPLAY)) {
    if (key.startsWith(prefix)) return name;
  }
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Parse the 1delta /data/lending/user-positions response into flat ProtocolPosition[] */
function parsePositions(raw: any): ProtocolPosition[] {
  if (!raw) return [];

  // 1delta can return different shapes — handle both array and object
  const items: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.data?.items)
    ? raw.data.items
    : Array.isArray(raw?.positions)
    ? raw.positions
    : Object.values(raw?.data ?? raw ?? {}).flat();

  const out: ProtocolPosition[] = [];

  for (const item of items) {
    if (!item || typeof item !== "object") continue;

    // Flatten nested reserve/position arrays if present
    const reserves: any[] = Array.isArray(item.reserves)
      ? item.reserves
      : Array.isArray(item.positions)
      ? item.positions
      : [item];

    const chainId = Number(item.chainId ?? item.chain ?? 1);
    const protocolKey = String(item.lenderKey ?? item.lender ?? item.protocol ?? "UNKNOWN");

    for (const r of reserves) {
      const supplyRaw =
        parseFloat(r.supplyBalanceUsd ?? r.supplyUsd ?? r.collateralUsd ?? r.depositUsd ?? "0") || 0;
      const borrowRaw =
        parseFloat(r.borrowBalanceUsd ?? r.borrowUsd ?? r.debtUsd ?? "0") || 0;

      if (supplyRaw < 0.01 && borrowRaw < 0.01) continue; // skip dust

      const supplyAPY = (() => {
        const v = r.supplyAPY ?? r.depositAPY ?? r.depositRate ?? r.supplyRate ?? null;
        if (v === null || v === undefined) return null;
        const n = parseFloat(v);
        if (isNaN(n)) return null;
        // rates can come as 0.035 (3.5%) or 3.5 — normalize
        return Math.abs(n) <= 1 ? +(n * 100).toFixed(2) : +n.toFixed(2);
      })();

      const borrowAPR = (() => {
        const v = r.borrowAPR ?? r.variableBorrowRate ?? r.borrowRate ?? null;
        if (v === null || v === undefined) return null;
        const n = parseFloat(v);
        if (isNaN(n)) return null;
        return Math.abs(n) <= 1 ? +(n * 100).toFixed(2) : +n.toFixed(2);
      })();

      const asset = String(
        r.asset ?? r.symbol ?? r.assetGroup ?? r.tokenSymbol ?? item.asset ?? "?"
      );

      out.push({
        protocol: lenderDisplayName(protocolKey),
        protocolKey,
        chain: CHAIN_NAMES[chainId] ?? `Chain ${chainId}`,
        chainId,
        asset,
        supplyUSD: supplyRaw,
        borrowUSD: borrowRaw,
        supplyAPY,
        borrowAPR,
        healthFactor: r.healthFactor != null ? parseFloat(r.healthFactor) : undefined,
      });
    }
  }

  return out.sort((a, b) => (b.supplyUSD + b.borrowUSD) - (a.supplyUSD + a.borrowUSD));
}

const fetcher = async (url: string): Promise<ProtocolPosition[]> => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`positions API error ${res.status}`);
  return parsePositions(await res.json());
};

export function useUserPositions(address?: string) {
  const key =
    address && SUPABASE_URL
      ? `${SUPABASE_URL}/functions/v1/user-positions?account=${address}&chains=1,8453`
      : null;

  return useSWR<ProtocolPosition[]>(key, fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
    dedupingInterval: 15_000,
  });
}
