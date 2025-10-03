"use client";

import { useCallback } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { useKasRaffleContract } from "@/hooks/useKasRaffleContract";

export function useCloseRound() {
  const contract = useKasRaffleContract();
  const { data: hash, error, isPending, writeContractAsync, reset } = useWriteContract();

  const closeRound = useCallback(async () => {
    if (!contract.address) throw new Error("KASRaffle address unavailable");
    return writeContractAsync({
      address: contract.address,
      abi: contract.abi,
      functionName: "closeRound"
    });
  }, [contract.address, contract.abi, writeContractAsync]);

  const receipt = useWaitForTransactionReceipt({ hash });

  return {
    closeRound,
    reset,
    hash,
    error,
    isPending,
    receipt
  };
}
