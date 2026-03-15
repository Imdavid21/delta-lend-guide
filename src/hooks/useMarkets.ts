import useSWR from "swr";
import type { Market, Vault } from "@/lib/marketTypes";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
const MIN_TVL_USD = 10_000_000;

const fetcher = async (url: string) => {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
};

const opts = { refreshInterval: 60_000, revalidateOnFocus: true, dedupingInterval: 30_000 };

export function useMarkets() {
  return useSWR<Market[]>(
    SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/markets?type=lending` : null,
    async (url) => {
      const markets = await fetcher(url) as Market[];
      return markets.filter((market) => market.totalSupplyUSD >= MIN_TVL_USD);
    },
    opts,
  );
}

export function useVaults() {
  return useSWR<Vault[]>(
    SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/markets?type=vaults` : null,
    async (url) => {
      const vaults = await fetcher(url) as Vault[];
      return vaults.filter((vault) => vault.tvl >= MIN_TVL_USD);
    },
    opts,
  );
}
