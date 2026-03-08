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
  name: string;
  protocol: string;
  asset: string;
  apy: number;
  tvl: number;
  source: "morpho" | "yearn" | "euler";
}

export interface PendleMarket {
  id: string;
  name: string;
  asset: string;
  impliedAPY: number;
  expiry: string;
  daysToMaturity: number;
  tvl: number;
}

export function formatPercent(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${v.toFixed(2)}%`;
}

export function formatUSD(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(2)}K`;
  return `$${v.toFixed(2)}`;
}
