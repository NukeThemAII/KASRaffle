import { defineChain } from "viem";

import { env } from "@/lib/env";

export const kasplexTestnet = defineChain({
  id: env.chainIds.testnet,
  name: "Kasplex Testnet",
  network: "kasplex-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Bridged Kas",
    symbol: "KAS"
  },
  rpcUrls: {
    default: {
      http: [env.rpcUrls.testnet]
    },
    public: {
      http: [env.rpcUrls.testnet]
    }
  },
  blockExplorers: {
    default: {
      name: "Kasplex Testnet Explorer",
      url: env.explorers.testnet
    }
  }
});

export const kasplexMainnet = defineChain({
  id: env.chainIds.mainnet || 0,
  name: "Kasplex Mainnet",
  network: "kasplex-mainnet",
  nativeCurrency: {
    decimals: 18,
    name: "Kas",
    symbol: "KAS"
  },
  rpcUrls: {
    default: {
      http: [env.rpcUrls.mainnet]
    },
    public: {
      http: [env.rpcUrls.mainnet]
    }
  },
  blockExplorers: {
    default: {
      name: "Kasplex Explorer",
      url: env.explorers.mainnet
    }
  }
});

export const kasplexChains = env.chainIds.mainnet
  ? [kasplexTestnet, kasplexMainnet]
  : [kasplexTestnet];
