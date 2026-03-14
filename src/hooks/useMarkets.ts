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

function isZeroLend(item: { protocol?: string; protocolName?: string; name?: string }): boolean {
  const haystack = `${item.protocol ?? ""} ${item.protocolName ?? ""} ${item.name ?? ""}`.toLowerCase();
  return haystack.includes("zerolend");
}

const opts = { refreshInterval: 60_000, revalidateOnFocus: true, dedupingInterval: 30_000 };

export function useMarkets() {
  return useSWR<Market[]>(
    `${SUPABASE_URL}/functions/v1/markets?type=lending`,
    async (url: string) => {
      const data = await fetcher(url);
      return (data as Market[]).filter((m) => !isZeroLend(m));
    },
    opts,
  );
}

export function useVaults() {
  return useSWR<Vault[]>(
    `${SUPABASE_URL}/functions/v1/markets?type=vaults`,
    async (url: string) => {
      const data = await fetcher(url);
      return (data as Vault[]).filter((v) => !isZeroLend(v));
    },
    opts,
  );
}

export function usePendle() {
  return useSWR<PendleMarket[]>(
    `${SUPABASE_URL}/functions/v1/markets?type=pendle`,
    async (url: string) => {
      const data = await fetcher(url);
      return (data as PendleMarket[]).filter((p) => !isZeroLend(p));
    },
    opts,
  );
}
