# NARA Swarm Monitor

V4-only Ponder monitor for the fresh NARA redeploy.

This project intentionally fails closed. Protocol contract addresses must be
provided through environment variables after the fresh v4 deployment. Retired
v3 addresses and retired incident-stack v4 addresses are blocked at startup.

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
npm run dev
```

`npm run commander` is read-only. It expects a running Ponder API and reads from
`COMMANDER_SQL_URL`, defaulting to `http://localhost:42069/sql`.

## Cold AI Warning

Read `AGENTS.md` before changing this monitor. The old v3 stack, jackpot,
mining, and cron/keeper assumptions are not part of this fresh-start monitor.
