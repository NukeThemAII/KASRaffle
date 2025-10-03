"use client";

import { useCallback } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { useKasRaffleContract } from "@/hooks/useKasRaffleContract";

function createPauseHook(functionName: "pause" | "unpause") {
  return function usePauseAction() {
    const contract = useKasRaffleContract();
    const { data: hash, error, isPending, writeContractAsync, reset } = useWriteContract();

    const action = useCallback(async () => {
      if (!contract.address) throw new Error("KASRaffle address unavailable");
      return writeContractAsync({
        address: contract.address,
        abi: contract.abi,
        functionName
      });
    }, [contract.address, contract.abi, writeContractAsync]);

    const receipt = useWaitForTransactionReceipt({ hash });

    return {
      action,
      reset,
      hash,
      error,
      isPending,
      receipt
    };
  };
}

export const usePause = createPauseHook("pause");
export const useUnpause = createPauseHook("unpause");
