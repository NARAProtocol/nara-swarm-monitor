# NARA Swarm Monitor Agent Rules

This repository is v4-only.

## Absolute Boundary

The v3 protocol is dead and retired. Do not use, import, index, document, or
default to any v3 contract, ABI, address, event model, cron model, jackpot,
lotto, arena, or mining assumption.

The monitor exists only for the fresh NARA v4 redeploy from:

`../nara-protocol-hardhat/contracts/v4/`

Before changing monitor logic, read:

- `../AGENTS.md`
- `../nara-protocol-hardhat/AGENTS.md`
- `../nara-protocol-hardhat/CLAUDE.md`
- `../nara-protocol-hardhat/docs/CURRENT_STATE.md`

## Runtime Rules

- Fresh v4 addresses must come from environment variables.
- Never provide fallback addresses for protocol contracts.
- Never use retired incident-stack addresses as defaults.
- Never use the retired v3 token or engine addresses.
- If an address is not known yet because the fresh redeploy has not happened,
  leave it unset and let the monitor fail closed.
- `V4_START_BLOCK` is mandatory and must come from the fresh v4 deployment.
- Hand-written ABIs are temporary only. Prefer generated ABIs from the active
  v4 Hardhat artifacts.
- The monitor is read-only with respect to protocol state.
- The monitor never sends transactions.
- The monitor never holds private keys.
- No monitor component may call contracts with write intent.

## Active Monitoring Scope

Use active v4 concepts only:

- NARA token transfers and approvals
- Engine locks, extensions, unlocks, epoch advances, rewards, and parameters
- Position NFT mints, transfers, claims, Genesis metadata, and burns
- Genesis reward distributor events
- Bond vault and v4/NFT depository events
- Liquidity growth hook, vault, and compounder events
- Router and bribe router events
- AccessControl, Ownable, Ownable2Step, Pausable, and emergency sweep events

## Current Monitor Architecture

- Ponder indexes active v4 events and call traces.
- The failed transaction scanner is read-only and records reverted attempts
  against active v4 contract addresses.
- Deterministic rules create alerts from indexed tables and views.
- Commander Agent v1 is deterministic read-only reporting.
- AI Summarizer v1 only summarizes `commander_reports`.

## AI Boundaries

- AI cannot invent evidence.
- AI cannot lower severity.
- AI cannot hide critical alerts.
- AI cannot create alerts.
- AI cannot resolve alerts.
- AI cannot change wallet or position scores.
- AI cannot execute recommendations.
- AI cannot send transactions.
- AI cannot call contracts.
- AI cannot post publicly unless a future notification output is explicitly
  added and approved.

## Explicitly Out Of Scope Unless Rebuilt For v4

- v3 contracts
- retired incident-stack contracts
- old cron/keeper assumptions
- lotto/jackpot
- arena
- mining
- MisterMint
- any archived `legacy-v3` ABI or address

If a cold AI tries to add any of those back, stop and verify against the active
v4 source first.
