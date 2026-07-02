# NARA Swarm Monitor Environment Variables

Never print secret values in chat, logs, reports, or docs. It is acceptable to
print key names and whether a key is present.

## Core

`CHAIN_ID`
: Chain ID for the monitor. Base mainnet is `8453`.

`BASE_RPC_URL`
: Primary read-only RPC endpoint for Base.

`BASE_BACKUP_RPC_URL_1`
: Optional backup RPC endpoint.

`BASE_BACKUP_RPC_URL_2`
: Optional backup RPC endpoint.

`DATABASE_URL`
: Postgres database used by Ponder and runtime storage scripts.

`V4_START_BLOCK`
: Fresh v4 deployment start block. Must be a positive integer.

`V4_EPOCH_LENGTH_SECONDS`
: Deployed engine epoch length in seconds. Do not assume the default unless the
deployment config confirms it.

`COMMANDER_SQL_URL`
: Read-only Ponder SQL endpoint. Defaults to `http://localhost:42069/sql`.

## Contracts

All contract addresses must be fresh active v4 addresses. Do not use v3 or
retired incident-stack addresses.

`V4_NARA_TOKEN`
: Fresh active v4 `NARAToken`.

`V4_ENGINE`
: Fresh active v4 `NARAEngine`.

`V4_POSITION_NFT`
: Fresh active v4 `NARAPositionNFTV4`.

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

`V4_TREASURY_ADDRESS`
: Optional treasury label used by views and health checks.

`V4_FINAL_ADMIN`
: Optional final admin label used by wallet classification views.

`DEPLOYER_ADDRESS`
: Optional deployer label for operator context.

## Liquidity

`V4_DEX_TYPE`
: Optional DEX type label. Current default is `uniswap_v4`.

`V4_UNISWAP_V4_POOL_ID`
: Optional fresh v4 pool ID.

`V4_LIQUIDITY_HOOK`
: Optional fresh v4 liquidity hook address.

`V4_LIQUIDITY_VAULT`
: Optional fresh v4 liquidity vault address.

`V4_LIQUIDITY_COMPOUNDER`
: Optional fresh v4 liquidity compounder address.

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

## Deprecated Or External

`OZ_MONITOR_WEBHOOK_URL`
: Optional external OpenZeppelin Monitor webhook placeholder. It is not part of
the notification output v1 router.

