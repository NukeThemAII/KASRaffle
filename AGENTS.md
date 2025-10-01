# AGENTS.md

## KASRaffle — Agent Guide

### Mission

Build and maintain **KASRaffle**, a ticketed, time‑boxed raffle dApp on **Kasplex (Kaspa L2 EVM)**, using $KAS only. No paid oracles. Randomness via `prevrandao` + `blockhash` composite. Winners receive **80%** of the pot (tiered **60/25/15**), **5%** protocol fee, **15%** rollover to seed the next round. Permissionless close/finalize; payouts are **claimable** by winners.

### Networks

* **Kasplex Testnet** → primary dev target
* **Kasplex Mainnet** → production

> RPC URLs, chain IDs, and explorers are configured in the frontend `.env` and Foundry `foundry.toml`. Fill placeholders before deploy.

### Tech Stack

* **Contracts**: Solidity `^0.8.24`, OpenZeppelin v5, Foundry (forge/anvil)
* **Frontend**: Next.js 14 (App Router), TypeScript, wagmi + viem, RainbowKit, Tailwind + shadcn/ui
* **Tooling**: Slither (static), Foundry fuzz/invariant tests, gas snapshots

### Repo Structure (Scaffold‑ETH 2 monorepo)

```
/packages
  /forge
    /src/KASRaffle.sol
    /script/Deploy.s.sol
    /test/KASRaffle.t.sol
  /next
    app/(site)/page.tsx
    app/history/page.tsx
    app/admin/page.tsx
    components/*
    hooks/*
    lib/addresses.ts
```

### Product & Protocol Overview

* Users buy **tickets** (fixed price) in $KAS within a **round**.
* First ticket starts the **countdown** (`roundDuration`).
* At deadline: anyone calls `closeRound()`

  * If `minTicketsToDraw` not met → **Refunding** path
  * Else → **Drawing** path: compute seed, pick tier winners by ticket index
* `finalizeRound(maxSteps)` resolves winners in chunks (gas‑bounded)
* Contract allocates: **winners 80%**, **fees 5%**, **rollover 15%**
* Winners claim (`claim(roundId)`, paying gas)
* Admin can withdraw only **fees**; rollover automatically seeds the next round
* Direct $KAS sends to the contract are treated as ticket purchases; odd remainders are refunded

### Economics (basis points)

* `WINNERS_BPS = 8000` (80%)
* `FEE_BPS = 500` (5%)
* `ROLLOVER_BPS = 1500` (15%)
* **Tier split (of winners share)**: `[6000, 2500, 1500]` → 60% / 25% / 15%
* Tunables: `ticketPrice`, `roundDuration`, `minTicketsToDraw`, `maxParticipants`, `maxTicketsPerAddress`, `maxTicketsPerRound`

### Randomness (free, no paid oracle)

* Seed = `keccak256(prevrandao, blockhash(n-1), totalTickets, pot, roundId)`
* Derive one index per tier: `pick = (keccak256(seed,i) % totalTickets) + 1`
* Sort picks; finalize by scanning cumulative ticket ranges
* **Mitigations**: prize split + fees + rollover reduce manipulation incentives; time‑boxed close; prize caps via tunables

### Core Contract API (externals)

* **User**

  * `buyTickets()` payable (also `receive()` for direct sends)
  * `claim(roundId)`
  * Views: `getCurrentRound()`, `getRoundSummary(id)`, `getWinners(id)`, `winningTicketIndices(id)`, `getParticipantsCount(id)`, `getParticipantsSlice(id,start,limit)`, `claimable(id,account)`
* **Permissionless lifecycle**

  * `closeRound()` → transitions to Ready→Drawing
  * `finalizeRound(maxSteps)` → resolves winners in chunks
  * `finalizeRefunds(roundId,maxSteps)` → refunds chunked for void rounds
* **Admin** (Ownable)

  * `setParams(...)`, `setFeeVault(addr)`, `withdrawFees(amount)`, `pause()`, `unpause()`, `sweepExcess(to,amount)`

### Events (for rich UI & analytics)

* `RoundOpened(roundId,startTime,endTime,seededRollover)`
* `TicketsPurchased(roundId,buyer,tickets,value,totalTickets)`
* `RoundReady(roundId,pot,winnersShare,feeShare,rolloverShare)`
* `DrawingStarted(roundId,seed,winningTicketIndices)`
* `WinnersResolved(roundId,winners,prizes)`
* `RefundsQueued(roundId,participants)`
* `Refunded(roundId,account,amount)`
* `Claimed(roundId,winner,amount)`
* `FeesWithdrawn(to,amount)`
* `KeeperPaid(keeper,amount)`
* `ParamsUpdated()`

### Security & Quality Checklist

* CEI; reentrancy guards on external payers
* No unbounded loops in state‑changers (finalize/refund are chunked)
* Strict accounting: `feesAccrued + rolloverBank + unclaimed <= balance` (invariant test)
* Bounded parameters; sum of BPS equals 10_000
* Tests for refund path, cap enforcement, sweepExcess guard, multi‑winner claims
* Gas targets: keep `closeRound` + per‑step `finalizeRound` under network limits with 5k participants

### Tests (Foundry)

* Unit: happy path (buy→close→finalize→claim), refund path, direct send path, parameter updates
* Fuzz: ticket counts, participant counts, claim flows, timelocks
* Invariants: accounting ≤ balance; no loss/leak; role invariants

### Frontend Requirements

* **Home /**: Active round cards (Pot, Time Left, Ticket Price, Total/Your Tickets), Buy tickets, Status (Open/Drawing/Refunding/Closed), Winners revelation
* **/history**: Table of past rounds; link to details
* **/leaderboard**: Top winners & top buyers (events‑derived)
* **/admin**: Param setters (bounded), withdraw fees, pause/unpause, lifecycle buttons (close/finalize/refund)
* Hooks (viem): `useRound`, `useCountdown`, `useBuyTickets`, `useCloseRound`, `useFinalizeRound`, `useFinalizeRefunds`, `useWinners`, `useParticipantsSlice`

### Commands

* Contracts: `forge test -vv`, `forge snapshot`, `slither . --filter-paths node_modules`
* Frontend: `pnpm dev` (Next), `pnpm build` / `start`
* Deploy: `forge script script/Deploy.s.sol --rpc-url $RPC --broadcast`

### CI Suggestions

* Run `forge test` + `slither` on PRs; ensure gas snapshot deltas are reviewed
* Typecheck & ESLint for frontend; preview deploy to testnet on `main` merges

### Non‑Goals (V1)

* No upgradeable proxy
* No paid VRF or keeper services

---

## Agent Prompts

### SYSTEM Prompt (drop into your agent)

```
You are a senior Solidity + Next.js engineer. Build KASRaffle for Kasplex (Kaspa L2 EVM) per AGENTS.md.
Constraints:
- Solidity ^0.8.24, OZ v5, Foundry.
- No paid oracles; randomness via prevrandao + blockhash composite.
- Implement chunked finalize & refund flows.
- Strict accounting and reentrancy safety.
Deliverables:
1) src/KASRaffle.sol (events, errors, getters) per spec.
2) test/KASRaffle.t.sol — unit + fuzz; invariants: fees+rollover+unclaimed ≤ balance.
3) Next.js pages: / (active round UI), /history, /admin; wagmi/viem hooks; Tailwind/shadcn theme.
4) script/Deploy.s.sol with constructor (ticketPrice, roundDuration, feeVault) and address output for FE.
Ensure:
- Public views are covered by FE hooks.
- Events power History/Leaderboard.
- Param setters validate BPS sums and bounds.
```

### TASK Prompt (use per feature)

```
Task: Implement <feature> for KASRaffle.
Context: Kasplex testnet; $KAS only; no paid oracle. Contract API and events as per AGENTS.md.
Requirements:
- Write audited‑quality Solidity/TS code with tests/docs.
- Follow CEI, bounded loops, custom errors, NatSpec.
- Emit events for all state changes.
- Update README.md if behavior changes.
Deliverables:
- Code + tests + docs updates.
Acceptance:
- forge tests pass; slither clean; UI builds; manual e2e on testnet for this feature.
```

## Kasplex testnet RPC

Network Name

Kasplex Network Testnet​

Explorer URL

explorer.testnet.kasplextest.xyz

RPC URL

rpc.kasplextest.xyz

Native Token

name: Bridged Kas

symbol: KAS

decimals: 18

GasPrice/Basefee

2000GWEI

ChainID: 167012

Testnet (safe) kasplex private (deployer) key: cf5643a2cce8338eb4dc88b6b0d7cdf46e50a1c58ed1937f0cc8135c2b47f94c
---



## Contributing

* PRs welcome. Follow the AGENTS.md acceptance criteria
* Run tests + lint before submission

## License

MIT © KASRaffle contributors
