import { BitGoService } from "../bitgo";

export type WalletType = "retail" | "bitgo";

export class CustodyAdapter {
  private bitgoService?: BitGoService;

  constructor(bitgoService?: BitGoService) {
    this.bitgoService = bitgoService;
  }

  async executeTransaction(walletType: WalletType, tx: any): Promise<any> {
    if (walletType === "retail") {
      // For retail, we just return the calldata for the frontend to sign
      return {
        type: "signatureRequest",
        tx,
      };
    } else {
      if (!this.bitgoService) throw new Error("BitGo service not configured");
      
      // For BitGo, we create a transaction request
      const request = await this.bitgoService.createTxRequest(
        tx.walletId, 
        tx.to, 
        tx.amount || "0", 
        tx.data
      );

      return {
        type: "bitgoTxRequest",
        requestId: request.id,
        status: request.status,
      };
    }
  }
}
