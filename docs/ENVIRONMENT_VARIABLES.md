# NARA Swarm Monitor Environment Variables

Never print secret values in chat, logs, reports, or docs. It is acceptable to
print key names and whether a key is present.

## Core

`CHAIN_ID`
: Chain ID for the monitor. Base mainnet is `8453`.

`MONITOR_PROFILE`
: `core` indexes the currently deployed token, engine, liquidity hook, vault,
  and compounder. `full` additionally requires every deferred protocol surface.

`BASE_RPC_URL`
: Primary read-only RPC endpoint for Base.

`BASE_BACKUP_RPC_URL_1`
: Optional backup RPC endpoint.

`BASE_BACKUP_RPC_URL_2`
: Optional backup RPC endpoint.

`DATABASE_URL`
: Postgres database used by Ponder and runtime storage scripts.

`DATABASE_SCHEMA`
: Dedicated PostgreSQL schema owned by this Ponder app. Use
  `nara_v4_monitor` for the production monitor; do not reuse `public` when it
  contains another Ponder app.

`V4_START_BLOCK`
: Deployment scan start block on Base Mainnet. The verified V5 deployment checkpoint block is `53422831` (historical v4 launch receipt block was `49718979`); verify this against the pinned deployment manifest before changing it. Must be a positive integer.

`V4_EPOCH_LENGTH_SECONDS`
: Deployed engine epoch length in seconds. Do not assume the default unless the
deployment config confirms it.

`V4_MAX_EPOCH_BACKLOG`
: Maximum backlog considered healthy by the direct-state epoch poll. Defaults
  to `1`.

`V4_EPOCH_CRITICAL_BACKLOG`
: Early critical paging threshold. Production uses `5`, before the Engine's
  eight-epoch user-call JIT settlement limit is exceeded.

`EPOCH_SENTINEL_INTERVAL_SECONDS`
: Independent direct-chain epoch polling cadence. Production uses `300` (five
  minutes); the sentinel does not depend on Ponder, Commander, or Postgres.

`EPOCH_ALERT_REPEAT_SECONDS`
: Repeat interval for an unchanged YELLOW or RED state. Production uses `1800`
  (30 minutes). Status transitions notify immediately.

`BASE_BACKUP_RPC_URL_1` / `BASE_BACKUP_RPC_URL_2`
: Optional independent Base read providers used sequentially if the primary
  direct-state request fails. Provider URLs are never included in reports or
  logs.

`FAILED_TX_SCAN_MAX_BLOCKS`
: Maximum blocks scanned by one recurring failed-transaction pass. Defaults to
  `512`. The default pass scans the latest bounded window, not the full
  deployment history.

`FAILED_TX_FROM_BLOCK` / `FAILED_TX_TO_BLOCK`
: Optional manual scan bounds. The selected range must still fit within
  `FAILED_TX_SCAN_MAX_BLOCKS`; increase the cap deliberately for an offline
  historical batch rather than turning recurring monitoring into an unbounded
  scan.

`COMMANDER_SQL_URL`
: Read-only Ponder SQL endpoint. Defaults to `http://localhost:42069/sql` for
local development. Railway uses `http://127.0.0.1:8080/sql` because its
injected `PORT` is `8080`.

## Contracts

All contract addresses must be fresh active v4 addresses. Do not use v3 or
retired incident-stack addresses.

`V4_NARA_TOKEN`
: Fresh active v4 `NARAToken`.

`V4_ENGINE`
: Fresh active v4 `NARAEngine`.

`V4_POSITION_NFT`
: Active Position NFT contract address (`NARAPositionNFTV5` `0x8C5F088D9d09dBB90aB6F3aaA049a8FD5D5FfFDA` on V5). Optional in the `core` profile.

`V4_BOND_DEPOSITORY_NFT`
: Fresh active v4 `NARABondDepositoryV4NFT`, the NFT launch-path depository.

`V4_BOND_VAULT`
: Fresh active v4 `NARABondVaultV4`.

`V4_OPS_VAULT`
: Fresh active v4 `NARAOpsVaultV4`.

`V4_ENGINE_OPS_ROUTER`
: Approved `NARAEngineOpsRouterV1` address.

`V4_BREAK_GLASS_SAFE`
: Approved break-glass Safe allowed to call engine admin functions directly.

`V4_STAKING_POOL`
: Required by the full profile. Fresh `NARAStakingPoolV4` address.

`V4_STAKING_POOL_SY`
: Required by the full profile. Fresh `NARAStakingPoolSYV4` address.

`V4_FRACTIONAL_FACTORY`
: Required by the full profile. Fresh `NARAFractionalPositionFactoryV4`
address.

`V4_LIQUIDITY_GROWTH_HOOK`
: Required by both profiles. Fresh liquidity-growth hook address.

`V4_LIQUIDITY_GROWTH_VAULT`
: Required by both profiles. Fresh liquidity-growth vault address.

`V4_LIQUIDITY_COMPOUNDER`
: Required by both profiles. Fresh liquidity compounder address.

`V4_USDC_TOKEN`
: Verified Base USDC address used to prove that a Hook fee event is a canonical
NARA buy before the large-buy watcher notifies.

`V4_BASKET_FEE_COLLECTOR`
: Required by the full profile. Canonical basket V2 fee collector.

`V4_BASKET_MANAGERS`
: Required comma-separated list containing at least one fresh basket manager
address.

`V4_GENESIS_REWARD_DISTRIBUTOR`
: Required by the full profile. Fresh Genesis reward distributor address.

`V4_BRIBE_ROUTER`
: Required by the full profile. Fresh `BribeRouterV4` address.

`V4_TREASURY_ADDRESS`
: Optional treasury label used by views and health checks.

`V4_FINAL_ADMIN`
: Optional final admin label used by wallet classification views.

`DEPLOYER_ADDRESS`
: Optional deployer label for operator context.

`V5_PRINCIPAL_LEDGER`
: Optional V5 `NARAPrincipalLedgerV5` address. When set, Ponder indexes V5
  position creation (`PositionCreated`) and withdrawal (`PrincipalWithdrawn`)
  alongside `V4_ENGINE`, and the Telegram listener and failed-tx scanner read
  it directly.

`V5_REWARD_LEDGER`
: Optional V5 `NARARewardLedgerV5` address. When set, Ponder indexes V5 reward
  claims (`RewardClaimed`) alongside `V4_ENGINE`, and the Telegram listener and
  failed-tx scanner read it directly.

`V5_EMISSION_RESERVE`
: Optional V5 `NARAEmissionReserveV5` address for protocol wallet labeling and
  Telegram `/contracts` display.

`V5_FORGE`
: Optional V5 `NARAForgeV5` address for protocol wallet labeling and Telegram
  `/contracts` display.

`V5_POSITION_SALE`
: Optional V5 `NARAPositionSaleV5` address for protocol wallet labeling and
  Telegram `/contracts` display.

`V5_POOL_ORACLE`
: Optional V5 `NARAPoolOracleV5` address for protocol wallet labeling and
  Telegram `/contracts` display.

`V5_TREASURY_RANGE_MANAGER`
: Optional V5 `NARATreasuryRangeManagerV5` address for protocol wallet labeling
  and Telegram `/contracts` display.

## Liquidity

`V4_DEX_TYPE`
: Optional DEX type label. Current default is `uniswap_v4`.

`V4_UNISWAP_V4_POOL_ID`
: Optional fresh v4 pool ID.

`V4_LIQUIDITY_HOOK`
: Optional legacy environment alias. Runtime indexing uses
`V4_LIQUIDITY_GROWTH_HOOK`.

`V4_LIQUIDITY_VAULT`
: Optional legacy environment alias. Runtime indexing uses
`V4_LIQUIDITY_GROWTH_VAULT`.

## Notifications

`NOTIFY_CHANNELS`
: Comma-separated channels. Supported values are `console`, `webhook`,
`telegram`, `discord`, and `email`. Console is always available. Email is a
placeholder until SMTP is explicitly added.

`NOTIFY_YELLOW`
: If `true`, YELLOW reports notify optional channels.

`NOTIFY_GREEN`
: If `true`, GREEN reports notify optional channels. GREEN always prints to
console when console is routed.

`FORCE_NOTIFY`
: If `true`, bypass duplicate payload dedup for configured channels.

`WEBHOOK_URL`
: Optional webhook destination. The value must stay in env only and is not
stored in `notification_deliveries`.

`TELEGRAM_BOT_TOKEN`
: Optional Telegram bot token. The token must stay in env only and is never
stored.

`TELEGRAM_CHAT_ID`
: Optional Telegram chat ID. This can appear as a destination label.

`DISCORD_WEBHOOK_URL`
: Optional Discord webhook URL. The value must stay in env only and is not
stored in `notification_deliveries`.

`LARGE_BUY_ALERT_ENABLED`
: Enables the independent read-only canonical NARA/USDC large-buy watcher.
  Keep it `false` until the verified pool, currencies, Telegram destination,
  and first future activation block are all configured. Its output is operator
  telemetry, not a trading signal.

`LARGE_BUY_ALERT_MIN_USDC`
: Gross USDC input threshold with up to six decimals. Production uses `100`.

`LARGE_BUY_ALERT_START_BLOCK`
: First Base block eligible for notification. Set it to the first future block
at activation so historical swaps cannot create Telegram alerts.

`LARGE_BUY_ALERT_POLL_SECONDS`
: RPC polling cadence. Production uses `10`; validation refuses values below
five seconds.

`LARGE_BUY_ALERT_CONFIRMATIONS`
: Base confirmation depth before sending. Production uses `2`.

`LARGE_BUY_ALERT_MAX_BLOCKS_PER_SCAN`
: Maximum contiguous Base range per catch-up query. Production uses `500`.

## API

`API_HOST`
: Intended API bind host. Default posture is `127.0.0.1`.

`API_PORT`
: Intended API port. Current local Ponder default is `42069`.

`API_READ_ONLY`
: Must remain `true`. The monitor API is read-only.

`API_MAX_LIMIT`
: Operator-facing query limit hint for dashboard/API consumers.

## AI Summary

`AI_SUMMARY_PROVIDER`
: Current summarizer provider selector. Default is `local_stub`, which makes no
external API call and only reads `commander_reports`.

`GEMINI_API_KEY`
: Reserved for later optional AI integrations. It is not required for the
current `local_stub` path and must not be printed.

`AI_PROVIDER`
: Not currently used by this repo. Use `AI_SUMMARY_PROVIDER`.

`AI_MODEL`
: Not currently used by this repo. The current `local_stub` model name is
defined in code.

## Failed Transaction Scanner

`FAILED_TX_TO_BLOCK`
: Optional scan upper bound. If omitted, the scanner uses the latest block from
the RPC client.

## Release Engineering Only

These values are not monitor runtime configuration. Set them only from an
approved cross-repository release handoff.

`NARA_WORKSPACE_ROOT`
: Absolute path to a workspace containing the expected
`nara-protocol-hardhat` and `nara-category-baskets-v1` Git repositories.

`NARA_PROTOCOL_ORIGIN_COMMIT`
: Full 40-character merged commit from
`NARAProtocol/nara_protocol_v4`. ABI synchronization and the pinned ecosystem
drift gate verify that this commit is contained in the locally known
`origin/main`.

`NARA_BASKETS_ORIGIN_COMMIT`
: Full 40-character merged commit from
`NARAProtocol/nara_protocol_v4_baskets`. The pinned ecosystem drift gate
verifies that this commit is contained in the locally known `origin/main`.

## Retired And Forbidden

The treasury Range Ranger is permanently retired; see the FIELD workspace audit
`audit-runs/2026-09-24-range-manager/REPORT.md`. The monitor never holds a
signing key.

`TREASURY_PRIVATE_KEY`
: Forbidden. It must not be set in any environment: Railway, CI, or a
  workstation `.env` or `.env.local`. `npm run start` refuses to start while it
  is set, before any child process is launched, and `npm run validate:env`
  fails while it is set in the environment, `.env` or `.env.local`. Ponder loads
  `.env.local` by itself, so keep the key out of that file too.

`RANGE_RANGER_*`
: Obsolete. `RANGE_RANGER_ALERT_ENABLED`, `RANGE_RANGER_POLL_SECONDS`,
  `RANGE_RANGER_TRANCHE_USDC`, `RANGE_RANGER_TRANCHE_NARA`,
  `RANGE_RANGER_MIN_USDC`, `RANGE_RANGER_MAX_USDC`, `RANGE_RANGER_MIN_NARA`,
  `RANGE_RANGER_MAX_NARA`, `RANGE_RANGER_MIN_GAP_PCT` and
  `RANGE_RANGER_VOLATILITY_PCT` are ignored because the Range Ranger never
  starts; delete them. `npm run start` and `npm run validate:env` refuse to run
  while `RANGE_RANGER_AUTO_EXECUTE` is enabled.

`npm run start` also withholds every variable whose name contains
`PRIVATE_KEY`, `MNEMONIC` or `SEED` from the processes it launches, and logs
the withheld names, never their values.

## Deprecated Or External

`OZ_MONITOR_WEBHOOK_URL`
: Optional external OpenZeppelin Monitor webhook placeholder. It is not part of
the notification output v1 router.
