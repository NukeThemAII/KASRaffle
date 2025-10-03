"use client";

import { useEffect, useMemo, useState } from "react";

import { useCurrentRoundId } from "@/hooks/useCurrentRoundId";
import { useRoundSummary } from "@/hooks/useRoundSummary";
import { useWinners } from "@/hooks/useWinners";
import { formatKas, roundStatusLabel } from "@/lib/format";
import { formatDuration } from "@/lib/time";

export default function HistoryPage() {
  const { roundId: latestRoundId } = useCurrentRoundId();
  const [selectedRound, setSelectedRound] = useState<bigint | undefined>(undefined);

  useEffect(() => {
    if (!latestRoundId || latestRoundId === 0n) return;
    setSelectedRound(latestRoundId - 1n);
  }, [latestRoundId]);

  const { summary, isLoading } = useRoundSummary(selectedRound);
  const { winners, prizes } = useWinners(selectedRound);

  const navigationDisabled = useMemo(() => !latestRoundId || latestRoundId <= 1n, [latestRoundId]);

  const handlePrev = () => {
    if (!selectedRound || selectedRound === 0n) return;
    setSelectedRound(selectedRound - 1n);
  };

  const handleNext = () => {
    if (!selectedRound || !latestRoundId) return;
    if (selectedRound + 1n >= latestRoundId) return;
    setSelectedRound(selectedRound + 1n);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Round History</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrev}
            disabled={navigationDisabled || (selectedRound ?? 0n) === 0n}
            className="rounded-md border border-slate-700 px-3 py-2 text-sm disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm text-slate-400">
            Viewing round {selectedRound !== undefined ? Number(selectedRound) : "--"}
          </span>
          <button
            onClick={handleNext}
            disabled={navigationDisabled || !selectedRound || !latestRoundId || selectedRound + 1n >= latestRoundId}
            className="rounded-md border border-slate-700 px-3 py-2 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </header>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
        {isLoading && <p className="text-sm text-slate-400">Loading round data…</p>}
        {!isLoading && !summary && (
          <p className="text-sm text-slate-400">Select a round to view its summary.</p>
        )}
        {summary && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4 text-sm text-slate-300">
              <Info label="Round" value={`#${Number(summary.id)}`} />
              <Info label="Status" value={roundStatusLabel(summary.status)} />
              <Info label="Participants" value={Number(summary.participants).toLocaleString()} />
              <Info label="Tickets" value={Number(summary.totalTickets).toLocaleString()} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Info label="Ticket Pot" value={`${formatKas(summary.ticketPot)} KAS`} />
              <Info label="Seeded Rollover" value={`${formatKas(summary.seededRollover)} KAS`} />
              <Info label="Winners Share" value={`${formatKas(summary.winnersShare)} KAS`} />
              <Info label="Fee Share" value={`${formatKas(summary.feeShare)} KAS`} />
              <Info label="Rollover" value={`${formatKas(summary.rolloverShare)} KAS`} />
              <Info
                label="Duration"
                value={summary.startTime && summary.endTime ? formatDuration(Number(summary.endTime - summary.startTime)) : "--"}
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Winners</h2>
              {winners && winners.length > 0 ? (
                <ul className="mt-2 space-y-2 text-sm">
                  {winners.map((winner, index) => (
                    <li key={`${winner}-${index}`} className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/80 px-3 py-2">
                      <span className="font-mono text-xs text-slate-300">{winner}</span>
                      <span className="text-slate-100">{formatKas(prizes?.[index] ?? 0n)} KAS</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">No winners recorded for this round yet.</p>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-100">{value}</span>
    </div>
  );
}
