/**
 * 1delta supported chain registry.
 *
 * Composer contract addresses sourced from:
 * https://docs.1delta.io/contract-addresses
 *
 * Call Forwarder (all chains): 0xfCa1154C643C32638AEe9a43eeE7f377f515c801
 */

export interface ChainConfig {
  id: number;
  name: string;
  /** Short label used in the UI chain selector */
  label: string;
  /** 1delta Composer contract address on this chain */
  composerAddress: `0x${string}`;
  /** Representative gas cost range */
  gasEst: string;
  /** Approximate confirmation time */
  timeEst: string;
}

export const CALL_FORWARDER = "0xfCa1154C643C32638AEe9a43eeE7f377f515c801" as const;

export const CHAIN_CONFIGS: ChainConfig[] = [
  { id: 1,      name: "Ethereum",      label: "Ethereum",       composerAddress: "0x8e24cfc19c6c00c524353cb8816f5f1c2f33c201", gasEst: "~$2–15",   timeEst: "~12s" },
  { id: 10,     name: "Optimism",      label: "Optimism",       composerAddress: "0xCDef0A216fcEF809258aA4f341dB1A5aB296ea72", gasEst: "<$0.05",   timeEst: "~2s"  },
  { id: 25,     name: "Cronos",        label: "Cronos",         composerAddress: "0xcB6Eb8df68153cebF60E1872273Ef52075a5C297", gasEst: "<$0.01",   timeEst: "~5s"  },
  { id: 40,     name: "Telos",         label: "Telos",          composerAddress: "0xcB6Eb8df68153cebF60E1872273Ef52075a5C297", gasEst: "<$0.01",   timeEst: "~1s"  },
  { id: 50,     name: "XDC",           label: "XDC",            composerAddress: "0xcB6Eb8df68153cebF60E1872273Ef52075a5C297", gasEst: "<$0.01",   timeEst: "~2s"  },
  { id: 56,     name: "BSC",           label: "BSC",            composerAddress: "0x816EBC5cb8A5651C902Cb06659907A93E574Db0B", gasEst: "~$0.10",   timeEst: "~3s"  },
  { id: 100,    name: "Gnosis",        label: "Gnosis",         composerAddress: "0xcb6eb8df68153cebf60e1872273ef52075a5c297", gasEst: "<$0.01",   timeEst: "~5s"  },
  { id: 130,    name: "Unichain",      label: "Unichain",       composerAddress: "0xcB6Eb8df68153cebF60E1872273Ef52075a5C297", gasEst: "<$0.01",   timeEst: "~1s"  },
  { id: 137,    name: "Polygon",       label: "Polygon",        composerAddress: "0xFd245e732b40b6BF2038e42b476bD06580585326", gasEst: "~$0.05",   timeEst: "~2s"  },
  { id: 143,    name: "Monad",         label: "Monad",          composerAddress: "0x8E24CfC19c6C00c524353CB8816f5f1c2F33c201", gasEst: "<$0.01",   timeEst: "~1s"  },
  { id: 146,    name: "Sonic",         label: "Sonic",          composerAddress: "0x8E24CfC19c6C00c524353CB8816f5f1c2F33c201", gasEst: "<$0.01",   timeEst: "~1s"  },
  { id: 169,    name: "Manta Pacific", label: "Manta",          composerAddress: "0xcB6Eb8df68153cebF60E1872273Ef52075a5C297", gasEst: "<$0.01",   timeEst: "~2s"  },
  { id: 250,    name: "Fantom",        label: "Fantom",         composerAddress: "0x816EBC5cb8A5651C902Cb06659907A93E574Db0B", gasEst: "<$0.01",   timeEst: "~2s"  },
  { id: 999,    name: "HyperEVM",      label: "HyperEVM",       composerAddress: "0xcb6eb8df68153cebf60e1872273ef52075a5c297", gasEst: "<$0.01",   timeEst: "~1s"  },
  { id: 1088,   name: "Metis",         label: "Metis",          composerAddress: "0xCe434378adacC51d54312c872113D687Ac19B516", gasEst: "~$0.01",   timeEst: "~4s"  },
  { id: 1116,   name: "Core",          label: "Core",           composerAddress: "0x816EBC5cb8A5651C902Cb06659907A93E574Db0B", gasEst: "<$0.01",   timeEst: "~3s"  },
  { id: 1284,   name: "Moonbeam",      label: "Moonbeam",       composerAddress: "0x8E24CfC19c6C00c524353CB8816f5f1c2F33c201", gasEst: "<$0.01",   timeEst: "~12s" },
  { id: 1329,   name: "Sei",           label: "Sei",            composerAddress: "0x8E24CfC19c6C00c524353CB8816f5f1c2F33c201", gasEst: "<$0.01",   timeEst: "~1s"  },
  { id: 1868,   name: "Soneium",       label: "Soneium",        composerAddress: "0x8E24CfC19c6C00c524353CB8816f5f1c2F33c201", gasEst: "<$0.01",   timeEst: "~2s"  },
  { id: 2818,   name: "Morph",         label: "Morph",          composerAddress: "0xcB6Eb8df68153cebF60E1872273Ef52075a5C297", gasEst: "<$0.01",   timeEst: "~2s"  },
  { id: 5000,   name: "Mantle",        label: "Mantle",         composerAddress: "0x5c019a146758287c614fe654caec1ba1caf05f4e", gasEst: "<$0.01",   timeEst: "~2s"  },
  { id: 8217,   name: "Kaia",          label: "Kaia",           composerAddress: "0x8E24CfC19c6C00c524353CB8816f5f1c2F33c201", gasEst: "<$0.01",   timeEst: "~1s"  },
  { id: 8453,   name: "Base",          label: "Base",           composerAddress: "0xB7ea94340e65CC68d1274aE483dfBE593fD6f21e", gasEst: "<$0.01",   timeEst: "~2s"  },
  { id: 9745,   name: "Plasma",        label: "Plasma",         composerAddress: "0x8E24CfC19c6C00c524353CB8816f5f1c2F33c201", gasEst: "<$0.01",   timeEst: "~2s"  },
  { id: 34443,  name: "Mode",          label: "Mode",           composerAddress: "0x8E24CfC19c6C00c524353CB8816f5f1c2F33c201", gasEst: "<$0.01",   timeEst: "~2s"  },
  { id: 42161,  name: "Arbitrum",      label: "Arbitrum",       composerAddress: "0x05f3f58716a88A52493Be45aA0871c55b3748f18", gasEst: "<$0.10",   timeEst: "~2s"  },
  { id: 43111,  name: "Hemi",          label: "Hemi",           composerAddress: "0x79f4061BF049c5c6CAC6bfe2415c2460815F4ac7", gasEst: "<$0.01",   timeEst: "~2s"  },
  { id: 43114,  name: "Avalanche",     label: "Avalanche",      composerAddress: "0x8E24CfC19c6C00c524353CB8816f5f1c2F33c201", gasEst: "~$0.05",   timeEst: "~2s"  },
  { id: 59144,  name: "Linea",         label: "Linea",          composerAddress: "0x816EBC5cb8A5651C902Cb06659907A93E574Db0B", gasEst: "<$0.05",   timeEst: "~2s"  },
  { id: 80094,  name: "Berachain",     label: "Berachain",      composerAddress: "0xcB6Eb8df68153cebF60E1872273Ef52075a5C297", gasEst: "<$0.01",   timeEst: "~2s"  },
  { id: 81457,  name: "Blast",         label: "Blast",          composerAddress: "0x816EBC5cb8A5651C902Cb06659907A93E574Db0B", gasEst: "<$0.01",   timeEst: "~2s"  },
  { id: 167000, name: "Taiko",         label: "Taiko",          composerAddress: "0x594cE4B82A81930cC637f1A59afdFb0D70054232", gasEst: "<$0.01",   timeEst: "~15s" },
  { id: 534352, name: "Scroll",        label: "Scroll",         composerAddress: "0x8E24CfC19c6C00c524353CB8816f5f1c2F33c201", gasEst: "<$0.01",   timeEst: "~8s"  },
  { id: 747474, name: "Katana",        label: "Katana",         composerAddress: "0x8E24CfC19c6C00c524353CB8816f5f1c2F33c201", gasEst: "<$0.01",   timeEst: "~2s"  },
];

// Quick lookup maps
export const CHAIN_BY_ID: Record<number, ChainConfig> = Object.fromEntries(
  CHAIN_CONFIGS.map(c => [c.id, c]),
);
export const CHAIN_BY_NAME: Record<string, ChainConfig> = Object.fromEntries(
  CHAIN_CONFIGS.map(c => [c.name, c]),
);

export const ALL_CHAIN_IDS: number[] = CHAIN_CONFIGS.map(c => c.id);

// Subset of chains available as named exports in @reown/appkit/networks
// (used in wagmi.ts to build the wallet network list)
export const WAGMI_CHAIN_IDS = new Set([
  1, 10, 56, 100, 137, 250, 1088, 1284, 5000, 8453, 34443, 42161, 43114, 59144, 80094, 81457, 534352,
]);
