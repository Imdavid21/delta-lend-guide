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
 * WalletConnect/Reown project id.
 *
 * In hosted builders (e.g. Lovable), env vars can be absent at build time.
 * Use env when provided, otherwise fall back to a known project id so builds
 * do not fail during module evaluation.
 */
const fallbackProjectId = "d1a01c7977c04f18c87214e3e8887b49";

export const projectId =
  import.meta.env.VITE_PROJECT_ID ??
  import.meta.env.WALLETCONNECT_PROJECT_ID ??
  fallbackProjectId;

export const networks = [mainnet, optimism, arbitrum, base, polygon, bsc, avalanche] as [AppKitNetwork, ...AppKitNetwork[]];

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
});

export const config = wagmiAdapter.wagmiConfig;
