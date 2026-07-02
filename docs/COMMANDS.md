# NARA Swarm Monitor Commands

Every command is for the active v4 monitor only. None of these commands require
private keys or protocol-write permissions.

## Long-Running Services

`npm run dev`
: Starts Ponder in development mode.

`npm run start`
: Starts Ponder in production-style mode.

`npm run api`
: Starts the current Ponder server/API path. This exposes the read-only SQL and
GraphQL endpoints implemented in `src/api/index.ts`.

## Database Tooling

`npm run db`
: Runs Ponder database tooling.

## Generation And Validation

`npm run sync:abis`
: Copies generated ABIs from active v4 Hardhat artifacts into this monitor.

`npm run validate:v4-env`
: Validates required fresh v4 addresses and `V4_START_BLOCK`.

`npm run validate:env`
: Alias for `validate:v4-env`.

`npm run codegen`
: Runs Ponder code generation.

`npm run typecheck`
: Runs TypeScript type checking.

`npm run lint`
: Runs ESLint.

## Monitoring Cycle

`npm run scan:failed`
: Runs one read-only failed transaction scan over active v4 contracts.

`npm run commander`
: Builds a deterministic Commander report from indexed views and alerts.

`npm run summarize`
: Builds an AI summary from the latest Commander report. The default
`local_stub` provider makes no external API call.

`npm run notify`
: Sends configured notifications for Commander or AI summary output and stores
delivery rows.

`npm run monitor:cycle`
: Runs one safe read-only cycle:
`sync:abis`, `validate:v4-env`, `scan:failed`, `commander`, `summarize`,
`notify`.

`npm run monitor:cycle:dry-run`
: Prints the single-cycle plan without executing commands. This is the
cross-platform dry-run command.

`npm run monitor:health`
: Prints env validity, DB connection status, latest indexed block, latest
Commander report time, open severity 5 count, latest failed transaction scan
time, and API config without secret values.

## Tests

`npm run test`
: Runs seeded tests for ops-router monitoring, position intelligence, wallet
intelligence, deterministic alerts, failed transaction scanner, Commander,
AI summarizer, notifications, and operator packaging.
