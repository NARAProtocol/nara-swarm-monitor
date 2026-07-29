# NARA Swarm Monitor Agent Rules

This repository is v4-only.

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

In the FIELD workspace, read
`../docs/NARA_CROSS_REPOSITORY_RELEASE_PROTOCOL.md` before any
multi-repository update. Record the origin commit, artifact source, manifest,
chain, start block, backfill result, and downstream public-documentation impact
in the pull request.

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
- If an address is not known because that deferred component is not deployed,
  leave it unset and let the full monitor profile fail closed.
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

## Current Deployment Warning

- The current Ponder configuration supports `MONITOR_PROFILE=core` for the
  deployed token, engine, liquidity hook, vault, and compounder.
- Do not invent or reuse addresses to make the full profile boot.
- The public launch scope is baskets only. A dedicated baskets/core profile is
  required after basket manager and fee collector addresses are deployed.
- Do not deploy deferred position NFT, bond, router, lockboard, or composability
  surfaces merely to satisfy the indexer.

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
