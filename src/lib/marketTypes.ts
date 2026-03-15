export interface Market {
  id: string;
  marketUid: string;
  protocol: string;
  protocolName: string;
  poolName: string;
  asset: string;
  supplyAPY: number;
  borrowAPR: number | null;
  totalSupplyUSD: number;
  availableLiquidityUSD: number;
  utilizationRate: number | null;
}

export interface Vault {
  id: string;
  marketUid?: string;
  name: string;
  protocol: string;
  asset: string;
  apy: number;
  tvl: number;
  source: "morpho" | "yearn" | "euler";
  curator?: string;
}


export function formatPercent(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v > 0 && v < 0.01) return "<0.01%";
  return `${v.toFixed(2)}%`;
}

export function formatUSD(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(2)}K`;
  return `$${v.toFixed(2)}`;
}


const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  8453: "Base",
};

function parseChainIdFromMarketUid(marketUid?: string): number | undefined {
  if (!marketUid) return undefined;
  const parts = marketUid.split(":");
  if (parts.length < 2) return undefined;
  const n = Number(parts[1]);
  return Number.isFinite(n) ? n : undefined;
}

function resolveProtocolInstance(protocol: string, poolName?: string): string | null {
  const isHorizon = /horizon/i.test(poolName ?? "") || /HORIZON/i.test(protocol);
  const isPrime = /prime/i.test(poolName ?? "") || /PRIME/i.test(protocol);

  if (protocol.startsWith("AAVE_V3")) return isHorizon ? "Horizon" : isPrime ? "Prime" : "Core";
  if (protocol.startsWith("COMPOUND_V3")) return isPrime ? "Prime" : "Blue";
  return null;
}

export function formatProtocolLabel(market: Pick<Market, "protocol" | "protocolName" | "poolName" | "marketUid">): string {
  // Trust backend-resolved labels (already include instance + chain info)
  return market.protocolName;
}
