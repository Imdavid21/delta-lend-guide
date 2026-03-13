import { Market, Vault, PendleMarket } from "@/lib/marketTypes";

export class MarketDataLayer {
  private supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  private supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  async fetchLendingMarkets(): Promise<Market[]> {
    const res = await fetch(`${this.supabaseUrl}/functions/v1/markets?type=lending`, {
      headers: { Authorization: `Bearer ${this.supabaseKey}` },
    });
    return res.json();
  }

  async fetchVaults(): Promise<Vault[]> {
    const res = await fetch(`${this.supabaseUrl}/functions/v1/markets?type=vaults`, {
      headers: { Authorization: `Bearer ${this.supabaseKey}` },
    });
    return res.json();
  }

  async fetchPendleMarkets(): Promise<PendleMarket[]> {
    const res = await fetch(`${this.supabaseUrl}/functions/v1/markets?type=pendle`, {
      headers: { Authorization: `Bearer ${this.supabaseKey}` },
    });
    return res.json();
  }

  async getAllStablecoinOpportunities(): Promise<(Market | Vault | PendleMarket)[]> {
    const [lending, vaults, pendle] = await Promise.all([
      this.fetchLendingMarkets(),
      this.fetchVaults(),
      this.fetchPendleMarkets(),
    ]);

    const STABLECOINS = ["USDC", "USDT", "DAI", "USDE", "SUSDE", "FRAX", "GHO", "LUSD"];
    
    const filterFn = (m: any) => STABLECOINS.includes(m.asset?.toUpperCase());

    return [
      ...lending.filter(filterFn),
      ...vaults.filter(filterFn),
      ...pendle.filter(filterFn),
    ];
  }
}
