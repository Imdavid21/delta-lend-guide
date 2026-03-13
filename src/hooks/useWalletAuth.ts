import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { supabase } from "@/integrations/supabase/client";

/**
 * Watches wallet connection state and upserts into wallet_users table.
 * Treats each wallet connect as a "sign in / sign up".
 */
export function useWalletAuth() {
  const { address, isConnected, chainId } = useAccount();
  const lastRegistered = useRef<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      lastRegistered.current = null;
      return;
    }

    // Don't re-register the same address
    if (lastRegistered.current === address) return;
    lastRegistered.current = address;

    const lowerAddress = address.toLowerCase();

    (async () => {
      try {
        // Upsert: insert if new, update last_connected_at if existing
        const { error } = await supabase
          .from("wallet_users" as any)
          .upsert(
            {
              wallet_address: lowerAddress,
              chain_id: chainId ?? 1,
              last_connected_at: new Date().toISOString(),
            } as any,
            { onConflict: "wallet_address" }
          );

        if (error) {
          console.error("Failed to register wallet:", error.message);
        } else {
          console.log("Wallet registered/updated:", lowerAddress);
        }
      } catch (err) {
        console.error("Wallet auth error:", err);
      }
    })();
  }, [isConnected, address, chainId]);
}
