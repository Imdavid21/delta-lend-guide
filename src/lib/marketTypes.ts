export interface Market {
  id: string;
  marketUid: string;
  chainId: string;
  chainName: string;
  protocol: string;
  protocolName: string;
  poolName: string;
  vaultName: string;
  asset: string;
  supplyAPY: number;
  supplyAPYWithIncentives: number;
  borrowAPR: number | null;
  totalSupplyUSD: number;
  availableLiquidityUSD: number;
  utilizationRate: number | null;
  updatedAt: number;
}

export const CHAIN_NAMES: Record<string, string> = {
  "1": "Ethereum", "10": "Optimism", "25": "Cronos", "40": "Telos", "50": "XDC",
  "56": "BNB Chain", "100": "Gnosis", "130": "Unichain", "137": "Polygon", "143": "Monad",
  "146": "Sonic", "169": "Manta Pacific", "250": "Fantom", "1088": "Metis", "1116": "Core DAO",
  "1284": "Moonbeam", "1329": "Sei", "1868": "Soneium", "2818": "Morph", "5000": "Mantle",
  "8217": "Klaytn", "8453": "Base", "9745": "Plasma", "34443": "Mode", "42161": "Arbitrum",
  "43111": "Hemi", "43114": "Avalanche", "59144": "Linea", "80094": "Berachain",
  "81457": "Blast", "167000": "Taiko", "534352": "Scroll", "747474": "Katana",
};

export const LENDER_NAMES: Record<string, string> = {
  "AAVE_V2": "Aave V2", "AAVE_V3": "Aave V3", "COMPOUND_V2": "Compound V2",
  "COMPOUND_V3": "Compound V3", "LENDLE": "Lendle", "MORPHO": "Morpho",
  "MORPHO_BLUE": "Morpho Blue", "SPARK": "Spark", "RADIANT": "Radiant",
  "RADIANT_V2": "Radiant V2", "VENUS": "Venus", "SEAMLESS": "Seamless",
  "ZEROLEND": "ZeroLend", "LAYERBANK": "LayerBank", "AURELIUS": "Aurelius",
  "INIT": "Init Capital", "MERIDIAN": "Meridian", "IRONCLAD": "Ironclad",
  "GRANARY": "Granary", "YLDR": "Yldr", "MOONWELL": "Moonwell",
  "MENDI": "Mendi Finance", "SILO": "Silo Finance",
};

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
