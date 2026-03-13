export class CustodyAdapter {
  constructor() {}

  async executeTransaction(_walletType: "retail", tx: any): Promise<any> {
    // For retail, we just return the calldata for the frontend to sign
    return {
      type: "signatureRequest",
      tx,
    };
  }
}
