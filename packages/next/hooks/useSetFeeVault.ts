"use client";

import { useCallback } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { useKasRaffleContract } from "@/hooks/useKasRaffleContract";

export function useSetFeeVault() {
  const contract = useKasRaffleContract();
  const { data: hash, error, isPending, writeContractAsync, reset } = useWriteContract();

  const setFeeVault = useCallback(
    async (vault: `0x${string}`) => {
      if (!contract.address) throw new Error("KASRaffle address unavailable");
      return writeContractAsync({
        address: contract.address,
        abi: contract.abi,
        functionName: "setFeeVault",
        args: [vault]
      });
    },
    [contract.address, contract.abi, writeContractAsync]
  );

  const receipt = useWaitForTransactionReceipt({ hash });

  return {
    setFeeVault,
    reset,
    hash,
    error,
    isPending,
    receipt
  };
}
