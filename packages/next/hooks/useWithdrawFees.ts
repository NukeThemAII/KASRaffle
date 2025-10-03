"use client";

import { useCallback } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { useKasRaffleContract } from "@/hooks/useKasRaffleContract";

export function useWithdrawFees() {
  const contract = useKasRaffleContract();
  const { data: hash, error, isPending, writeContractAsync, reset } = useWriteContract();

  const withdrawFees = useCallback(
    async (amount: bigint) => {
      if (!contract.address) throw new Error("KASRaffle address unavailable");
      return writeContractAsync({
        address: contract.address,
        abi: contract.abi,
        functionName: "withdrawFees",
        args: [amount]
      });
    },
    [contract.address, contract.abi, writeContractAsync]
  );

  const receipt = useWaitForTransactionReceipt({ hash });

  return {
    withdrawFees,
    reset,
    hash,
    error,
    isPending,
    receipt
  };
}
