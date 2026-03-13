import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import type { AppKitNetwork } from "@reown/appkit/networks";
import {
  mainnet,
  optimism,
  arbitrum,
  base,
  polygon,
  bsc,
  avalanche,
} from "@reown/appkit/networks";

/**
 * WalletConnect/Reown project id (required).
 *
 * Prefer VITE_PROJECT_ID. WALLETCONNECT_PROJECT_ID is also accepted as a
 * compatibility fallback to ease merge/conflict resolution across branches.
 */
const configuredProjectId =
  import.meta.env.VITE_PROJECT_ID ?? import.meta.env.WALLETCONNECT_PROJECT_ID;

if (!configuredProjectId) {
  throw new Error(
    "Missing VITE_PROJECT_ID (or WALLETCONNECT_PROJECT_ID). Configure a Reown/WalletConnect project ID for this deployment.",
  );
}

export const projectId = configuredProjectId;

export const networks = [mainnet, optimism, arbitrum, base, polygon, bsc, avalanche] as [AppKitNetwork, ...AppKitNetwork[]];

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
});

export const config = wagmiAdapter.wagmiConfig;
