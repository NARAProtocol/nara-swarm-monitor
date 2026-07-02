import {
  failed_transactions,
  failed_tx_groups,
  wallet_activity_events,
  wallet_position_scores,
} from "ponder:schema";
import { emitAlert } from "../rule-engine/engine";
import type {
  FailedTransactionRecord,
  FailedTxAlertInput,
  FailedTxGroupRecord,
  FailedTxWriter,
  FailedWalletActivityRecord,
  FailedWalletRiskDelta,
} from "./failedTxScanner";

function emptyWalletScore(delta: FailedWalletRiskDelta) {
  return {
    wallet: delta.wallet,
    chainId: delta.chainId,
    rawPositionCount: 0,
    wrappedPositionCount: 0,
    genesisPositionCount: 0,
    lockedAmount: 0n,
    activeLockedAmount: 0n,
    unlockedAmount: 0n,
    unlocking24hAmount: 0n,
    unlocking7dAmount: 0n,
    claimCount: 0,
    claimNaraAmount: 0n,
    claimEthAmount: 0n,
    claimTokenAmount: 0n,
    transferInAmount: 0n,
    transferOutAmount: 0n,
    netTransferAmount: 0n,
    genesisRewardWeight: 0n,
    avgLockDurationEpochs: 0n,
    lastActivityTimestamp: delta.timestamp,
    riskScore: delta.riskScoreDelta,
    convictionScore: delta.convictionScoreDelta,
    updatedAt: delta.timestamp,
  };
}

export function createPonderFailedTxWriter(db: any): FailedTxWriter {
  return {
    async insertFailedTransaction(record: FailedTransactionRecord) {
      await db.insert(failed_transactions).values(record).onConflictDoUpdate(() => ({
        revertReason: record.revertReason,
        gasUsed: record.gasUsed,
        effectiveGasPrice: record.effectiveGasPrice,
        metadataJson: record.metadataJson,
      }));
    },

    async upsertFailedTxGroup(record: FailedTxGroupRecord) {
      await db.insert(failed_tx_groups).values(record).onConflictDoUpdate((row: any) => ({
        windowEnd: record.windowEnd,
        failureCount: record.failureCount,
        lastFailureTxHash: record.lastFailureTxHash,
        severity: record.severity,
        updatedAt: record.updatedAt,
      }));
    },

    async insertWalletActivity(record: FailedWalletActivityRecord) {
      await db.insert(wallet_activity_events).values(record).onConflictDoNothing();
    },

    async increaseWalletRiskScore(delta: FailedWalletRiskDelta) {
      await db.insert(wallet_position_scores).values(emptyWalletScore(delta)).onConflictDoUpdate((row: any) => ({
        riskScore: row.riskScore + delta.riskScoreDelta,
        convictionScore: row.convictionScore + delta.convictionScoreDelta,
        lastActivityTimestamp: delta.timestamp,
        updatedAt: delta.timestamp,
      }));
    },

    async emitAlert(alert: FailedTxAlertInput) {
      await emitAlert(db, alert);
    },
  };
}
