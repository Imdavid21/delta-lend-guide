import useSWR from "swr";

// 1delta has access-control-allow-origin: * — call directly, no proxy needed
const ONEDELTA_BASE = "https://portal.1delta.io/v1";

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
  1: "Ethereum", 10: "Optimism", 25: "Cronos", 40: "Telos", 50: "XDC",
  56: "BSC", 100: "Gnosis", 130: "Unichain", 137: "Polygon", 146: "Sonic",
  169: "Manta", 250: "Fantom", 999: "HyperEVM", 1088: "Metis", 1116: "Core",
  1284: "Moonbeam", 1329: "Sei", 1868: "Soneium", 2818: "Morph", 5000: "Mantle",
  8217: "Kaia", 8453: "Base", 9745: "Plasma", 34443: "Mode", 42161: "Arbitrum",
  43111: "Hemi", 43114: "Avalanche", 59144: "Linea", 80094: "Berachain",
  81457: "Blast", 167000: "Taiko", 534352: "Scroll", 747474: "Katana",
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
  FLUX: "Flux Finance",
};

function lenderDisplayName(key: string): string {
  // Strip trailing vault hash: "MORPHO_BLUE_AB0D..." → "MORPHO_BLUE"
  const base = key.replace(/_[A-F0-9]{8,}$/i, "");
  for (const [prefix, name] of Object.entries(LENDER_DISPLAY)) {
    if (base.startsWith(prefix)) return name;
  }
  return base.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Normalize a rate that may be a decimal (0.035) or already a percent (3.5) */
function normalizeRate(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (!Number.isFinite(n)) return null;
  // Values <= 1 are decimal form (0.035 → 3.5%). Values > 1 are already percent.
  return Math.abs(n) <= 1 ? +(n * 100).toFixed(2) : +n.toFixed(2);
}

/**
 * Parse the 1delta /data/lending/user-positions response.
 *
 * Confirmed shape:
 *   { success: true, data: { items: [
 *     { lender, chainId, aprData: { depositApr, borrowApr }, data: [
 *       { health, positions: [
 *         { depositsUSD, debtUSD, debtStableUSD, underlyingInfo: { asset: { symbol } } }
 *       ]}
 *     ]}
 *   ]}}
 */
function parsePositions(raw: any): ProtocolPosition[] {
  if (!raw) return [];

  const items: any[] = Array.isArray(raw?.data?.items)
    ? raw.data.items
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw)
    ? raw
    : [];

  const out: ProtocolPosition[] = [];

  for (const item of items) {
    if (!item || typeof item !== "object") continue;

    const chainId = Number(item.chainId ?? 1);
    const rawLender = String(item.lender ?? "UNKNOWN");
    // Strip Morpho vault hash suffix to get stable protocol key
    const protocolKey = rawLender.replace(/_[A-F0-9]{8,}$/i, "");

    // APR lives at the item level (not position level)
    const itemApr = item.aprData ?? {};
    const itemSupplyAPY = normalizeRate(itemApr.depositApr ?? itemApr.apr);
    const itemBorrowAPR = normalizeRate(itemApr.borrowApr);

    const accountDataList: any[] = Array.isArray(item.data) ? item.data : [];

    for (const accountData of accountDataList) {
      const rawHealth = accountData?.health;
      const healthFactor =
        rawHealth != null && rawHealth !== "Infinity"
          ? parseFloat(rawHealth)
          : undefined;

      const positions: any[] = Array.isArray(accountData?.positions)
        ? accountData.positions
        : [];

      for (const pos of positions) {
        const supplyUSD =
          parseFloat(pos.depositsUSD ?? pos.depositsUSDOracle ?? 0) || 0;
        const borrowUSD =
          (parseFloat(pos.debtUSD ?? 0) || 0) +
          (parseFloat(pos.debtStableUSD ?? 0) || 0);

        if (supplyUSD < 0.01 && borrowUSD < 0.01) continue;

        const asset = String(
          pos.underlyingInfo?.asset?.symbol ??
            pos.underlyingInfo?.asset?.assetGroup ??
            pos.underlying ??
            "?"
        );

        // Prefer position-level APR if it has data, else use item-level
        const posApr = pos.aprData ?? {};
        const supplyAPY =
          posApr.depositApr != null
            ? normalizeRate(posApr.depositApr)
            : itemSupplyAPY;
        const borrowAPR =
          posApr.borrowApr != null
            ? normalizeRate(posApr.borrowApr)
            : itemBorrowAPR;

        out.push({
          protocol: lenderDisplayName(rawLender),
          protocolKey,
          chain: CHAIN_NAMES[chainId] ?? `Chain ${chainId}`,
          chainId,
          asset,
          supplyUSD,
          borrowUSD,
          supplyAPY,
          borrowAPR,
          healthFactor:
            healthFactor != null && !isNaN(healthFactor)
              ? healthFactor
              : undefined,
        });
      }
    }
  }

  return out.sort(
    (a, b) => b.supplyUSD + b.borrowUSD - (a.supplyUSD + a.borrowUSD)
  );
}

const fetcher = async (address: string): Promise<ProtocolPosition[]> => {
  const url = `${ONEDELTA_BASE}/data/lending/user-positions?account=${address}&chains=${Object.keys(CHAIN_NAMES).join(",")}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`positions API error ${res.status}`);
  return parsePositions(await res.json());
};

export function useUserPositions(address?: string) {
  return useSWR<ProtocolPosition[]>(
    address ? `1delta-positions:${address}` : null,
    () => fetcher(address!),
    {
      refreshInterval: 30_000,
      revalidateOnFocus: false,
      dedupingInterval: 15_000,
    }
  );
}
