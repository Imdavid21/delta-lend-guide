import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import {
  mainnet,
  optimism,
  arbitrum,
  base,
  polygon,
  bsc,
  avalanche,
} from "@reown/appkit/networks";

export const projectId = "d1a01c7977c04f18c87214e3e8887b49";

export const networks = [mainnet, optimism, arbitrum, base, polygon, bsc, avalanche] as const;

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
});

export const config = wagmiAdapter.wagmiConfig;
