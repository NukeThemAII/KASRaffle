"use client";

import { ChangeEvent, useEffect, useState } from "react";

import { usePause, useUnpause } from "@/hooks/usePauseControls";
import { useRaffleConfig } from "@/hooks/useRaffleConfig";
import { useSetFeeVault } from "@/hooks/useSetFeeVault";
import { useSetParams } from "@/hooks/useSetParams";
import { useTierBps } from "@/hooks/useTierBps";
import { useWithdrawFees } from "@/hooks/useWithdrawFees";
import { formatKas } from "@/lib/format";
import { formatEther, parseEther } from "viem";

export default function AdminPage() {
  const { values, isLoading } = useRaffleConfig();
  const { tiers } = useTierBps();
  const { withdrawFees, isPending: withdrawing, error: withdrawError } = useWithdrawFees();
  const { setFeeVault, isPending: settingFeeVault, error: feeVaultError } = useSetFeeVault();
  const { action: pause, isPending: pausing, error: pauseError } = usePause();
  const { action: unpause, isPending: unpausing, error: unpauseError } = useUnpause();
  const {
    setParams,
    isPending: updatingParams,
    error: paramsError,
    receipt: paramsReceipt
  } = useSetParams();

  const [withdrawAmount, setWithdrawAmount] = useState("0.0");
  const [feeVault, setFeeVaultAddress] = useState("0x");
  const [paramsForm, setParamsForm] = useState({
    ticketPrice: "0.1",
    roundDurationMinutes: "180",
    minTicketsToDraw: "2",
    maxParticipants: "5000",
    maxTicketsPerAddress: "50000",
    maxTicketsPerRound: "200000",
    winnersBps: "8000",
    feeBps: "500",
    rolloverBps: "1500",
    keeperTipWei: "0.001",
    keeperTipMaxWei: "0.01",
    tierBps: "6000,2500,1500"
  });
  const [formInitialized, setFormInitialized] = useState(false);
  const [paramsErrorMessage, setParamsErrorMessage] = useState<string | null>(null);
  const [paramsSuccessMessage, setParamsSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (formInitialized) return;
    if (!values || Object.keys(values).length === 0) return;
    const tierString = tiers && tiers.length > 0 ? tiers.join(",") : "6000,2500,1500";

    setParamsForm({
      ticketPrice: values.ticketPrice ? formatEther(values.ticketPrice) : "0.1",
      roundDurationMinutes: values.roundDuration
        ? (Number(values.roundDuration) / 60).toFixed(0)
        : "180",
      minTicketsToDraw: values.minTicketsToDraw ? Number(values.minTicketsToDraw).toString() : "2",
      maxParticipants: values.maxParticipants ? Number(values.maxParticipants).toString() : "5000",
      maxTicketsPerAddress: values.maxTicketsPerAddress
        ? Number(values.maxTicketsPerAddress).toString()
        : "50000",
      maxTicketsPerRound: values.maxTicketsPerRound ? Number(values.maxTicketsPerRound).toString() : "200000",
      winnersBps: values.winnersBps ? Number(values.winnersBps).toString() : "8000",
      feeBps: values.feeBps ? Number(values.feeBps).toString() : "500",
      rolloverBps: values.rolloverBps ? Number(values.rolloverBps).toString() : "1500",
      keeperTipWei: values.keeperTipWei ? formatEther(values.keeperTipWei) : "0.001",
      keeperTipMaxWei: values.keeperTipMaxWei ? formatEther(values.keeperTipMaxWei) : "0.01",
      tierBps: tierString
    });
    setFormInitialized(true);
  }, [formInitialized, values, tiers]);

  useEffect(() => {
    if (paramsReceipt?.status === "success") {
      setParamsSuccessMessage("Parameters updated on-chain.");
    }
  }, [paramsReceipt?.status]);

  const handleParamChange = (field: keyof typeof paramsForm) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setParamsForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleWithdraw = async () => {
    const value = parseFloat(withdrawAmount);
    if (!Number.isFinite(value) || value <= 0) return;
    try {
      await withdrawFees(parseEther(withdrawAmount as `${number}`));
    } catch (error) {
      console.error(error);
    }
  };

  const handleSetFeeVault = async () => {
    if (!feeVault || !feeVault.startsWith("0x")) return;
    try {
      await setFeeVault(feeVault as `0x${string}`);
    } catch (error) {
      console.error(error);
    }
  };

  const handleParamsSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setParamsErrorMessage(null);
    setParamsSuccessMessage(null);

    try {
      const tierValues = paramsForm.tierBps
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => Number.parseInt(value, 10));

      if (tierValues.length === 0 || tierValues.some((value) => Number.isNaN(value))) {
        throw new Error("Tier BPS must contain integers separated by commas.");
      }

      const tierSum = tierValues.reduce((acc, value) => acc + value, 0);
      if (tierSum !== 10_000) {
        throw new Error("Tier BPS must sum to 10,000.");
      }

      const winnersBps = Number.parseInt(paramsForm.winnersBps, 10);
      const feeBps = Number.parseInt(paramsForm.feeBps, 10);
      const rolloverBps = Number.parseInt(paramsForm.rolloverBps, 10);
      if (winnersBps + feeBps + rolloverBps !== 10_000) {
        throw new Error("Winners + fee + rollover BPS must sum to 10,000.");
      }

      const roundDurationMinutesValue = Number.parseFloat(paramsForm.roundDurationMinutes);
      if (!Number.isFinite(roundDurationMinutesValue) || roundDurationMinutesValue <= 0) {
        throw new Error("Round duration must be greater than zero.");
      }

      const minTicketsToDraw = Number.parseInt(paramsForm.minTicketsToDraw, 10);
      const maxParticipants = Number.parseInt(paramsForm.maxParticipants, 10);
      const maxTicketsPerAddress = Number.parseInt(paramsForm.maxTicketsPerAddress, 10);
      const maxTicketsPerRound = Number.parseInt(paramsForm.maxTicketsPerRound, 10);

      const ints = [minTicketsToDraw, maxParticipants, maxTicketsPerAddress, maxTicketsPerRound];
      if (ints.some((value) => !Number.isFinite(value) || value <= 0)) {
        throw new Error("Numeric limits must be positive integers.");
      }

      const ticketPrice = parseEther(paramsForm.ticketPrice as `${number}`);
      const keeperTipWei = parseEther(paramsForm.keeperTipWei as `${number}`);
      const keeperTipMaxWei = parseEther(paramsForm.keeperTipMaxWei as `${number}`);

      await setParams({
        ticketPrice,
        roundDuration: BigInt(Math.max(1, Math.round(roundDurationMinutesValue * 60))),
        minTicketsToDraw: BigInt(minTicketsToDraw),
        maxParticipants: BigInt(maxParticipants),
        maxTicketsPerAddress: BigInt(maxTicketsPerAddress),
        maxTicketsPerRound: BigInt(maxTicketsPerRound),
        winnersBps,
        feeBps,
        rolloverBps,
        keeperTipWei,
        keeperTipMaxWei,
        tierBps: tierValues
      });
      setParamsSuccessMessage("Transaction submitted. Awaiting confirmation…");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update parameters.";
      setParamsErrorMessage(message);
      console.error(error);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <header>
        <h1 className="text-3xl font-semibold">Admin Controls</h1>
        <p className="text-sm text-slate-400">Protocol configuration and fee management</p>
      </header>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
        <h2 className="text-xl font-semibold">Protocol Parameters</h2>
        <p className="text-sm text-slate-400">Update raffle limits, fee splits, and keeper incentives.</p>
        <form onSubmit={handleParamsSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label="Ticket Price (KAS)"
              value={paramsForm.ticketPrice}
              onChange={handleParamChange("ticketPrice")}
              type="number"
              min="0"
              step="0.0001"
              required
            />
            <FormField
              label="Round Duration (minutes)"
              value={paramsForm.roundDurationMinutes}
              onChange={handleParamChange("roundDurationMinutes")}
              type="number"
              min="1"
              step="1"
              required
            />
            <FormField
              label="Min Tickets To Draw"
              value={paramsForm.minTicketsToDraw}
              onChange={handleParamChange("minTicketsToDraw")}
              type="number"
              min="1"
              step="1"
              required
            />
            <FormField
              label="Max Participants"
              value={paramsForm.maxParticipants}
              onChange={handleParamChange("maxParticipants")}
              type="number"
              min="1"
              step="1"
              required
            />
            <FormField
              label="Max Tickets / Address"
              value={paramsForm.maxTicketsPerAddress}
              onChange={handleParamChange("maxTicketsPerAddress")}
              type="number"
              min="1"
              step="1"
              required
            />
            <FormField
              label="Max Tickets / Round"
              value={paramsForm.maxTicketsPerRound}
              onChange={handleParamChange("maxTicketsPerRound")}
              type="number"
              min="1"
              step="1"
              required
            />
            <FormField
              label="Winners Share (bps)"
              value={paramsForm.winnersBps}
              onChange={handleParamChange("winnersBps")}
              type="number"
              min="0"
              max="10000"
              step="1"
              required
            />
            <FormField
              label="Fee Share (bps)"
              value={paramsForm.feeBps}
              onChange={handleParamChange("feeBps")}
              type="number"
              min="0"
              max="10000"
              step="1"
              required
            />
            <FormField
              label="Rollover Share (bps)"
              value={paramsForm.rolloverBps}
              onChange={handleParamChange("rolloverBps")}
              type="number"
              min="0"
              max="10000"
              step="1"
              required
            />
            <FormField
              label="Keeper Tip (KAS)"
              value={paramsForm.keeperTipWei}
              onChange={handleParamChange("keeperTipWei")}
              type="number"
              min="0"
              step="0.0001"
              required
            />
            <FormField
              label="Keeper Tip Max (KAS)"
              value={paramsForm.keeperTipMaxWei}
              onChange={handleParamChange("keeperTipMaxWei")}
              type="number"
              min="0"
              step="0.0001"
              required
            />
            <FormField
              label="Tier BPS (comma separated)"
              value={paramsForm.tierBps}
              onChange={handleParamChange("tierBps")}
              placeholder="6000,2500,1500"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="submit"
              className="self-start rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={updatingParams}
            >
              {updatingParams ? "Updating parameters…" : "Update Parameters"}
            </button>
            {(paramsErrorMessage || paramsError) && (
              <p className="text-xs text-red-400">{paramsErrorMessage ?? paramsError?.message}</p>
            )}
            {paramsSuccessMessage && (
              <p className="text-xs text-green-400">{paramsSuccessMessage}</p>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
        <h2 className="text-xl font-semibold">Protocol Stats</h2>
        {isLoading && <p className="text-sm text-slate-400">Loading configuration…</p>}
        {!isLoading && (
          <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <Stat label="Ticket Price" value={`${formatKas(values.ticketPrice)} KAS`} />
            <Stat label="Round Duration" value={`${Number(values.roundDuration ?? 0n) / 60} minutes`} />
            <Stat label="Min Tickets" value={`${Number(values.minTicketsToDraw ?? 0n)}`} />
            <Stat label="Max Participants" value={`${Number(values.maxParticipants ?? 0n)}`} />
            <Stat label="Max Tickets/Address" value={`${Number(values.maxTicketsPerAddress ?? 0n)}`} />
            <Stat label="Max Tickets/Round" value={`${Number(values.maxTicketsPerRound ?? 0n)}`} />
            <Stat label="Winners BPS" value={`${Number(values.winnersBps ?? 0n)}`} />
            <Stat label="Fee BPS" value={`${Number(values.feeBps ?? 0n)}`} />
            <Stat label="Rollover BPS" value={`${Number(values.rolloverBps ?? 0n)}`} />
            <Stat label="Keeper Tip" value={`${formatKas(values.keeperTipWei)} KAS`} />
            <Stat label="Keeper Tip Max" value={`${formatKas(values.keeperTipMaxWei)} KAS`} />
          </dl>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
          <h2 className="text-lg font-semibold">Withdraw Fees</h2>
          <p className="text-sm text-slate-400">Withdraw accrued protocol fees to the configured vault.</p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              step="0.01"
              value={withdrawAmount}
              onChange={(event) => setWithdrawAmount(event.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-orange-400 focus:outline-none"
              placeholder="Amount in KAS"
            />
            <button
              onClick={handleWithdraw}
              disabled={withdrawing}
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {withdrawing ? "Withdrawing…" : "Withdraw"}
            </button>
          </div>
          {withdrawError && <p className="text-xs text-red-400">{withdrawError.message}</p>}
        </div>

        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
          <h2 className="text-lg font-semibold">Fee Vault</h2>
          <p className="text-sm text-slate-400">Update the fee vault address.</p>
          <input
            type="text"
            value={feeVault}
            onChange={(event) => setFeeVaultAddress(event.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 focus:border-orange-400 focus:outline-none"
            placeholder="0x..."
          />
          <button
            onClick={handleSetFeeVault}
            disabled={settingFeeVault}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {settingFeeVault ? "Updating…" : "Update Vault"}
          </button>
          {feeVaultError && <p className="text-xs text-red-400">{feeVaultError.message}</p>}
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Pause Controls</h2>
        <p className="text-sm text-slate-400">Emergency switches to halt ticket purchases.</p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => pause()}
            disabled={pausing}
            className="rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pausing ? "Pausing…" : "Pause"}
          </button>
          <button
            onClick={() => unpause()}
            disabled={unpausing}
            className="rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {unpausing ? "Unpausing…" : "Resume"}
          </button>
        </div>
        {(pauseError || unpauseError) && (
          <p className="mt-2 text-xs text-red-400">{(pauseError || unpauseError)?.message}</p>
        )}
        <p className="mt-4 text-xs text-slate-500">
          Advanced parameter tuning (tier BPS, caps, keeper incentives) will be added soon. Update these values via the
          `setParams` call directly until the UI is complete.
        </p>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-slate-100">{value}</dd>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  min,
  max,
  step,
  required
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-300">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        required={required}
        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-orange-400 focus:outline-none"
      />
    </label>
  );
}
