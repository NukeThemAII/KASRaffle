"use client";

import { useMemo } from "react";
import { useReadContract } from "wagmi";

import { useKasRaffleContract } from "@/hooks/useKasRaffleContract";

export type Participant = {
  account: `0x${string}`;
  tickets: bigint;
};

export function useParticipantsSlice(roundId: bigint | undefined, start: bigint, limit: bigint) {
  const contract = useKasRaffleContract();
  const enabled = useMemo(
    () => Boolean(contract.address) && typeof roundId !== "undefined" && limit > 0n,
    [contract.address, roundId, limit]
  );

  const query = useReadContract({
    address: contract.address,
    abi: contract.abi,
    functionName: "getParticipantsSlice",
    args: roundId !== undefined ? [roundId, start, limit] : undefined,
    query: { enabled }
  });

  const participants = query.data as unknown as Participant[] | undefined;

  return {
    ...query,
    participants
  };
}
