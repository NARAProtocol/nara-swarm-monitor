# NARA Swarm Monitor Recovery Procedures

All recovery actions here are read-only with respect to protocol state. Do not
add private keys, send transactions, deploy contracts, write to contracts,
resolve alerts automatically, or print secrets while recovering the monitor.

## Ponder Stuck

1. Check process logs for RPC, database, or ABI decode errors.
2. Run:

   ```bash
   npm run validate:env
   npm run codegen
   npm run typecheck
   ```

3. Confirm `BASE_RPC_URL`, `DATABASE_URL`, and `V4_START_BLOCK` are present.
4. Confirm all configured contract addresses are fresh active v4 addresses.
5. Restart Ponder with:

   ```bash
   npm run start
   ```

6. If decode errors remain, run `npm run sync:abis` and restart Ponder.

## RPC Rate Limited

1. Switch `BASE_RPC_URL` to a healthy read-only RPC endpoint.
2. Keep backup RPC values in env for operator reference.
3. Lower manual scan frequency if `scan:failed` is competing with Ponder.
4. Avoid running multiple failed transaction scans over the same wide block
   range at once.

## Failed Transaction Scanner Interrupted

1. Re-run:

   ```bash
   npm run scan:failed
   ```

2. Use `FAILED_TX_TO_BLOCK` only when you need a bounded replay window.
3. Check `failed_transactions` and `failed_tx_groups` after the run.
4. The scanner is read-only and can be repeated; duplicate handling is in the
   database writer path.

## Duplicate Notifications

1. Check `notification_deliveries` for the same `payloadHash` and channel.
2. Confirm `FORCE_NOTIFY=false` for normal operation.
3. If duplicate sends were intentional, record the reason outside the monitor.
4. If duplicate sends were accidental, leave the alert state unchanged and fix
   the notification runner schedule.

## Missing ABI

1. Confirm the active v4 Hardhat repo exists next to this repo.
2. Run:

   ```bash
   npm run sync:abis
   npm run codegen
   npm run typecheck
   ```

3. Verify the missing contract is active v4, not v3 or archived.
4. If the active v4 artifact does not exist, stop and ask for the correct
   artifact source.

## Stale Commander Report

1. Confirm Ponder is running and indexed past the relevant block.
2. Confirm `COMMANDER_SQL_URL` points at the current Ponder SQL endpoint.
3. Run:

   ```bash
   npm run commander
   npm run summarize
   npm run notify
   ```

4. Use `npm run monitor:health` to check latest Commander report time.

## API Cannot Connect To DB

1. Confirm `DATABASE_URL` is present without printing its value.
2. Confirm Postgres is reachable from the monitor host.
3. Run:

   ```bash
   npm run monitor:health
   ```

4. Restart Ponder after DB access is restored.

## Wrong Contract Address Detected

1. Stop the monitor process.
2. Remove or correct the bad env value.
3. Run:

   ```bash
   npm run validate:env
   ```

4. If a retired address was used, treat indexed data from that run as invalid.
5. Reset or rebuild the monitor database only after preserving any required
   operator evidence.

## Alert Flood

1. Do not auto-resolve alerts.
2. Check whether the flood comes from one rule, one wallet, one contract, or an
   RPC/indexing replay.
3. Run:

   ```bash
   npm run commander
   npm run summarize
   npm run notify
   ```

4. Review `open_alerts`, `critical_alerts`, and relevant summary views.
5. If the flood is a deterministic threshold issue, change thresholds only in a
   reviewed code change.

## DB Reset Needed

1. Stop Ponder and all cycle runners.
2. Export or snapshot any evidence needed for operations review.
3. Confirm fresh v4 env values:

   ```bash
   npm run validate:env
   ```

4. Use Ponder database tooling only after confirming the target database is the
   monitor DB.
5. Restart Ponder and re-run:

   ```bash
   npm run scan:failed
   npm run commander
   npm run summarize
   npm run notify
   ```

Never run destructive database commands against an unverified database target.

