"use client";

import { useMemo } from "react";
import { useChainId } from "wagmi";

import { getKasRaffleAddress } from "@/lib/addresses";
import { kasRaffleAbi } from "@/lib/abi/kasRaffle";

export function useKasRaffleContract() {
  const chainId = useChainId();
  const address = useMemo(() => getKasRaffleAddress(chainId), [chainId]);

  return useMemo(
    () => ({
      chainId,
      address,
      abi: kasRaffleAbi
    }),
    [address, chainId]
  );
}
