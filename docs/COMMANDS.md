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
: Release-time command that copies generated ABIs from a clean protocol
checkout at an approved full merged commit. It requires
`NARA_WORKSPACE_ROOT` and `NARA_PROTOCOL_ORIGIN_COMMIT`, verifies the expected
GitHub remote and `origin/main` ancestry, and refuses a mismatched or dirty
checkout. Run the protocol build at that exact commit before this command. It
is not part of a runtime monitor cycle.

`npm run validate:v4-env`
: Validates required fresh v4 addresses and `V4_START_BLOCK`.

`npm run validate:env`
: Alias for `validate:v4-env`.

`npm run codegen`
: Runs Ponder code generation.

`npm run typecheck`
: Runs TypeScript type checking.

`npm run check:docs`
: Verifies command docs, environment variable docs, and runbook runtime order
stay aligned with `package.json` and `.env.example`.

`npm run check:secrets`
: Runs static and smoke checks that guard against printing secret env values.

`npm run check:dependencies`
: Audits the complete locked dependency tree and fails on high or critical
security advisories.

`npm run check:ecosystem-drift`
: Verifies monitor handlers against committed monitor ABIs. For a
cross-repository release check, set `NARA_WORKSPACE_ROOT`,
`NARA_PROTOCOL_ORIGIN_COMMIT`, and `NARA_BASKETS_ORIGIN_COMMIT` from the
approved handoff record first. The two commits must be full merged commits in
the locally known producer `origin/main` refs. The command reads Solidity
source directly from those Git commits and does not consume sibling working
trees.

`npm run check:repository-policy`
: Verifies required public files, issue and pull-request templates, Dependabot
coverage, explicit least-privilege workflow permissions, bounded CI jobs,
full-SHA Action pinning, Node/npm toolchain alignment, ignored secret-bearing
files, and truthful license status. It runs inside the canonical verification
gate.

`npm run audit:github-settings`
: Performs a read-only audit of the live
`NARAProtocol/nara-swarm-monitor` GitHub settings. It requires an authenticated
GitHub CLI session and checks default-branch protection, signed commits, the
required `verify` check, no administrator bypass, linear history, squash-only
merges, least-privilege workflow tokens, selected and SHA-pinned Actions,
CodeQL, Dependabot security updates, vulnerability alerts, secret scanning with
push protection, and private vulnerability reporting. Override the target only
with `NARA_GITHUB_REPOSITORY=owner/name`.

`npm run verify`
: Runs the canonical pre-push and CI quality gate: repository policy,
documentation drift, secret leakage, dependency security, environment
validation, deterministic tests, Ponder code generation, ESLint, and TypeScript
type checking. When `DATABASE_URL` is absent, this command uses a non-secret
validation-only local URL; it does not connect to that database.

`npm run lint`
: Runs ESLint across the TypeScript source and configuration files.

## Monitoring Cycle

`npm run check:epoch-health`
: Reads `currentEpoch()` and the settled epoch from the active v4 engine at one
Base block, classifies the backlog, and routes the result through configured
read-only notification outputs. With the production policy it is GREEN at 0-1
epochs, YELLOW at 2-4, RED from 5, and explicitly write-blocking above the
engine's eight-epoch JIT limit. Configured Base RPC fallbacks are read-only and
tried sequentially without logging their URLs.

`npm run check:epoch-sentinel`
: Runs the same direct Base check in hosted sentinel mode. Repeated unresolved
alerts are rate-limited by `EPOCH_ALERT_REPEAT_SECONDS`, while status changes
and recovery notify immediately.

`npm run scan:failed`
: Runs one read-only failed transaction scan over active v4 contracts.

`npm run commander`
: Builds a deterministic Commander report from indexed views and alerts and
stores it in `commander_reports` for the downstream summary stage.

`npm run summarize`
: Builds an AI summary from the latest Commander report. The default
`local_stub` provider makes no external API call.

`npm run notify`
: Sends configured notifications for Commander or AI summary output and stores
delivery rows.

`npm run monitor:cycle`
: Runs one safe read-only cycle:
`validate:v4-env`, `scan:failed`, `commander`, `summarize`, `notify`. The epoch
sentinel is intentionally separate from this database-backed cycle.

`npm run monitor:cycle:dry-run`
: Prints the single-cycle plan without executing commands. This is the
cross-platform dry-run command.

`npm run monitor:health`
: Prints env validity, DB connection status, Ponder's committed checkpoint and
historical readiness, Ponder heartbeat, latest Commander/AI/delivery times,
open severity 5 count, latest recorded failed transaction time, and API config
without secret values.

## Tests

`npm run test`
: Runs seeded tests for ops-router monitoring, position intelligence, wallet
intelligence, deterministic alerts, failed transaction scanner, Commander,
AI summarizer, notifications, and operator packaging. ABI handlers are always
checked against committed ABIs. Active Solidity source comparison runs only
through the explicitly pinned cross-repository gate described above.
