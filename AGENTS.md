# NARA Swarm Monitor Agent Rules

This repository monitors active NARA Protocol deployments on Base Mainnet (`8453`).

## Cross-Repository Role

This repository is the downstream read-only consumer for protocol and basket
events. It owns indexing, monitor configuration, deterministic alert rules, and
monitor documentation. It does not own contract behavior, ABIs, addresses,
deployment status, or product availability.

Accept an ABI or event change only from a full merged commit in
`NARAProtocol/nara_protocol_v4` or
`NARAProtocol/nara_protocol_v4_baskets`. Accept a production address and start
block only from verified deployment evidence. Schema work may begin from a
merged implementation, but the monitor must remain unconnected until deployed
state is verified.

Record the origin commit, artifact source, manifest, chain, start block,
backfill result, and downstream public-documentation impact in the pull request.

The explicit cross-repository ABI gate is `npm run check:ecosystem-drift`.
Before running it, fetch both producer remotes and set
`NARA_WORKSPACE_ROOT`, `NARA_PROTOCOL_ORIGIN_COMMIT`, and
`NARA_BASKETS_ORIGIN_COMMIT` from the approved handoff record. Both commit
values must be full 40-character commits contained in the locally known
`origin/main`.

The gate reads source directly from those Git commits. It does not read either
working tree. Do not weaken it to consume whichever sibling files happen to be
present.

## GitHub Publishing Standard

All GitHub-facing changes must follow
`docs/GITHUB_REPOSITORY_STANDARD.md`. Before any push, run `npm run verify`,
inspect the staged diff, scan for secrets, and use a Conventional Commit.
Documentation and repository status claims must match current code.

`npm run verify` includes the machine-enforced repository policy gate. Before
changing or claiming GitHub security settings, run
`npm run audit:github-settings`; it reads the live repository configuration and
must pass without exceptions.

The default branch is protected. Never push directly to `main`. Create a focused
branch, open a pull request, require the `verify` check to pass, resolve
conversations, and squash merge. Administrators are subject to the same
protection. Never disable or bypass protection for an emergency; preserve the
change locally and wait for the protected workflow to become available.

## Absolute Boundary

The v3 protocol is dead and retired. Do not use, import, index, document, or
default to any v3 contract, ABI, address, event model, cron model, jackpot,
lotto, arena, or mining assumption.

## Current Documentation Handoff

Maintainers and automated verifiers must respect the verified Base Mainnet state:

- active Base NARA token (`NARATokenV5`):
  `0x91FB78A9F46B67f54BbD4489941d19666b2fAe0f` (`1,000,000 NARA` fixed supply);
- verified V5 deployment checkpoint block: `53422831` (`NARAPositionSaleV5` deployed at block `53443166`);
- the canonical NARA/USDC Uniswap v4 pool (`0x3bd8b60dc9eb37f00afa57585232e4018ae661b2dbd5318562183a67a07ac758`) and 34-contract V5 suite are deployed on Base Mainnet in a technical live-testing phase; this is not a claim that a public product or every interface is available; and
- baskets remain undeployed and preview-only.

Changing facts still come from the pinned manifests and release evidence, not
from this summary. Never use any retired historical token address.

Before changing monitor logic, read `README.md`, `docs/MONITOR_ARCHITECTURE.md`,
and `docs/ENVIRONMENT_VARIABLES.md`.

## Runtime Rules

- Active protocol addresses must come from environment variables.
- Never provide fallback addresses for protocol contracts.
- Never use retired incident-stack or v3 addresses as defaults.
- If an address is not known because that deferred component is not deployed,
  leave it unset and let the full monitor profile fail closed.
- `V4_START_BLOCK` is mandatory and must come from the verified deployment block (`53422831` for V5).
- Prefer generated ABIs from verified protocol artifacts.
- The monitor is read-only with respect to protocol state.
- The monitor never sends transactions.
- The monitor never holds private keys.
- The legacy treasury Range Ranger is permanently retired. Do not revive it, add a
  signer, or read `TREASURY_PRIVATE_KEY`; that variable must not be set in any
  environment, and `RANGE_RANGER_*` variables are obsolete.
- No monitor component may call contracts with write intent.

## Active Monitoring Scope

Use active protocol concepts only:

- NARA token transfers and approvals
- Epoch engine commitments, recharges, withdrawals, epoch advances, and reward settlements
- Principal ledger, reward ledger, and emission reserve events
- Position NFT (`NARAP`) mints, transfers, and secondary sale marketplace events
- Forge roll and fusion lifecycle events
- Liquidity hook, fee vault, POL position, capital policy, and treasury range manager events
- AccessControl, Ownable, Ownable2Step, Pausable, and governance delay events

## Current Monitor Architecture

- Ponder indexes active protocol events and call traces.
- The failed transaction scanner is read-only and records reverted attempts
  against monitored contract addresses.
- Deterministic rules create alerts from indexed tables and views.
- Commander Agent v1 is deterministic read-only reporting.
- AI Summarizer v1 only summarizes `commander_reports`.

## Current Deployment Warning

- The current Ponder configuration supports `MONITOR_PROFILE=core` for the
  deployed token, engine, liquidity hook, vault, and compounder, plus optional `V5_*` modular surfaces.
- Do not invent or reuse addresses to make the full profile boot.
- The deployed core and canonical pool are in technical live testing with real
  assets. Monitoring them does not establish public product availability,
  production readiness, safety, legal approval, or availability in any
  jurisdiction.
- Do not deploy bond, router, lockboard, composability, or other deferred
  surfaces merely to satisfy the indexer. A dedicated basket profile is
  required only after verified basket manager and fee collector deployments
  and an immutable downstream handoff exist.

## AI Boundaries

- AI cannot invent evidence.
- AI cannot lower severity.
- AI cannot hide critical alerts.
- AI cannot create alerts.
- AI cannot resolve alerts.
- AI cannot change wallet or position scores.
- AI cannot execute operator response steps or investment decisions.
- AI cannot send transactions.
- AI cannot call contracts.
- AI cannot post publicly unless a future notification output is explicitly
  added and approved.
- Monitor alerts, scores, reports, and summaries are operational telemetry.
  They must never be framed as investment research, trading signals,
  personalized advice, asset rankings, or recommendations to transact.

## Explicitly Out Of Scope

- v3 contracts
- retired incident-stack contracts
- old cron/keeper assumptions
- lotto/jackpot
- arena
- mining
- MisterMint
- any archived `legacy-v3` ABI or address
