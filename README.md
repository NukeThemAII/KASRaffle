## KASRaffle — Time‑boxed Raffles on Kasplex (Kaspa L2 EVM)

Win big with provably‑fair *pseudo* randomness, claimable payouts, and a perpetual **rollover** jackpot.

### TL;DR

* Buy tickets in **$KAS** during an active round
* Countdown starts when the **first ticket** is bought
* At deadline, anyone can **close & finalize** (and earns a small keeper tip)
* Payout split: **80% winners** (tiers 60/25/15), **5% protocol fee**, **15% rollover**
* Winners **claim** prizes; admin can only withdraw **fees**

### Why KASRaffle?

* **Simple & fair**: no paid oracles; randomness uses `prevrandao` + `blockhash`
* **Permissionless lifecycle**: community can progress the round
* **Rich analytics**: events and view functions for UI dashboards

---

## Features

* Fixed ticket price per round; multiple tickets allowed
* Tiered winners (default 3): 60% / 25% / 15% of winners’ share
* Automatic rollover (15%) to seed the next round
* Claimable payouts; refund path if not enough tickets
* Direct sends = ticket purchases; odd remainders are refunded
* Admin fee accrual & withdrawal; strict accounting safeties

## Economics (default)

* Winners: **8000 bps** (80%)
* Protocol fee: **500 bps** (5%)
* Rollover: **1500 bps** (15%)
* Tiers (of winners share): `[6000, 2500, 1500]`

> All BPS are configurable by the owner, with validation to ensure they sum to 10,000.

## Randomness

Seeded by `prevrandao` and the previous blockhash, plus round data. This is **pseudo‑random** and adequate for low/medium value raffles when combined with prize caps and time‑boxing. For high‑stakes use, consider external VRF modules (future optional add‑on when an approved free oracle exists on Kasplex).

---

## Architecture

```
Users → buyTickets (payable) ─┐
                             │  (events)
                 Round (Open) │
       ┌──────── countdown ───┘
       │                     deadline
       ▼                        │
 closeRound() → Ready → Drawing │
       │                        ▼
       ├─ finalizeRound(max) → Winners fixed → claim(roundId)
       │
       └─ (if low tickets) → Refunding → finalizeRefunds(max)

Accounting: pot split → winners 80% | fees 5% | rollover 15%
Admin: setParams / withdrawFees / pause / sweepExcess (guarded)
```

---

## Addresses

Fill after deployment:

```
Kasplex Testnet:
  KASRaffle: 0x____
Kasplex Mainnet:
  KASRaffle: 0x____
```

---

## Getting Started (Dev)

### Prereqs

* Node 18+ and **pnpm**
* **Foundry**: `curl -L https://foundry.paradigm.xyz | bash` → `foundryup`
* **Slither** (optional but recommended)

### Install

```bash
pnpm i
cd packages/forge && forge install openzeppelin/openzeppelin-contracts@v5.0.2
```

### Environment

Create `.env` files:

```
# packages/next/.env.local
NEXT_PUBLIC_RPC_URL_TESTNET="https://<kasplex-testnet-rpc>"
NEXT_PUBLIC_RPC_URL_MAINNET="https://<kasplex-mainnet-rpc>"
NEXT_PUBLIC_CHAIN_ID_TESTNET=<id>
NEXT_PUBLIC_CHAIN_ID_MAINNET=<id>
NEXT_PUBLIC_EXPLORER_TESTNET="https://explorer.testnet.kasplex.io"
NEXT_PUBLIC_EXPLORER_MAINNET="https://explorer.kasplex.io"
```

```
# foundry .env
RPC_TESTNET="https://<kasplex-testnet-rpc>"
RPC_MAINNET="https://<kasplex-mainnet-rpc>"
PRIVATE_KEY="0x..."   # deployer
FEE_VAULT="0x..."     # protocol fee receiver
TICKET_PRICE_WEI=100000000000000000   # 0.1 KAS
ROUND_DURATION_SEC=10800              # 3h
```

Update `foundry.toml` with chain IDs if needed.

### Build & Test (contracts)

```bash
cd packages/forge
forge build
forge test -vv
```

### Run Frontend

```bash
cd packages/next
pnpm dev
```

---

## Deploy

### Foundry Script (Deploy.s.sol)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Script.sol";
import "../src/KASRaffle.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address feeVault = vm.envAddress("FEE_VAULT");
        uint256 price = vm.envUint("TICKET_PRICE_WEI");
        uint256 dur = vm.envUint("ROUND_DURATION_SEC");
        vm.startBroadcast(pk);
        KASRaffle r = new KASRaffle(price, dur, feeVault);
        vm.stopBroadcast();
        console2.log("KASRaffle:", address(r));
    }
}
```

### Broadcast

```bash
forge script script/Deploy.s.sol \
  --rpc-url $RPC_TESTNET \
  --broadcast --verify --slow
```

Record the address in `packages/next/lib/addresses.ts`.

---

## Frontend Wiring

* Put deployed addresses per network into `lib/addresses.ts`
* Generate `abi` from `packages/forge/out/KASRaffle.sol/KASRaffle.json`
* Hooks expose all read/write flows (buy, close, finalize, refunds, claim)
* The UI shows status pills: **Open**, **Drawing**, **Refunding**, **Closed**

### Theme

* Primary: `#1DA1F2` (Kas‑blue)
* Accent: `#14F195` (neon green)
* Surface: `#0B1020`
* Text: `#E6F2FF` / `#94A3B8`
  Use Tailwind with `rounded-2xl`, soft shadows, glass card backgrounds.

---

## Admin Runbook

* Check active round → if deadline passed, click **Close Round**
* Let FE auto‑call **Finalize** until done (chunked)
* For void rounds (too few tickets) use **Finalize Refunds**
* **Withdraw Fees** to fee vault as needed
* **Pause** during incidents; **Unpause** once resolved

---

## Analytics

* Index `TicketsPurchased`, `WinnersResolved`, `Claimed` for leaderboards
* Use `getParticipantsSlice` for pagination in tables

---

## Security Notes

* Pseudo‑randomness is not VRF; keep prizes & timing reasonable
* Strict accounting prevents sweeping user funds; `sweepExcess` guarded by liabilities check
* All external transfers use CEI + reentrancy guard

---
