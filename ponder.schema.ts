import { onchainTable } from "ponder";

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

export const mines = onchainTable("mines", (t) => ({
  id: t.text().primaryKey(), // chainId + txHash + logIndex
  chainId: t.integer().notNull(),
  user: t.text().notNull(),
  epoch: t.bigint().notNull(),
  tickets: t.bigint().notNull(),
  paidWei: t.bigint().notNull(),
  resolved: t.integer().default(0), // 0 = committed, 1 = resolved
  reward: t.bigint().default(0n),
  boost: t.bigint().default(0n),
  nftId: t.bigint(),
  blockNumber: t.bigint().notNull(),
  txHash: t.text().notNull(),
  logIndex: t.integer().notNull(),
  timestamp: t.integer().notNull(),
}));

export const nfts = onchainTable("nfts", (t) => ({
  tokenId: t.text().primaryKey(), // chainId + tokenId
  chainId: t.integer().notNull(),
  tokenIdRaw: t.bigint().notNull(),
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

export const jackpot_events = onchainTable("jackpot_events", (t) => ({
  id: t.text().primaryKey(),
  chainId: t.integer().notNull(),
  eventType: t.text().notNull(), // "enter" | "draw" | "win"
  epoch: t.bigint().notNull(),
  user: t.text().notNull(),
  amount: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  txHash: t.text().notNull(),
  logIndex: t.integer().notNull(),
  timestamp: t.integer().notNull(),
}));

export const keeper_events = onchainTable("keeper_events", (t) => ({
  id: t.text().primaryKey(),
  chainId: t.integer().notNull(),
  keeper: t.text().notNull(),
  caller: t.text().notNull(),
  rewardPaidNara: t.bigint().notNull(),
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
  miningStreakDays: t.integer().notNull(),
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
