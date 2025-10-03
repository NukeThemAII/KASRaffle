"use client";

import { useEffect, useMemo, useState } from "react";

import { useCurrentRoundId } from "@/hooks/useCurrentRoundId";
import { useParticipantsCount } from "@/hooks/useParticipantsCount";
import { useParticipantsSlice } from "@/hooks/useParticipantsSlice";
import { useRoundSummary } from "@/hooks/useRoundSummary";
import { useWinners } from "@/hooks/useWinners";
import { formatKas, roundStatusLabel } from "@/lib/format";

const PAGE_SIZE = 50n;

export default function LeaderboardPage() {
  const { roundId: latestRoundId } = useCurrentRoundId();
  const [roundId, setRoundId] = useState<bigint | undefined>(undefined);
  const [start, setStart] = useState<bigint>(0n);

  useEffect(() => {
    if (!latestRoundId || latestRoundId <= 1n) return;
    setRoundId(latestRoundId - 1n);
  }, [latestRoundId]);

  useEffect(() => {
    setStart(0n);
  }, [roundId]);

  const { summary } = useRoundSummary(roundId);
  const { winners, prizes } = useWinners(roundId);
  const { count: participantsCount } = useParticipantsCount(roundId);
  const { participants, isLoading } = useParticipantsSlice(roundId, start, PAGE_SIZE);

  const topBuyers = useMemo(() => {
    if (!participants) return [] as typeof participants;
    return [...participants].sort((a, b) => Number(b.tickets - a.tickets));
  }, [participants]);

  const canPrevPage = start > 0n;
  const canNextPage = participantsCount ? start + PAGE_SIZE < participantsCount : false;

  const handlePagePrev = () => {
    if (!canPrevPage) return;
    setStart((prev) => (prev >= PAGE_SIZE ? prev - PAGE_SIZE : 0n));
  };

  const handlePageNext = () => {
    if (!canNextPage) return;
    setStart((prev) => prev + PAGE_SIZE);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Leaderboard</h1>
        <p className="text-sm text-slate-400">
          Explore recent winners and top ticket buyers. Data is fetched directly from the contract; for deeper analytics,
          connect an off-chain indexer to aggregate events.
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
        <label className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">Round</span>
          <input
            type="number"
            min="0"
            value={roundId !== undefined ? Number(roundId) : ""}
            onChange={(event) => {
              const value = Number.parseInt(event.target.value, 10);
              setRoundId(Number.isFinite(value) ? BigInt(Math.max(0, value)) : undefined);
            }}
            className="w-24 rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-right text-slate-100 focus:border-orange-400 focus:outline-none"
          />
        </label>
        <span className="text-xs text-slate-500">
          Latest finalized round: {latestRoundId && latestRoundId > 0n ? Number(latestRoundId - 1n) : "--"}
        </span>
      </section>

      {summary && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg">
          <div className="grid grid-cols-1 gap-4 text-sm text-slate-300 md:grid-cols-2">
            <Info label="Status" value={roundStatusLabel(summary.status)} />
            <Info label="Participants" value={Number(summary.participants).toLocaleString()} />
            <Info label="Tickets" value={Number(summary.totalTickets).toLocaleString()} />
            <Info label="Pot" value={`${formatKas(summary.pot)} KAS`} />
          </div>
        </section>
      )}

      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Top Buyers</h2>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <button
              onClick={handlePagePrev}
              disabled={!canPrevPage}
              className="rounded border border-slate-700 px-2 py-1 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              onClick={handlePageNext}
              disabled={!canNextPage}
              className="rounded border border-slate-700 px-2 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
        {isLoading && <p className="text-sm text-slate-400">Loading participants…</p>}
        {!isLoading && topBuyers.length === 0 && <p className="text-sm text-slate-400">No participant data for this slice.</p>}
        {topBuyers.length > 0 && (
          <table className="w-full table-fixed text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-12 px-2 py-2">#</th>
                <th className="px-2 py-2">Address</th>
                <th className="w-32 px-2 py-2 text-right">Tickets</th>
              </tr>
            </thead>
            <tbody>
              {topBuyers.map((participant, index) => (
                <tr key={`${participant.account}-${index}`} className="border-t border-slate-800">
                  <td className="px-2 py-2 text-xs text-slate-500">{Number(start) + index + 1}</td>
                  <td className="px-2 py-2 font-mono text-xs text-slate-200">{participant.account}</td>
                  <td className="px-2 py-2 text-right text-slate-100">{Number(participant.tickets).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-xs text-slate-500">
          Results are loaded in batches of {Number(PAGE_SIZE)} participants using `getParticipantsSlice`. Fetch additional
          pages to view the full leaderboard or ingest `TicketsPurchased` events off-chain for comprehensive analytics.
        </p>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Recent Winners</h2>
        {winners && winners.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm">
            {winners.map((winner, index) => (
              <li
                key={`${winner}-${index}`}
                className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/80 px-3 py-2"
              >
                <span className="font-mono text-xs text-slate-300">{winner}</span>
                <span className="text-slate-100">{formatKas(prizes?.[index] ?? 0n)} KAS</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No winners resolved for the selected round.</p>
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
