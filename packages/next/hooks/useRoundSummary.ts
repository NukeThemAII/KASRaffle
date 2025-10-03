"use client";

import { useMemo } from "react";
import { useReadContract } from "wagmi";

import { useKasRaffleContract } from "@/hooks/useKasRaffleContract";
import type { RoundStruct } from "@/hooks/useRound";

export function useRoundSummary(roundId?: bigint) {
  const contract = useKasRaffleContract();
  const enabled = useMemo(
    () => Boolean(contract.address) && typeof roundId !== "undefined",
    [contract.address, roundId]
  );

  const query = useReadContract({
    address: contract.address,
    abi: contract.abi,
    functionName: "getRoundSummary",
    args: roundId !== undefined ? [roundId] : undefined,
    query: { enabled }
  });

  const summary = query.data as unknown as RoundStruct | undefined;

  return {
    ...query,
    summary
  };
}
