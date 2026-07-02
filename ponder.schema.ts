import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  ne,
  onchainTable,
  onchainView,
  primaryKey,
  sql,
} from "ponder";

// Unique IDs for events: chainId + transaction_hash + log_index
// Unique IDs for transactions: chainId + transaction_hash

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const configuredTreasuryAddress = (process.env.V4_TREASURY_ADDRESS || ZERO_ADDRESS).toLowerCase();
const configuredOpsVaultAddress = (process.env.V4_OPS_VAULT || ZERO_ADDRESS).toLowerCase();
const configuredFinalAdminAddress = (process.env.V4_FINAL_ADMIN || ZERO_ADDRESS).toLowerCase();
const configuredBreakGlassAddress = (process.env.V4_BREAK_GLASS_SAFE || ZERO_ADDRESS).toLowerCase();
const configuredRouterAddress = (process.env.V4_ENGINE_OPS_ROUTER || ZERO_ADDRESS).toLowerCase();
const configuredTokenAddress = (process.env.V4_NARA_TOKEN || ZERO_ADDRESS).toLowerCase();
const configuredEngineAddress = (process.env.V4_ENGINE || ZERO_ADDRESS).toLowerCase();
const configuredPositionNftAddress = (process.env.V4_POSITION_NFT || ZERO_ADDRESS).toLowerCase();
const configuredBondDepositoryNftAddress = (process.env.V4_BOND_DEPOSITORY_NFT || ZERO_ADDRESS).toLowerCase();
const configuredBondVaultAddress = (process.env.V4_BOND_VAULT || ZERO_ADDRESS).toLowerCase();
const epochLengthSeconds = Number(process.env.V4_EPOCH_LENGTH_SECONDS || "900");
const whaleLockedAmountWei = process.env.WALLET_WHALE_LOCKED_AMOUNT_WEI || "100000000000000000000000";
const largeOutgoingTransferWei = process.env.WALLET_LARGE_OUTGOING_TRANSFER_WEI || "100000000000000000000000";
const epochLengthSecondsSql = sql.raw(String(epochLengthSeconds));
const whaleLockedAmountSql = sql.raw(whaleLockedAmountWei);
const largeOutgoingTransferSql = sql.raw(largeOutgoingTransferWei);
const nowEpochSecondsSql = sql<number>`extract(epoch from now())::integer`;

export const wallets = onchainTable("wallets", (t) => ({
  address: t.text().primaryKey(),
  firstSeenBlock: t.bigint().notNull(),
  convictionScore: t.bigint().default(0n),
  riskLevel: t.text().default("low"),
  lastUpdatedAt: t.integer().notNull(),
}));

export const transactions = onchainTable("transactions", (t) => ({
  id: t.text().primaryKey(), // chainId + txHash
  chainId: t.integer().notNull(),
  txHash: t.text().notNull(),
  blockNumber: t.bigint().notNull(),
  blockHash: t.text().notNull(),
  from: t.text().notNull(),
  to: t.text(),
  status: t.integer().notNull(), // 0 = failed, 1 = success
  functionName: t.text(),
  calldata: t.text(),
  value: t.bigint().notNull(),
  gasUsed: t.bigint().notNull(),
  gasPrice: t.bigint().notNull(),
  timestamp: t.integer().notNull(),
}));

export const erc20_transfers = onchainTable("erc20_transfers", (t) => ({
  id: t.text().primaryKey(),
  chainId: t.integer().notNull(),
  from: t.text().notNull(),
  to: t.text().notNull(),
  amount: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  blockHash: t.text().notNull(),
  txHash: t.text().notNull(),
  logIndex: t.integer().notNull(),
  timestamp: t.integer().notNull(),
}));

export const locks = onchainTable("locks", (t) => ({
  id: t.text().primaryKey(), // chainId + lockId
  chainId: t.integer().notNull(),
  lockId: t.bigint().notNull(),
  user: t.text().notNull(),
  amount: t.bigint().notNull(),
  activationEpoch: t.bigint().notNull(),
  unlockEpoch: t.bigint().notNull(),
  weight: t.bigint().notNull(),
  status: t.text().notNull(), // "locked" | "unlocked" | "fractionalized"
  blockNumber: t.bigint().notNull(),
  txHash: t.text().notNull(),
  logIndex: t.integer().notNull(),
  timestamp: t.integer().notNull(),
  unlockedAtBlock: t.bigint(),
  unlockedAtTimestamp: t.integer(),
  unlockTxHash: t.text(),
  unlockTo: t.text(),
}));

export const claims = onchainTable("claims", (t) => ({
  id: t.text().primaryKey(),
  chainId: t.integer().notNull(),
  user: t.text().notNull(),
  rewardToken: t.text().notNull(),
  amount: t.bigint().notNull(),
  naraFeeAmount: t.bigint().default(0n),
  tokenFeeAmount: t.bigint().default(0n),
  blockNumber: t.bigint().notNull(),
  txHash: t.text().notNull(),
  logIndex: t.integer().notNull(),
  timestamp: t.integer().notNull(),
}));

export const nfts = onchainTable("nfts", (t) => ({
  tokenId: t.text().primaryKey(), // chainId + tokenId
  chainId: t.integer().notNull(),
  tokenIdRaw: t.bigint().notNull(),
  positionId: t.bigint(),
  minter: t.text(),
  owner: t.text().notNull(),
  positionAccount: t.text(),
  principalAmount: t.bigint(),
  durationEpochs: t.bigint(),
  tier: t.integer().notNull(),
  isGenesis: t.integer().notNull(), // 0 = regular, 1 = genesis
  isEternal: t.integer().notNull(), // 0 = regular, 1 = eternal
  genesisRoundId: t.integer(),
  genesisTierId: t.integer(),
  genesisRewardMultiplierBps: t.integer(),
  genesisRewardWeight: t.bigint(),
  mintedAtBlock: t.bigint().notNull(),
  mintedAtTimestamp: t.integer().notNull(),
  lastOwnerUpdateBlock: t.bigint(),
  lastOwnerUpdateTimestamp: t.integer(),
}));

export const nft_transfers = onchainTable("nft_transfers", (t) => ({
  id: t.text().primaryKey(),
  chainId: t.integer().notNull(),
  tokenId: t.text().notNull(),
  from: t.text().notNull(),
  to: t.text().notNull(),
  blockNumber: t.bigint().notNull(),
  txHash: t.text().notNull(),
  logIndex: t.integer().notNull(),
  timestamp: t.integer().notNull(),
}));

export const liquidity_events = onchainTable("liquidity_events", (t) => ({
  id: t.text().primaryKey(),
  chainId: t.integer().notNull(),
  eventType: t.text().notNull(), // "add" | "remove" | "swap" | "sync"
  provider: t.text().notNull(),
  amount0: t.bigint().notNull(),
  amount1: t.bigint().notNull(),
  sqrtPrice: t.bigint(),
  blockNumber: t.bigint().notNull(),
  txHash: t.text().notNull(),
  logIndex: t.integer().notNull(),
  timestamp: t.integer().notNull(),
}));

export const admin_events = onchainTable("admin_events", (t) => ({
  id: t.text().primaryKey(),
  chainId: t.integer().notNull(),
  eventType: t.text().notNull(), // "role_grant" | "role_revoke" | "ownership_transfer" | "pause" | "unpause" | "upgrade" | "param_change"
  contractAddress: t.text().notNull(),
  actor: t.text().notNull(),
  target: t.text(), // beneficiary address or role hash or parameter bytes32
  valueOld: t.text(),
  valueNew: t.text(),
  blockNumber: t.bigint().notNull(),
  txHash: t.text().notNull(),
  logIndex: t.integer().notNull(),
  timestamp: t.integer().notNull(),
}));

export const ops_router_events = onchainTable("ops_router_events", (t) => ({
  id: t.text().primaryKey(),
  chainId: t.integer().notNull(),
  eventType: t.text().notNull(),
  routerAddress: t.text().notNull(),
  caller: t.text().notNull(),
  target: t.text(),
  amount: t.bigint(),
  configHash: t.text(),
  executableAt: t.bigint(),
  stagedEpoch: t.bigint(),
  trackedEmissionReserveAfter: t.bigint(),
  blockNumber: t.bigint().notNull(),
  blockHash: t.text().notNull(),
  txHash: t.text().notNull(),
  logIndex: t.integer().notNull(),
  timestamp: t.integer().notNull(),
}));

export const position_claim_events = onchainTable("position_claim_events", (t) => ({
  id: t.text().primaryKey(),
  chainId: t.integer().notNull(),
  source: t.text().notNull(),
  tokenId: t.text(),
  positionId: t.bigint(),
  user: t.text(),
  to: t.text().notNull(),
  rewardToken: t.text().notNull(),
  naraAmount: t.bigint().default(0n),
  ethAmount: t.bigint().default(0n),
  tokenAmount: t.bigint().default(0n),
  blockNumber: t.bigint().notNull(),
  blockHash: t.text().notNull(),
  txHash: t.text().notNull(),
  logIndex: t.integer().notNull(),
  timestamp: t.integer().notNull(),
}));

export const position_events = onchainTable("position_events", (t) => ({
  id: t.text().primaryKey(),
  chainId: t.integer().notNull(),
  eventType: t.text().notNull(),
  tokenId: t.text(),
  positionId: t.bigint(),
  owner: t.text(),
  to: t.text(),
  amount: t.bigint(),
  metadataJson: t.text(),
  blockNumber: t.bigint().notNull(),
  blockHash: t.text().notNull(),
  txHash: t.text().notNull(),
  logIndex: t.integer().notNull(),
  timestamp: t.integer().notNull(),
}));

export const wallet_labels = onchainTable("wallet_labels", (t) => ({
  id: t.text().primaryKey(),
  chainId: t.integer().notNull(),
  wallet: t.text().notNull(),
  label: t.text().notNull(),
  source: t.text().notNull(),
  confidence: t.integer().notNull(),
  reason: t.text().notNull(),
  blockNumber: t.bigint().notNull(),
  timestamp: t.integer().notNull(),
}));

export const wallet_position_scores = onchainTable("wallet_position_scores", (t) => ({
  wallet: t.text().notNull(),
  chainId: t.integer().notNull(),
  rawPositionCount: t.integer().notNull(),
  wrappedPositionCount: t.integer().notNull(),
  genesisPositionCount: t.integer().notNull(),
  lockedAmount: t.bigint().notNull(),
  activeLockedAmount: t.bigint().notNull(),
  unlockedAmount: t.bigint().notNull(),
  unlocking24hAmount: t.bigint().notNull(),
  unlocking7dAmount: t.bigint().notNull(),
  claimCount: t.integer().notNull(),
  claimNaraAmount: t.bigint().notNull(),
  claimEthAmount: t.bigint().notNull(),
  claimTokenAmount: t.bigint().notNull(),
  transferInAmount: t.bigint().notNull(),
  transferOutAmount: t.bigint().notNull(),
  netTransferAmount: t.bigint().notNull(),
  genesisRewardWeight: t.bigint().notNull(),
  avgLockDurationEpochs: t.bigint().notNull(),
  lastActivityTimestamp: t.integer().notNull(),
  riskScore: t.bigint().notNull(),
  convictionScore: t.bigint().notNull(),
  updatedAt: t.integer().notNull(),
}), (table) => ({
  pk: primaryKey({ columns: [table.wallet, table.chainId] }),
}));

export const wallet_activity_events = onchainTable("wallet_activity_events", (t) => ({
  id: t.text().primaryKey(),
  chainId: t.integer().notNull(),
  wallet: t.text().notNull(),
  eventType: t.text().notNull(),
  source: t.text().notNull(),
  amount: t.bigint(),
  token: t.text(),
  positionId: t.bigint(),
  tokenId: t.text(),
  counterparty: t.text(),
  blockNumber: t.bigint().notNull(),
  blockHash: t.text().notNull(),
  txHash: t.text().notNull(),
  logIndex: t.integer().notNull(),
  timestamp: t.integer().notNull(),
}));

export const failed_transactions = onchainTable("failed_transactions", (t) => ({
  id: t.text().primaryKey(),
  chainId: t.integer().notNull(),
  txHash: t.text().notNull(),
  blockNumber: t.bigint().notNull(),
  blockHash: t.text().notNull(),
  timestamp: t.integer().notNull(),
  from: t.text().notNull(),
  to: t.text().notNull(),
  contractName: t.text().notNull(),
  functionSelector: t.text().notNull(),
  functionName: t.text().notNull(),
  status: t.integer().notNull(),
  value: t.bigint().notNull(),
  gasUsed: t.bigint().notNull(),
  effectiveGasPrice: t.bigint().notNull(),
  revertReason: t.text(),
  callPath: t.text().notNull(),
  riskCategory: t.text().notNull(),
  wallet: t.text().notNull(),
  positionId: t.bigint(),
  tokenId: t.text(),
  amount: t.bigint(),
  metadataJson: t.text(),
}));

export const failed_tx_groups = onchainTable("failed_tx_groups", (t) => ({
  id: t.text().primaryKey(),
  chainId: t.integer().notNull(),
  wallet: t.text().notNull(),
  contractName: t.text().notNull(),
  functionName: t.text().notNull(),
  functionSelector: t.text().notNull(),
  windowStart: t.integer().notNull(),
  windowEnd: t.integer().notNull(),
  failureCount: t.integer().notNull(),
  lastFailureTxHash: t.text().notNull(),
  severity: t.integer().notNull(),
  updatedAt: t.integer().notNull(),
}));

export const direct_engine_admin_call_events = onchainTable("direct_engine_admin_call_events", (t) => ({
  id: t.text().primaryKey(),
  chainId: t.integer().notNull(),
  engineAddress: t.text().notNull(),
  caller: t.text().notNull(),
  txFrom: t.text().notNull(),
  functionName: t.text().notNull(),
  selector: t.text().notNull(),
  role: t.text().notNull(),
  callPath: t.text().notNull(),
  allowedCaller: t.integer().notNull(),
  severity: t.integer().notNull(),
  blockNumber: t.bigint().notNull(),
  blockHash: t.text().notNull(),
  txHash: t.text().notNull(),
  traceIndex: t.integer().notNull(),
  timestamp: t.integer().notNull(),
}));

export const admin_config_events = onchainTable("admin_config_events", (t) => ({
  id: t.text().primaryKey(),
  chainId: t.integer().notNull(),
  source: t.text().notNull(),
  eventType: t.text().notNull(),
  functionName: t.text(),
  contractAddress: t.text().notNull(),
  actor: t.text().notNull(),
  caller: t.text().notNull(),
  role: t.text(),
  configHash: t.text(),
  executableAt: t.bigint(),
  stagedEpoch: t.bigint(),
  allowedCaller: t.integer(),
  severity: t.integer(),
  blockNumber: t.bigint().notNull(),
  blockHash: t.text().notNull(),
  txHash: t.text().notNull(),
  eventIndex: t.integer().notNull(),
  timestamp: t.integer().notNull(),
}));

export const alerts = onchainTable("alerts", (t) => ({
  id: t.text().primaryKey(), // chainId + alertFingerprint + status
  fingerprint: t.text().notNull(),
  severity: t.integer().notNull(), // 1 - 5
  ruleId: t.text().notNull(),
  title: t.text().notNull(),
  description: t.text().notNull(),
  status: t.text().notNull(), // "open" | "resolved"
  txHash: t.text(),
  blockNumber: t.bigint(),
  wallet: t.text(),
  positionId: t.bigint(),
  tokenId: t.text(),
  amount: t.bigint(),
  viewName: t.text(),
  sourceTable: t.text(),
  sourceRowId: t.text(),
  observedValue: t.text(),
  thresholdValue: t.text(),
  firstSeenAt: t.integer().notNull(),
  lastSeenAt: t.integer().notNull(),
  occurrenceCount: t.integer().default(1),
  resolvedAt: t.integer(),
  resolutionNote: t.text(),
}));

export const wallet_scores = onchainTable("wallet_scores", (t) => ({
  address: t.text().primaryKey(),
  lockedAmount: t.bigint().notNull(),
  nftWeight: t.bigint().notNull(),
  lockConsistencyCount: t.integer().notNull(),
  claimConsistencyCount: t.integer().notNull(),
  holdingTimeSeconds: t.integer().notNull(),
  fastSellingCount: t.integer().notNull(),
  failedTxCount: t.integer().notNull(),
  sybilScore: t.integer().notNull(),
  convictionScore: t.bigint().notNull(),
  lastUpdatedAt: t.integer().notNull(),
}));

export const agent_reports = onchainTable("agent_reports", (t) => ({
  id: t.text().primaryKey(),
  timestamp: t.integer().notNull(),
  reportType: t.text().notNull(), // "daily" | "hourly" | "emergency"
  inputQuery: t.text().notNull(),
  sourceViews: t.text().notNull(), // JSON list of views queried
  sourceAlertIds: t.text().notNull(), // JSON list of alerts
  sourceTxHashes: t.text().notNull(), // JSON list of transaction hashes
  modelUsed: t.text().notNull(),
  confidence: t.text().notNull(),
  requiresHumanApproval: t.integer().notNull(), // 0 = no, 1 = yes
  content: t.text().notNull(),
}));

export const commander_reports = onchainTable("commander_reports", (t) => ({
  id: t.text().primaryKey(),
  chainId: t.integer().notNull(),
  status: t.text().notNull(),
  severity: t.integer().notNull(),
  title: t.text().notNull(),
  summary: t.text().notNull(),
  mainEvent: t.text().notNull(),
  protocolActivityJson: t.text().notNull(),
  walletActivityJson: t.text().notNull(),
  positionActivityJson: t.text().notNull(),
  adminActivityJson: t.text().notNull(),
  treasuryActivityJson: t.text().notNull(),
  routerActivityJson: t.text().notNull(),
  failedTxActivityJson: t.text().notNull(),
  riskSummaryJson: t.text().notNull(),
  recommendedActionsJson: t.text().notNull(),
  evidenceJson: t.text().notNull(),
  requiresHumanDecision: t.integer().notNull(),
  createdAt: t.integer().notNull(),
}));

export const ai_summaries = onchainTable("ai_summaries", (t) => ({
  id: t.text().primaryKey(),
  chainId: t.integer().notNull(),
  commanderReportId: t.text().notNull(),
  modelProvider: t.text().notNull(),
  modelName: t.text().notNull(),
  status: t.text().notNull(),
  severity: t.integer().notNull(),
  summaryText: t.text().notNull(),
  operatorSummary: t.text().notNull(),
  riskSummary: t.text().notNull(),
  recommendedActionsText: t.text().notNull(),
  evidenceJson: t.text().notNull(),
  inputHash: t.text().notNull(),
  outputHash: t.text().notNull(),
  createdAt: t.integer().notNull(),
}));

export const decisions = onchainTable("decisions", (t) => ({
  id: t.text().primaryKey(),
  reportId: t.text().notNull(),
  timestamp: t.integer().notNull(),
  proposal: t.text().notNull(),
  status: t.text().notNull(), // "proposed" | "approved" | "rejected"
  actor: t.text().notNull(),
  executedAt: t.integer(),
}));

export const ops_router_timeline = onchainView("ops_router_timeline").as((qb) =>
  qb.select({
    id: ops_router_events.id,
    chainId: ops_router_events.chainId,
    eventType: ops_router_events.eventType,
    routerAddress: ops_router_events.routerAddress,
    caller: ops_router_events.caller,
    target: ops_router_events.target,
    amount: ops_router_events.amount,
    configHash: ops_router_events.configHash,
    executableAt: ops_router_events.executableAt,
    stagedEpoch: ops_router_events.stagedEpoch,
    trackedEmissionReserveAfter: ops_router_events.trackedEmissionReserveAfter,
    blockNumber: ops_router_events.blockNumber,
    blockHash: ops_router_events.blockHash,
    txHash: ops_router_events.txHash,
    logIndex: ops_router_events.logIndex,
    timestamp: ops_router_events.timestamp,
  }).from(ops_router_events),
);

export const direct_engine_admin_calls = onchainView("direct_engine_admin_calls").as((qb) =>
  qb.select({
    id: direct_engine_admin_call_events.id,
    chainId: direct_engine_admin_call_events.chainId,
    engineAddress: direct_engine_admin_call_events.engineAddress,
    caller: direct_engine_admin_call_events.caller,
    txFrom: direct_engine_admin_call_events.txFrom,
    functionName: direct_engine_admin_call_events.functionName,
    selector: direct_engine_admin_call_events.selector,
    role: direct_engine_admin_call_events.role,
    callPath: direct_engine_admin_call_events.callPath,
    allowedCaller: direct_engine_admin_call_events.allowedCaller,
    severity: direct_engine_admin_call_events.severity,
    blockNumber: direct_engine_admin_call_events.blockNumber,
    blockHash: direct_engine_admin_call_events.blockHash,
    txHash: direct_engine_admin_call_events.txHash,
    traceIndex: direct_engine_admin_call_events.traceIndex,
    timestamp: direct_engine_admin_call_events.timestamp,
  }).from(direct_engine_admin_call_events),
);

export const admin_config_timeline = onchainView("admin_config_timeline").as((qb) =>
  qb.select({
    id: admin_config_events.id,
    chainId: admin_config_events.chainId,
    source: admin_config_events.source,
    eventType: admin_config_events.eventType,
    functionName: admin_config_events.functionName,
    contractAddress: admin_config_events.contractAddress,
    actor: admin_config_events.actor,
    caller: admin_config_events.caller,
    role: admin_config_events.role,
    configHash: admin_config_events.configHash,
    executableAt: admin_config_events.executableAt,
    stagedEpoch: admin_config_events.stagedEpoch,
    allowedCaller: admin_config_events.allowedCaller,
    severity: admin_config_events.severity,
    blockNumber: admin_config_events.blockNumber,
    blockHash: admin_config_events.blockHash,
    txHash: admin_config_events.txHash,
    eventIndex: admin_config_events.eventIndex,
    timestamp: admin_config_events.timestamp,
  }).from(admin_config_events),
);

export const treasury_movements = onchainView("treasury_movements").as((qb) =>
  qb.select({
    id: ops_router_events.id,
    chainId: ops_router_events.chainId,
    movementType: ops_router_events.eventType,
    routerAddress: ops_router_events.routerAddress,
    caller: ops_router_events.caller,
    to: ops_router_events.target,
    amount: ops_router_events.amount,
    blockNumber: ops_router_events.blockNumber,
    blockHash: ops_router_events.blockHash,
    txHash: ops_router_events.txHash,
    logIndex: ops_router_events.logIndex,
    timestamp: ops_router_events.timestamp,
  }).from(ops_router_events).where(eq(ops_router_events.eventType, "treasury_eth_fees_withdrawn")),
);

export const reward_reserve_accounting = onchainView("reward_reserve_accounting").as((qb) =>
  qb.select({
    id: ops_router_events.id,
    chainId: ops_router_events.chainId,
    accountingType: ops_router_events.eventType,
    routerAddress: ops_router_events.routerAddress,
    caller: ops_router_events.caller,
    amount: ops_router_events.amount,
    trackedEmissionReserveAfter: ops_router_events.trackedEmissionReserveAfter,
    blockNumber: ops_router_events.blockNumber,
    blockHash: ops_router_events.blockHash,
    txHash: ops_router_events.txHash,
    logIndex: ops_router_events.logIndex,
    timestamp: ops_router_events.timestamp,
  }).from(ops_router_events).where(inArray(ops_router_events.eventType, [
    "emission_reserve_deposited",
    "emission_reserve_synced",
  ])),
);

export const position_current_state = onchainView("position_current_state").as((qb) =>
  qb.select({
    id: locks.id,
    chainId: locks.chainId,
    positionId: locks.lockId,
    tokenId: nfts.tokenId,
    tokenIdRaw: nfts.tokenIdRaw,
    positionAccount: nfts.positionAccount,
    owner: sql<string>`case
      when ${nfts.tokenId} is not null and ${nfts.owner} <> ${ZERO_ADDRESS} then ${nfts.owner}
      when ${nfts.tokenId} is not null and ${nfts.owner} = ${ZERO_ADDRESS} then ${ZERO_ADDRESS}
      when ${locks.user} <> ${ZERO_ADDRESS} then ${locks.user}
      else ${ZERO_ADDRESS}
    end`,
    ownerSource: sql<string>`case
      when ${nfts.tokenId} is not null and ${nfts.owner} <> ${ZERO_ADDRESS} then 'nft_owner'
      when ${nfts.tokenId} is not null and ${nfts.owner} = ${ZERO_ADDRESS} then 'nft_owner_unknown'
      when ${locks.user} <> ${ZERO_ADDRESS} then 'engine_lock_owner'
      else 'unknown'
    end`,
    ownerStatus: sql<string>`case
      when ${nfts.tokenId} is not null and ${nfts.owner} = ${ZERO_ADDRESS} then 'unknown_until_transfer'
      when ${nfts.tokenId} is null and ${locks.user} = ${ZERO_ADDRESS} then 'unknown_until_transfer'
      else 'known'
    end`,
    engineLockOwner: locks.user,
    status: locks.status,
    isWrapped: sql<number>`case when ${nfts.tokenId} is null then 0 else 1 end`,
    amount: locks.amount,
    principalAmount: sql<bigint>`coalesce(${nfts.principalAmount}, ${locks.amount})`,
    activationEpoch: locks.activationEpoch,
    unlockEpoch: locks.unlockEpoch,
    estimatedUnlockTimestamp: sql<number>`(${locks.timestamp} + (((${locks.unlockEpoch} - ${locks.activationEpoch})::numeric * ${epochLengthSecondsSql})::integer))`,
    weight: locks.weight,
    durationEpochs: sql<bigint>`coalesce(${nfts.durationEpochs}, (${locks.unlockEpoch} - ${locks.activationEpoch}))`,
    isGenesis: sql<number>`coalesce(${nfts.isGenesis}, 0)`,
    isEternal: sql<number>`coalesce(${nfts.isEternal}, 0)`,
    genesisRoundId: nfts.genesisRoundId,
    genesisTierId: nfts.genesisTierId,
    genesisRewardMultiplierBps: nfts.genesisRewardMultiplierBps,
    genesisRewardWeight: sql<bigint>`coalesce(${nfts.genesisRewardWeight}, 0)`,
    lastOwnerUpdateBlock: nfts.lastOwnerUpdateBlock,
    lastOwnerUpdateTimestamp: nfts.lastOwnerUpdateTimestamp,
    blockNumber: locks.blockNumber,
    txHash: locks.txHash,
    timestamp: locks.timestamp,
  })
    .from(locks)
    .leftJoin(nfts, and(eq(locks.chainId, nfts.chainId), eq(locks.lockId, nfts.positionId))),
);

export const wallet_position_summary = onchainView("wallet_position_summary").as((qb) =>
  qb.select({
    wallet: position_current_state.owner,
    ownerStatus: position_current_state.ownerStatus,
    walletType: sql<string>`case
      when ${position_current_state.ownerStatus} = 'unknown_until_transfer' then 'unknown'
      when lower(${position_current_state.owner}) = ${configuredTreasuryAddress} then 'treasury'
      when coalesce(sum(${position_current_state.amount}) filter (where ${position_current_state.status} = 'locked'), 0) >= ${whaleLockedAmountSql} then 'whale'
      else 'user'
    end`,
    rawPositionCount: sql<number>`count(*) filter (where ${position_current_state.isWrapped} = 0)`,
    nftPositionCount: sql<number>`count(*) filter (where ${position_current_state.isWrapped} = 1)`,
    lockedNara: sql<bigint>`coalesce(sum(${position_current_state.amount}) filter (where ${position_current_state.status} = 'locked'), 0)`,
    rawLockedNara: sql<bigint>`coalesce(sum(${position_current_state.amount}) filter (where ${position_current_state.status} = 'locked' and ${position_current_state.isWrapped} = 0), 0)`,
    nftLockedNara: sql<bigint>`coalesce(sum(${position_current_state.amount}) filter (where ${position_current_state.status} = 'locked' and ${position_current_state.isWrapped} = 1), 0)`,
    activeWeight: sql<bigint>`coalesce(sum(${position_current_state.weight}) filter (where ${position_current_state.status} = 'locked'), 0)`,
    genesisRewardWeight: sql<bigint>`coalesce(sum(${position_current_state.genesisRewardWeight}) filter (where ${position_current_state.status} = 'locked'), 0)`,
    unlockingSoon24hNara: sql<bigint>`coalesce(sum(${position_current_state.amount}) filter (where ${position_current_state.status} = 'locked' and ${position_current_state.estimatedUnlockTimestamp} between ${nowEpochSecondsSql} and (${nowEpochSecondsSql} + 86400)), 0)`,
    unlockingSoon7dNara: sql<bigint>`coalesce(sum(${position_current_state.amount}) filter (where ${position_current_state.status} = 'locked' and ${position_current_state.estimatedUnlockTimestamp} between ${nowEpochSecondsSql} and (${nowEpochSecondsSql} + 604800)), 0)`,
    positionCount: sql<number>`count(*)`,
  })
    .from(position_current_state)
    .groupBy(position_current_state.owner, position_current_state.ownerStatus),
);

export const wallet_locked_exposure = onchainView("wallet_locked_exposure").as((qb) =>
  qb.select({
    wallet: position_current_state.owner,
    ownerStatus: position_current_state.ownerStatus,
    walletType: sql<string>`case
      when ${position_current_state.ownerStatus} = 'unknown_until_transfer' then 'unknown'
      when lower(${position_current_state.owner}) = ${configuredTreasuryAddress} then 'treasury'
      when coalesce(sum(${position_current_state.amount}), 0) >= ${whaleLockedAmountSql} then 'whale'
      else 'user'
    end`,
    lockedNara: sql<bigint>`coalesce(sum(${position_current_state.amount}), 0)`,
    activeWeight: sql<bigint>`coalesce(sum(${position_current_state.weight}), 0)`,
    rawLockedNara: sql<bigint>`coalesce(sum(${position_current_state.amount}) filter (where ${position_current_state.isWrapped} = 0), 0)`,
    nftLockedNara: sql<bigint>`coalesce(sum(${position_current_state.amount}) filter (where ${position_current_state.isWrapped} = 1), 0)`,
    genesisRewardWeight: sql<bigint>`coalesce(sum(${position_current_state.genesisRewardWeight}), 0)`,
    lockedPositionCount: sql<number>`count(*)`,
  })
    .from(position_current_state)
    .where(eq(position_current_state.status, "locked"))
    .groupBy(position_current_state.owner, position_current_state.ownerStatus),
);

export const owner_locked_positions = onchainView("owner_locked_positions").as((qb) =>
  qb.select({
    id: position_current_state.id,
    chainId: position_current_state.chainId,
    owner: position_current_state.owner,
    ownerSource: position_current_state.ownerSource,
    ownerStatus: position_current_state.ownerStatus,
    tokenId: position_current_state.tokenId,
    positionId: position_current_state.positionId,
    amount: position_current_state.amount,
    weight: position_current_state.weight,
    unlockEpoch: position_current_state.unlockEpoch,
    estimatedUnlockTimestamp: position_current_state.estimatedUnlockTimestamp,
    isWrapped: position_current_state.isWrapped,
    isGenesis: position_current_state.isGenesis,
    isEternal: position_current_state.isEternal,
  })
    .from(position_current_state)
    .where(eq(position_current_state.status, "locked")),
);

export const treasury_locked_positions = onchainView("treasury_locked_positions").as((qb) =>
  qb.select({
    id: position_current_state.id,
    chainId: position_current_state.chainId,
    owner: position_current_state.owner,
    ownerSource: position_current_state.ownerSource,
    tokenId: position_current_state.tokenId,
    positionId: position_current_state.positionId,
    amount: position_current_state.amount,
    weight: position_current_state.weight,
    unlockEpoch: position_current_state.unlockEpoch,
    estimatedUnlockTimestamp: position_current_state.estimatedUnlockTimestamp,
    isWrapped: position_current_state.isWrapped,
    isGenesis: position_current_state.isGenesis,
  })
    .from(position_current_state)
    .where(and(
      eq(position_current_state.status, "locked"),
      eq(position_current_state.owner, configuredTreasuryAddress),
      ne(position_current_state.ownerStatus, "unknown_until_transfer"),
    )),
);

export const genesis_position_summary = onchainView("genesis_position_summary").as((qb) =>
  qb.select({
    owner: position_current_state.owner,
    ownerStatus: position_current_state.ownerStatus,
    genesisRoundId: position_current_state.genesisRoundId,
    genesisTierId: position_current_state.genesisTierId,
    positionCount: sql<number>`count(*)`,
    eternalCount: sql<number>`count(*) filter (where ${position_current_state.isEternal} = 1)`,
    lockedNara: sql<bigint>`coalesce(sum(${position_current_state.amount}) filter (where ${position_current_state.status} = 'locked'), 0)`,
    genesisRewardWeight: sql<bigint>`coalesce(sum(${position_current_state.genesisRewardWeight}) filter (where ${position_current_state.status} = 'locked'), 0)`,
  })
    .from(position_current_state)
    .where(eq(position_current_state.isGenesis, 1))
    .groupBy(
      position_current_state.owner,
      position_current_state.ownerStatus,
      position_current_state.genesisRoundId,
      position_current_state.genesisTierId,
    ),
);

export const unlock_cliffs_24h = onchainView("unlock_cliffs_24h").as((qb) =>
  qb.select({
    id: position_current_state.id,
    chainId: position_current_state.chainId,
    owner: position_current_state.owner,
    ownerSource: position_current_state.ownerSource,
    ownerStatus: position_current_state.ownerStatus,
    tokenId: position_current_state.tokenId,
    positionId: position_current_state.positionId,
    amount: position_current_state.amount,
    weight: position_current_state.weight,
    estimatedUnlockTimestamp: position_current_state.estimatedUnlockTimestamp,
    isWrapped: position_current_state.isWrapped,
    isGenesis: position_current_state.isGenesis,
  })
    .from(position_current_state)
    .where(and(
      eq(position_current_state.status, "locked"),
      gte(position_current_state.estimatedUnlockTimestamp, nowEpochSecondsSql),
      lte(position_current_state.estimatedUnlockTimestamp, sql<number>`(${nowEpochSecondsSql} + 86400)`),
    )),
);

export const unlock_cliffs_7d = onchainView("unlock_cliffs_7d").as((qb) =>
  qb.select({
    id: position_current_state.id,
    chainId: position_current_state.chainId,
    owner: position_current_state.owner,
    ownerSource: position_current_state.ownerSource,
    ownerStatus: position_current_state.ownerStatus,
    tokenId: position_current_state.tokenId,
    positionId: position_current_state.positionId,
    amount: position_current_state.amount,
    weight: position_current_state.weight,
    estimatedUnlockTimestamp: position_current_state.estimatedUnlockTimestamp,
    isWrapped: position_current_state.isWrapped,
    isGenesis: position_current_state.isGenesis,
  })
    .from(position_current_state)
    .where(and(
      eq(position_current_state.status, "locked"),
      gte(position_current_state.estimatedUnlockTimestamp, nowEpochSecondsSql),
      lte(position_current_state.estimatedUnlockTimestamp, sql<number>`(${nowEpochSecondsSql} + 604800)`),
    )),
);

export const nft_without_position_metadata = onchainView("nft_without_position_metadata").as((qb) =>
  qb.select({
    tokenId: nfts.tokenId,
    chainId: nfts.chainId,
    tokenIdRaw: nfts.tokenIdRaw,
    owner: nfts.owner,
    ownerStatus: sql<string>`case when ${nfts.owner} = ${ZERO_ADDRESS} then 'unknown_until_transfer' else 'known' end`,
    lastOwnerUpdateBlock: nfts.lastOwnerUpdateBlock,
    lastOwnerUpdateTimestamp: nfts.lastOwnerUpdateTimestamp,
    mintedAtBlock: nfts.mintedAtBlock,
    mintedAtTimestamp: nfts.mintedAtTimestamp,
  })
    .from(nfts)
    .where(isNull(nfts.positionId)),
);

export const position_without_nft = onchainView("position_without_nft").as((qb) =>
  qb.select({
    id: locks.id,
    chainId: locks.chainId,
    positionId: locks.lockId,
    owner: locks.user,
    amount: locks.amount,
    weight: locks.weight,
    status: locks.status,
    activationEpoch: locks.activationEpoch,
    unlockEpoch: locks.unlockEpoch,
    estimatedUnlockTimestamp: sql<number>`(${locks.timestamp} + (((${locks.unlockEpoch} - ${locks.activationEpoch})::numeric * ${epochLengthSecondsSql})::integer))`,
    blockNumber: locks.blockNumber,
    txHash: locks.txHash,
    timestamp: locks.timestamp,
  })
    .from(locks)
    .leftJoin(nfts, and(eq(locks.chainId, nfts.chainId), eq(locks.lockId, nfts.positionId)))
    .where(isNull(nfts.tokenId)),
);

export const position_claim_history = onchainView("position_claim_history").as((qb) =>
  qb.select({
    id: position_claim_events.id,
    chainId: position_claim_events.chainId,
    source: position_claim_events.source,
    tokenId: position_claim_events.tokenId,
    positionId: position_claim_events.positionId,
    user: position_claim_events.user,
    to: position_claim_events.to,
    rewardToken: position_claim_events.rewardToken,
    naraAmount: position_claim_events.naraAmount,
    ethAmount: position_claim_events.ethAmount,
    tokenAmount: position_claim_events.tokenAmount,
    blockNumber: position_claim_events.blockNumber,
    blockHash: position_claim_events.blockHash,
    txHash: position_claim_events.txHash,
    logIndex: position_claim_events.logIndex,
    timestamp: position_claim_events.timestamp,
  }).from(position_claim_events),
);

export const position_owner_history = onchainView("position_owner_history").as((qb) =>
  qb.select({
    id: nft_transfers.id,
    chainId: nft_transfers.chainId,
    tokenId: nft_transfers.tokenId,
    positionId: nfts.positionId,
    from: nft_transfers.from,
    to: nft_transfers.to,
    ownerStatus: sql<string>`case when ${nft_transfers.to} = ${ZERO_ADDRESS} then 'unknown_until_transfer' else 'known' end`,
    blockNumber: nft_transfers.blockNumber,
    txHash: nft_transfers.txHash,
    logIndex: nft_transfers.logIndex,
    timestamp: nft_transfers.timestamp,
  })
    .from(nft_transfers)
    .leftJoin(nfts, eq(nft_transfers.tokenId, nfts.tokenId)),
);

export const wallet_exposure_summary = onchainView("wallet_exposure_summary").as((qb) =>
  qb.select({
    wallet: position_current_state.owner,
    chainId: position_current_state.chainId,
    ownerStatus: position_current_state.ownerStatus,
    walletType: sql<string>`case
      when ${position_current_state.ownerStatus} = 'unknown_until_transfer' then 'unknown'
      when lower(${position_current_state.owner}) = ${configuredTreasuryAddress} then 'treasury'
      when coalesce(sum(${position_current_state.amount}) filter (where ${position_current_state.status} = 'locked'), 0) >= ${whaleLockedAmountSql} then 'whale'
      else 'user'
    end`,
    rawPositionCount: sql<number>`count(*) filter (where ${position_current_state.isWrapped} = 0)`,
    wrappedPositionCount: sql<number>`count(*) filter (where ${position_current_state.isWrapped} = 1)`,
    genesisPositionCount: sql<number>`count(*) filter (where ${position_current_state.isGenesis} = 1)`,
    lockedAmount: sql<bigint>`coalesce(sum(${position_current_state.amount}), 0)`,
    activeLockedAmount: sql<bigint>`coalesce(sum(${position_current_state.amount}) filter (where ${position_current_state.status} = 'locked'), 0)`,
    unlockedAmount: sql<bigint>`coalesce(sum(${position_current_state.amount}) filter (where ${position_current_state.status} = 'unlocked'), 0)`,
    unlocking24hAmount: sql<bigint>`coalesce(sum(${position_current_state.amount}) filter (where ${position_current_state.status} = 'locked' and ${position_current_state.estimatedUnlockTimestamp} between ${nowEpochSecondsSql} and (${nowEpochSecondsSql} + 86400)), 0)`,
    unlocking7dAmount: sql<bigint>`coalesce(sum(${position_current_state.amount}) filter (where ${position_current_state.status} = 'locked' and ${position_current_state.estimatedUnlockTimestamp} between ${nowEpochSecondsSql} and (${nowEpochSecondsSql} + 604800)), 0)`,
    genesisRewardWeight: sql<bigint>`coalesce(sum(${position_current_state.genesisRewardWeight}), 0)`,
    avgLockDurationEpochs: sql<bigint>`coalesce(avg(${position_current_state.durationEpochs})::bigint, 0)`,
    activeWeight: sql<bigint>`coalesce(sum(${position_current_state.weight}) filter (where ${position_current_state.status} = 'locked'), 0)`,
    lastActivityTimestamp: sql<number>`max(${position_current_state.timestamp})`,
  })
    .from(position_current_state)
    .groupBy(position_current_state.owner, position_current_state.chainId, position_current_state.ownerStatus),
);

export const wallet_claim_summary = onchainView("wallet_claim_summary").as((qb) =>
  qb.select({
    wallet: position_claim_events.to,
    chainId: position_claim_events.chainId,
    claimCount: sql<number>`count(*)`,
    claimNaraAmount: sql<bigint>`coalesce(sum(${position_claim_events.naraAmount}), 0)`,
    claimEthAmount: sql<bigint>`coalesce(sum(${position_claim_events.ethAmount}), 0)`,
    claimTokenAmount: sql<bigint>`coalesce(sum(${position_claim_events.tokenAmount}), 0)`,
    firstClaimTimestamp: sql<number>`min(${position_claim_events.timestamp})`,
    lastClaimTimestamp: sql<number>`max(${position_claim_events.timestamp})`,
  })
    .from(position_claim_events)
    .groupBy(position_claim_events.to, position_claim_events.chainId),
);

export const wallet_transfer_summary = onchainView("wallet_transfer_summary").as((qb) =>
  qb.select({
    wallet: wallet_activity_events.wallet,
    chainId: wallet_activity_events.chainId,
    transferInAmount: sql<bigint>`coalesce(sum(${wallet_activity_events.amount}) filter (where ${wallet_activity_events.eventType} = 'erc20_transfer_in'), 0)`,
    transferOutAmount: sql<bigint>`coalesce(sum(${wallet_activity_events.amount}) filter (where ${wallet_activity_events.eventType} = 'erc20_transfer_out'), 0)`,
    netTransferAmount: sql<bigint>`coalesce(sum(case
      when ${wallet_activity_events.eventType} = 'erc20_transfer_in' then ${wallet_activity_events.amount}
      when ${wallet_activity_events.eventType} = 'erc20_transfer_out' then -${wallet_activity_events.amount}
      else 0
    end), 0)`,
    transferInCount: sql<number>`count(*) filter (where ${wallet_activity_events.eventType} = 'erc20_transfer_in')`,
    transferOutCount: sql<number>`count(*) filter (where ${wallet_activity_events.eventType} = 'erc20_transfer_out')`,
    largeOutgoingTransferCount: sql<number>`count(*) filter (where ${wallet_activity_events.eventType} = 'erc20_transfer_out' and ${wallet_activity_events.amount} >= ${largeOutgoingTransferSql})`,
    firstTransferTimestamp: sql<number>`min(${wallet_activity_events.timestamp})`,
    lastTransferTimestamp: sql<number>`max(${wallet_activity_events.timestamp})`,
  })
    .from(wallet_activity_events)
    .where(inArray(wallet_activity_events.eventType, ["erc20_transfer_in", "erc20_transfer_out"]))
    .groupBy(wallet_activity_events.wallet, wallet_activity_events.chainId),
);

export const wallet_unlock_risk = onchainView("wallet_unlock_risk").as((qb) =>
  qb.select({
    wallet: position_current_state.owner,
    chainId: position_current_state.chainId,
    unlocking24hAmount: sql<bigint>`coalesce(sum(${position_current_state.amount}) filter (where ${position_current_state.estimatedUnlockTimestamp} between ${nowEpochSecondsSql} and (${nowEpochSecondsSql} + 86400)), 0)`,
    unlocking7dAmount: sql<bigint>`coalesce(sum(${position_current_state.amount}) filter (where ${position_current_state.estimatedUnlockTimestamp} between ${nowEpochSecondsSql} and (${nowEpochSecondsSql} + 604800)), 0)`,
    unlocking24hCount: sql<number>`count(*) filter (where ${position_current_state.estimatedUnlockTimestamp} between ${nowEpochSecondsSql} and (${nowEpochSecondsSql} + 86400))`,
    unlocking7dCount: sql<number>`count(*) filter (where ${position_current_state.estimatedUnlockTimestamp} between ${nowEpochSecondsSql} and (${nowEpochSecondsSql} + 604800))`,
    unlockRiskScore: sql<bigint>`(
      (coalesce(sum(${position_current_state.amount}) filter (where ${position_current_state.estimatedUnlockTimestamp} between ${nowEpochSecondsSql} and (${nowEpochSecondsSql} + 86400)), 0) / 1000000000000000000) +
      ((coalesce(sum(${position_current_state.amount}) filter (where ${position_current_state.estimatedUnlockTimestamp} between ${nowEpochSecondsSql} and (${nowEpochSecondsSql} + 604800)), 0) / 1000000000000000000) / 2)
    )::bigint`,
  })
    .from(position_current_state)
    .where(eq(position_current_state.status, "locked"))
    .groupBy(position_current_state.owner, position_current_state.chainId),
);

export const wallet_genesis_power = onchainView("wallet_genesis_power").as((qb) =>
  qb.select({
    wallet: position_current_state.owner,
    chainId: position_current_state.chainId,
    genesisPositionCount: sql<number>`count(*)`,
    eternalGenesisCount: sql<number>`count(*) filter (where ${position_current_state.isEternal} = 1)`,
    genesisRewardWeight: sql<bigint>`coalesce(sum(${position_current_state.genesisRewardWeight}), 0)`,
    genesisLockedAmount: sql<bigint>`coalesce(sum(${position_current_state.amount}) filter (where ${position_current_state.status} = 'locked'), 0)`,
  })
    .from(position_current_state)
    .where(eq(position_current_state.isGenesis, 1))
    .groupBy(position_current_state.owner, position_current_state.chainId),
);

export const wallet_admin_risk = onchainView("wallet_admin_risk").as((qb) =>
  qb.select({
    wallet: direct_engine_admin_call_events.caller,
    chainId: direct_engine_admin_call_events.chainId,
    directAdminCallCount: sql<number>`count(*)`,
    unknownDirectAdminCallCount: sql<number>`count(*) filter (where ${direct_engine_admin_call_events.callPath} = 'unknown_direct')`,
    maxSeverity: sql<number>`coalesce(max(${direct_engine_admin_call_events.severity}), 0)`,
    adminRiskScore: sql<bigint>`(
      (count(*) filter (where ${direct_engine_admin_call_events.callPath} = 'unknown_direct') * 1000) +
      (count(*) filter (where ${direct_engine_admin_call_events.callPath} = 'break_glass') * 100)
    )::bigint`,
    lastAdminCallTimestamp: sql<number>`max(${direct_engine_admin_call_events.timestamp})`,
  })
    .from(direct_engine_admin_call_events)
    .groupBy(direct_engine_admin_call_events.caller, direct_engine_admin_call_events.chainId),
);

export const wallet_current_profile = onchainView("wallet_current_profile").as((qb) =>
  qb.select({
    wallet: wallet_position_scores.wallet,
    chainId: wallet_position_scores.chainId,
    primaryLabel: sql<string>`case
      when ${wallet_position_scores.wallet} = ${ZERO_ADDRESS} then 'unknown'
      when lower(${wallet_position_scores.wallet}) = ${configuredTreasuryAddress} then 'treasury'
      when lower(${wallet_position_scores.wallet}) = ${configuredRouterAddress} then 'router'
      when lower(${wallet_position_scores.wallet}) = ${configuredBreakGlassAddress} then 'break_glass'
      when lower(${wallet_position_scores.wallet}) = ${configuredFinalAdminAddress} then 'admin'
      when lower(${wallet_position_scores.wallet}) = ${configuredOpsVaultAddress} then 'ops'
      when lower(${wallet_position_scores.wallet}) in (${configuredTokenAddress}, ${configuredEngineAddress}, ${configuredPositionNftAddress}, ${configuredBondDepositoryNftAddress}, ${configuredBondVaultAddress}) then 'contract'
      when ${wallet_position_scores.activeLockedAmount} >= ${whaleLockedAmountSql} then 'whale'
      when ${wallet_position_scores.genesisPositionCount} > 0 then 'genesis_holder'
      else 'user'
    end`,
    rawPositionCount: wallet_position_scores.rawPositionCount,
    wrappedPositionCount: wallet_position_scores.wrappedPositionCount,
    genesisPositionCount: wallet_position_scores.genesisPositionCount,
    lockedAmount: wallet_position_scores.lockedAmount,
    activeLockedAmount: wallet_position_scores.activeLockedAmount,
    unlockedAmount: wallet_position_scores.unlockedAmount,
    unlocking24hAmount: wallet_position_scores.unlocking24hAmount,
    unlocking7dAmount: wallet_position_scores.unlocking7dAmount,
    claimCount: wallet_position_scores.claimCount,
    claimNaraAmount: wallet_position_scores.claimNaraAmount,
    claimEthAmount: wallet_position_scores.claimEthAmount,
    claimTokenAmount: wallet_position_scores.claimTokenAmount,
    transferInAmount: wallet_position_scores.transferInAmount,
    transferOutAmount: wallet_position_scores.transferOutAmount,
    netTransferAmount: wallet_position_scores.netTransferAmount,
    genesisRewardWeight: wallet_position_scores.genesisRewardWeight,
    avgLockDurationEpochs: wallet_position_scores.avgLockDurationEpochs,
    lastActivityTimestamp: wallet_position_scores.lastActivityTimestamp,
    riskScore: sql<bigint>`(
      ${wallet_position_scores.riskScore} +
      (${wallet_position_scores.unlocking24hAmount} / 1000000000000000000) +
      ((${wallet_position_scores.unlocking7dAmount} / 1000000000000000000) / 2)
    )::bigint`,
    convictionScore: sql<bigint>`(
      ${wallet_position_scores.convictionScore} +
      case
        when ${wallet_position_scores.activeLockedAmount} > 0 and ${wallet_position_scores.lastActivityTimestamp} > 0
        then greatest(0, ((${nowEpochSecondsSql} - ${wallet_position_scores.lastActivityTimestamp}) / 86400))::bigint * 10
        else 0
      end
    )::bigint`,
    updatedAt: wallet_position_scores.updatedAt,
  }).from(wallet_position_scores),
);

export const wallet_whales = onchainView("wallet_whales").as((qb) =>
  qb.select({
    wallet: wallet_exposure_summary.wallet,
    chainId: wallet_exposure_summary.chainId,
    ownerStatus: wallet_exposure_summary.ownerStatus,
    activeLockedAmount: wallet_exposure_summary.activeLockedAmount,
    genesisRewardWeight: wallet_exposure_summary.genesisRewardWeight,
    rawPositionCount: wallet_exposure_summary.rawPositionCount,
    wrappedPositionCount: wallet_exposure_summary.wrappedPositionCount,
  })
    .from(wallet_exposure_summary)
    .where(and(
      gte(wallet_exposure_summary.activeLockedAmount, whaleLockedAmountSql),
      ne(wallet_exposure_summary.ownerStatus, "unknown_until_transfer"),
    )),
);

export const wallet_fresh_activity = onchainView("wallet_fresh_activity").as((qb) =>
  qb.select({
    wallet: wallet_activity_events.wallet,
    chainId: wallet_activity_events.chainId,
    firstActivityTimestamp: sql<number>`min(${wallet_activity_events.timestamp})`,
    lastActivityTimestamp: sql<number>`max(${wallet_activity_events.timestamp})`,
    activityCount: sql<number>`count(*)`,
    fresh24hActivityCount: sql<number>`count(*) filter (where ${wallet_activity_events.timestamp} >= (${nowEpochSecondsSql} - 86400))`,
    fresh7dActivityCount: sql<number>`count(*) filter (where ${wallet_activity_events.timestamp} >= (${nowEpochSecondsSql} - 604800))`,
  })
    .from(wallet_activity_events)
    .groupBy(wallet_activity_events.wallet, wallet_activity_events.chainId),
);

export const wallet_conviction_ranking = onchainView("wallet_conviction_ranking").as((qb) =>
  qb.select({
    wallet: wallet_current_profile.wallet,
    chainId: wallet_current_profile.chainId,
    primaryLabel: wallet_current_profile.primaryLabel,
    convictionScore: wallet_current_profile.convictionScore,
    riskScore: wallet_current_profile.riskScore,
    lockedAmount: wallet_current_profile.lockedAmount,
    genesisRewardWeight: wallet_current_profile.genesisRewardWeight,
  })
    .from(wallet_current_profile)
    .orderBy(desc(wallet_current_profile.convictionScore)),
);

export const wallet_risk_ranking = onchainView("wallet_risk_ranking").as((qb) =>
  qb.select({
    wallet: wallet_current_profile.wallet,
    chainId: wallet_current_profile.chainId,
    primaryLabel: wallet_current_profile.primaryLabel,
    riskScore: wallet_current_profile.riskScore,
    convictionScore: wallet_current_profile.convictionScore,
    activeLockedAmount: wallet_current_profile.activeLockedAmount,
    unlocking24hAmount: wallet_current_profile.unlocking24hAmount,
    unlocking7dAmount: wallet_current_profile.unlocking7dAmount,
  })
    .from(wallet_current_profile)
    .orderBy(desc(wallet_current_profile.riskScore)),
);

export const failed_tx_recent = onchainView("failed_tx_recent").as((qb) =>
  qb.select({
    id: failed_transactions.id,
    chainId: failed_transactions.chainId,
    txHash: failed_transactions.txHash,
    blockNumber: failed_transactions.blockNumber,
    blockHash: failed_transactions.blockHash,
    timestamp: failed_transactions.timestamp,
    from: failed_transactions.from,
    to: failed_transactions.to,
    contractName: failed_transactions.contractName,
    functionSelector: failed_transactions.functionSelector,
    functionName: failed_transactions.functionName,
    status: failed_transactions.status,
    value: failed_transactions.value,
    gasUsed: failed_transactions.gasUsed,
    effectiveGasPrice: failed_transactions.effectiveGasPrice,
    revertReason: failed_transactions.revertReason,
    callPath: failed_transactions.callPath,
    riskCategory: failed_transactions.riskCategory,
    wallet: failed_transactions.wallet,
    positionId: failed_transactions.positionId,
    tokenId: failed_transactions.tokenId,
    amount: failed_transactions.amount,
    metadataJson: failed_transactions.metadataJson,
  })
    .from(failed_transactions)
    .where(gte(failed_transactions.timestamp, sql<number>`extract(epoch from now())::integer - 86400`))
    .orderBy(desc(failed_transactions.timestamp)),
);

export const failed_tx_by_wallet = onchainView("failed_tx_by_wallet").as((qb) =>
  qb.select({
    wallet: failed_transactions.wallet,
    chainId: failed_transactions.chainId,
    failureCount: sql<number>`count(*)`,
    adminFailureCount: sql<number>`count(*) filter (where ${failed_transactions.riskCategory} in ('admin_revert', 'treasury_revert', 'router_revert'))`,
    claimFailureCount: sql<number>`count(*) filter (where ${failed_transactions.riskCategory} = 'claim_revert')`,
    lockFailureCount: sql<number>`count(*) filter (where ${failed_transactions.riskCategory} = 'lock_revert')`,
    unlockFailureCount: sql<number>`count(*) filter (where ${failed_transactions.riskCategory} = 'unlock_revert')`,
    maxFailureSeverity: sql<number>`max(case when ${failed_transactions.riskCategory} in ('admin_revert', 'treasury_revert', 'router_revert') then 5 when ${failed_transactions.riskCategory} in ('claim_revert', 'lock_revert', 'unlock_revert', 'bond_revert') then 4 else 3 end)`,
    firstFailureAt: sql<number>`min(${failed_transactions.timestamp})`,
    lastFailureAt: sql<number>`max(${failed_transactions.timestamp})`,
    lastFailureTxHash: sql<string>`(array_agg(${failed_transactions.txHash} order by ${failed_transactions.timestamp} desc))[1]`,
  })
    .from(failed_transactions)
    .groupBy(failed_transactions.wallet, failed_transactions.chainId),
);

export const failed_tx_by_function = onchainView("failed_tx_by_function").as((qb) =>
  qb.select({
    chainId: failed_transactions.chainId,
    contractName: failed_transactions.contractName,
    functionName: failed_transactions.functionName,
    functionSelector: failed_transactions.functionSelector,
    riskCategory: failed_transactions.riskCategory,
    failureCount: sql<number>`count(*)`,
    uniqueWalletCount: sql<number>`count(distinct ${failed_transactions.wallet})`,
    firstFailureAt: sql<number>`min(${failed_transactions.timestamp})`,
    lastFailureAt: sql<number>`max(${failed_transactions.timestamp})`,
    lastFailureTxHash: sql<string>`(array_agg(${failed_transactions.txHash} order by ${failed_transactions.timestamp} desc))[1]`,
  })
    .from(failed_transactions)
    .groupBy(
      failed_transactions.chainId,
      failed_transactions.contractName,
      failed_transactions.functionName,
      failed_transactions.functionSelector,
      failed_transactions.riskCategory,
    ),
);

export const failed_tx_admin_risk = onchainView("failed_tx_admin_risk").as((qb) =>
  qb.select({
    id: failed_transactions.id,
    chainId: failed_transactions.chainId,
    txHash: failed_transactions.txHash,
    blockNumber: failed_transactions.blockNumber,
    timestamp: failed_transactions.timestamp,
    wallet: failed_transactions.wallet,
    to: failed_transactions.to,
    contractName: failed_transactions.contractName,
    functionName: failed_transactions.functionName,
    functionSelector: failed_transactions.functionSelector,
    callPath: failed_transactions.callPath,
    riskCategory: failed_transactions.riskCategory,
    revertReason: failed_transactions.revertReason,
  })
    .from(failed_transactions)
    .where(inArray(failed_transactions.riskCategory, ["admin_revert", "treasury_revert", "router_revert"])),
);

export const failed_tx_user_friction = onchainView("failed_tx_user_friction").as((qb) =>
  qb.select({
    id: failed_transactions.id,
    chainId: failed_transactions.chainId,
    txHash: failed_transactions.txHash,
    blockNumber: failed_transactions.blockNumber,
    timestamp: failed_transactions.timestamp,
    wallet: failed_transactions.wallet,
    contractName: failed_transactions.contractName,
    functionName: failed_transactions.functionName,
    functionSelector: failed_transactions.functionSelector,
    riskCategory: failed_transactions.riskCategory,
    positionId: failed_transactions.positionId,
    tokenId: failed_transactions.tokenId,
    amount: failed_transactions.amount,
    revertReason: failed_transactions.revertReason,
  })
    .from(failed_transactions)
    .where(inArray(failed_transactions.riskCategory, ["user_revert", "claim_revert", "lock_revert", "unlock_revert", "bond_revert"])),
);

export const failed_tx_spikes = onchainView("failed_tx_spikes").as((qb) =>
  qb.select({
    id: failed_tx_groups.id,
    chainId: failed_tx_groups.chainId,
    wallet: failed_tx_groups.wallet,
    contractName: failed_tx_groups.contractName,
    functionName: failed_tx_groups.functionName,
    functionSelector: failed_tx_groups.functionSelector,
    windowStart: failed_tx_groups.windowStart,
    windowEnd: failed_tx_groups.windowEnd,
    failureCount: failed_tx_groups.failureCount,
    lastFailureTxHash: failed_tx_groups.lastFailureTxHash,
    severity: failed_tx_groups.severity,
    updatedAt: failed_tx_groups.updatedAt,
  })
    .from(failed_tx_groups)
    .where(gte(failed_tx_groups.severity, 4)),
);

export const failed_tx_alert_summary = onchainView("failed_tx_alert_summary").as((qb) =>
  qb.select({
    ruleId: alerts.ruleId,
    openAlertCount: sql<number>`count(*) filter (where ${alerts.status} = 'open')`,
    criticalAlertCount: sql<number>`count(*) filter (where ${alerts.status} = 'open' and ${alerts.severity} = 5)`,
    maxSeverity: sql<number>`coalesce(max(${alerts.severity}) filter (where ${alerts.status} = 'open'), 0)`,
    totalOccurrences: sql<number>`coalesce(sum(${alerts.occurrenceCount}) filter (where ${alerts.status} = 'open'), 0)`,
    lastSeenAt: sql<number>`max(${alerts.lastSeenAt})`,
  })
    .from(alerts)
    .where(inArray(alerts.ruleId, [
      "failed_unknown_direct_admin_call_spike",
      "failed_treasury_call_spike",
      "failed_router_ops_call_spike",
      "same_wallet_same_function_repeated_failures",
      "many_failed_claims",
      "many_failed_locks",
      "many_failed_unlocks",
      "single_suspicious_failed_admin_attempt",
      "single_suspicious_failed_treasury_attempt",
    ]))
    .groupBy(alerts.ruleId),
);

export const open_alerts = onchainView("open_alerts").as((qb) =>
  qb.select({
    id: alerts.id,
    fingerprint: alerts.fingerprint,
    severity: alerts.severity,
    ruleId: alerts.ruleId,
    title: alerts.title,
    description: alerts.description,
    txHash: alerts.txHash,
    blockNumber: alerts.blockNumber,
    wallet: alerts.wallet,
    positionId: alerts.positionId,
    tokenId: alerts.tokenId,
    amount: alerts.amount,
    viewName: alerts.viewName,
    sourceTable: alerts.sourceTable,
    sourceRowId: alerts.sourceRowId,
    observedValue: alerts.observedValue,
    thresholdValue: alerts.thresholdValue,
    firstSeenAt: alerts.firstSeenAt,
    lastSeenAt: alerts.lastSeenAt,
    occurrenceCount: alerts.occurrenceCount,
  })
    .from(alerts)
    .where(eq(alerts.status, "open")),
);

export const critical_alerts = onchainView("critical_alerts").as((qb) =>
  qb.select({
    id: alerts.id,
    fingerprint: alerts.fingerprint,
    severity: alerts.severity,
    ruleId: alerts.ruleId,
    title: alerts.title,
    description: alerts.description,
    txHash: alerts.txHash,
    blockNumber: alerts.blockNumber,
    wallet: alerts.wallet,
    positionId: alerts.positionId,
    tokenId: alerts.tokenId,
    amount: alerts.amount,
    viewName: alerts.viewName,
    sourceTable: alerts.sourceTable,
    sourceRowId: alerts.sourceRowId,
    firstSeenAt: alerts.firstSeenAt,
    lastSeenAt: alerts.lastSeenAt,
    occurrenceCount: alerts.occurrenceCount,
  })
    .from(alerts)
    .where(and(eq(alerts.status, "open"), eq(alerts.severity, 5))),
);

export const wallet_alert_summary = onchainView("wallet_alert_summary").as((qb) =>
  qb.select({
    wallet: alerts.wallet,
    openAlertCount: sql<number>`count(*) filter (where ${alerts.status} = 'open')`,
    criticalAlertCount: sql<number>`count(*) filter (where ${alerts.status} = 'open' and ${alerts.severity} = 5)`,
    maxSeverity: sql<number>`coalesce(max(${alerts.severity}) filter (where ${alerts.status} = 'open'), 0)`,
    lastSeenAt: sql<number>`max(${alerts.lastSeenAt})`,
  })
    .from(alerts)
    .where(ne(alerts.wallet, ""))
    .groupBy(alerts.wallet),
);

export const position_alert_summary = onchainView("position_alert_summary").as((qb) =>
  qb.select({
    positionId: alerts.positionId,
    openAlertCount: sql<number>`count(*) filter (where ${alerts.status} = 'open')`,
    criticalAlertCount: sql<number>`count(*) filter (where ${alerts.status} = 'open' and ${alerts.severity} = 5)`,
    maxSeverity: sql<number>`coalesce(max(${alerts.severity}) filter (where ${alerts.status} = 'open'), 0)`,
    lastSeenAt: sql<number>`max(${alerts.lastSeenAt})`,
  })
    .from(alerts)
    .where(sql`${alerts.positionId} is not null`)
    .groupBy(alerts.positionId),
);

export const admin_alert_summary = onchainView("admin_alert_summary").as((qb) =>
  qb.select({
    ruleId: alerts.ruleId,
    openAlertCount: sql<number>`count(*) filter (where ${alerts.status} = 'open')`,
    criticalAlertCount: sql<number>`count(*) filter (where ${alerts.status} = 'open' and ${alerts.severity} = 5)`,
    maxSeverity: sql<number>`coalesce(max(${alerts.severity}) filter (where ${alerts.status} = 'open'), 0)`,
    lastSeenAt: sql<number>`max(${alerts.lastSeenAt})`,
  })
    .from(alerts)
    .where(inArray(alerts.ruleId, [
      "direct_engine_admin_call_unapproved",
      "param_or_treasury_direct_call_unapproved",
      "role_granted_to_unknown_address",
      "role_admin_changed",
      "repeated_admin_attempts",
      "failed_unknown_direct_admin_call_spike",
      "single_suspicious_failed_admin_attempt",
    ]))
    .groupBy(alerts.ruleId),
);

export const treasury_alert_summary = onchainView("treasury_alert_summary").as((qb) =>
  qb.select({
    ruleId: alerts.ruleId,
    openAlertCount: sql<number>`count(*) filter (where ${alerts.status} = 'open')`,
    criticalAlertCount: sql<number>`count(*) filter (where ${alerts.status} = 'open' and ${alerts.severity} = 5)`,
    totalAmount: sql<bigint>`coalesce(sum(${alerts.amount}), 0)`,
    maxSeverity: sql<number>`coalesce(max(${alerts.severity}) filter (where ${alerts.status} = 'open'), 0)`,
    lastSeenAt: sql<number>`max(${alerts.lastSeenAt})`,
  })
    .from(alerts)
    .where(inArray(alerts.ruleId, [
      "large_treasury_withdrawal",
      "failed_treasury_call_spike",
      "single_suspicious_failed_treasury_attempt",
    ]))
    .groupBy(alerts.ruleId),
);

export const router_alert_summary = onchainView("router_alert_summary").as((qb) =>
  qb.select({
    ruleId: alerts.ruleId,
    openAlertCount: sql<number>`count(*) filter (where ${alerts.status} = 'open')`,
    criticalAlertCount: sql<number>`count(*) filter (where ${alerts.status} = 'open' and ${alerts.severity} = 5)`,
    maxSeverity: sql<number>`coalesce(max(${alerts.severity}) filter (where ${alerts.status} = 'open'), 0)`,
    lastSeenAt: sql<number>`max(${alerts.lastSeenAt})`,
  })
    .from(alerts)
    .where(inArray(alerts.ruleId, [
      "unexpected_router_caller",
      "router_operation_spike",
      "failed_router_ops_call_spike",
    ]))
    .groupBy(alerts.ruleId),
);

export const protocol_risk_summary = onchainView("protocol_risk_summary").as((qb) =>
  qb.select({
    openAlertCount: sql<number>`count(*) filter (where ${alerts.status} = 'open')`,
    criticalAlertCount: sql<number>`count(*) filter (where ${alerts.status} = 'open' and ${alerts.severity} = 5)`,
    severity4AlertCount: sql<number>`count(*) filter (where ${alerts.status} = 'open' and ${alerts.severity} = 4)`,
    severity3AlertCount: sql<number>`count(*) filter (where ${alerts.status} = 'open' and ${alerts.severity} = 3)`,
    maxSeverity: sql<number>`coalesce(max(${alerts.severity}) filter (where ${alerts.status} = 'open'), 0)`,
    totalOccurrences: sql<number>`coalesce(sum(${alerts.occurrenceCount}) filter (where ${alerts.status} = 'open'), 0)`,
    lastSeenAt: sql<number>`max(${alerts.lastSeenAt})`,
  }).from(alerts),
);
