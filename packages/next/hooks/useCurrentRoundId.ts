"use client";

import { useMemo } from "react";
import { useReadContract } from "wagmi";

import { useKasRaffleContract } from "@/hooks/useKasRaffleContract";

export function useCurrentRoundId() {
  const contract = useKasRaffleContract();
  const enabled = useMemo(() => Boolean(contract.address), [contract.address]);

  const query = useReadContract({
    address: contract.address,
    abi: contract.abi,
    functionName: "currentRoundId",
    query: { enabled }
  });

  const roundId = query.data as unknown as bigint | undefined;

  return {
    ...query,
    roundId
  };
}
