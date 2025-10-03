import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";

import { kasplexChains, kasplexMainnet, kasplexTestnet } from "@/lib/chains";
import { env } from "@/lib/env";

const transports: Record<number, ReturnType<typeof http>> = {
  [kasplexTestnet.id]: http(env.rpcUrls.testnet)
};

if (env.chainIds.mainnet && kasplexMainnet.id !== 0) {
  transports[kasplexMainnet.id] = http(env.rpcUrls.mainnet);
}

export const wagmiConfig = getDefaultConfig({
  appName: "KASRaffle",
  projectId: env.walletConnectProjectId || "kasraffle-dev",
  chains: kasplexChains,
  ssr: true,
  transports
});
