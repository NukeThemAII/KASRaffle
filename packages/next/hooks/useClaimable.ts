"use client";

import { useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";

import { useKasRaffleContract } from "@/hooks/useKasRaffleContract";

export function useClaimable(roundId: bigint | undefined, account?: `0x${string}`) {
  const contract = useKasRaffleContract();
  const { address: connectedAddress } = useAccount();
  const target = account ?? connectedAddress;

  const enabled = useMemo(
    () => Boolean(contract.address) && typeof roundId !== "undefined" && Boolean(target),
    [contract.address, roundId, target]
  );

  const query = useReadContract({
    address: contract.address,
    abi: contract.abi,
    functionName: "claimable",
    args: target && roundId !== undefined ? [roundId, target] : undefined,
    query: { enabled }
  });

  const amount = query.data as unknown as bigint | undefined;

  return {
    ...query,
    amount
  };
}
