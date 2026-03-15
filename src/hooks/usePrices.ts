import useSWR from "swr";

const COINGECKO_IDS: Record<string, string> = {
  ETH:    "ethereum",
  WETH:   "weth",
  WBTC:   "wrapped-bitcoin",
  cbBTC:  "coinbase-wrapped-btc",
  USDC:   "usd-coin",
  USDT:   "tether",
  DAI:    "dai",
  wstETH: "wrapped-steth",
  cbETH:  "coinbase-wrapped-staked-eth",
  MATIC:  "matic-network",
  BNB:    "binancecoin",
  AVAX:   "avalanche-2",
};

const IDS = Object.values(COINGECKO_IDS).join(",");
const URL = `https://api.coingecko.com/api/v3/simple/price?ids=${IDS}&vs_currencies=usd`;

const fetcher = async (url: string): Promise<Record<string, number>> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko error ${res.status}`);
  const raw = await res.json() as Record<string, { usd: number }>;
  // Invert the map: symbol → price
  const prices: Record<string, number> = {};
  for (const [symbol, cgId] of Object.entries(COINGECKO_IDS)) {
    const entry = raw[cgId];
    if (entry) prices[symbol] = entry.usd;
  }
  return prices;
};

// Stale-while-revalidate every 60s; CoinGecko free tier allows ~30 req/min
const opts = { refreshInterval: 60_000, dedupingInterval: 30_000, revalidateOnFocus: false };

/**
 * Returns a map of symbol → USD price.
 * Falls back to reasonable static prices if the API is unavailable.
 */
export function usePrices(): Record<string, number> {
  const { data } = useSWR<Record<string, number>>(URL, fetcher, opts);
  return data ?? FALLBACK_PRICES;
}

/** Used while the first fetch is in-flight or if CoinGecko is unreachable */
const FALLBACK_PRICES: Record<string, number> = {
  ETH: 3500, WETH: 3500, WBTC: 95000, cbBTC: 95000,
  USDC: 1, USDT: 1, DAI: 1,
  wstETH: 4000, cbETH: 3600,
  MATIC: 0.5, BNB: 600, AVAX: 35,
};
