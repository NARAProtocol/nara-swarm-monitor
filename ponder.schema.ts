import { eq, inArray, onchainTable, onchainView } from "ponder";

// Unique IDs for events: chainId + transaction_hash + log_index
// Unique IDs for transactions: chainId + transaction_hash

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
  positionId: t.bigint().notNull(),
  owner: t.text().notNull(),
  tier: t.integer().notNull(),
  isGenesis: t.integer().notNull(), // 0 = regular, 1 = genesis
  isEternal: t.integer().notNull(), // 0 = regular, 1 = eternal
  mintedAtBlock: t.bigint().notNull(),
  mintedAtTimestamp: t.integer().notNull(),
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
