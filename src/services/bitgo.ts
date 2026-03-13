export interface BitGoWallet {
  id: string;
  label: string;
  coin: string;
  address: string;
  balance: number;
}

export interface BitGoTxRequest {
  id: string;
  walletId: string;
  status: "pendingApproval" | "approved" | "signed" | "broadcasted" | "failed";
  destination: string;
  amount: string;
  data?: string;
}

export class BitGoService {
  private accessToken: string;
  private enterpriseId: string;
  private apiUrl = "https://api.bitgo.com/api/v2";

  constructor(accessToken: string, enterpriseId: string) {
    this.accessToken = accessToken;
    this.enterpriseId = enterpriseId;
  }

  async getWallets(coin?: string): Promise<BitGoWallet[]> {
    const url = `${this.apiUrl}/wallet?enterprise=${this.enterpriseId}${coin ? `&coin=${coin}` : ""}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!res.ok) throw new Error(`BitGo error: ${res.statusText}`);
    const data = await res.json();
    return data.wallets.map((w: any) => ({
      id: w.id,
      label: w.label,
      coin: w.coin,
      address: w.receiveAddress?.address,
      balance: w.balance,
    }));
  }

  async getBalances(walletId: string): Promise<number> {
    const url = `${this.apiUrl}/wallet/${walletId}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!res.ok) throw new Error(`BitGo error: ${res.statusText}`);
    const data = await res.json();
    return data.balance;
  }

  async createTxRequest(walletId: string, destination: string, amount: string, data?: string): Promise<BitGoTxRequest> {
    const url = `${this.apiUrl}/wallet/${walletId}/txrequests`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipients: [{ address: destination, amount }],
        data,
      }),
    });
    if (!res.ok) throw new Error(`BitGo error: ${res.statusText}`);
    return res.json();
  }
}
