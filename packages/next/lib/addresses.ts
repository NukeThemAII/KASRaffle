import { env } from "@/lib/env";

export type SupportedChainId = number;

const addresses: Record<SupportedChainId, { kasRaffle?: `0x${string}` }> = {};

if (env.contracts.kasRaffleTestnet) {
  addresses[env.chainIds.testnet] = {
    kasRaffle: env.contracts.kasRaffleTestnet as `0x${string}`
  };
}

if (env.chainIds.mainnet && env.contracts.kasRaffleMainnet) {
  addresses[env.chainIds.mainnet] = {
    kasRaffle: env.contracts.kasRaffleMainnet as `0x${string}`
  };
}

export function getKasRaffleAddress(chainId?: SupportedChainId): `0x${string}` | undefined {
  if (!chainId) return undefined;
  return addresses[chainId]?.kasRaffle;
}

export const supportedChainIds = Object.keys(addresses).map((id) => Number(id));
