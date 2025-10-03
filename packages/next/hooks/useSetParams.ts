"use client";

import { useCallback } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { useKasRaffleContract } from "@/hooks/useKasRaffleContract";

interface ParamsArgs {
  ticketPrice: bigint;
  roundDuration: bigint;
  minTicketsToDraw: bigint;
  maxParticipants: bigint;
  maxTicketsPerAddress: bigint;
  maxTicketsPerRound: bigint;
  winnersBps: number;
  feeBps: number;
  rolloverBps: number;
  keeperTipWei: bigint;
  keeperTipMaxWei: bigint;
  tierBps: number[];
}

export function useSetParams() {
  const contract = useKasRaffleContract();
  const { data: hash, error, isPending, writeContractAsync, reset } = useWriteContract();

  const setParams = useCallback(
    async (args: ParamsArgs) => {
      if (!contract.address) throw new Error("KASRaffle address unavailable");
      return writeContractAsync({
        address: contract.address,
        abi: contract.abi,
        functionName: "setParams",
        args: [
          args.ticketPrice,
          args.roundDuration,
          args.minTicketsToDraw,
          args.maxParticipants,
          args.maxTicketsPerAddress,
          args.maxTicketsPerRound,
          args.winnersBps,
          args.feeBps,
          args.rolloverBps,
          args.keeperTipWei,
          args.keeperTipMaxWei,
          args.tierBps
        ]
      });
    },
    [contract.address, contract.abi, writeContractAsync]
  );

  const receipt = useWaitForTransactionReceipt({ hash });

  return {
    setParams,
    reset,
    hash,
    error,
    isPending,
    receipt
  };
}
