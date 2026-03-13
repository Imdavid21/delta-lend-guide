import { Market, Vault, PendleMarket } from "@/lib/marketTypes";

export interface StrategyPlan {
  allocations: {
    target: Market | Vault | PendleMarket;
    amount: number;
    description: string;
  }[];
  expectedAPY: number;
  riskScore: "Low" | "Medium" | "High";
}

export class StrategyEngine {
  generatePlan(opportunities: (Market | Vault | PendleMarket)[], totalCapital: number): StrategyPlan {
    // Sort by APY descending
    const sorted = [...opportunities].sort((a, b) => {
      const aYield = (a as any).supplyAPY || (a as any).apy || (a as any).impliedAPY || 0;
      const bYield = (b as any).supplyAPY || (b as any).apy || (b as any).impliedAPY || 0;
      return bYield - aYield;
    });

    // Simple allocation: Split top 3
    const top3 = sorted.slice(0, 3);
    const count = top3.length;
    if (count === 0) return { allocations: [], expectedAPY: 0, riskScore: "Low" };

    const weight = totalCapital / count;
    let totalYield = 0;

    const allocations = top3.map((o) => {
      const y = (o as any).supplyAPY || (o as any).apy || (o as any).impliedAPY || 0;
      totalYield += y;
      return {
        target: o,
        amount: weight,
        description: `Deposit ${weight.toLocaleString()} ${(o as any).asset} into ${(o as any).protocolName || (o as any).protocol || 'Vault'}`,
      };
    });

    return {
      allocations,
      expectedAPY: totalYield / count,
      riskScore: "Medium",
    };
  }
}
