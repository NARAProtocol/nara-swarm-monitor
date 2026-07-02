# NARA Swarm Monitor Operator Runbook

This runbook is for the fresh active NARA v4 monitor only. It does not use v3,
retired incident-stack contracts, mocks, mining, jackpot, private keys,
transactions, or protocol writes.

The monitor is read-only with respect to protocol state. It indexes logs and
traces, scans receipts, builds deterministic reports, summarizes those reports,
and sends operator-facing notifications.

## Prerequisites

- Node.js 18.14 or newer.
- A Postgres database available through `DATABASE_URL`.
- A Base RPC URL in `BASE_RPC_URL`.
- Fresh v4 contract addresses only.
- `V4_START_BLOCK` from the fresh v4 deployment.
- Generated ABIs from the active v4 Hardhat artifacts.
- Ponder API reachable through `COMMANDER_SQL_URL` when running Commander,
  summarize, notify, and health commands.

No private key, signer, wallet, deployer key, transaction permission, or
contract-write permission is required.

## Runtime Order

### Step 1: Sync Generated ABIs

```bash
npm run sync:abis
```

This copies ABIs from active v4 Hardhat artifacts. Do not use hand-written ABI
files as the long-term source of truth.

### Step 2: Validate Environment

Preferred command:

```bash
npm run validate:env
```

Current validator command:

```bash
npm run validate:v4-env
```

The validator fails closed if required active v4 addresses are missing, zero, or
retired.

### Step 3: Run Ponder Indexer

Development:

```bash
npm run dev
```

Production-style local server:

```bash
npm run start
```

The Ponder server also exposes the read-only GraphQL and SQL API from
`src/api/index.ts`. Keep it local by default and place any external access
behind an operator-controlled reverse proxy.

### Step 4: Run Failed Transaction Scan

```bash
npm run scan:failed
```

This scans receipts for reverted transactions touching active v4 contract
addresses. It is read-only and does not submit transactions.

### Step 5: Generate Commander Report

```bash
npm run commander
```

Commander v1 reads existing monitor views and alerts, then creates a
deterministic status report. It does not call contracts or raw chain state.

### Step 6: Generate AI Summary

```bash
npm run summarize
```

The default provider is `AI_SUMMARY_PROVIDER=local_stub`, which makes no
external API call. It reads only `commander_reports`.

### Step 7: Send Notifications

```bash
npm run notify
```

Notifications report Commander or AI summary output only. They do not resolve
alerts, create alerts, send transactions, or post publicly unless the operator
has explicitly enabled a channel.

### Step 8: Start Read-Only API/Dashboard

```bash
npm run api
```

This uses the current Ponder server path. The API exposes read-only SQL and
GraphQL surfaces for indexed monitor data. `API_HOST`, `API_PORT`,
`API_READ_ONLY`, and `API_MAX_LIMIT` document the intended local API posture;
they do not grant write permissions.

## Single Cycle

To run one safe read-only cycle after Ponder is already running:

```bash
npm run monitor:cycle
```

The cycle runs:

```text
sync:abis
validate:v4-env
scan:failed
commander
summarize
notify
```

It intentionally does not start long-running Ponder.

Dry run:

```bash
npm run monitor:cycle:dry-run
```

## Health Check

```bash
npm run monitor:health
```

The health check prints:

- environment validity by key name only
- DB connection status
- latest indexed block if available
- latest Commander report time
- open severity 5 alert count
- latest failed transaction scan time if available
- API config summary without secret values

## Safety Rules

- No private keys.
- No transactions.
- No deploys.
- No contract writes.
- No secret printing.
- No public posting unless a notification channel is explicitly enabled.
- No automatic alert resolution.
