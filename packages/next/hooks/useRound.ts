"use client";

import { useMemo } from "react";
import { useReadContract } from "wagmi";

import { useKasRaffleContract } from "@/hooks/useKasRaffleContract";

export type RoundStruct = {
  id: bigint;
  startTime: bigint;
  endTime: bigint;
  status: bigint;
  participants: bigint;
  totalTickets: bigint;
  ticketPot: bigint;
  seededRollover: bigint;
  pot: bigint;
  winnersShare: bigint;
  feeShare: bigint;
  rolloverShare: bigint;
  seed: `0x${string}`;
};

export function useRound() {
  const contract = useKasRaffleContract();

  const enabled = useMemo(() => Boolean(contract.address), [contract.address]);

  const query = useReadContract({
    address: contract.address,
    abi: contract.abi,
    functionName: "getCurrentRound",
    query: {
      enabled
    }
  });

  return useMemo(() => {
    const round = query.data as unknown as RoundStruct | undefined;
    return {
      ...query,
      round
    };
  }, [query]);
}
