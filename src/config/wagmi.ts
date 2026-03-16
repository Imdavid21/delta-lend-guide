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
  gnosis,
  fantom,
  metis,
  moonbeam,
  mantle,
  mode,
  blast,
  scroll,
  linea,
  berachain,
} from "@reown/appkit/networks";

// Additional chains defined manually for 1delta support.
// Using the AppKitNetwork shape so they integrate with AppKit/WalletConnect.
const sonic: AppKitNetwork = {
  id: 146,
  name: "Sonic",
  nativeCurrency: { name: "Sonic", symbol: "S", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.soniclabs.com"] } },
  blockExplorers: { default: { name: "SonicScan", url: "https://sonicscan.org" } },
  chainNamespace: "eip155",
  caipNetworkId: "eip155:146",
};

const sei: AppKitNetwork = {
  id: 1329,
  name: "Sei",
  nativeCurrency: { name: "Sei", symbol: "SEI", decimals: 18 },
  rpcUrls: { default: { http: ["https://evm-rpc.sei-apis.com"] } },
  blockExplorers: { default: { name: "Seitrace", url: "https://seitrace.com" } },
  chainNamespace: "eip155",
  caipNetworkId: "eip155:1329",
};

const unichain: AppKitNetwork = {
  id: 130,
  name: "Unichain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://mainnet.unichain.org"] } },
  blockExplorers: { default: { name: "Uniscan", url: "https://uniscan.xyz" } },
  chainNamespace: "eip155",
  caipNetworkId: "eip155:130",
};

const manta: AppKitNetwork = {
  id: 169,
  name: "Manta Pacific",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://pacific-rpc.manta.network/http"] } },
  blockExplorers: { default: { name: "Manta Pacific Explorer", url: "https://pacific-explorer.manta.network" } },
  chainNamespace: "eip155",
  caipNetworkId: "eip155:169",
};

const coreDao: AppKitNetwork = {
  id: 1116,
  name: "Core",
  nativeCurrency: { name: "Core", symbol: "CORE", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.coredao.org"] } },
  blockExplorers: { default: { name: "CoreScan", url: "https://scan.coredao.org" } },
  chainNamespace: "eip155",
  caipNetworkId: "eip155:1116",
};

const taiko: AppKitNetwork = {
  id: 167000,
  name: "Taiko",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.taiko.xyz"] } },
  blockExplorers: { default: { name: "Taikoscan", url: "https://taikoscan.io" } },
  chainNamespace: "eip155",
  caipNetworkId: "eip155:167000",
};

const soneium: AppKitNetwork = {
  id: 1868,
  name: "Soneium",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.soneium.org"] } },
  blockExplorers: { default: { name: "Soneium Explorer", url: "https://explorer.soneium.org" } },
  chainNamespace: "eip155",
  caipNetworkId: "eip155:1868",
};

const berachainV2: AppKitNetwork = berachain;

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

// All 1delta-supported chains available in the wallet switcher.
export const networks = [
  // Tier 1 — high TVL / common use
  mainnet,
  arbitrum,
  base,
  optimism,
  polygon,
  bsc,
  avalanche,
  // Tier 2 — active DeFi ecosystems
  gnosis,
  mantle,
  blast,
  scroll,
  linea,
  mode,
  berachainV2,
  fantom,
  metis,
  moonbeam,
  // Tier 3 — newer / emerging
  sonic,
  sei,
  unichain,
  manta,
  coreDao,
  taiko,
  soneium,
] as [AppKitNetwork, ...AppKitNetwork[]];

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
});

export const config = wagmiAdapter.wagmiConfig;
