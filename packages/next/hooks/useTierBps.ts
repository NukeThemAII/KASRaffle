"use client";

import { useMemo } from "react";
import { useReadContract } from "wagmi";

import { useKasRaffleContract } from "@/hooks/useKasRaffleContract";

export function useTierBps() {
  const contract = useKasRaffleContract();
  const enabled = useMemo(() => Boolean(contract.address), [contract.address]);

  const query = useReadContract({
    address: contract.address,
    abi: contract.abi,
    functionName: "getTierBps",
    query: { enabled }
  });

  const tiers = query.data as unknown as number[] | undefined;

  return {
    ...query,
    tiers
  };
}
