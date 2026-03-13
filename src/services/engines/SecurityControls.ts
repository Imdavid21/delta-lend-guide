export interface SecurityPolicy {
  maxTransactionLimitUSD: number;
  whitelistedProtocols: string[];
  requiresMultiSigner: boolean;
  rateLimitPerDay: number;
}

export class SecurityControls {
  private activePolicy: SecurityPolicy = {
    maxTransactionLimitUSD: 1_000_000,
    whitelistedProtocols: ["Aave V3", "Morpho Blue", "Euler V2", "Pendle"],
    requiresMultiSigner: true,
    rateLimitPerDay: 10,
  };

  validateTransaction(tx: any, policy?: SecurityPolicy): { success: boolean; error?: string } {
    const currentPolicy = policy || this.activePolicy;

    // Check amount limit
    if (tx.amountUSD > currentPolicy.maxTransactionLimitUSD) {
      return { success: false, error: `Transaction exceeds max limit of ${currentPolicy.maxTransactionLimitUSD} USD` };
    }

    // Check protocol whitelisting
    if (tx.protocol && !currentPolicy.whitelistedProtocols.includes(tx.protocol)) {
      return { success: false, error: `Protocol ${tx.protocol} is not in the security whitelist` };
    }

    // Check destination address whitelisting
    // if (!tx.isWhitelistedDestination) return { success: false, error: "Destination address not whitelisted" };

    return { success: true };
  }

  isMultiSignerRequired() {
    return this.activePolicy.requiresMultiSigner;
  }
}
