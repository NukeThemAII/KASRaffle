"use client";

import { useCallback } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { useKasRaffleContract } from "@/hooks/useKasRaffleContract";

export function useFinalizeRound() {
  const contract = useKasRaffleContract();
  const { data: hash, error, isPending, writeContractAsync, reset } = useWriteContract();

  const finalizeRound = useCallback(
    async (maxSteps: bigint) => {
      if (!contract.address) throw new Error("KASRaffle address unavailable");
      return writeContractAsync({
        address: contract.address,
        abi: contract.abi,
        functionName: "finalizeRound",
        args: [maxSteps]
      });
    },
    [contract.address, contract.abi, writeContractAsync]
  );

  const receipt = useWaitForTransactionReceipt({ hash });

  return {
    finalizeRound,
    reset,
    hash,
    error,
    isPending,
    receipt
  };
}
