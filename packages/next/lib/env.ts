const fallback = (value: string | undefined, label: string): string => {
  if (!value) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[env] Missing value for ${label}`);
    }
    return "";
  }
  return value;
};

export const env = {
  walletConnectProjectId: fallback(process.env.NEXT_PUBLIC_WALLETCONNECT_ID, "NEXT_PUBLIC_WALLETCONNECT_ID"),
  chainIds: {
    testnet: Number(process.env.NEXT_PUBLIC_CHAIN_ID_TESTNET ?? 167012),
    mainnet: Number(process.env.NEXT_PUBLIC_CHAIN_ID_MAINNET ?? 0)
  },
  rpcUrls: {
    testnet: fallback(process.env.NEXT_PUBLIC_RPC_URL_TESTNET, "NEXT_PUBLIC_RPC_URL_TESTNET") ||
      "https://rpc.kasplextest.xyz",
    mainnet: fallback(process.env.NEXT_PUBLIC_RPC_URL_MAINNET, "NEXT_PUBLIC_RPC_URL_MAINNET") ||
      "https://rpc.kasplexmainnet.xyz"
  },
  explorers: {
    testnet:
      process.env.NEXT_PUBLIC_EXPLORER_TESTNET || "https://explorer.testnet.kasplextest.xyz",
    mainnet: process.env.NEXT_PUBLIC_EXPLORER_MAINNET || "https://explorer.kasplex.xyz"
  },
  contracts: {
    kasRaffleTestnet: process.env.NEXT_PUBLIC_KASRAFFLE_TESTNET,
    kasRaffleMainnet: process.env.NEXT_PUBLIC_KASRAFFLE_MAINNET
  }
} as const;
