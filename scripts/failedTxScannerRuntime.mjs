import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, decodeFunctionData, http, toFunctionSelector } from "viem";

const __dirname = dirname(fileURLToPath(import.meta.url));
const monitorRoot = resolve(__dirname, "..");
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const UNKNOWN_SELECTOR = "0x00000000";

export const ABI_TARGETS = [
  { contractName: "NARAToken", exportName: "NARATokenAbi", path: "abis/NARATokenAbi.ts" },
  { contractName: "NARAEngine", exportName: "NARAEngineAbi", path: "abis/NARAEngineAbi.ts" },
  { contractName: "NARAPositionNFTV4", exportName: "NARAPositionNFTAbi", path: "abis/NARAPositionNFTAbi.ts" },
  { contractName: "NARABondVaultV4", exportName: "NARABondVaultAbi", path: "abis/NARABondVaultAbi.ts" },
  { contractName: "NARABondDepositoryV4NFT", exportName: "NARABondDepositoryV4NFTAbi", path: "abis/NARABondDepositoryV4NFTAbi.ts" },
  { contractName: "NARAOpsVaultV4", exportName: "NARAOpsVaultAbi", path: "abis/NARAOpsVaultAbi.ts" },
  { contractName: "NARAEngineOpsRouterV1", exportName: "NARAEngineOpsRouterV1Abi", path: "abis/NARAEngineOpsRouterV1Abi.ts" },
];

const ENGINE_ADMIN_FUNCTIONS = new Set([
  "proposeConfig",
  "executeConfig",
  "cancelConfig",
  "depositRewards",
  "syncEmissionReserve",
  "setBondVault",
  "grantRole",
  "revokeRole",
  "renounceRole",
]);

const TREASURY_FUNCTIONS = new Set([
  "withdrawTreasuryEthFees",
  "withdraw",
  "withdrawToken",
  "rescueEth",
  "rescueToken",
  "sweep",
  "emergencyWithdraw",
]);

const ACCESS_CONTROL_ADMIN_FUNCTIONS = new Set([
  "grantRole",
  "revokeRole",
  "renounceRole",
  "transferOwnership",
  "acceptOwnership",
  "pause",
  "unpause",
]);

function normalizeAddress(address) {
  return (address || ZERO_ADDRESS).toLowerCase();
}

function normalizeSelector(selector) {
  return selector.toLowerCase();
}

function selectorFromInput(input) {
  if (!input || input === "0x" || input.length < 10) return UNKNOWN_SELECTOR;
  return normalizeSelector(input.slice(0, 10));
}

function stringifyMetadata(metadata) {
  return JSON.stringify(metadata, (_, value) => (typeof value === "bigint" ? value.toString() : value));
}

function loadGeneratedAbi(target) {
  const source = readFileSync(resolve(monitorRoot, target.path), "utf8");
  const match = source.match(new RegExp(`export const ${target.exportName} = ([\\s\\S]*) as const;`));
  if (!match?.[1]) throw new Error(`Unable to parse generated ABI ${target.path}`);
  return JSON.parse(match[1]);
}

export function loadDefaultAbiContracts() {
  return ABI_TARGETS.map((target) => ({
    contractName: target.contractName,
    abi: loadGeneratedAbi(target),
  }));
}

export function buildSelectorRegistry(contracts = loadDefaultAbiContracts()) {
  const byContract = new Map();
  const global = new Map();

  for (const contract of contracts) {
    const contractMap = new Map();
    for (const item of contract.abi.filter((abiItem) => abiItem.type === "function")) {
      const selector = normalizeSelector(toFunctionSelector(item));
      const entry = {
        contractName: contract.contractName,
        selector,
        functionName: item.name,
        abi: contract.abi,
      };
      contractMap.set(selector, entry);
      if (!global.has(selector)) global.set(selector, entry);
    }
    byContract.set(contract.contractName.toLowerCase(), contractMap);
  }

  return { byContract, global };
}

function isNameMatch(functionName, fragments) {
  const lowered = functionName.toLowerCase();
  return fragments.some((fragment) => lowered.includes(fragment));
}

export function classifyFailedFunction(contractName, functionName) {
  if (contractName === "NARAEngineOpsRouterV1") {
    return { functionGroup: "router_ops", riskCategory: "router_revert", callPath: "router_ops" };
  }

  if (contractName === "NARAEngine" && TREASURY_FUNCTIONS.has(functionName)) {
    return { functionGroup: "treasury_function", riskCategory: "treasury_revert", callPath: "treasury" };
  }

  if (contractName === "NARAEngine" && ENGINE_ADMIN_FUNCTIONS.has(functionName)) {
    return { functionGroup: "admin_function", riskCategory: "admin_revert", callPath: "direct_admin" };
  }

  if (TREASURY_FUNCTIONS.has(functionName)) {
    return { functionGroup: "treasury_function", riskCategory: "treasury_revert", callPath: "treasury" };
  }

  if (ACCESS_CONTROL_ADMIN_FUNCTIONS.has(functionName) || isNameMatch(functionName, ["set", "configure", "propose", "execute", "cancel"])) {
    return { functionGroup: "admin_function", riskCategory: "admin_revert", callPath: "direct_admin" };
  }

  if (functionName === "lock" || functionName === "lockWithPermit" || functionName === "onTransferReceived") {
    return { functionGroup: "engine_lock", riskCategory: "lock_revert", callPath: "lock" };
  }

  if (functionName === "unlock" || isNameMatch(functionName, ["unlock", "burneternalgenesis"])) {
    return { functionGroup: "engine_unlock", riskCategory: "unlock_revert", callPath: "unlock" };
  }

  if (isNameMatch(functionName, ["claim"])) {
    return {
      functionGroup: contractName === "NARAPositionNFTV4" ? "nft_claim" : "claim",
      riskCategory: "claim_revert",
      callPath: "claim",
    };
  }

  if (isNameMatch(functionName, ["extend"])) {
    return { functionGroup: "extend", riskCategory: "user_revert", callPath: "user" };
  }

  if (contractName === "NARAPositionNFTV4" && isNameMatch(functionName, ["mint", "wrap"])) {
    return { functionGroup: "nft_mint_or_wrap", riskCategory: "lock_revert", callPath: "lock" };
  }

  if (contractName === "NARABondDepositoryV4NFT" && isNameMatch(functionName, ["bond", "deposit", "purchase", "buy"])) {
    return { functionGroup: "bond_create", riskCategory: "bond_revert", callPath: "bond" };
  }

  if (functionName === "unknown") {
    return { functionGroup: "unknown", riskCategory: "unknown_revert", callPath: "unknown" };
  }

  return { functionGroup: "unknown", riskCategory: "user_revert", callPath: "user" };
}

function bigintArg(value) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  return null;
}

function extractKnownArgs(functionName, functionGroup, args) {
  let positionId = null;
  let tokenId = null;
  let amount = null;

  if (functionGroup === "engine_lock") amount = bigintArg(args[0]);
  if (["engine_unlock", "claim", "extend"].includes(functionGroup)) positionId = bigintArg(args[0]);
  if (["nft_claim", "nft_mint_or_wrap"].includes(functionGroup)) {
    const maybeTokenId = bigintArg(args[0]);
    tokenId = maybeTokenId === null ? null : maybeTokenId.toString();
  }
  if (functionName === "claimTokenRewards") positionId = bigintArg(args[0]);
  if (functionGroup === "bond_create") amount = bigintArg(args[0]) ?? bigintArg(args[1]);

  return { positionId, tokenId, amount };
}

export function decodeFailedTxInput(contractName, input, registry = buildSelectorRegistry()) {
  const selector = selectorFromInput(input);
  const entry = registry.byContract.get(contractName.toLowerCase())?.get(selector) ?? registry.global.get(selector);
  const functionName = entry?.functionName ?? "unknown";
  let decodedArgs = [];

  if (entry && input && input.length >= 10) {
    try {
      const decoded = decodeFunctionData({ abi: entry.abi, data: input });
      decodedArgs = Array.isArray(decoded.args) ? [...decoded.args] : [];
    } catch {
      decodedArgs = [];
    }
  }

  const classification = classifyFailedFunction(contractName, functionName);
  return {
    selector,
    functionName,
    ...classification,
    ...extractKnownArgs(functionName, classification.functionGroup, decodedArgs),
    decodedArgs,
  };
}

function statusNumber(status) {
  if (status === "reverted" || status === 0 || status === 0n || status === "0x0") return 0;
  return 1;
}

function activeContractMap(activeContracts) {
  return new Map(activeContracts.map((contract) => [normalizeAddress(contract.address), contract]));
}

export function failedTransactionFromReceipt({ chainId, tx, receipt, block, activeContracts, registry }) {
  const contract = activeContractMap(activeContracts).get(normalizeAddress(tx.to));
  if (!contract) return null;

  const status = statusNumber(receipt.status);
  if (status !== 0) return null;

  const decoded = decodeFailedTxInput(contract.contractName, tx.input, registry);
  const wallet = normalizeAddress(tx.from);
  const id = `${chainId}-${tx.hash.toLowerCase()}`;

  return {
    id,
    chainId,
    txHash: tx.hash.toLowerCase(),
    blockNumber: block.number ?? 0n,
    blockHash: block.hash ?? "0x",
    timestamp: Number(block.timestamp ?? 0),
    from: wallet,
    to: normalizeAddress(tx.to),
    contractName: contract.contractName,
    functionSelector: decoded.selector,
    functionName: decoded.functionName,
    status,
    value: tx.value ?? 0n,
    gasUsed: receipt.gasUsed ?? 0n,
    effectiveGasPrice: receipt.effectiveGasPrice ?? tx.gasPrice ?? 0n,
    revertReason: receipt.revertReason ?? null,
    callPath: decoded.callPath,
    riskCategory: decoded.riskCategory,
    wallet,
    positionId: decoded.positionId,
    tokenId: decoded.tokenId,
    amount: decoded.amount,
    metadataJson: stringifyMetadata({
      functionGroup: decoded.functionGroup,
      decodedArgs: decoded.decodedArgs,
      source: "failedTxScanner",
    }),
  };
}

export function walletActivityForFailedTransaction(record) {
  return {
    id: `${record.id}-failed-tx-activity`,
    chainId: record.chainId,
    wallet: record.wallet,
    eventType: "failed_tx",
    source: "failed_transactions",
    amount: record.amount,
    token: null,
    positionId: record.positionId,
    tokenId: record.tokenId,
    counterparty: record.to,
    blockNumber: record.blockNumber,
    blockHash: record.blockHash,
    txHash: record.txHash,
    logIndex: -1,
    timestamp: record.timestamp,
  };
}

export function riskScoreDeltaForFailure(record, groupFailureCount = 1) {
  const categoryScore = {
    user_revert: 5n,
    claim_revert: 10n,
    lock_revert: 15n,
    unlock_revert: 15n,
    bond_revert: 15n,
    admin_revert: 50n,
    treasury_revert: 75n,
    router_revert: 75n,
    unknown_revert: 10n,
  };
  const repeatedPenalty = groupFailureCount >= 3 ? BigInt(groupFailureCount - 1) * 10n : 0n;
  return {
    id: `${record.id}-risk-delta`,
    chainId: record.chainId,
    wallet: record.wallet,
    riskScoreDelta: categoryScore[record.riskCategory] + repeatedPenalty,
    convictionScoreDelta: 0n,
    sourceFailedTxId: record.id,
    timestamp: record.timestamp,
  };
}

function groupWindow(timestamp, windowSeconds) {
  const windowStart = Math.floor(timestamp / windowSeconds) * windowSeconds;
  return { windowStart, windowEnd: windowStart + windowSeconds };
}

function groupSeverity(records, repeatedThreshold, criticalThreshold) {
  const riskCategories = new Set(records.map((record) => record.riskCategory));
  if (
    records.length >= criticalThreshold &&
    (riskCategories.has("admin_revert") || riskCategories.has("treasury_revert") || riskCategories.has("router_revert"))
  ) {
    return 5;
  }
  if (records.length >= repeatedThreshold) return 4;
  if (riskCategories.has("admin_revert") || riskCategories.has("treasury_revert")) return 3;
  return 1;
}

export function buildFailedTxGroups(records, options = {}) {
  const windowSeconds = options.groupWindowSeconds ?? 3600;
  const repeatedThreshold = options.repeatedFailureThreshold ?? 3;
  const criticalThreshold = options.criticalFailureThreshold ?? 3;
  const grouped = new Map();

  for (const record of records) {
    const { windowStart } = groupWindow(record.timestamp, windowSeconds);
    const groupKey = [record.chainId, record.wallet, record.contractName, record.functionSelector, windowStart].join(":");
    grouped.set(groupKey, [...(grouped.get(groupKey) ?? []), record]);
  }

  return [...grouped.values()].map((groupRecords) => {
    const latest = groupRecords.reduce((current, next) => (next.timestamp >= current.timestamp ? next : current), groupRecords[0]);
    const { windowStart, windowEnd } = groupWindow(latest.timestamp, windowSeconds);
    return {
      id: [latest.chainId, latest.wallet, latest.contractName, latest.functionSelector, windowStart].join(":"),
      chainId: latest.chainId,
      wallet: latest.wallet,
      contractName: latest.contractName,
      functionName: latest.functionName,
      functionSelector: latest.functionSelector,
      windowStart,
      windowEnd,
      failureCount: groupRecords.length,
      lastFailureTxHash: latest.txHash,
      severity: groupSeverity(groupRecords, repeatedThreshold, criticalThreshold),
      updatedAt: latest.timestamp,
    };
  });
}

function isApprovedDirectAdmin(record, options = {}) {
  const wallet = normalizeAddress(record.wallet);
  return wallet === normalizeAddress(options.approvedOpsRouter) || wallet === normalizeAddress(options.approvedBreakGlassSafe);
}

function latestRecordForGroup(group, records) {
  return records
    .filter((record) =>
      record.chainId === group.chainId &&
      record.wallet === group.wallet &&
      record.contractName === group.contractName &&
      record.functionSelector === group.functionSelector &&
      record.timestamp >= group.windowStart &&
      record.timestamp < group.windowEnd)
    .reduce((current, next) => (next.timestamp >= current.timestamp ? next : current), records[0]);
}

export function alertsForFailedTransactions(records, groups, options = {}) {
  const alerts = [];
  const repeatedThreshold = options.repeatedFailureThreshold ?? 3;
  const criticalThreshold = options.criticalFailureThreshold ?? 3;

  for (const record of records) {
    if (record.riskCategory === "admin_revert" && !isApprovedDirectAdmin(record, options)) {
      alerts.push({
        ruleId: "single_suspicious_failed_admin_attempt",
        fingerprintParts: [record.wallet, record.contractName, record.functionSelector, record.txHash],
        txHash: record.txHash,
        blockNumber: record.blockNumber,
        wallet: record.wallet,
        observedValue: record.functionName,
        thresholdValue: "approved admin path",
        sourceTable: "failed_transactions",
        sourceRowId: record.id,
        timestamp: record.timestamp,
      });
    }

    if (record.riskCategory === "treasury_revert" && !isApprovedDirectAdmin(record, options)) {
      alerts.push({
        ruleId: "single_suspicious_failed_treasury_attempt",
        fingerprintParts: [record.wallet, record.contractName, record.functionSelector, record.txHash],
        txHash: record.txHash,
        blockNumber: record.blockNumber,
        wallet: record.wallet,
        observedValue: record.functionName,
        thresholdValue: "approved treasury path",
        sourceTable: "failed_transactions",
        sourceRowId: record.id,
        timestamp: record.timestamp,
      });
    }
  }

  for (const group of groups) {
    const latest = latestRecordForGroup(group, records);
    if (group.failureCount >= repeatedThreshold) {
      alerts.push({
        ruleId: "same_wallet_same_function_repeated_failures",
        fingerprintParts: [group.wallet, group.contractName, group.functionSelector, group.windowStart],
        txHash: group.lastFailureTxHash,
        blockNumber: latest.blockNumber,
        wallet: group.wallet,
        observedValue: String(group.failureCount),
        thresholdValue: String(repeatedThreshold),
        sourceTable: "failed_tx_groups",
        sourceRowId: group.id,
        timestamp: group.updatedAt,
      });
    }

    const spikeBase = {
      txHash: group.lastFailureTxHash,
      blockNumber: latest.blockNumber,
      wallet: group.wallet,
      observedValue: String(group.failureCount),
      thresholdValue: String(criticalThreshold),
      sourceTable: "failed_tx_groups",
      sourceRowId: group.id,
      timestamp: group.updatedAt,
    };

    if (group.failureCount >= criticalThreshold && latest.riskCategory === "admin_revert" && !isApprovedDirectAdmin(latest, options)) {
      alerts.push({ ...spikeBase, ruleId: "failed_unknown_direct_admin_call_spike", fingerprintParts: [group.wallet, group.functionSelector, group.windowStart] });
    }

    if (group.failureCount >= criticalThreshold && latest.riskCategory === "treasury_revert" && !isApprovedDirectAdmin(latest, options)) {
      alerts.push({ ...spikeBase, ruleId: "failed_treasury_call_spike", fingerprintParts: [group.wallet, group.functionSelector, group.windowStart] });
    }

    if (group.failureCount >= criticalThreshold && latest.riskCategory === "router_revert") {
      alerts.push({ ...spikeBase, ruleId: "failed_router_ops_call_spike", fingerprintParts: [group.wallet, group.functionSelector, group.windowStart] });
    }

    if (group.failureCount >= repeatedThreshold && latest.riskCategory === "claim_revert") {
      alerts.push({ ...spikeBase, ruleId: "many_failed_claims", thresholdValue: String(repeatedThreshold), fingerprintParts: [group.wallet, group.windowStart] });
    }

    if (group.failureCount >= repeatedThreshold && latest.riskCategory === "lock_revert") {
      alerts.push({ ...spikeBase, ruleId: "many_failed_locks", thresholdValue: String(repeatedThreshold), fingerprintParts: [group.wallet, group.windowStart] });
    }

    if (group.failureCount >= repeatedThreshold && latest.riskCategory === "unlock_revert") {
      alerts.push({ ...spikeBase, ruleId: "many_failed_unlocks", thresholdValue: String(repeatedThreshold), fingerprintParts: [group.wallet, group.windowStart] });
    }
  }

  return alerts;
}

export function assembleFailedScanResult(records, counters = {}, options = {}) {
  const groups = buildFailedTxGroups(records, options);
  const groupCountByRecord = new Map();
  for (const group of groups) {
    for (const record of records) {
      if (
        record.chainId === group.chainId &&
        record.wallet === group.wallet &&
        record.contractName === group.contractName &&
        record.functionSelector === group.functionSelector &&
        record.timestamp >= group.windowStart &&
        record.timestamp < group.windowEnd
      ) {
        groupCountByRecord.set(record.id, group.failureCount);
      }
    }
  }

  return {
    failedTransactions: records,
    failedTxGroups: groups,
    walletActivityEvents: records.map(walletActivityForFailedTransaction),
    walletRiskDeltas: records.map((record) => riskScoreDeltaForFailure(record, groupCountByRecord.get(record.id) ?? 1)),
    alerts: alertsForFailedTransactions(records, groups, options),
    scannedBlocks: counters.scannedBlocks ?? 0,
    inspectedTransactions: counters.inspectedTransactions ?? 0,
    ignoredNonNaraTransactions: counters.ignoredNonNaraTransactions ?? 0,
  };
}

export async function scanFailedTransactions({ client, chainId, fromBlock, toBlock, activeContracts, options = {} }) {
  const contractsByAddress = activeContractMap(activeContracts);
  const registry = buildSelectorRegistry();
  const records = [];
  let inspectedTransactions = 0;
  let ignoredNonNaraTransactions = 0;
  let scannedBlocks = 0;

  for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber += 1n) {
    const block = await client.getBlock({ blockNumber, includeTransactions: true });
    scannedBlocks += 1;

    for (const tx of block.transactions ?? []) {
      if (!contractsByAddress.has(normalizeAddress(tx.to))) {
        ignoredNonNaraTransactions += 1;
        continue;
      }

      inspectedTransactions += 1;
      const receipt = await client.getTransactionReceipt({ hash: tx.hash });
      const record = failedTransactionFromReceipt({ chainId, tx, receipt, block, activeContracts, registry });
      if (record) records.push(record);
    }
  }

  return assembleFailedScanResult(records, { scannedBlocks, inspectedTransactions, ignoredNonNaraTransactions }, options);
}

export function activeContractsFromEnv(env = process.env) {
  const envTargets = [
    ["V4_NARA_TOKEN", "NARAToken"],
    ["V4_ENGINE", "NARAEngine"],
    ["V4_POSITION_NFT", "NARAPositionNFTV4"],
    ["V4_BOND_VAULT", "NARABondVaultV4"],
    ["V4_BOND_DEPOSITORY_NFT", "NARABondDepositoryV4NFT"],
    ["V4_OPS_VAULT", "NARAOpsVaultV4"],
    ["V4_ENGINE_OPS_ROUTER", "NARAEngineOpsRouterV1"],
  ];
  const missing = envTargets
    .filter(([envName]) => !env[envName] || normalizeAddress(env[envName]) === ZERO_ADDRESS)
    .map(([envName]) => envName);

  if (missing.length > 0) {
    throw new Error(`Missing active v4 contract address env vars: ${missing.join(", ")}`);
  }

  return envTargets.map(([envName, contractName]) => ({
    contractName,
    address: env[envName],
  }));
}

export function createBaseClient(rpcUrl) {
  return createPublicClient({ transport: http(rpcUrl) });
}

export function serializeForJson(value) {
  return JSON.stringify(value, (_, entry) => (typeof entry === "bigint" ? entry.toString() : entry), 2);
}
