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
 * Reown project ids are often restricted by origin in the dashboard. If the
 * id is missing or not configured for the current origin, WalletConnect URI
 * generation fails and the QR area can render blank.
 */
const configuredProjectId = import.meta.env.VITE_PROJECT_ID;

if (!configuredProjectId) {
  throw new Error(
    "Missing VITE_PROJECT_ID. Configure a Reown/WalletConnect project ID for this deployment.",
  );
}

export const projectId = configuredProjectId;

export const networks = [mainnet, optimism, arbitrum, base, polygon, bsc, avalanche] as [AppKitNetwork, ...AppKitNetwork[]];

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
});

export const config = wagmiAdapter.wagmiConfig;
