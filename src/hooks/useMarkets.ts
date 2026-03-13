import useSWR from "swr";
import type { Market, Vault, PendleMarket } from "@/lib/marketTypes";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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

const STABLECOINS = ["USDC", "USDT", "DAI", "USDE", "SUSDE", "FRAX", "GHO", "EUSD", "CRVUSD", "LUSD", "PYUSD", "USDC.E"];

export function useMarkets() {
  const res = useSWR<Market[]>(
    `${SUPABASE_URL}/functions/v1/markets?type=lending`,
    fetcher,
    opts,
  );
  return {
    ...res,
    data: res.data ? res.data.filter((m) => STABLECOINS.includes(m.asset.toUpperCase())) : undefined,
  };
}

export function useVaults() {
  const res = useSWR<Vault[]>(
    `${SUPABASE_URL}/functions/v1/markets?type=vaults`,
    fetcher,
    opts,
  );
  return {
    ...res,
    data: res.data ? res.data.filter((m) => STABLECOINS.includes(m.asset.toUpperCase())) : undefined,
  };
}

export function usePendle() {
  const res = useSWR<PendleMarket[]>(
    `${SUPABASE_URL}/functions/v1/markets?type=pendle`,
    fetcher,
    opts,
  );
  return {
    ...res,
    data: res.data ? res.data.filter((m) => STABLECOINS.includes(m.asset.toUpperCase())) : undefined,
  };
}
