# NARA Large-Buy Telegram Alert Activation — 2026-08-28

Change ID: `NARA-20260828-large-buy-telegram-alert`

Network: Base (`8453`)

Evidence state: implemented, tested, merged, configured, deployed, and routing
tested. A real post-activation buy at or above the threshold has not yet been
observed, so live qualifying-buy delivery is not claimed by this record.

## Purpose

Notify the configured Telegram chat when a swap through the canonical
NARA/USDC v4 Hook spends at least `100 USDC` buying NARA. This is a read-only
monitor output; it does not quote, route, approve, sign, or submit a trade.

## Detection policy

The independent worker reads the canonical Hook's `PoolFeeTaken` event and
requires all of the following before notification:

- event `poolId` equals the verified production NARA/USDC pool;
- event input currency equals verified Base USDC;
- `isBuy == true`; and
- gross `amountIn >= 100,000,000` raw USDC units (`100 USDC`).

The message includes the transaction initiator, gross USDC input, Hook fee,
fee BPS, Base block, and BaseScan transaction link. It waits two Base blocks,
polls every ten seconds, and scans at most 500 blocks per catch-up request.

## Reliability and privacy

- A Postgres block cursor survives process and Railway restarts.
- Chain ID, transaction hash, and log index form the unique delivery ID.
- The cursor advances only after all qualifying notifications in the scanned
  range succeed; failed Telegram sends are retried.
- The primary and two configured Base RPCs are tried sequentially without
  logging their URLs.
- Telegram token, chat credential, database URL, and RPC URLs remain
  environment-only and are redacted from errors.
- The worker is supervised independently of Ponder, the Telegram command
  listener, the epoch sentinel, and the broad ten-minute monitor cycle.

## Source and deployment evidence

Protected monitor PR `#27` passed both canonical verification jobs and CodeQL,
then squash-merged as
`5b7f369aba15c85aa13f172af32929ba5d8477af`.

The immutable source change was cherry-picked to the established Railway
deployment branch as `38db568f77e5b81f48678b745506300429d6243c`.
Railway deployment `393c7901-8b70-4965-9176-bc022bd0a909` reached `SUCCESS`
with one active monitor instance.

Production configuration was activated with:

- threshold: `100 USDC`;
- forward-only start block: `50541378`;
- poll interval: `10 seconds`;
- confirmation depth: `2 blocks`; and
- maximum range: `500 blocks`.

The verified production Hook, pool ID, Base USDC address, existing Telegram
destination, database, and RPC providers remain environment-bound. No secret
value is included in this record.

## Verification

- Full repository verification passed: repository policy, documentation drift,
  secret scan, dependency audit, environment validation, deterministic tests,
  Ponder code generation, lint, and typecheck.
- Focused tests passed threshold parsing, inclusive 100-USDC behavior,
  non-buy rejection, wrong-pool/currency rejection, stable delivery IDs,
  Telegram formatting, and compatibility with the committed generated Hook
  ABI.
- A read-only historical status-`1` receipt probe decoded a canonical buy as
  `11 USDC` gross input, `0.55 USDC` Hook fee, `500 BPS`, and `isBuy=true`.
  It remained below threshold and sent no notification.
- Production environment validation passed before deployment.
- Hosted logs reported the watcher active at `100 USDC`, ten-second polling,
  and two confirmations, then healthy confirmed-head cursor advancement with
  zero historical alerts.
- Telegram accepted one clearly labeled setup test message. The test path does
  not create a buy delivery row or fabricate an onchain event.

## Rollback

Set `LARGE_BUY_ALERT_ENABLED=false` and redeploy the monitor. This stops only
the large-buy worker; Ponder, Telegram commands, the epoch sentinel, broad
monitoring, and protocol state are unaffected. Cursor and delivery rows remain
as audit evidence.
