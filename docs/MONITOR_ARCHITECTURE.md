# NARA Swarm Monitor Architecture

This repository is the read-only monitor for the fresh active NARA v4 stack.
It must not index, call, or describe v3, retired incident-stack contracts,
mining, jackpot, arena, or old cron/keeper behavior as active.

## Data Flow

```text
active v4 contracts
  -> Ponder event and trace indexing
  -> schema tables
  -> SQL views
  -> deterministic rules
  -> alerts
  -> Commander reports
  -> AI summaries
```

The monitor never sends transactions and never holds private keys.

## Active Inputs

Fresh v4 addresses are supplied through environment variables. The monitor fails
closed if required active v4 addresses are missing or retired addresses are
detected.

Generated active v4 Hardhat artifacts are the ABI source of truth. Hand-written
ABIs must not become permanent source of truth.

## Current Tables

Core indexed tables:

- `wallets`
- `transactions`
- `erc20_transfers`
- `locks`
- `claims`
- `nfts`
- `nft_transfers`
- `liquidity_events`
- `admin_events`
- `ops_router_events`
- `position_events`
- `position_claim_events`
- `wallet_activity_events`
- `wallet_labels`
- `wallet_position_scores`
- `alerts`
- `failed_transactions`
- `failed_tx_groups`
- `commander_reports`
- `ai_summaries`

Legacy/planned support tables that may still exist:

- `wallet_scores`
- `agent_reports`
- `decisions`

Do not treat old table names as proof of active v3 behavior.

## Position Intelligence Views

- `position_current_state`
- `wallet_position_summary`
- `wallet_locked_exposure`
- `owner_locked_positions`
- `treasury_locked_positions`
- `genesis_position_summary`
- `unlock_cliffs_24h`
- `unlock_cliffs_7d`
- `nft_without_position_metadata`
- `position_without_nft`
- `position_claim_history`
- `position_owner_history`

Position ownership logic must treat zero address as unknown until transfer, not
as a real holder.

## Wallet Intelligence Views

- `wallet_exposure_summary`
- `wallet_claim_summary`
- `wallet_transfer_summary`
- `wallet_unlock_risk`
- `wallet_genesis_power`
- `wallet_admin_risk`
- `wallet_current_profile`
- `wallet_whales`
- `wallet_fresh_activity`
- `wallet_conviction_ranking`
- `wallet_risk_ranking`

Wallet scores are deterministic. Failed transaction risk can raise risk score
but must not raise conviction score.

## Alert Views

- `open_alerts`
- `critical_alerts`
- `wallet_alert_summary`
- `position_alert_summary`
- `admin_alert_summary`
- `treasury_alert_summary`
- `router_alert_summary`
- `protocol_risk_summary`

Severity is deterministic. Unknown direct admin calls and other configured
critical conditions remain severity 5 unless the deterministic rule changes in a
reviewed code change.

## Failed Transaction Views

- `failed_tx_recent`
- `failed_tx_by_wallet`
- `failed_tx_by_function`
- `failed_tx_admin_risk`
- `failed_tx_user_friction`
- `failed_tx_spikes`
- `failed_tx_alert_summary`

The failed transaction scanner is read-only. It scans receipts for reverted
transactions touching active v4 contract addresses and decodes selectors from
generated active v4 ABIs.

## Admin, Router, Treasury Views

- `ops_router_timeline`
- `direct_engine_admin_calls`
- `admin_config_timeline`
- `treasury_movements`
- `reward_reserve_accounting`

Routine `PARAM_ROLE` and `TREASURY_ROLE` actions should go through the approved
ops router. Direct core calls are either break-glass or suspicious and must be
visible to the monitor.

## Commander Agent

Commander v1 is deterministic read-only reporting. It reads monitor views and
alerts, then emits a structured report.

Status logic:

- RED if any open severity 5 alert exists.
- YELLOW if any open severity 3 or 4 alert exists.
- GREEN if no open severity 3+ alerts exist.

Commander does not send transactions, resolve alerts, change scores, or query
raw chain state directly.

## AI Summarizer

AI Summarizer v1 reads only `commander_reports`. The default `local_stub`
provider makes no external API call and formats the report deterministically.

The AI summarizer may not:

- read raw tables directly
- query chain state
- create alerts
- resolve alerts
- change scores
- lower severity
- invent evidence
- execute recommendations
- send transactions
- call contracts
- post publicly

If evidence is missing, it must say evidence unavailable.
