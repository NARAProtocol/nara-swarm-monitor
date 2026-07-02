import {
  decodeFunctionData,
  toFunctionSelector,
  type Abi,
  type AbiFunction,
  type Hex,
} from "viem";
import { NARATokenAbi } from "../../abis/NARATokenAbi";
import { NARAEngineAbi } from "../../abis/NARAEngineAbi";
import { NARAPositionNFTAbi } from "../../abis/NARAPositionNFTAbi";
import { NARABondVaultAbi } from "../../abis/NARABondVaultAbi";
import { NARABondDepositoryV4NFTAbi } from "../../abis/NARABondDepositoryV4NFTAbi";
import { NARAOpsVaultAbi } from "../../abis/NARAOpsVaultAbi";
import { NARAEngineOpsRouterV1Abi } from "../../abis/NARAEngineOpsRouterV1Abi";

export type FailedTxRiskCategory =
  | "user_revert"
  | "claim_revert"
  | "lock_revert"
  | "unlock_revert"
  | "bond_revert"
  | "admin_revert"
  | "treasury_revert"
  | "router_revert"
  | "unknown_revert";

export type FailedTxCallPath =
  | "user"
  | "claim"
  | "lock"
  | "unlock"
  | "bond"
  | "direct_admin"
  | "treasury"
  | "router_ops"
  | "unknown";

export type FunctionGroup =
  | "engine_lock"
  | "engine_unlock"
  | "claim"
  | "extend"
  | "nft_mint_or_wrap"
  | "nft_claim"
  | "bond_create"
  | "router_ops"
  | "admin_function"
  | "treasury_function"
  | "unknown";

export type ActiveContractConfig = {
  contractName: string;
  address: string;
};

export type FailedScannerOptions = {
  groupWindowSeconds?: number;
  repeatedFailureThreshold?: number;
  criticalFailureThreshold?: number;
  approvedOpsRouter?: string;
  approvedBreakGlassSafe?: string;
};

export type FailedTxDecodeResult = {
  selector: string;
  functionName: string;
  functionGroup: FunctionGroup;
  riskCategory: FailedTxRiskCategory;
  callPath: FailedTxCallPath;
  positionId: bigint | null;
  tokenId: string | null;
  amount: bigint | null;
  decodedArgs: unknown[];
};

export type FailedTransactionRecord = {
  id: string;
  chainId: number;
  txHash: string;
  blockNumber: bigint;
  blockHash: string;
  timestamp: number;
  from: string;
  to: string;
  contractName: string;
  functionSelector: string;
  functionName: string;
  status: number;
  value: bigint;
  gasUsed: bigint;
  effectiveGasPrice: bigint;
  revertReason: string | null;
  callPath: FailedTxCallPath;
  riskCategory: FailedTxRiskCategory;
  wallet: string;
  positionId: bigint | null;
  tokenId: string | null;
  amount: bigint | null;
  metadataJson: string;
};

export type FailedTxGroupRecord = {
  id: string;
  chainId: number;
  wallet: string;
  contractName: string;
  functionName: string;
  functionSelector: string;
  windowStart: number;
  windowEnd: number;
  failureCount: number;
  lastFailureTxHash: string;
  severity: number;
  updatedAt: number;
};

export type FailedWalletActivityRecord = {
  id: string;
  chainId: number;
  wallet: string;
  eventType: "failed_tx";
  source: "failed_transactions";
  amount: bigint | null;
  token: string | null;
  positionId: bigint | null;
  tokenId: string | null;
  counterparty: string;
  blockNumber: bigint;
  blockHash: string;
  txHash: string;
  logIndex: number;
  timestamp: number;
};

export type FailedWalletRiskDelta = {
  id: string;
  chainId: number;
  wallet: string;
  riskScoreDelta: bigint;
  convictionScoreDelta: bigint;
  sourceFailedTxId: string;
  timestamp: number;
};

export type FailedTxAlertInput = {
  ruleId:
    | "failed_unknown_direct_admin_call_spike"
    | "failed_treasury_call_spike"
    | "failed_router_ops_call_spike"
    | "same_wallet_same_function_repeated_failures"
    | "many_failed_claims"
    | "many_failed_locks"
    | "many_failed_unlocks"
    | "single_suspicious_failed_admin_attempt"
    | "single_suspicious_failed_treasury_attempt";
  fingerprintParts: Array<string | number | bigint | null | undefined>;
  txHash: string;
  blockNumber: bigint;
  wallet: string;
  observedValue: string;
  thresholdValue: string;
  sourceTable: "failed_transactions" | "failed_tx_groups";
  sourceRowId: string;
  timestamp: number;
};

export type FailedScanResult = {
  failedTransactions: FailedTransactionRecord[];
  failedTxGroups: FailedTxGroupRecord[];
  walletActivityEvents: FailedWalletActivityRecord[];
  walletRiskDeltas: FailedWalletRiskDelta[];
  alerts: FailedTxAlertInput[];
  scannedBlocks: number;
  inspectedTransactions: number;
  ignoredNonNaraTransactions: number;
};

export type FailedTxWriter = {
  insertFailedTransaction(record: FailedTransactionRecord): Promise<void>;
  upsertFailedTxGroup(record: FailedTxGroupRecord): Promise<void>;
  insertWalletActivity(record: FailedWalletActivityRecord): Promise<void>;
  increaseWalletRiskScore(delta: FailedWalletRiskDelta): Promise<void>;
  emitAlert(alert: FailedTxAlertInput): Promise<void>;
};

type AbiContract = {
  contractName: string;
  abi: Abi;
};

type SelectorEntry = {
  contractName: string;
  selector: string;
  functionName: string;
  abi: Abi;
};

type SelectorRegistry = {
  byContract: Map<string, Map<string, SelectorEntry>>;
  global: Map<string, SelectorEntry>;
};

type ScannerTx = {
  hash: Hex;
  from: string;
  to?: string | null;
  input?: Hex;
  value?: bigint;
  gasPrice?: bigint | null;
};

type ScannerReceipt = {
  status?: "success" | "reverted" | number | bigint | `0x${string}`;
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
  revertReason?: string | null;
};

type ScannerBlock = {
  number?: bigint | null;
  hash?: string | null;
  timestamp?: bigint | number;
  transactions?: ScannerTx[];
};

const DEFAULT_GROUP_WINDOW_SECONDS = 3_600;
const DEFAULT_REPEATED_FAILURE_THRESHOLD = 3;
const DEFAULT_CRITICAL_FAILURE_THRESHOLD = 3;
const UNKNOWN_SELECTOR = "0x00000000";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const ABI_CONTRACTS: AbiContract[] = [
  { contractName: "NARAToken", abi: NARATokenAbi as Abi },
  { contractName: "NARAEngine", abi: NARAEngineAbi as Abi },
  { contractName: "NARAPositionNFTV4", abi: NARAPositionNFTAbi as Abi },
  { contractName: "NARABondVaultV4", abi: NARABondVaultAbi as Abi },
  { contractName: "NARABondDepositoryV4NFT", abi: NARABondDepositoryV4NFTAbi as Abi },
  { contractName: "NARAOpsVaultV4", abi: NARAOpsVaultAbi as Abi },
  { contractName: "NARAEngineOpsRouterV1", abi: NARAEngineOpsRouterV1Abi as Abi },
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

function normalizeAddress(address?: string | null): string {
  return (address || ZERO_ADDRESS).toLowerCase();
}

function normalizeSelector(selector: string): string {
  return selector.toLowerCase();
}

function selectorFromInput(input?: string | null): string {
  if (!input || input === "0x" || input.length < 10) return UNKNOWN_SELECTOR;
  return normalizeSelector(input.slice(0, 10));
}

function stringifyMetadata(metadata: Record<string, unknown>): string {
  return JSON.stringify(metadata, (_, value) => (typeof value === "bigint" ? value.toString() : value));
}

function functionItems(abi: Abi): AbiFunction[] {
  return abi.filter((item): item is AbiFunction => item.type === "function");
}

export function buildSelectorRegistry(contracts: AbiContract[] = ABI_CONTRACTS): SelectorRegistry {
  const byContract = new Map<string, Map<string, SelectorEntry>>();
  const global = new Map<string, SelectorEntry>();

  for (const contract of contracts) {
    const contractKey = contract.contractName.toLowerCase();
    const contractMap = new Map<string, SelectorEntry>();
    for (const item of functionItems(contract.abi)) {
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
    byContract.set(contractKey, contractMap);
  }

  return { byContract, global };
}

const DEFAULT_SELECTOR_REGISTRY = buildSelectorRegistry();

function registryEntryFor(contractName: string, selector: string, registry: SelectorRegistry): SelectorEntry | undefined {
  return registry.byContract.get(contractName.toLowerCase())?.get(selector) ?? registry.global.get(selector);
}

function tryDecodeArgs(entry: SelectorEntry | undefined, input?: Hex): unknown[] {
  if (!entry || !input || input.length < 10) return [];
  try {
    const decoded = decodeFunctionData({ abi: entry.abi, data: input });
    return Array.isArray(decoded.args) ? [...decoded.args] : [];
  } catch {
    return [];
  }
}

function isNameMatch(functionName: string, fragments: string[]): boolean {
  const lowered = functionName.toLowerCase();
  return fragments.some((fragment) => lowered.includes(fragment));
}

export function classifyFailedFunction(contractName: string, functionName: string): {
  functionGroup: FunctionGroup;
  riskCategory: FailedTxRiskCategory;
  callPath: FailedTxCallPath;
} {
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
    const isNftClaim = contractName === "NARAPositionNFTV4";
    return { functionGroup: isNftClaim ? "nft_claim" : "claim", riskCategory: "claim_revert", callPath: "claim" };
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

function bigintArg(value: unknown): bigint | null {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return BigInt(value);
  return null;
}

function extractKnownArgs(functionName: string, functionGroup: FunctionGroup, args: unknown[]): {
  positionId: bigint | null;
  tokenId: string | null;
  amount: bigint | null;
} {
  let positionId: bigint | null = null;
  let tokenId: string | null = null;
  let amount: bigint | null = null;

  if (functionGroup === "engine_lock") {
    amount = bigintArg(args[0]);
  }

  if (functionGroup === "engine_unlock" || functionGroup === "claim" || functionGroup === "extend") {
    positionId = bigintArg(args[0]);
  }

  if (functionGroup === "nft_claim" || functionGroup === "nft_mint_or_wrap") {
    const maybeTokenId = bigintArg(args[0]);
    tokenId = maybeTokenId === null ? null : maybeTokenId.toString();
  }

  if (functionName === "claimTokenRewards") {
    positionId = bigintArg(args[0]);
  }

  if (functionGroup === "bond_create") {
    amount = bigintArg(args[0]) ?? bigintArg(args[1]);
  }

  return { positionId, tokenId, amount };
}

export function decodeFailedTxInput(
  contractName: string,
  input?: Hex,
  registry: SelectorRegistry = DEFAULT_SELECTOR_REGISTRY,
): FailedTxDecodeResult {
  const selector = selectorFromInput(input);
  const entry = registryEntryFor(contractName, selector, registry);
  const functionName = entry?.functionName ?? "unknown";
  const decodedArgs = tryDecodeArgs(entry, input);
  const classification = classifyFailedFunction(contractName, functionName);
  const knownArgs = extractKnownArgs(functionName, classification.functionGroup, decodedArgs);

  return {
    selector,
    functionName,
    ...classification,
    ...knownArgs,
    decodedArgs,
  };
}

function statusNumber(status: ScannerReceipt["status"]): number {
  if (status === "reverted" || status === 0 || status === 0n || status === "0x0") return 0;
  return 1;
}

function activeContractMap(activeContracts: ActiveContractConfig[]): Map<string, ActiveContractConfig> {
  return new Map(activeContracts.map((contract) => [normalizeAddress(contract.address), contract]));
}

export function failedTransactionFromReceipt(input: {
  chainId: number;
  tx: ScannerTx;
  receipt: ScannerReceipt;
  block: ScannerBlock;
  activeContracts: ActiveContractConfig[];
  registry?: SelectorRegistry;
}): FailedTransactionRecord | null {
  const contract = activeContractMap(input.activeContracts).get(normalizeAddress(input.tx.to));
  if (!contract) return null;

  const status = statusNumber(input.receipt.status);
  if (status !== 0) return null;

  const blockNumber = input.block.number ?? 0n;
  const blockHash = input.block.hash ?? "0x";
  const timestamp = Number(input.block.timestamp ?? 0);
  const decoded = decodeFailedTxInput(contract.contractName, input.tx.input, input.registry);
  const wallet = normalizeAddress(input.tx.from);
  const to = normalizeAddress(input.tx.to);
  const id = `${input.chainId}-${input.tx.hash.toLowerCase()}`;

  return {
    id,
    chainId: input.chainId,
    txHash: input.tx.hash.toLowerCase(),
    blockNumber,
    blockHash,
    timestamp,
    from: wallet,
    to,
    contractName: contract.contractName,
    functionSelector: decoded.selector,
    functionName: decoded.functionName,
    status,
    value: input.tx.value ?? 0n,
    gasUsed: input.receipt.gasUsed ?? 0n,
    effectiveGasPrice: input.receipt.effectiveGasPrice ?? input.tx.gasPrice ?? 0n,
    revertReason: input.receipt.revertReason ?? null,
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

export function walletActivityForFailedTransaction(record: FailedTransactionRecord): FailedWalletActivityRecord {
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

export function riskScoreDeltaForFailure(record: FailedTransactionRecord, groupFailureCount = 1): FailedWalletRiskDelta {
  const categoryScore: Record<FailedTxRiskCategory, bigint> = {
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
  const repeatedPenalty = groupFailureCount >= DEFAULT_REPEATED_FAILURE_THRESHOLD ? BigInt(groupFailureCount - 1) * 10n : 0n;

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

function groupWindow(timestamp: number, windowSeconds: number): { windowStart: number; windowEnd: number } {
  const windowStart = Math.floor(timestamp / windowSeconds) * windowSeconds;
  return { windowStart, windowEnd: windowStart + windowSeconds };
}

function groupSeverity(records: FailedTransactionRecord[], repeatedThreshold: number, criticalThreshold: number): number {
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

export function buildFailedTxGroups(
  records: FailedTransactionRecord[],
  options: FailedScannerOptions = {},
): FailedTxGroupRecord[] {
  const windowSeconds = options.groupWindowSeconds ?? DEFAULT_GROUP_WINDOW_SECONDS;
  const repeatedThreshold = options.repeatedFailureThreshold ?? DEFAULT_REPEATED_FAILURE_THRESHOLD;
  const criticalThreshold = options.criticalFailureThreshold ?? DEFAULT_CRITICAL_FAILURE_THRESHOLD;
  const grouped = new Map<string, FailedTransactionRecord[]>();

  for (const record of records) {
    const { windowStart } = groupWindow(record.timestamp, windowSeconds);
    const groupKey = [
      record.chainId,
      record.wallet,
      record.contractName,
      record.functionSelector,
      windowStart,
    ].join(":");
    const groupRecords = grouped.get(groupKey) ?? [];
    groupRecords.push(record);
    grouped.set(groupKey, groupRecords);
  }

  return [...grouped.values()].map((groupRecords) => {
    const latest = groupRecords.reduce((current, next) => (next.timestamp >= current.timestamp ? next : current), groupRecords[0]!);
    const { windowStart, windowEnd } = groupWindow(latest.timestamp, windowSeconds);
    return {
      id: [
        latest.chainId,
        latest.wallet,
        latest.contractName,
        latest.functionSelector,
        windowStart,
      ].join(":"),
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

function isApprovedDirectAdmin(record: FailedTransactionRecord, options: FailedScannerOptions): boolean {
  const wallet = normalizeAddress(record.wallet);
  return wallet === normalizeAddress(options.approvedOpsRouter) || wallet === normalizeAddress(options.approvedBreakGlassSafe);
}

function latestRecordForGroup(group: FailedTxGroupRecord, records: FailedTransactionRecord[]): FailedTransactionRecord {
  return records
    .filter((record) =>
      record.chainId === group.chainId &&
      record.wallet === group.wallet &&
      record.contractName === group.contractName &&
      record.functionSelector === group.functionSelector &&
      record.timestamp >= group.windowStart &&
      record.timestamp < group.windowEnd,
    )
    .reduce((current, next) => (next.timestamp >= current.timestamp ? next : current), records[0]!);
}

export function alertsForFailedTransactions(
  records: FailedTransactionRecord[],
  groups: FailedTxGroupRecord[],
  options: FailedScannerOptions = {},
): FailedTxAlertInput[] {
  const alerts: FailedTxAlertInput[] = [];
  const repeatedThreshold = options.repeatedFailureThreshold ?? DEFAULT_REPEATED_FAILURE_THRESHOLD;
  const criticalThreshold = options.criticalFailureThreshold ?? DEFAULT_CRITICAL_FAILURE_THRESHOLD;

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

    if (group.failureCount >= criticalThreshold && latest.riskCategory === "admin_revert" && !isApprovedDirectAdmin(latest, options)) {
      alerts.push({
        ruleId: "failed_unknown_direct_admin_call_spike",
        fingerprintParts: [group.wallet, group.functionSelector, group.windowStart],
        txHash: group.lastFailureTxHash,
        blockNumber: latest.blockNumber,
        wallet: group.wallet,
        observedValue: String(group.failureCount),
        thresholdValue: String(criticalThreshold),
        sourceTable: "failed_tx_groups",
        sourceRowId: group.id,
        timestamp: group.updatedAt,
      });
    }

    if (group.failureCount >= criticalThreshold && latest.riskCategory === "treasury_revert" && !isApprovedDirectAdmin(latest, options)) {
      alerts.push({
        ruleId: "failed_treasury_call_spike",
        fingerprintParts: [group.wallet, group.functionSelector, group.windowStart],
        txHash: group.lastFailureTxHash,
        blockNumber: latest.blockNumber,
        wallet: group.wallet,
        observedValue: String(group.failureCount),
        thresholdValue: String(criticalThreshold),
        sourceTable: "failed_tx_groups",
        sourceRowId: group.id,
        timestamp: group.updatedAt,
      });
    }

    if (group.failureCount >= criticalThreshold && latest.riskCategory === "router_revert") {
      alerts.push({
        ruleId: "failed_router_ops_call_spike",
        fingerprintParts: [group.wallet, group.functionSelector, group.windowStart],
        txHash: group.lastFailureTxHash,
        blockNumber: latest.blockNumber,
        wallet: group.wallet,
        observedValue: String(group.failureCount),
        thresholdValue: String(criticalThreshold),
        sourceTable: "failed_tx_groups",
        sourceRowId: group.id,
        timestamp: group.updatedAt,
      });
    }

    if (group.failureCount >= repeatedThreshold && latest.riskCategory === "claim_revert") {
      alerts.push({
        ruleId: "many_failed_claims",
        fingerprintParts: [group.wallet, group.windowStart],
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

    if (group.failureCount >= repeatedThreshold && latest.riskCategory === "lock_revert") {
      alerts.push({
        ruleId: "many_failed_locks",
        fingerprintParts: [group.wallet, group.windowStart],
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

    if (group.failureCount >= repeatedThreshold && latest.riskCategory === "unlock_revert") {
      alerts.push({
        ruleId: "many_failed_unlocks",
        fingerprintParts: [group.wallet, group.windowStart],
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
  }

  return alerts;
}

export function assembleFailedScanResult(
  records: FailedTransactionRecord[],
  scannedBlocks: number,
  inspectedTransactions: number,
  ignoredNonNaraTransactions: number,
  options: FailedScannerOptions = {},
): FailedScanResult {
  const groups = buildFailedTxGroups(records, options);
  const groupCountByRecord = new Map<string, number>();
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
    scannedBlocks,
    inspectedTransactions,
    ignoredNonNaraTransactions,
  };
}

export async function scanFailedTransactions(input: {
  client: {
    getBlock(args: { blockNumber: bigint; includeTransactions: true }): Promise<ScannerBlock>;
    getTransactionReceipt(args: { hash: Hex }): Promise<ScannerReceipt>;
  };
  chainId: number;
  fromBlock: bigint;
  toBlock: bigint;
  activeContracts: ActiveContractConfig[];
  options?: FailedScannerOptions;
  writer?: FailedTxWriter;
}): Promise<FailedScanResult> {
  const contractsByAddress = activeContractMap(input.activeContracts);
  const records: FailedTransactionRecord[] = [];
  let inspectedTransactions = 0;
  let ignoredNonNaraTransactions = 0;
  let scannedBlocks = 0;

  for (let blockNumber = input.fromBlock; blockNumber <= input.toBlock; blockNumber += 1n) {
    const block = await input.client.getBlock({ blockNumber, includeTransactions: true });
    scannedBlocks += 1;

    for (const tx of block.transactions ?? []) {
      const to = normalizeAddress(tx.to);
      if (!contractsByAddress.has(to)) {
        ignoredNonNaraTransactions += 1;
        continue;
      }

      inspectedTransactions += 1;
      const receipt = await input.client.getTransactionReceipt({ hash: tx.hash });
      const record = failedTransactionFromReceipt({
        chainId: input.chainId,
        tx,
        receipt,
        block,
        activeContracts: input.activeContracts,
      });
      if (record) records.push(record);
    }
  }

  const result = assembleFailedScanResult(
    records,
    scannedBlocks,
    inspectedTransactions,
    ignoredNonNaraTransactions,
    input.options,
  );

  if (input.writer) {
    await persistFailedScanResult(input.writer, result);
  }

  return result;
}

export async function persistFailedScanResult(writer: FailedTxWriter, result: FailedScanResult): Promise<void> {
  for (const record of result.failedTransactions) {
    await writer.insertFailedTransaction(record);
  }
  for (const group of result.failedTxGroups) {
    await writer.upsertFailedTxGroup(group);
  }
  for (const activity of result.walletActivityEvents) {
    await writer.insertWalletActivity(activity);
  }
  for (const delta of result.walletRiskDeltas) {
    await writer.increaseWalletRiskScore(delta);
  }
  for (const alert of result.alerts) {
    await writer.emitAlert(alert);
  }
}
