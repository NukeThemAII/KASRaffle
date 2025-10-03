"use client";

import { useMemo } from "react";
import { useReadContracts } from "wagmi";

import { useKasRaffleContract } from "@/hooks/useKasRaffleContract";

const FUNCTIONS = [
  "ticketPrice",
  "roundDuration",
  "minTicketsToDraw",
  "maxParticipants",
  "maxTicketsPerAddress",
  "maxTicketsPerRound",
  "winnersBps",
  "feeBps",
  "rolloverBps",
  "keeperTipWei",
  "keeperTipMaxWei"
] as const;

type ConfigKeys = (typeof FUNCTIONS)[number];

export function useRaffleConfig() {
  const contract = useKasRaffleContract();
  const enabled = useMemo(() => Boolean(contract.address), [contract.address]);

  const result = useReadContracts({
    contracts: FUNCTIONS.map((functionName) => ({
      address: contract.address,
      abi: contract.abi,
      functionName
    })),
    allowFailure: true,
    query: { enabled }
  });

  const values: Partial<Record<ConfigKeys, bigint>> = {};
  if (result.data) {
    result.data.forEach((entry, index) => {
      if (!entry.result) return;
      values[FUNCTIONS[index]] = entry.result as unknown as bigint;
    });
  }

  return {
    ...result,
    values
  };
}
