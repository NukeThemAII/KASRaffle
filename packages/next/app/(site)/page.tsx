"use client";

import { useMemo, useState } from "react";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

import { useBuyTickets } from "@/hooks/useBuyTickets";
import { useClaim } from "@/hooks/useClaim";
import { useClaimable } from "@/hooks/useClaimable";
import { useCloseRound } from "@/hooks/useCloseRound";
import { useCountdown } from "@/hooks/useCountdown";
import { useFinalizeRefunds } from "@/hooks/useFinalizeRefunds";
import { useFinalizeRound } from "@/hooks/useFinalizeRound";
import { useRound } from "@/hooks/useRound";
import { useTicketPrice } from "@/hooks/useTicketPrice";
import { formatKas, roundStatusLabel } from "@/lib/format";
import { formatDuration } from "@/lib/time";

export default function HomePage() {
  const { round, isLoading: isLoadingRound, refetch: refetchRound } = useRound();
  const countdown = useCountdown(round);
  const { price } = useTicketPrice();
  const { address } = useAccount();

  const { buy, isPending: isBuying, error: buyError, receipt: buyReceipt } = useBuyTickets();
  const { closeRound, isPending: isClosing, error: closeError } = useCloseRound();
  const { finalizeRound, isPending: isFinalizing, error: finalizeError } = useFinalizeRound();
  const {
    finalizeRefunds,
    isPending: isRefunding,
    error: refundError
  } = useFinalizeRefunds();
  const { claim, isPending: isClaiming, error: claimError } = useClaim();

  const [ticketCount, setTicketCount] = useState<number>(1);

  const claimable = useClaimable(round?.id, address as `0x${string}` | undefined);

  const pot = useMemo(() => {
    if (!round) return 0n;
    return (round.ticketPot ?? 0n) + (round.seededRollover ?? 0n);
  }, [round]);

  const totalCost = useMemo(() => {
    if (!price) return 0n;
    return price * BigInt(Math.max(0, ticketCount));
  }, [price, ticketCount]);

  const handleBuy = async () => {
    if (!totalCost || ticketCount <= 0) return;
    try {
      await buy(totalCost);
      await refetchRound();
    } catch (error) {
      console.error(error);
    }
  };

  const handleClose = async () => {
    try {
      await closeRound();
      await refetchRound();
    } catch (error) {
      console.error(error);
    }
  };

  const handleFinalize = async () => {
    try {
      await finalizeRound(200n);
      await refetchRound();
    } catch (error) {
      console.error(error);
    }
  };

  const handleFinalizeRefunds = async () => {
    if (!round?.id) return;
    try {
      await finalizeRefunds(round.id, 200n);
      await refetchRound();
    } catch (error) {
      console.error(error);
    }
  };

  const handleClaim = async () => {
    if (!round?.id) return;
    try {
      await claim(round.id);
      await refetchRound();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">KASRaffle</h1>
          <p className="text-sm text-slate-400">Provably fair raffles on Kasplex (Kaspa L2 EVM)</p>
        </div>
        <ConnectButton showBalance={false} chainStatus="icon" />
      </header>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <StatCard label="Pot" value={`${formatKas(pot)} KAS`} isLoading={isLoadingRound} />
        <StatCard label="Tickets" value={Number(round?.totalTickets ?? 0n).toLocaleString()} isLoading={isLoadingRound} />
        <StatCard label="Time Left" value={formatDuration(countdown.secondsRemaining)} highlight={countdown.isExpired} />
        <StatCard label="Status" value={roundStatusLabel(round?.status)} />
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
          <h2 className="text-xl font-semibold">Buy Tickets</h2>
          <p className="mt-2 text-sm text-slate-400">
            Ticket price: {price ? `${formatKas(price)} KAS` : "--"}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <input
              type="number"
              min={1}
              value={ticketCount}
              onChange={(event) => setTicketCount(Number(event.target.value))}
              className="w-24 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-right text-slate-100 focus:border-orange-400 focus:outline-none"
            />
            <button
              onClick={handleBuy}
              disabled={!price || isBuying || ticketCount <= 0}
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBuying ? "Processing..." : `Buy (${formatKas(totalCost)} KAS)`}
            </button>
          </div>
          {(buyError || closeError || finalizeError || refundError || claimError) && (
            <p className="mt-4 text-sm text-red-400">
              {(buyError || closeError || finalizeError || refundError || claimError)?.message || "Action failed"}
            </p>
          )}
          {buyReceipt?.status === "success" && (
            <p className="mt-4 text-sm text-green-400">Purchase confirmed on-chain.</p>
          )}
        </div>

        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
          <h2 className="text-xl font-semibold">Lifecycle Controls</h2>
          <p className="text-sm text-slate-400">Anyone can help close or finalize the round after the deadline.</p>
          <div className="flex flex-wrap gap-3">
            <ActionButton label="Close Round" onClick={handleClose} disabled={isClosing} />
            <ActionButton label="Finalize Winners" onClick={handleFinalize} disabled={isFinalizing} />
            <ActionButton label="Finalize Refunds" onClick={handleFinalizeRefunds} disabled={isRefunding} />
            <ActionButton label="Claim Winnings" onClick={handleClaim} disabled={isClaiming || !claimable.amount || claimable.amount === 0n} />
          </div>
          {claimable.amount && claimable.amount > 0n && (
            <p className="text-sm text-green-400">Claimable: {formatKas(claimable.amount)} KAS</p>
          )}
        </div>
      </div>

      <footer className="mt-auto border-t border-slate-800 pt-6 text-xs text-slate-500">
        <p>
          Winners receive 80% of the pot, 5% goes to protocol fees, 15% rolls into the next round. Randomness is derived
          from prevrandao and blockhash.
        </p>
      </footer>
    </main>
  );
}

function StatCard({
  label,
  value,
  isLoading,
  highlight
}: {
  label: string;
  value: string;
  isLoading?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${highlight ? "text-red-400" : "text-slate-100"}`}>
        {isLoading ? "--" : value}
      </p>
    </div>
  );
}

function ActionButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-orange-400 hover:text-orange-300 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}
