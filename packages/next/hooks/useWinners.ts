"use client";

import { useMemo } from "react";
import { useReadContract } from "wagmi";

import { useKasRaffleContract } from "@/hooks/useKasRaffleContract";

export function useWinners(roundId?: bigint) {
  const contract = useKasRaffleContract();
  const enabled = useMemo(() => Boolean(contract.address) && typeof roundId !== "undefined", [contract.address, roundId]);

  const query = useReadContract({
    address: contract.address,
    abi: contract.abi,
    functionName: "getWinners",
    args: roundId !== undefined ? [roundId] : undefined,
    query: { enabled }
  });

  const data = query.data as unknown as [readonly `0x${string}`[], readonly bigint[]] | undefined;

  return {
    ...query,
    winners: data?.[0],
    prizes: data?.[1]
  };
}
