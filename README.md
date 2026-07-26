# NARA Swarm Monitor

V4-only Ponder monitor for the fresh NARA redeploy.

This project intentionally fails closed. Protocol contract addresses must be
provided through environment variables after the fresh v4 deployment. Retired
v3 addresses and retired incident-stack v4 addresses are blocked at startup.

## Current Deployment Scope

The 2026-07-26 Stage A deployment contains token, engine, reward reserve, hook,
and vault only. The current Ponder configuration is a **full-protocol profile**
and intentionally cannot start until every configured surface is deployed.
Never fill missing variables with retired, zero, or invented addresses.

The public launch scope is NARA Baskets only. Before basket monitoring can go
live, add an explicit baskets/core monitoring profile or complete a reviewed
refactor that conditionally registers only deployed contracts. Do not deploy
position NFT, bond, router, or composability contracts merely to satisfy the
monitor.

## Required Inputs

Set these from the fresh v4 deployment only:

```text
CHAIN_ID=8453
BASE_RPC_URL=
V4_START_BLOCK=
V4_NARA_TOKEN=
V4_ENGINE=
V4_POSITION_NFT=
V4_BOND_DEPOSITORY_NFT=
V4_BOND_VAULT=
V4_OPS_VAULT=
V4_ENGINE_OPS_ROUTER=
V4_BREAK_GLASS_SAFE=
V4_STAKING_POOL=
V4_STAKING_POOL_SY=
V4_FRACTIONAL_FACTORY=
V4_LIQUIDITY_GROWTH_HOOK=
V4_LIQUIDITY_GROWTH_VAULT=
V4_LIQUIDITY_COMPOUNDER=
V4_BASKET_MANAGERS=
V4_BASKET_FEE_COLLECTOR=
V4_GENESIS_REWARD_DISTRIBUTOR=
V4_BRIBE_ROUTER=
```

Do not use archived v3 addresses or retired incident-stack addresses.

Routine PARAM_ROLE and TREASURY_ROLE operations should flow through
`V4_ENGINE_OPS_ROUTER`. Direct `NARAEngine` admin calls by any caller other than
that router or `V4_BREAK_GLASS_SAFE` produce a severity 5 alert.

## Commands

```bash
npm run validate:v4-env
npm run sync:abis
npm test
npm run codegen
npm run typecheck
npm run commander
npm run summarize
npm run dev
```

`npm run commander` is read-only. It expects a running Ponder API and reads from
`COMMANDER_SQL_URL`, defaulting to `http://localhost:42069/sql`.

`npm run summarize` is read-only with respect to protocol state. It reads the
latest `commander_reports` row, uses `AI_SUMMARY_PROVIDER=local_stub` by default,
prints a deterministic summary, and stores only an `ai_summaries` row through
`DATABASE_URL`.

## Cold AI Warning

Read `AGENTS.md` before changing this monitor. The old v3 stack, jackpot,
mining, and cron/keeper assumptions are not part of this fresh-start monitor.
