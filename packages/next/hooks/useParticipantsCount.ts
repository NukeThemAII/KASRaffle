"use client";

import { useMemo } from "react";
import { useReadContract } from "wagmi";

import { useKasRaffleContract } from "@/hooks/useKasRaffleContract";

export function useParticipantsCount(roundId?: bigint) {
  const contract = useKasRaffleContract();
  const enabled = useMemo(
    () => Boolean(contract.address) && typeof roundId !== "undefined",
    [contract.address, roundId]
  );

  const query = useReadContract({
    address: contract.address,
    abi: contract.abi,
    functionName: "getParticipantsCount",
    args: roundId !== undefined ? [roundId] : undefined,
    query: { enabled }
  });

  const count = query.data as unknown as bigint | undefined;

  return {
    ...query,
    count
  };
}
