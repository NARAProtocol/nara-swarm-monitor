import assert from "node:assert/strict";
import { encodeFunctionData } from "viem";
import {
  assembleFailedScanResult,
  failedTransactionFromReceipt,
  loadDefaultAbiContracts,
  scanFailedTransactions,
} from "./failedTxScannerRuntime.mjs";

const chainId = 8453;
const engine = "0x000000000000000000000000000000000000e001";
const nft = "0x000000000000000000000000000000000000e002";
const router = "0x000000000000000000000000000000000000e003";
const other = "0x000000000000000000000000000000000000dEaD";
const wallet = "0x000000000000000000000000000000000000a001";
const recipient = "0x000000000000000000000000000000000000a002";
const block = {
  number: 100n,
  hash: "0xblock",
  timestamp: 1_700_000_000,
};
const failedReceipt = {
  status: "reverted",
  gasUsed: 50_000n,
  effectiveGasPrice: 1_000_000n,
};
const severityByRule = {
  failed_unknown_direct_admin_call_spike: 5,
  failed_treasury_call_spike: 5,
  failed_router_ops_call_spike: 5,
  same_wallet_same_function_repeated_failures: 4,
  many_failed_claims: 4,
  many_failed_locks: 4,
  many_failed_unlocks: 4,
  single_suspicious_failed_admin_attempt: 3,
  single_suspicious_failed_treasury_attempt: 3,
};

const abiByContract = new Map(loadDefaultAbiContracts().map((contract) => [contract.contractName, contract.abi]));
const activeContracts = [
  { contractName: "NARAEngine", address: engine },
  { contractName: "NARAPositionNFTV4", address: nft },
  { contractName: "NARAEngineOpsRouterV1", address: router },
];

function calldata(contractName, functionName, args) {
  return encodeFunctionData({
    abi: abiByContract.get(contractName),
    functionName,
    args,
  });
}

function hash(index) {
  return `0x${index.toString(16).padStart(64, "0")}`;
}

function tx(index, to, input, from = wallet) {
  return {
    hash: hash(index),
    from,
    to,
    input,
    value: 0n,
    gasPrice: 1_000_000n,
  };
}

function failedRecord(index, to, input, from = wallet, timestampOffset = 0) {
  return failedTransactionFromReceipt({
    chainId,
    tx: tx(index, to, input, from),
    receipt: failedReceipt,
    block: { ...block, timestamp: block.timestamp + timestampOffset },
    activeContracts,
  });
}

{
  const record = failedRecord(1, engine, calldata("NARAEngine", "lock", [100n, 12n, 0n]));
  assert.equal(record.riskCategory, "lock_revert", "failed lock tx stored");
  assert.equal(record.amount, 100n, "failed lock amount is decoded");
}

{
  const record = failedRecord(2, engine, calldata("NARAEngine", "claimRewards", [7n, recipient]));
  assert.equal(record.riskCategory, "claim_revert", "failed claim tx stored");
  assert.equal(record.positionId, 7n, "failed claim positionId is decoded");
}

{
  const role = `0x${"11".repeat(32)}`;
  const record = failedRecord(3, engine, calldata("NARAEngine", "grantRole", [role, recipient]));
  assert.equal(record.riskCategory, "admin_revert", "failed admin tx stored");
  assert.equal(record.callPath, "direct_admin", "failed admin call path is direct admin");
}

{
  const record = failedRecord(4, engine, calldata("NARAEngine", "lock", [10n, 4n, 0n]));
  assert.equal(record.functionName, "lock", "function selector decoded");
  assert.notEqual(record.functionSelector, "0x00000000", "known selector is not unknown");
}

{
  const record = failedRecord(5, engine, "0x12345678");
  assert.equal(record.functionName, "unknown", "unknown selector stored as unknown");
  assert.equal(record.riskCategory, "unknown_revert", "unknown selector gets unknown risk category");
}

{
  const input = calldata("NARAEngine", "claimRewards", [1n, recipient]);
  const records = [failedRecord(6, engine, input), failedRecord(7, engine, input, wallet, 30), failedRecord(8, engine, input, wallet, 60)];
  const result = assembleFailedScanResult(records, {}, { repeatedFailureThreshold: 3, criticalFailureThreshold: 3 });
  assert.equal(result.failedTxGroups.length, 1, "same wallet repeated failure creates group");
  assert.equal(result.failedTxGroups[0].failureCount, 3, "group failure count is updated");
}

{
  const role = `0x${"22".repeat(32)}`;
  const input = calldata("NARAEngine", "grantRole", [role, recipient]);
  const records = [failedRecord(9, engine, input), failedRecord(10, engine, input, wallet, 20), failedRecord(11, engine, input, wallet, 40)];
  const result = assembleFailedScanResult(records, {}, { repeatedFailureThreshold: 3, criticalFailureThreshold: 3 });
  const alert = result.alerts.find((entry) => entry.ruleId === "failed_unknown_direct_admin_call_spike");
  assert.equal(Boolean(alert), true, "admin failure spike creates severity 5");
  assert.equal(severityByRule[alert.ruleId], 5, "admin failure spike severity is 5");
}

{
  const record = failedRecord(12, engine, calldata("NARAEngine", "withdrawTreasuryEthFees", [recipient]));
  const result = assembleFailedScanResult([record], {}, {});
  assert.equal(result.walletRiskDeltas[0].riskScoreDelta > 0n, true, "wallet risk score increases from failures");
  assert.equal(result.walletRiskDeltas[0].convictionScoreDelta, 0n, "failed tx does not increase conviction score");
}

{
  const record = failedRecord(13, router, calldata("NARAEngineOpsRouterV1", "withdrawTreasuryEthFees", [recipient]));
  const result = assembleFailedScanResult([record], {}, {});
  assert.equal(result.walletActivityEvents.length, 1, "wallet activity receives failed_tx row");
  assert.equal(result.walletActivityEvents[0].eventType, "failed_tx", "wallet activity event type is failed_tx");
}

{
  let receiptFetched = false;
  const client = {
    async getBlock() {
      return {
        ...block,
        transactions: [tx(14, other, "0x12345678")],
      };
    },
    async getTransactionReceipt() {
      receiptFetched = true;
      return failedReceipt;
    },
  };
  const result = await scanFailedTransactions({
    client,
    chainId,
    fromBlock: 100n,
    toBlock: 100n,
    activeContracts,
  });
  assert.equal(result.failedTransactions.length, 0, "non-NARA contract tx ignored");
  assert.equal(result.ignoredNonNaraTransactions, 1, "ignored counter increments");
  assert.equal(receiptFetched, false, "non-NARA tx does not fetch receipt");
}

console.log("failed transaction scanner tests passed");

