"use client";

import { useCallback } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { useKasRaffleContract } from "@/hooks/useKasRaffleContract";

export function useFinalizeRefunds() {
  const contract = useKasRaffleContract();
  const { data: hash, error, isPending, writeContractAsync, reset } = useWriteContract();

  const finalizeRefunds = useCallback(
    async (roundId: bigint, maxSteps: bigint) => {
      if (!contract.address) throw new Error("KASRaffle address unavailable");
      return writeContractAsync({
        address: contract.address,
        abi: contract.abi,
        functionName: "finalizeRefunds",
        args: [roundId, maxSteps]
      });
    },
    [contract.address, contract.abi, writeContractAsync]
  );

  const receipt = useWaitForTransactionReceipt({ hash });

  return {
    finalizeRefunds,
    reset,
    hash,
    error,
    isPending,
    receipt
  };
}
