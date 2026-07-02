import { ponder } from "ponder:registry";
import { 
  wallets, 
  erc20_transfers, 
  locks, 
  claims, 
  nfts, 
  nft_transfers, 
  admin_events,
  ops_router_events,
  direct_engine_admin_call_events,
  admin_config_events,
  position_claim_events,
  position_events,
  wallet_activity_events,
  wallet_labels,
  wallet_position_scores,
} from "ponder:schema";
import {
  CONTRACTS,
  BREAK_GLASS_SAFE_ADDRESS,
  ENGINE_OPS_ROUTER_ADDRESS,
  FINAL_ADMIN_ADDRESS,
  TREASURY_ADDRESS,
} from "../config/contracts";
import { emitAlert } from "./rule-engine/engine";

// Dynamic chainId lookup from environment
const chainId = Number(process.env.CHAIN_ID || "8453");
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const NARA_UNIT = 10n ** 18n;
const epochLengthSeconds = BigInt(process.env.V4_EPOCH_LENGTH_SECONDS || "900");
const whaleLockedAmount = BigInt(process.env.WALLET_WHALE_LOCKED_AMOUNT_WEI || "100000000000000000000000");
const largeOutgoingTransferAmount = BigInt(process.env.WALLET_LARGE_OUTGOING_TRANSFER_WEI || "100000000000000000000000");
const largeTreasuryWithdrawalAmount = BigInt(process.env.ALERT_LARGE_TREASURY_WITHDRAWAL_WEI || "1000000000000000000");
const largeUnlock24hAmount = BigInt(process.env.ALERT_LARGE_UNLOCK_24H_WEI || "10000000000000000000000");
const largeUnlock7dAmount = BigInt(process.env.ALERT_LARGE_UNLOCK_7D_WEI || "25000000000000000000000");
const mediumUnlockAmount = BigInt(process.env.ALERT_MEDIUM_UNLOCK_WEI || "1000000000000000000000");
const highConvictionScoreThreshold = BigInt(process.env.ALERT_HIGH_CONVICTION_SCORE || "10000");
const highRiskScoreThreshold = BigInt(process.env.ALERT_HIGH_RISK_SCORE || "500");
const shortTermDurationEpochs = BigInt(process.env.WALLET_SHORT_TERM_DURATION_EPOCHS || "96");
const longTermDurationEpochs = BigInt(process.env.WALLET_LONG_TERM_DURATION_EPOCHS || "2880");

// Helper to upsert wallets in Drizzle style
async function ensureWallet(db: any, address: string, blockNumber: bigint, timestamp: number) {
  const wallet = normalizeAddress(address);
  if (wallet === ZERO_ADDRESS) return;
  await db.insert(wallets).values({
    address: wallet,
    firstSeenBlock: blockNumber,
    lastUpdatedAt: timestamp,
  }).onConflictDoNothing();

  await upsertWalletLabel(db, wallet, "user", "observed_activity", 60, "Wallet appeared in indexed v4 activity.", blockNumber, timestamp);
  await ensureWalletScore(db, wallet, timestamp);
  await labelKnownProtocolWallets(db, blockNumber, timestamp);
}

function stringifyMetadata(metadata: Record<string, unknown>): string {
  return JSON.stringify(metadata, (_, value) => (typeof value === "bigint" ? value.toString() : value));
}

function positionTokenId(tokenId: bigint): string {
  return `${chainId}-${tokenId}`;
}

function amountScore(amount: bigint): bigint {
  return amount / NARA_UNIT;
}

function lockConvictionScore(
  amount: bigint,
  durationEpochs: bigint,
  wrapped: boolean,
  genesisRewardWeight: bigint,
): bigint {
  return amountScore(amount) + (durationEpochs * 10n) + (wrapped ? 100n : 0n) + amountScore(genesisRewardWeight);
}

function lockRiskScore(amount: bigint, durationEpochs: bigint, timestamp: number): bigint {
  const estimatedUnlockTimestamp = BigInt(timestamp) + (durationEpochs * epochLengthSeconds);
  let score = 0n;
  if (durationEpochs <= shortTermDurationEpochs) score += 50n;
  if (estimatedUnlockTimestamp <= BigInt(timestamp) + 86_400n) score += amountScore(amount);
  else if (estimatedUnlockTimestamp <= BigInt(timestamp) + 604_800n) score += amountScore(amount) / 2n;
  return score;
}

function unlockSoonAmounts(amount: bigint, durationEpochs: bigint, timestamp: number): { unlocking24hAmount: bigint; unlocking7dAmount: bigint } {
  const estimatedUnlockTimestamp = BigInt(timestamp) + (durationEpochs * epochLengthSeconds);
  const now = BigInt(timestamp);
  if (estimatedUnlockTimestamp <= now + 86_400n) {
    return { unlocking24hAmount: amount, unlocking7dAmount: amount };
  }
  if (estimatedUnlockTimestamp <= now + 604_800n) {
    return { unlocking24hAmount: 0n, unlocking7dAmount: amount };
  }
  return { unlocking24hAmount: 0n, unlocking7dAmount: 0n };
}

async function ensureWalletScore(db: any, walletAddress: string, timestamp: number) {
  const wallet = normalizeAddress(walletAddress);
  if (wallet === ZERO_ADDRESS) return;

  await db.insert(wallet_position_scores).values({
    wallet,
    chainId,
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
    lastActivityTimestamp: timestamp,
    riskScore: 0n,
    convictionScore: 0n,
    updatedAt: timestamp,
  }).onConflictDoNothing();
}

async function updateWalletScore(db: any, walletAddress: string, timestamp: number, delta: {
  rawPositionCount?: number;
  wrappedPositionCount?: number;
  genesisPositionCount?: number;
  lockedAmount?: bigint;
  activeLockedAmount?: bigint;
  unlockedAmount?: bigint;
  unlocking24hAmount?: bigint;
  unlocking7dAmount?: bigint;
  claimCount?: number;
  claimNaraAmount?: bigint;
  claimEthAmount?: bigint;
  claimTokenAmount?: bigint;
  transferInAmount?: bigint;
  transferOutAmount?: bigint;
  netTransferAmount?: bigint;
  genesisRewardWeight?: bigint;
  durationSampleEpochs?: bigint;
  durationSampleCount?: number;
  riskScore?: bigint;
  convictionScore?: bigint;
}) {
  const wallet = normalizeAddress(walletAddress);
  if (wallet === ZERO_ADDRESS) return;

  const rawPositionCount = delta.rawPositionCount ?? 0;
  const wrappedPositionCount = delta.wrappedPositionCount ?? 0;
  const genesisPositionCount = delta.genesisPositionCount ?? 0;
  const lockedAmount = delta.lockedAmount ?? 0n;
  const activeLockedAmount = delta.activeLockedAmount ?? 0n;
  const unlockedAmount = delta.unlockedAmount ?? 0n;
  const unlocking24hAmount = delta.unlocking24hAmount ?? 0n;
  const unlocking7dAmount = delta.unlocking7dAmount ?? 0n;
  const claimCount = delta.claimCount ?? 0;
  const claimNaraAmount = delta.claimNaraAmount ?? 0n;
  const claimEthAmount = delta.claimEthAmount ?? 0n;
  const claimTokenAmount = delta.claimTokenAmount ?? 0n;
  const transferInAmount = delta.transferInAmount ?? 0n;
  const transferOutAmount = delta.transferOutAmount ?? 0n;
  const netTransferAmount = delta.netTransferAmount ?? 0n;
  const genesisRewardWeight = delta.genesisRewardWeight ?? 0n;
  const durationSampleEpochs = delta.durationSampleEpochs ?? 0n;
  const durationSampleCount = delta.durationSampleCount ?? 0;
  const riskScore = delta.riskScore ?? 0n;
  const convictionScore = delta.convictionScore ?? 0n;

  await db.insert(wallet_position_scores).values({
    wallet,
    chainId,
    rawPositionCount,
    wrappedPositionCount,
    genesisPositionCount,
    lockedAmount,
    activeLockedAmount,
    unlockedAmount,
    unlocking24hAmount,
    unlocking7dAmount,
    claimCount,
    claimNaraAmount,
    claimEthAmount,
    claimTokenAmount,
    transferInAmount,
    transferOutAmount,
    netTransferAmount,
    genesisRewardWeight,
    avgLockDurationEpochs: durationSampleCount > 0 ? durationSampleEpochs / BigInt(durationSampleCount) : 0n,
    lastActivityTimestamp: timestamp,
    riskScore,
    convictionScore,
    updatedAt: timestamp,
  }).onConflictDoUpdate((row: any) => {
    const previousPositionCount = BigInt(row.rawPositionCount + row.wrappedPositionCount + row.genesisPositionCount);
    const newDurationSamples = BigInt(durationSampleCount);
    const avgLockDurationEpochs = newDurationSamples === 0n
      ? row.avgLockDurationEpochs
      : ((row.avgLockDurationEpochs * previousPositionCount) + durationSampleEpochs) / (previousPositionCount + newDurationSamples);

    return {
      rawPositionCount: row.rawPositionCount + rawPositionCount,
      wrappedPositionCount: row.wrappedPositionCount + wrappedPositionCount,
      genesisPositionCount: row.genesisPositionCount + genesisPositionCount,
      lockedAmount: row.lockedAmount + lockedAmount,
      activeLockedAmount: row.activeLockedAmount + activeLockedAmount,
      unlockedAmount: row.unlockedAmount + unlockedAmount,
      unlocking24hAmount: row.unlocking24hAmount + unlocking24hAmount,
      unlocking7dAmount: row.unlocking7dAmount + unlocking7dAmount,
      claimCount: row.claimCount + claimCount,
      claimNaraAmount: row.claimNaraAmount + claimNaraAmount,
      claimEthAmount: row.claimEthAmount + claimEthAmount,
      claimTokenAmount: row.claimTokenAmount + claimTokenAmount,
      transferInAmount: row.transferInAmount + transferInAmount,
      transferOutAmount: row.transferOutAmount + transferOutAmount,
      netTransferAmount: row.netTransferAmount + netTransferAmount,
      genesisRewardWeight: row.genesisRewardWeight + genesisRewardWeight,
      avgLockDurationEpochs,
      lastActivityTimestamp: Math.max(row.lastActivityTimestamp, timestamp),
      riskScore: row.riskScore + riskScore,
      convictionScore: row.convictionScore + convictionScore,
      updatedAt: timestamp,
    };
  });
}

async function upsertWalletLabel(
  db: any,
  walletAddress: string,
  label: string,
  source: string,
  confidence: number,
  reason: string,
  blockNumber: bigint,
  timestamp: number,
) {
  const wallet = normalizeAddress(walletAddress);
  const id = `${chainId}-${wallet}-${label}-${source}`;

  await db.insert(wallet_labels).values({
    id,
    chainId,
    wallet,
    label,
    source,
    confidence,
    reason,
    blockNumber,
    timestamp,
  }).onConflictDoUpdate({
    confidence,
    reason,
    blockNumber,
    timestamp,
  });

  if (wallet !== ZERO_ADDRESS) {
    await ensureWalletScore(db, wallet, timestamp);
  }
}

async function labelKnownProtocolWallets(db: any, blockNumber: bigint, timestamp: number) {
  const contractLabels: Array<[string, string]> = [
    [CONTRACTS.token.address, "NARA token contract"],
    [CONTRACTS.engine.address, "NARAEngine contract"],
    [CONTRACTS.positionNft.address, "NARAPositionNFTV4 contract"],
    [CONTRACTS.bondDepositoryNft.address, "NARABondDepositoryV4NFT contract"],
    [CONTRACTS.bondVault.address, "NARABondVaultV4 contract"],
    [CONTRACTS.opsVault.address, "NARAOpsVaultV4 contract"],
    [ENGINE_OPS_ROUTER_ADDRESS, "NARAEngineOpsRouterV1 contract"],
  ];

  for (const [address, reason] of contractLabels) {
    await upsertWalletLabel(db, address, "contract", "protocol_config", 100, reason, blockNumber, timestamp);
  }

  await upsertWalletLabel(db, ENGINE_OPS_ROUTER_ADDRESS, "router", "protocol_config", 100, "Approved engine ops router.", blockNumber, timestamp);
  await upsertWalletLabel(db, BREAK_GLASS_SAFE_ADDRESS, "break_glass", "protocol_config", 100, "Approved break glass Safe.", blockNumber, timestamp);
  await upsertWalletLabel(db, CONTRACTS.opsVault.address, "ops", "protocol_config", 100, "Operations vesting vault.", blockNumber, timestamp);

  if (TREASURY_ADDRESS) {
    await upsertWalletLabel(db, TREASURY_ADDRESS, "treasury", "protocol_config", 100, "Configured v4 treasury address.", blockNumber, timestamp);
  }
  if (FINAL_ADMIN_ADDRESS) {
    await upsertWalletLabel(db, FINAL_ADMIN_ADDRESS, "admin", "protocol_config", 100, "Configured final admin address.", blockNumber, timestamp);
  }
}

async function recordWalletActivity(
  context: any,
  event: any,
  walletAddress: string,
  eventType: string,
  source: string,
  values: {
    amount?: bigint | null;
    token?: string | null;
    positionId?: bigint | null;
    tokenId?: string | null;
    counterparty?: string | null;
    index?: number;
    suffix?: string;
  } = {},
) {
  const wallet = normalizeAddress(walletAddress);
  if (wallet === ZERO_ADDRESS) {
    await upsertWalletLabel(context.db, wallet, "unknown", source, 100, "Zero address is an unknown placeholder, not a holder.", event.block.number, Number(event.block.timestamp));
    return;
  }

  const timestamp = Number(event.block.timestamp);
  const eventIndex = values.index ?? event.log?.logIndex ?? event.trace?.traceIndex ?? 0;
  const suffix = values.suffix ?? "";
  const id = `${chainId}-${event.transaction.hash}-${eventIndex}-${wallet}-${eventType}${suffix ? `-${suffix}` : ""}`;

  await context.db.insert(wallet_activity_events).values({
    id,
    chainId,
    wallet,
    eventType,
    source,
    amount: values.amount ?? null,
    token: values.token ? normalizeAddress(values.token) : null,
    positionId: values.positionId ?? null,
    tokenId: values.tokenId ?? null,
    counterparty: values.counterparty ? normalizeAddress(values.counterparty) : null,
    blockNumber: event.block.number,
    blockHash: event.block.hash,
    txHash: event.transaction.hash,
    logIndex: eventIndex,
    timestamp,
  }).onConflictDoNothing();

  await ensureWallet(context.db, wallet, event.block.number, timestamp);
}

async function recordPositionEvent(
  context: any,
  event: any,
  eventType: string,
  values: {
    tokenId?: string | null;
    positionId?: bigint | null;
    owner?: string | null;
    to?: string | null;
    amount?: bigint | null;
    metadata?: Record<string, unknown>;
  },
) {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}-${eventType}`;

  await context.db.insert(position_events).values({
    id,
    chainId,
    eventType,
    tokenId: values.tokenId ?? null,
    positionId: values.positionId ?? null,
    owner: values.owner ? normalizeAddress(values.owner) : null,
    to: values.to ? normalizeAddress(values.to) : null,
    amount: values.amount ?? null,
    metadataJson: values.metadata ? stringifyMetadata(values.metadata) : null,
    blockNumber: event.block.number,
    blockHash: event.block.hash,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp: Number(event.block.timestamp),
  }).onConflictDoNothing();
}

async function recordPositionClaimEvent(
  context: any,
  event: any,
  source: string,
  values: {
    tokenId?: string | null;
    positionId?: bigint | null;
    user?: string | null;
    to: string;
    rewardToken: string;
    naraAmount?: bigint;
    ethAmount?: bigint;
    tokenAmount?: bigint;
  },
) {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}-${source}`;

  await context.db.insert(position_claim_events).values({
    id,
    chainId,
    source,
    tokenId: values.tokenId ?? null,
    positionId: values.positionId ?? null,
    user: values.user ? normalizeAddress(values.user) : null,
    to: normalizeAddress(values.to),
    rewardToken: values.rewardToken,
    naraAmount: values.naraAmount ?? 0n,
    ethAmount: values.ethAmount ?? 0n,
    tokenAmount: values.tokenAmount ?? 0n,
    blockNumber: event.block.number,
    blockHash: event.block.hash,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp: Number(event.block.timestamp),
  }).onConflictDoNothing();
}

const approvedOpsRouter = ENGINE_OPS_ROUTER_ADDRESS.toLowerCase();
const approvedBreakGlassSafe = BREAK_GLASS_SAFE_ADDRESS.toLowerCase();

const directEngineAdminFunctionRoles = {
  proposeConfig: "PARAM_ROLE",
  executeConfig: "PARAM_ROLE",
  cancelConfig: "PARAM_ROLE",
  setLockFee: "PARAM_ROLE",
  setClaimFee: "PARAM_ROLE",
  setLockEthFee: "PARAM_ROLE",
  setUnlockEthFee: "PARAM_ROLE",
  setTreasury: "TREASURY_ROLE",
  setRewardReserve: "TREASURY_ROLE",
  setBondVault: "TREASURY_ROLE",
  withdrawTreasuryEthFees: "TREASURY_ROLE",
} as const;

type DirectEngineAdminFunction = keyof typeof directEngineAdminFunctionRoles;
type EngineAdminRole = (typeof directEngineAdminFunctionRoles)[DirectEngineAdminFunction];

const routerConfigEventFunctions = {
  engine_config_proposed: "proposeConfig",
  engine_config_staged: "executeConfig",
  engine_config_cancelled: "cancelConfig",
} as const;

function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

function engineAdminCallPath(caller: string): string {
  const normalized = normalizeAddress(caller);
  if (normalized === approvedOpsRouter) return "ops_router";
  if (normalized === approvedBreakGlassSafe) return "break_glass";
  return "unknown_direct";
}

function isApprovedEngineAdminCaller(caller: string): boolean {
  const path = engineAdminCallPath(caller);
  return path === "ops_router" || path === "break_glass";
}

function isKnownProtocolAddress(address: string): boolean {
  const normalized = normalizeAddress(address);
  const known = new Set([
    normalizeAddress(CONTRACTS.token.address),
    normalizeAddress(CONTRACTS.engine.address),
    normalizeAddress(CONTRACTS.positionNft.address),
    normalizeAddress(CONTRACTS.bondDepositoryNft.address),
    normalizeAddress(CONTRACTS.bondVault.address),
    normalizeAddress(CONTRACTS.opsVault.address),
    approvedOpsRouter,
    approvedBreakGlassSafe,
  ]);

  if (TREASURY_ADDRESS) known.add(normalizeAddress(TREASURY_ADDRESS));
  if (FINAL_ADMIN_ADDRESS) known.add(normalizeAddress(FINAL_ADMIN_ADDRESS));
  return known.has(normalized);
}

function isApprovedRouterCaller(address: string): boolean {
  const normalized = normalizeAddress(address);
  if (normalized === approvedBreakGlassSafe) return true;
  if (FINAL_ADMIN_ADDRESS && normalized === normalizeAddress(FINAL_ADMIN_ADDRESS)) return true;
  if (TREASURY_ADDRESS && normalized === normalizeAddress(TREASURY_ADDRESS)) return true;
  return false;
}

async function insertAdminConfigEvent(context: any, values: any) {
  await context.db.insert(admin_config_events).values(values).onConflictDoNothing();
}

async function recordOpsRouterEvent(
  context: any,
  event: any,
  eventType: string,
) {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);
  const args = event.args as any;

  await context.db.insert(ops_router_events).values({
    id,
    chainId,
    eventType,
    routerAddress: normalizeAddress(event.log.address),
    caller: normalizeAddress(args.caller),
    target: args.to ? normalizeAddress(args.to) : null,
    amount: args.amount ?? null,
    configHash: args.configHash ?? null,
    executableAt: args.executableAt ?? null,
    stagedEpoch: args.stagedEpoch ?? null,
    trackedEmissionReserveAfter: args.trackedEmissionReserveAfter ?? null,
    blockNumber: event.block.number,
    blockHash: event.block.hash,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  }).onConflictDoNothing();

  if (!isApprovedRouterCaller(args.caller)) {
    await emitAlert(context.db, {
      ruleId: "unexpected_router_caller",
      fingerprintParts: [eventType, args.caller],
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      wallet: normalizeAddress(args.caller),
      sourceTable: "ops_router_events",
      sourceRowId: id,
      observedValue: normalizeAddress(args.caller),
      thresholdValue: "approved_router_operator",
      timestamp,
    });
  }

  if (eventType === "treasury_eth_fees_withdrawn" && args.amount >= largeTreasuryWithdrawalAmount) {
    await emitAlert(context.db, {
      ruleId: "large_treasury_withdrawal",
      fingerprintParts: [args.to ?? "unknown", args.amount / largeTreasuryWithdrawalAmount],
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      wallet: args.to ? normalizeAddress(args.to) : null,
      amount: args.amount,
      sourceTable: "ops_router_events",
      sourceRowId: id,
      observedValue: args.amount.toString(),
      thresholdValue: largeTreasuryWithdrawalAmount.toString(),
      timestamp,
    });
  }

  if (eventType in routerConfigEventFunctions) {
    await insertAdminConfigEvent(context, {
      id: `${id}-config`,
      chainId,
      source: "ops_router",
      eventType,
      functionName: routerConfigEventFunctions[eventType as keyof typeof routerConfigEventFunctions],
      contractAddress: normalizeAddress(event.log.address),
      actor: normalizeAddress(args.caller),
      caller: normalizeAddress(args.caller),
      role: "PARAM_ROLE",
      configHash: args.configHash ?? null,
      executableAt: args.executableAt ?? null,
      stagedEpoch: args.stagedEpoch ?? null,
      allowedCaller: 1,
      severity: 0,
      blockNumber: event.block.number,
      blockHash: event.block.hash,
      txHash: event.transaction.hash,
      eventIndex: event.log.logIndex,
      timestamp,
    });
  }

  await recordWalletActivity(context, event, event.log.address, `ops_router_${eventType}`, "NARAEngineOpsRouterV1", {
    amount: args.amount ?? null,
    counterparty: args.caller,
    suffix: "router",
  });
  await recordWalletActivity(context, event, args.caller, `ops_router_caller_${eventType}`, "NARAEngineOpsRouterV1", {
    amount: args.amount ?? null,
    counterparty: event.log.address,
    suffix: "caller",
  });
}

async function recordDirectEngineAdminCall(
  context: any,
  event: any,
  functionName: DirectEngineAdminFunction,
) {
  const timestamp = Number(event.block.timestamp);
  const caller = normalizeAddress(event.trace.from);
  const txFrom = normalizeAddress(event.transaction.from);
  const engineAddress = normalizeAddress(event.trace.to ?? "");
  const traceIndex = event.trace.traceIndex;
  const id = `${chainId}-${event.transaction.hash}-${traceIndex}`;
  const role: EngineAdminRole = directEngineAdminFunctionRoles[functionName];
  const callPath = engineAdminCallPath(caller);
  const allowedCaller = isApprovedEngineAdminCaller(caller);
  const severity = allowedCaller ? 0 : 5;
  const selector = event.trace.input?.slice(0, 10) ?? "0x";

  await context.db.insert(direct_engine_admin_call_events).values({
    id,
    chainId,
    engineAddress,
    caller,
    txFrom,
    functionName,
    selector,
    role,
    callPath,
    allowedCaller: allowedCaller ? 1 : 0,
    severity,
    blockNumber: event.block.number,
    blockHash: event.block.hash,
    txHash: event.transaction.hash,
    traceIndex,
    timestamp,
  }).onConflictDoNothing();

  await context.db.insert(admin_events).values({
    id: `${id}-admin`,
    chainId,
    eventType: "direct_engine_admin_call",
    contractAddress: engineAddress,
    actor: caller,
    target: role,
    valueNew: functionName,
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: traceIndex,
    timestamp,
  }).onConflictDoNothing();

  await insertAdminConfigEvent(context, {
    id: `${id}-config`,
    chainId,
    source: "direct_engine",
    eventType: "direct_engine_admin_call",
    functionName,
    contractAddress: engineAddress,
    actor: txFrom,
    caller,
    role,
    configHash: null,
    executableAt: null,
    stagedEpoch: null,
    allowedCaller: allowedCaller ? 1 : 0,
    severity,
    blockNumber: event.block.number,
    blockHash: event.block.hash,
    txHash: event.transaction.hash,
    eventIndex: traceIndex,
    timestamp,
  });

  if (!allowedCaller) {
    const description = `${functionName} (${role}) was called on NARAEngine by ${caller}; approved callers are ${approvedOpsRouter} and ${approvedBreakGlassSafe}.`;

    await emitAlert(context.db, {
      ruleId: "direct_engine_admin_call_unapproved",
      fingerprintParts: [role, functionName, caller],
      description,
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      wallet: caller,
      sourceTable: "direct_engine_admin_call_events",
      sourceRowId: id,
      observedValue: `${functionName}:${caller}`,
      thresholdValue: `approved:${approvedOpsRouter},${approvedBreakGlassSafe}`,
      timestamp,
    });

    await emitAlert(context.db, {
      ruleId: "param_or_treasury_direct_call_unapproved",
      fingerprintParts: [role, functionName, caller],
      description,
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      wallet: caller,
      sourceTable: "direct_engine_admin_call_events",
      sourceRowId: id,
      observedValue: `${role}:${functionName}:${caller}`,
      thresholdValue: "ops_router_or_break_glass",
      timestamp,
    });
  }

  await recordWalletActivity(context, event, caller, "direct_engine_admin_call", "NARAEngine", {
    counterparty: engineAddress,
    index: traceIndex,
    suffix: functionName,
  });
  await updateWalletScore(context.db, caller, timestamp, {
    riskScore: callPath === "unknown_direct" ? 1000n : callPath === "break_glass" ? 100n : 0n,
  });

  if (callPath === "ops_router") {
    await upsertWalletLabel(context.db, caller, "router", "direct_engine_admin_call", 100, "Caller is the approved ops router.", event.block.number, timestamp);
  } else if (callPath === "break_glass") {
    await upsertWalletLabel(context.db, caller, "break_glass", "direct_engine_admin_call", 100, "Caller is the approved break glass Safe.", event.block.number, timestamp);
  } else {
    await upsertWalletLabel(context.db, caller, "unknown", "direct_engine_admin_call", 90, "Caller used a PARAM_ROLE or TREASURY_ROLE function outside approved router/break glass path.", event.block.number, timestamp);
    await upsertWalletLabel(context.db, caller, "admin", "direct_engine_admin_call", 40, "Caller reached an engine admin function directly.", event.block.number, timestamp);
  }
}

// 1. ERC20 Token Handlers
ponder.on("NARAToken:Transfer", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(erc20_transfers).values({
    id,
    chainId,
    from: event.args.from,
    to: event.args.to,
    amount: event.args.value,
    blockNumber: event.block.number,
    blockHash: event.block.hash,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });

  await ensureWallet(context.db, event.args.from, event.block.number, timestamp);
  await ensureWallet(context.db, event.args.to, event.block.number, timestamp);

  await recordWalletActivity(context, event, event.args.to, "erc20_transfer_in", "NARAToken", {
    amount: event.args.value,
    token: CONTRACTS.token.address,
    counterparty: event.args.from,
    suffix: "in",
  });
  await updateWalletScore(context.db, event.args.to, timestamp, {
    transferInAmount: event.args.value,
    netTransferAmount: event.args.value,
    convictionScore: amountScore(event.args.value) / 10n,
    riskScore: 5n,
  });

  await recordWalletActivity(context, event, event.args.from, "erc20_transfer_out", "NARAToken", {
    amount: event.args.value,
    token: CONTRACTS.token.address,
    counterparty: event.args.to,
    suffix: "out",
  });
  const senderScore = await context.db.find(wallet_position_scores, {
    wallet: normalizeAddress(event.args.from),
    chainId,
  });
  if (
    senderScore &&
    senderScore.convictionScore >= highConvictionScoreThreshold &&
    event.args.value >= largeOutgoingTransferAmount
  ) {
    await emitAlert(context.db, {
      ruleId: "large_outgoing_transfer_high_conviction",
      fingerprintParts: [event.args.from, event.transaction.hash],
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      wallet: normalizeAddress(event.args.from),
      amount: event.args.value,
      sourceTable: "erc20_transfers",
      sourceRowId: id,
      observedValue: `${event.args.value}:${senderScore.convictionScore}`,
      thresholdValue: `${largeOutgoingTransferAmount}:${highConvictionScoreThreshold}`,
      timestamp,
    });
  }
  await updateWalletScore(context.db, event.args.from, timestamp, {
    transferOutAmount: event.args.value,
    netTransferAmount: -event.args.value,
    riskScore: event.args.value >= largeOutgoingTransferAmount ? 100n + amountScore(event.args.value) : 5n,
  });
});

// 2. Engine Lock/Unlock/Claim Handlers
ponder.on("NARAEngine:Locked", async ({ event, context }) => {
  const lockId = event.args.positionId;
  const id = `${chainId}-${lockId}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(locks).values({
    id,
    chainId,
    lockId,
    user: event.args.owner,
    amount: event.args.amount,
    activationEpoch: event.args.activationEpoch,
    unlockEpoch: event.args.unlockEpoch,
    weight: event.args.weight,
    status: "locked",
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });

  await ensureWallet(context.db, event.args.owner, event.block.number, timestamp);

  const durationEpochs = event.args.unlockEpoch - event.args.activationEpoch;
  const soonAmounts = unlockSoonAmounts(event.args.amount, durationEpochs, timestamp);

  await recordWalletActivity(context, event, event.args.owner, "lock", "NARAEngine", {
    amount: event.args.amount,
    token: CONTRACTS.token.address,
    positionId: event.args.positionId,
  });
  await updateWalletScore(context.db, event.args.owner, timestamp, {
    rawPositionCount: 1,
    lockedAmount: event.args.amount,
    activeLockedAmount: event.args.amount,
    unlocking24hAmount: soonAmounts.unlocking24hAmount,
    unlocking7dAmount: soonAmounts.unlocking7dAmount,
    durationSampleEpochs: durationEpochs,
    durationSampleCount: 1,
    convictionScore: lockConvictionScore(event.args.amount, durationEpochs, false, 0n),
    riskScore: lockRiskScore(event.args.amount, durationEpochs, timestamp),
  });

  if (event.args.amount >= whaleLockedAmount) {
    await upsertWalletLabel(context.db, event.args.owner, "whale", "position_score", 90, "Wallet locked at or above the configured whale threshold.", event.block.number, timestamp);
    await emitAlert(context.db, {
      ruleId: "wallet_concentration_above_threshold",
      fingerprintParts: [event.args.owner],
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      wallet: normalizeAddress(event.args.owner),
      positionId: event.args.positionId,
      amount: event.args.amount,
      viewName: "wallet_exposure_summary",
      sourceTable: "locks",
      sourceRowId: id,
      observedValue: event.args.amount.toString(),
      thresholdValue: whaleLockedAmount.toString(),
      timestamp,
    });
  }
  if (durationEpochs <= shortTermDurationEpochs) {
    await upsertWalletLabel(context.db, event.args.owner, "short_term_holder", "position_score", 80, "Wallet opened a short-duration lock.", event.block.number, timestamp);
    await emitAlert(context.db, {
      ruleId: "short_duration_lock_concentration",
      fingerprintParts: [event.args.owner],
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      wallet: normalizeAddress(event.args.owner),
      positionId: event.args.positionId,
      amount: event.args.amount,
      viewName: "wallet_exposure_summary",
      sourceTable: "locks",
      sourceRowId: id,
      observedValue: durationEpochs.toString(),
      thresholdValue: shortTermDurationEpochs.toString(),
      timestamp,
    });
  }
  if (durationEpochs >= longTermDurationEpochs) {
    await upsertWalletLabel(context.db, event.args.owner, "long_term_holder", "position_score", 80, "Wallet opened a long-duration lock.", event.block.number, timestamp);
  }

  if (soonAmounts.unlocking24hAmount >= largeUnlock24hAmount) {
    await emitAlert(context.db, {
      ruleId: "large_unlock_24h",
      fingerprintParts: [event.args.owner],
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      wallet: normalizeAddress(event.args.owner),
      positionId: event.args.positionId,
      amount: soonAmounts.unlocking24hAmount,
      viewName: "unlock_cliffs_24h",
      sourceTable: "locks",
      sourceRowId: id,
      observedValue: soonAmounts.unlocking24hAmount.toString(),
      thresholdValue: largeUnlock24hAmount.toString(),
      timestamp,
    });
  } else if (soonAmounts.unlocking24hAmount >= mediumUnlockAmount) {
    await emitAlert(context.db, {
      ruleId: "medium_unlock_cliff",
      fingerprintParts: [event.args.owner, event.args.positionId],
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      wallet: normalizeAddress(event.args.owner),
      positionId: event.args.positionId,
      amount: soonAmounts.unlocking24hAmount,
      viewName: "unlock_cliffs_24h",
      sourceTable: "locks",
      sourceRowId: id,
      observedValue: soonAmounts.unlocking24hAmount.toString(),
      thresholdValue: mediumUnlockAmount.toString(),
      timestamp,
    });
  }

  if (soonAmounts.unlocking7dAmount >= largeUnlock7dAmount) {
    await emitAlert(context.db, {
      ruleId: "large_unlock_7d",
      fingerprintParts: [event.args.owner],
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      wallet: normalizeAddress(event.args.owner),
      positionId: event.args.positionId,
      amount: soonAmounts.unlocking7dAmount,
      viewName: "unlock_cliffs_7d",
      sourceTable: "locks",
      sourceRowId: id,
      observedValue: soonAmounts.unlocking7dAmount.toString(),
      thresholdValue: largeUnlock7dAmount.toString(),
      timestamp,
    });
  }
});

ponder.on("NARAEngine:Unlocked", async ({ event, context }) => {
  const lockId = event.args.positionId;
  const id = `${chainId}-${lockId}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.update(locks, { id }).set({
    status: "unlocked",
    unlockedAtBlock: event.block.number,
    unlockedAtTimestamp: timestamp,
    unlockTxHash: event.transaction.hash,
    unlockTo: event.args.owner,
  });

  await recordWalletActivity(context, event, event.args.owner, "unlock", "NARAEngine", {
    amount: event.args.amount,
    token: CONTRACTS.token.address,
    positionId: event.args.positionId,
  });
  await updateWalletScore(context.db, event.args.owner, timestamp, {
    activeLockedAmount: -event.args.amount,
    unlockedAmount: event.args.amount,
    riskScore: amountScore(event.args.amount) / 5n,
  });
});

ponder.on("NARAEngine:Extended", async ({ event, context }) => {
  const lockId = event.args.positionId;
  const id = `${chainId}-${lockId}`;

  const existing = await context.db.find(locks, { id });
  if (existing) {
    await context.db.update(locks, { id }).set({
      unlockEpoch: event.args.newUnlockEpoch,
      weight: event.args.newWeight,
    });
  }
});

ponder.on("NARAEngine:RewardsClaimed", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  if (event.args.naraAmount !== 0n) {
    await context.db.insert(claims).values({
      id: `${id}-nara`,
      chainId,
      user: event.args.to,
      rewardToken: CONTRACTS.token.address,
      amount: event.args.naraAmount,
      naraFeeAmount: 0n,
      tokenFeeAmount: 0n,
      blockNumber: event.block.number,
      txHash: event.transaction.hash,
      logIndex: event.log.logIndex,
      timestamp,
    });

    await recordWalletActivity(context, event, event.args.to, "claim_nara", "NARAEngine", {
      amount: event.args.naraAmount,
      token: CONTRACTS.token.address,
      positionId: event.args.positionId,
      suffix: "nara",
    });
  }

  if (event.args.ethAmount !== 0n) {
    await context.db.insert(claims).values({
      id: `${id}-eth`,
      chainId,
      user: event.args.to,
      rewardToken: ZERO_ADDRESS,
      amount: event.args.ethAmount,
      naraFeeAmount: 0n,
      tokenFeeAmount: 0n,
      blockNumber: event.block.number,
      txHash: event.transaction.hash,
      logIndex: event.log.logIndex,
      timestamp,
    });

    await recordWalletActivity(context, event, event.args.to, "claim_eth", "NARAEngine", {
      amount: event.args.ethAmount,
      token: ZERO_ADDRESS,
      positionId: event.args.positionId,
      suffix: "eth",
    });
  }

  if (event.args.naraAmount !== 0n || event.args.ethAmount !== 0n) {
    await updateWalletScore(context.db, event.args.to, timestamp, {
      claimCount: 1,
      claimNaraAmount: event.args.naraAmount,
      claimEthAmount: event.args.ethAmount,
      convictionScore: 25n,
    });
  }
});

ponder.on("NARAEngine:TokenRewardsClaimed", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(claims).values({
    id,
    chainId,
    user: event.args.to,
    rewardToken: event.args.token,
    amount: event.args.amount,
    naraFeeAmount: 0n,
    tokenFeeAmount: 0n,
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });

  await recordWalletActivity(context, event, event.args.to, "claim_token", "NARAEngine", {
    amount: event.args.amount,
    token: event.args.token,
    positionId: event.args.positionId,
  });
  await updateWalletScore(context.db, event.args.to, timestamp, {
    claimCount: 1,
    claimTokenAmount: event.args.amount,
    convictionScore: 25n,
  });
});

// 3. Engine Ops Router Observed Event Handlers
ponder.on("NARAEngineOpsRouterV1:EngineConfigProposedObserved", async ({ event, context }) => {
  await recordOpsRouterEvent(context, event, "engine_config_proposed");
});

ponder.on("NARAEngineOpsRouterV1:EngineConfigStagedObserved", async ({ event, context }) => {
  await recordOpsRouterEvent(context, event, "engine_config_staged");
});

ponder.on("NARAEngineOpsRouterV1:EngineConfigCancelledObserved", async ({ event, context }) => {
  await recordOpsRouterEvent(context, event, "engine_config_cancelled");
});

ponder.on("NARAEngineOpsRouterV1:TreasuryEthFeesWithdrawnObserved", async ({ event, context }) => {
  await recordOpsRouterEvent(context, event, "treasury_eth_fees_withdrawn");
});

ponder.on("NARAEngineOpsRouterV1:EmissionReserveDepositedObserved", async ({ event, context }) => {
  await recordOpsRouterEvent(context, event, "emission_reserve_deposited");
});

ponder.on("NARAEngineOpsRouterV1:EmissionReserveSyncedObserved", async ({ event, context }) => {
  await recordOpsRouterEvent(context, event, "emission_reserve_synced");
});

// 4. Direct Engine Admin Call Trace Handlers
ponder.on("NARAEngine.proposeConfig()", async ({ event, context }) => {
  await recordDirectEngineAdminCall(context, event, "proposeConfig");
});

ponder.on("NARAEngine.executeConfig()", async ({ event, context }) => {
  await recordDirectEngineAdminCall(context, event, "executeConfig");
});

ponder.on("NARAEngine.cancelConfig()", async ({ event, context }) => {
  await recordDirectEngineAdminCall(context, event, "cancelConfig");
});

ponder.on("NARAEngine.setLockFee()", async ({ event, context }) => {
  await recordDirectEngineAdminCall(context, event, "setLockFee");
});

ponder.on("NARAEngine.setClaimFee()", async ({ event, context }) => {
  await recordDirectEngineAdminCall(context, event, "setClaimFee");
});

ponder.on("NARAEngine.setLockEthFee()", async ({ event, context }) => {
  await recordDirectEngineAdminCall(context, event, "setLockEthFee");
});

ponder.on("NARAEngine.setUnlockEthFee()", async ({ event, context }) => {
  await recordDirectEngineAdminCall(context, event, "setUnlockEthFee");
});

ponder.on("NARAEngine.setTreasury()", async ({ event, context }) => {
  await recordDirectEngineAdminCall(context, event, "setTreasury");
});

ponder.on("NARAEngine.setRewardReserve()", async ({ event, context }) => {
  await recordDirectEngineAdminCall(context, event, "setRewardReserve");
});

ponder.on("NARAEngine.setBondVault()", async ({ event, context }) => {
  await recordDirectEngineAdminCall(context, event, "setBondVault");
});

ponder.on("NARAEngine.withdrawTreasuryEthFees()", async ({ event, context }) => {
  await recordDirectEngineAdminCall(context, event, "withdrawTreasuryEthFees");
});

// 5. NFT Wrapping Handlers
ponder.on("NARAPositionNFT:PositionMinted", async ({ event, context }) => {
  const tokenId = positionTokenId(event.args.tokenId);
  const timestamp = Number(event.block.timestamp);

  const existing = await context.db.find(nfts, { tokenId });
  if (existing) {
    await context.db.update(nfts, { tokenId }).set({
      positionId: event.args.positionId,
      minter: event.args.minter,
      owner: event.args.owner,
      positionAccount: event.args.account,
      principalAmount: event.args.amount,
      durationEpochs: event.args.durationEpochs,
    });
  } else {
    await context.db.insert(nfts).values({
      tokenId,
      chainId,
      tokenIdRaw: event.args.tokenId,
      positionId: event.args.positionId,
      minter: event.args.minter,
      owner: event.args.owner,
      positionAccount: event.args.account,
      principalAmount: event.args.amount,
      durationEpochs: event.args.durationEpochs,
      tier: 0,
      isGenesis: 0,
      isEternal: 0,
      mintedAtBlock: event.block.number,
      mintedAtTimestamp: timestamp,
      lastOwnerUpdateBlock: event.block.number,
      lastOwnerUpdateTimestamp: timestamp,
    });

  }

  await recordPositionEvent(context, event, "position_minted", {
    tokenId,
    positionId: event.args.positionId,
    owner: event.args.owner,
    to: event.args.owner,
    amount: event.args.amount,
    metadata: {
      minter: event.args.minter,
      account: event.args.account,
      durationEpochs: event.args.durationEpochs,
    },
  });

  await ensureWallet(context.db, event.args.minter, event.block.number, timestamp);
  await ensureWallet(context.db, event.args.owner, event.block.number, timestamp);

  const soonAmounts = unlockSoonAmounts(event.args.amount, BigInt(event.args.durationEpochs), timestamp);
  await recordWalletActivity(context, event, event.args.owner, "position_minted", "NARAPositionNFT", {
    amount: event.args.amount,
    token: CONTRACTS.token.address,
    positionId: event.args.positionId,
    tokenId,
  });
  await updateWalletScore(context.db, event.args.owner, timestamp, {
    wrappedPositionCount: 1,
    lockedAmount: event.args.amount,
    activeLockedAmount: event.args.amount,
    unlocking24hAmount: soonAmounts.unlocking24hAmount,
    unlocking7dAmount: soonAmounts.unlocking7dAmount,
    durationSampleEpochs: BigInt(event.args.durationEpochs),
    durationSampleCount: 1,
    convictionScore: lockConvictionScore(event.args.amount, BigInt(event.args.durationEpochs), true, 0n),
    riskScore: lockRiskScore(event.args.amount, BigInt(event.args.durationEpochs), timestamp),
  });
  await upsertWalletLabel(context.db, event.args.account, "contract", "position_minted", 70, "NARAPositionAccount clone that owns an engine position.", event.block.number, timestamp);

  if (event.args.amount >= whaleLockedAmount) {
    await upsertWalletLabel(context.db, event.args.owner, "whale", "position_score", 90, "Wallet minted an NFT position at or above the configured whale threshold.", event.block.number, timestamp);
    await emitAlert(context.db, {
      ruleId: "wallet_concentration_above_threshold",
      fingerprintParts: [event.args.owner],
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      wallet: normalizeAddress(event.args.owner),
      positionId: event.args.positionId,
      tokenId,
      amount: event.args.amount,
      viewName: "wallet_exposure_summary",
      sourceTable: "nfts",
      sourceRowId: tokenId,
      observedValue: event.args.amount.toString(),
      thresholdValue: whaleLockedAmount.toString(),
      timestamp,
    });
  }
  if (BigInt(event.args.durationEpochs) <= shortTermDurationEpochs) {
    await upsertWalletLabel(context.db, event.args.owner, "short_term_holder", "position_score", 80, "Wallet minted a short-duration NFT position.", event.block.number, timestamp);
    await emitAlert(context.db, {
      ruleId: "short_duration_lock_concentration",
      fingerprintParts: [event.args.owner],
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      wallet: normalizeAddress(event.args.owner),
      positionId: event.args.positionId,
      tokenId,
      amount: event.args.amount,
      viewName: "wallet_exposure_summary",
      sourceTable: "nfts",
      sourceRowId: tokenId,
      observedValue: event.args.durationEpochs.toString(),
      thresholdValue: shortTermDurationEpochs.toString(),
      timestamp,
    });
  }
  if (BigInt(event.args.durationEpochs) >= longTermDurationEpochs) {
    await upsertWalletLabel(context.db, event.args.owner, "long_term_holder", "position_score", 80, "Wallet minted a long-duration NFT position.", event.block.number, timestamp);
  }

  if (soonAmounts.unlocking24hAmount >= largeUnlock24hAmount) {
    await emitAlert(context.db, {
      ruleId: "large_unlock_24h",
      fingerprintParts: [event.args.owner],
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      wallet: normalizeAddress(event.args.owner),
      positionId: event.args.positionId,
      tokenId,
      amount: soonAmounts.unlocking24hAmount,
      viewName: "unlock_cliffs_24h",
      sourceTable: "nfts",
      sourceRowId: tokenId,
      observedValue: soonAmounts.unlocking24hAmount.toString(),
      thresholdValue: largeUnlock24hAmount.toString(),
      timestamp,
    });
  } else if (soonAmounts.unlocking24hAmount >= mediumUnlockAmount) {
    await emitAlert(context.db, {
      ruleId: "medium_unlock_cliff",
      fingerprintParts: [event.args.owner, event.args.positionId],
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      wallet: normalizeAddress(event.args.owner),
      positionId: event.args.positionId,
      tokenId,
      amount: soonAmounts.unlocking24hAmount,
      viewName: "unlock_cliffs_24h",
      sourceTable: "nfts",
      sourceRowId: tokenId,
      observedValue: soonAmounts.unlocking24hAmount.toString(),
      thresholdValue: mediumUnlockAmount.toString(),
      timestamp,
    });
  }

  if (soonAmounts.unlocking7dAmount >= largeUnlock7dAmount) {
    await emitAlert(context.db, {
      ruleId: "large_unlock_7d",
      fingerprintParts: [event.args.owner],
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      wallet: normalizeAddress(event.args.owner),
      positionId: event.args.positionId,
      tokenId,
      amount: soonAmounts.unlocking7dAmount,
      viewName: "unlock_cliffs_7d",
      sourceTable: "nfts",
      sourceRowId: tokenId,
      observedValue: soonAmounts.unlocking7dAmount.toString(),
      thresholdValue: largeUnlock7dAmount.toString(),
      timestamp,
    });
  }
});

ponder.on("NARAPositionNFT:GenesisPositionMinted", async ({ event, context }) => {
  const tokenId = positionTokenId(event.args.tokenId);
  const timestamp = Number(event.block.timestamp);

  const existing = await context.db.find(nfts, { tokenId });
  if (existing) {
    await context.db.update(nfts, { tokenId }).set({
      positionId: event.args.positionId,
      tier: event.args.tierId,
      isGenesis: 1,
      isEternal: event.args.eternal ? 1 : 0,
      genesisRoundId: event.args.roundId,
      genesisTierId: event.args.tierId,
      genesisRewardMultiplierBps: event.args.rewardMultiplierBps,
      genesisRewardWeight: event.args.rewardWeight,
    });
  } else {
    await context.db.insert(nfts).values({
      tokenId,
      chainId,
      tokenIdRaw: event.args.tokenId,
      positionId: event.args.positionId,
      owner: ZERO_ADDRESS,
      tier: event.args.tierId,
      isGenesis: 1,
      isEternal: event.args.eternal ? 1 : 0,
      genesisRoundId: event.args.roundId,
      genesisTierId: event.args.tierId,
      genesisRewardMultiplierBps: event.args.rewardMultiplierBps,
      genesisRewardWeight: event.args.rewardWeight,
      mintedAtBlock: event.block.number,
      mintedAtTimestamp: timestamp,
    });
  }

  await recordPositionEvent(context, event, "genesis_position_minted", {
    tokenId,
    positionId: event.args.positionId,
    owner: existing?.owner ?? ZERO_ADDRESS,
    amount: event.args.rewardWeight,
    metadata: {
      roundId: event.args.roundId,
      tierId: event.args.tierId,
      rewardMultiplierBps: event.args.rewardMultiplierBps,
      rewardWeight: event.args.rewardWeight,
      eternal: event.args.eternal,
    },
  });

  if (existing?.owner && existing.owner !== ZERO_ADDRESS) {
    await recordWalletActivity(context, event, existing.owner, "genesis_position_minted", "NARAPositionNFT", {
      amount: event.args.rewardWeight,
      positionId: event.args.positionId,
      tokenId,
    });
    await updateWalletScore(context.db, existing.owner, timestamp, {
      genesisPositionCount: 1,
      genesisRewardWeight: event.args.rewardWeight,
      convictionScore: 500n + amountScore(event.args.rewardWeight),
    });
    await upsertWalletLabel(context.db, existing.owner, "genesis_holder", "genesis_position_minted", 95, "Wallet owns an NFT with Genesis metadata.", event.block.number, timestamp);
  } else {
    await upsertWalletLabel(context.db, ZERO_ADDRESS, "unknown", "genesis_position_minted", 100, "Genesis owner unknown until ERC721 Transfer is indexed.", event.block.number, timestamp);
  }
});

ponder.on("NARAPositionNFT:Transfer", async ({ event, context }) => {
  const tokenId = positionTokenId(event.args.tokenId);
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  const existing = await context.db.find(nfts, { tokenId });
  if (existing) {
    await context.db.update(nfts, { tokenId }).set({
      owner: event.args.to,
      lastOwnerUpdateBlock: event.block.number,
      lastOwnerUpdateTimestamp: timestamp,
    });
  } else {
    await context.db.insert(nfts).values({
      tokenId,
      chainId,
      tokenIdRaw: event.args.tokenId,
      positionId: null,
      owner: event.args.to,
      tier: 0,
      isGenesis: 0,
      isEternal: 0,
      mintedAtBlock: event.block.number,
      mintedAtTimestamp: timestamp,
      lastOwnerUpdateBlock: event.block.number,
      lastOwnerUpdateTimestamp: timestamp,
    });

    await emitAlert(context.db, {
      ruleId: "nft_metadata_missing",
      fingerprintParts: [tokenId],
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      wallet: normalizeAddress(event.args.to),
      tokenId,
      viewName: "nft_without_position_metadata",
      sourceTable: "nfts",
      sourceRowId: tokenId,
      observedValue: "positionId:null",
      thresholdValue: "positionId:not_null",
      timestamp,
    });
  }

  await context.db.insert(nft_transfers).values({
    id,
    chainId,
    tokenId,
    from: event.args.from,
    to: event.args.to,
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });

  await recordPositionEvent(context, event, "nft_transfer", {
    tokenId,
    positionId: existing?.positionId ?? null,
    owner: event.args.to,
    to: event.args.to,
    metadata: {
      from: event.args.from,
      to: event.args.to,
    },
  });

  await ensureWallet(context.db, event.args.from, event.block.number, timestamp);
  await ensureWallet(context.db, event.args.to, event.block.number, timestamp);

  await recordWalletActivity(context, event, event.args.to, "nft_transfer_in", "NARAPositionNFT", {
    tokenId,
    positionId: existing?.positionId ?? null,
    counterparty: event.args.from,
    suffix: "in",
  });
  await recordWalletActivity(context, event, event.args.from, "nft_transfer_out", "NARAPositionNFT", {
    tokenId,
    positionId: existing?.positionId ?? null,
    counterparty: event.args.to,
    suffix: "out",
  });
  await updateWalletScore(context.db, event.args.to, timestamp, {
    convictionScore: existing?.isGenesis === 1 ? 100n : 25n,
  });

  if (existing?.isGenesis === 1 && event.args.to !== ZERO_ADDRESS) {
    await upsertWalletLabel(context.db, event.args.to, "genesis_holder", "nft_transfer", 90, "Wallet received an NFT with Genesis metadata.", event.block.number, timestamp);
    if (existing.owner === ZERO_ADDRESS) {
      await updateWalletScore(context.db, event.args.to, timestamp, {
        genesisPositionCount: 1,
        genesisRewardWeight: existing.genesisRewardWeight ?? 0n,
        convictionScore: 500n + amountScore(existing.genesisRewardWeight ?? 0n),
      });
    }
  }
});

ponder.on("NARAPositionNFT:PositionRewardsClaimed", async ({ event, context }) => {
  const tokenId = positionTokenId(event.args.tokenId);
  const existing = await context.db.find(nfts, { tokenId });

  await recordPositionClaimEvent(context, event, "position_rewards_claimed", {
    tokenId,
    positionId: event.args.positionId,
    user: existing?.owner ?? null,
    to: event.args.to,
    rewardToken: "nara_eth",
    naraAmount: event.args.naraAmount,
    ethAmount: event.args.ethAmount,
  });

  if (event.args.naraAmount !== 0n) {
    await recordWalletActivity(context, event, event.args.to, "position_claim_nara", "NARAPositionNFT", {
      amount: event.args.naraAmount,
      token: CONTRACTS.token.address,
      positionId: event.args.positionId,
      tokenId,
      suffix: "nara",
    });
  }
  if (event.args.ethAmount !== 0n) {
    await recordWalletActivity(context, event, event.args.to, "position_claim_eth", "NARAPositionNFT", {
      amount: event.args.ethAmount,
      token: ZERO_ADDRESS,
      positionId: event.args.positionId,
      tokenId,
      suffix: "eth",
    });
  }
  if (event.args.naraAmount !== 0n || event.args.ethAmount !== 0n) {
    await updateWalletScore(context.db, event.args.to, Number(event.block.timestamp), {
      claimCount: 1,
      claimNaraAmount: event.args.naraAmount,
      claimEthAmount: event.args.ethAmount,
      convictionScore: 25n,
    });
  }

  await ensureWallet(context.db, event.args.to, event.block.number, Number(event.block.timestamp));
});

ponder.on("NARAPositionNFT:PositionTokenRewardsClaimed", async ({ event, context }) => {
  const tokenId = positionTokenId(event.args.tokenId);
  const existing = await context.db.find(nfts, { tokenId });

  await recordPositionClaimEvent(context, event, "position_token_rewards_claimed", {
    tokenId,
    positionId: event.args.positionId,
    user: existing?.owner ?? null,
    to: event.args.to,
    rewardToken: event.args.token,
    tokenAmount: event.args.amount,
  });

  await recordWalletActivity(context, event, event.args.to, "position_claim_token", "NARAPositionNFT", {
    amount: event.args.amount,
    token: event.args.token,
    positionId: event.args.positionId,
    tokenId,
  });
  await updateWalletScore(context.db, event.args.to, Number(event.block.timestamp), {
    claimCount: 1,
    claimTokenAmount: event.args.amount,
    convictionScore: 25n,
  });

  await ensureWallet(context.db, event.args.to, event.block.number, Number(event.block.timestamp));
});

ponder.on("NARAPositionNFT:ClosedPositionTokenRewardsClaimed", async ({ event, context }) => {
  await recordPositionClaimEvent(context, event, "closed_position_token_rewards_claimed", {
    tokenId: null,
    positionId: event.args.positionId,
    user: null,
    to: event.args.to,
    rewardToken: event.args.token,
    tokenAmount: event.args.amount,
  });

  await recordWalletActivity(context, event, event.args.to, "closed_position_claim_token", "NARAPositionNFT", {
    amount: event.args.amount,
    token: event.args.token,
    positionId: event.args.positionId,
  });
  await updateWalletScore(context.db, event.args.to, Number(event.block.timestamp), {
    claimCount: 1,
    claimTokenAmount: event.args.amount,
    convictionScore: 25n,
  });

  await ensureWallet(context.db, event.args.to, event.block.number, Number(event.block.timestamp));
});

ponder.on("NARAPositionNFT:GenesisEthClaimed", async ({ event, context }) => {
  const tokenId = positionTokenId(event.args.tokenId);
  const existing = await context.db.find(nfts, { tokenId });

  await recordPositionClaimEvent(context, event, "genesis_eth_claimed", {
    tokenId,
    positionId: existing?.positionId ?? null,
    user: existing?.owner ?? null,
    to: event.args.to,
    rewardToken: ZERO_ADDRESS,
    ethAmount: event.args.amount,
  });

  await recordWalletActivity(context, event, event.args.to, "genesis_claim_eth", "NARAPositionNFT", {
    amount: event.args.amount,
    token: ZERO_ADDRESS,
    positionId: existing?.positionId ?? null,
    tokenId,
  });
  await updateWalletScore(context.db, event.args.to, Number(event.block.timestamp), {
    claimCount: 1,
    claimEthAmount: event.args.amount,
    convictionScore: 25n,
  });

  await ensureWallet(context.db, event.args.to, event.block.number, Number(event.block.timestamp));
});

ponder.on("NARAPositionNFT:GenesisTokenClaimed", async ({ event, context }) => {
  const tokenId = positionTokenId(event.args.tokenId);
  const existing = await context.db.find(nfts, { tokenId });

  await recordPositionClaimEvent(context, event, "genesis_token_claimed", {
    tokenId,
    positionId: existing?.positionId ?? null,
    user: existing?.owner ?? null,
    to: event.args.to,
    rewardToken: "genesis_token",
    tokenAmount: event.args.amount,
  });

  await recordWalletActivity(context, event, event.args.to, "genesis_claim_token", "NARAPositionNFT", {
    amount: event.args.amount,
    token: "genesis_token",
    positionId: existing?.positionId ?? null,
    tokenId,
  });
  await updateWalletScore(context.db, event.args.to, Number(event.block.timestamp), {
    claimCount: 1,
    claimTokenAmount: event.args.amount,
    convictionScore: 25n,
  });

  await ensureWallet(context.db, event.args.to, event.block.number, Number(event.block.timestamp));
});

ponder.on("NARAPositionNFT:PositionUnlocked", async ({ event, context }) => {
  const tokenId = positionTokenId(event.args.tokenId);

  await recordPositionEvent(context, event, "position_unlocked", {
    tokenId,
    positionId: event.args.positionId,
    to: event.args.to,
    metadata: {
      to: event.args.to,
    },
  });

  await recordWalletActivity(context, event, event.args.to, "position_unlocked", "NARAPositionNFT", {
    positionId: event.args.positionId,
    tokenId,
  });
  await updateWalletScore(context.db, event.args.to, Number(event.block.timestamp), {
    riskScore: 25n,
  });

  await ensureWallet(context.db, event.args.to, event.block.number, Number(event.block.timestamp));
});

ponder.on("NARAPositionNFT:PositionExtended", async ({ event, context }) => {
  const tokenId = positionTokenId(event.args.tokenId);
  const existing = await context.db.find(nfts, { tokenId });

  await recordPositionEvent(context, event, "position_extended", {
    tokenId,
    positionId: event.args.positionId,
    owner: existing?.owner ?? null,
    amount: BigInt(event.args.additionalEpochs),
    metadata: {
      additionalEpochs: event.args.additionalEpochs,
    },
  });

  if (existing?.owner && existing.owner !== ZERO_ADDRESS) {
    await recordWalletActivity(context, event, existing.owner, "position_extended", "NARAPositionNFT", {
      amount: BigInt(event.args.additionalEpochs),
      positionId: event.args.positionId,
      tokenId,
    });
    await updateWalletScore(context.db, existing.owner, Number(event.block.timestamp), {
      convictionScore: BigInt(event.args.additionalEpochs) * 10n,
    });
  }
});

ponder.on("NARAPositionNFT:EternalGenesisBurned", async ({ event, context }) => {
  const tokenId = positionTokenId(event.args.tokenId);

  await recordPositionEvent(context, event, "eternal_genesis_burned", {
    tokenId,
    positionId: event.args.positionId,
    owner: event.args.account,
    amount: event.args.rewardWeightRemoved,
    metadata: {
      account: event.args.account,
      rewardWeightRemoved: event.args.rewardWeightRemoved,
    },
  });

  await recordWalletActivity(context, event, event.args.account, "eternal_genesis_burned", "NARAPositionNFT", {
    amount: event.args.rewardWeightRemoved,
    positionId: event.args.positionId,
    tokenId,
  });
  await updateWalletScore(context.db, event.args.account, Number(event.block.timestamp), {
    genesisRewardWeight: -event.args.rewardWeightRemoved,
    riskScore: 50n,
  });
});

// 6. Admin Event Handlers
ponder.on("NARAEngine:RoleGranted", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(admin_events).values({
    id,
    chainId,
    eventType: "role_grant",
    contractAddress: event.log.address,
    actor: event.args.sender,
    target: event.args.role,
    valueNew: event.args.account,
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });

  if (!isKnownProtocolAddress(event.args.account)) {
    await emitAlert(context.db, {
      ruleId: "role_granted_to_unknown_address",
      fingerprintParts: [event.args.role, event.args.account],
      txHash: event.transaction.hash,
      blockNumber: event.block.number,
      wallet: normalizeAddress(event.args.account),
      sourceTable: "admin_events",
      sourceRowId: id,
      observedValue: `${event.args.role}:${normalizeAddress(event.args.account)}`,
      thresholdValue: "known_protocol_address",
      timestamp,
    });
  }
});

ponder.on("NARAEngine:RoleRevoked", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(admin_events).values({
    id,
    chainId,
    eventType: "role_revoke",
    contractAddress: event.log.address,
    actor: event.args.sender,
    target: event.args.role,
    valueOld: event.args.account,
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });

});

ponder.on("NARAEngine:UintParameterSet", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(admin_events).values({
    id,
    chainId,
    eventType: "param_change",
    contractAddress: event.log.address,
    actor: event.transaction.from,
    target: event.args.parameter,
    valueNew: event.args.value.toString(),
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });

});

// NARAEngine:RoleAdminChanged
ponder.on("NARAEngine:RoleAdminChanged", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(admin_events).values({
    id,
    chainId,
    eventType: "role_admin_change",
    contractAddress: event.log.address,
    actor: event.transaction.from,
    target: event.args.role,
    valueOld: event.args.previousAdminRole,
    valueNew: event.args.newAdminRole,
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });

  await emitAlert(context.db, {
    ruleId: "role_admin_changed",
    fingerprintParts: [event.args.role, event.args.newAdminRole],
    txHash: event.transaction.hash,
    blockNumber: event.block.number,
    sourceTable: "admin_events",
    sourceRowId: id,
    observedValue: `${event.args.previousAdminRole}:${event.args.newAdminRole}`,
    thresholdValue: "role_admin_unchanged",
    timestamp,
  });
});

// NARAEngine:AddressParameterSet
ponder.on("NARAEngine:AddressParameterSet", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(admin_events).values({
    id,
    chainId,
    eventType: "param_change",
    contractAddress: event.log.address,
    actor: event.transaction.from,
    target: event.args.parameter,
    valueNew: event.args.value,
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });
});

// NARAEngine:EthRewardsQueued
ponder.on("NARAEngine:EthRewardsQueued", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(admin_events).values({
    id,
    chainId,
    eventType: "eth_rewards_queued",
    contractAddress: event.log.address,
    actor: event.transaction.from,
    valueNew: event.args.amount.toString(),
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });
});

// NARAEngine:TokenRewardsNotified
ponder.on("NARAEngine:TokenRewardsNotified", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(admin_events).values({
    id,
    chainId,
    eventType: "token_rewards_notified",
    contractAddress: event.log.address,
    actor: event.transaction.from,
    target: event.args.token,
    valueNew: event.args.amount.toString(),
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });
});

// NARAPositionNFT:OwnershipTransferred
ponder.on("NARAPositionNFT:OwnershipTransferred", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(admin_events).values({
    id,
    chainId,
    eventType: "ownership_transfer",
    contractAddress: event.log.address,
    actor: event.args.previousOwner,
    valueNew: event.args.newOwner,
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });
});

// NARAPositionNFT:Approval
ponder.on("NARAPositionNFT:Approval", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(admin_events).values({
    id,
    chainId,
    eventType: "nft_approval",
    contractAddress: event.log.address,
    actor: event.args.owner,
    target: event.args.approved,
    valueNew: event.args.tokenId.toString(),
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });
});

// NARAPositionNFT:ApprovalForAll
ponder.on("NARAPositionNFT:ApprovalForAll", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(admin_events).values({
    id,
    chainId,
    eventType: "nft_approval_all",
    contractAddress: event.log.address,
    actor: event.args.owner,
    target: event.args.operator,
    valueNew: event.args.approved ? "true" : "false",
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });
});

// NARAToken:Approval
ponder.on("NARAToken:Approval", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(admin_events).values({
    id,
    chainId,
    eventType: "token_approval",
    contractAddress: event.log.address,
    actor: event.args.owner,
    target: event.args.spender,
    valueNew: event.args.value.toString(),
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });
});

// NARABondDepositoryV4NFT:BondCreated
ponder.on("NARABondDepositoryV4NFT:BondCreated", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(admin_events).values({
    id,
    chainId,
    eventType: "bond_created",
    contractAddress: event.log.address,
    actor: event.args.buyer,
    target: event.args.tokenId.toString(),
    valueNew: event.args.payout.toString(),
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });

  await ensureWallet(context.db, event.args.buyer, event.block.number, timestamp);
  await ensureWallet(context.db, event.args.recipient, event.block.number, timestamp);

  const tokenId = positionTokenId(event.args.tokenId);
  await recordWalletActivity(context, event, event.args.buyer, "bond_created", "NARABondDepositoryV4NFT", {
    amount: event.args.ethIn,
    token: ZERO_ADDRESS,
    positionId: event.args.positionId,
    tokenId,
    counterparty: event.args.recipient,
    suffix: "buyer",
  });
  await recordWalletActivity(context, event, event.args.recipient, "bond_received", "NARABondDepositoryV4NFT", {
    amount: event.args.payout,
    token: CONTRACTS.token.address,
    positionId: event.args.positionId,
    tokenId,
    counterparty: event.args.buyer,
    suffix: "recipient",
  });
  await upsertWalletLabel(context.db, event.args.recipient, "genesis_holder", "bond_created", 80, "Wallet received a bond-created Genesis NFT position.", event.block.number, timestamp);
});

// NARABondDepositoryV4NFT:CapacityAdded
ponder.on("NARABondDepositoryV4NFT:CapacityAdded", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(admin_events).values({
    id,
    chainId,
    eventType: "capacity_added",
    contractAddress: event.log.address,
    actor: event.transaction.from,
    valueNew: event.args.amount.toString(),
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });
});

// NARABondDepositoryV4NFT:ExcessReturnedToVault
ponder.on("NARABondDepositoryV4NFT:ExcessReturnedToVault", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(admin_events).values({
    id,
    chainId,
    eventType: "excess_returned",
    contractAddress: event.log.address,
    actor: event.transaction.from,
    valueNew: event.args.amount.toString(),
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });
});

// NARABondDepositoryV4NFT:Paused
ponder.on("NARABondDepositoryV4NFT:Paused", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(admin_events).values({
    id,
    chainId,
    eventType: "pause",
    contractAddress: event.log.address,
    actor: event.args.account,
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });
});

// NARABondDepositoryV4NFT:Unpaused
ponder.on("NARABondDepositoryV4NFT:Unpaused", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(admin_events).values({
    id,
    chainId,
    eventType: "unpause",
    contractAddress: event.log.address,
    actor: event.args.account,
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });
});

// NARABondVault:PulledToMarket
ponder.on("NARABondVault:PulledToMarket", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(admin_events).values({
    id,
    chainId,
    eventType: "vault_pull",
    contractAddress: event.log.address,
    actor: event.args.market,
    valueNew: event.args.amount.toString(),
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });
});

// NARABondVault:ReturnedFromMarket
ponder.on("NARABondVault:ReturnedFromMarket", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(admin_events).values({
    id,
    chainId,
    eventType: "vault_return",
    contractAddress: event.log.address,
    actor: event.args.market,
    valueNew: event.args.amount.toString(),
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });
});

// NARABondVault:ReleaseCapChanged
ponder.on("NARABondVault:ReleaseCapChanged", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(admin_events).values({
    id,
    chainId,
    eventType: "param_change",
    contractAddress: event.log.address,
    actor: event.transaction.from,
    target: "releaseCap",
    valueOld: event.args.oldCap.toString(),
    valueNew: event.args.newCap.toString(),
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });
});

// NARABondVault:MarketChanged
ponder.on("NARABondVault:MarketChanged", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(admin_events).values({
    id,
    chainId,
    eventType: "param_change",
    contractAddress: event.log.address,
    actor: event.transaction.from,
    target: "market",
    valueOld: event.args.oldMarket,
    valueNew: event.args.newMarket,
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });
});

// NARAOpsVault:Funded
ponder.on("NARAOpsVault:Funded", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(admin_events).values({
    id,
    chainId,
    eventType: "vault_fund",
    contractAddress: event.log.address,
    actor: event.transaction.from,
    valueNew: event.args.amount.toString(),
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });
});

// NARAOpsVault:Withdrawn
ponder.on("NARAOpsVault:Withdrawn", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(admin_events).values({
    id,
    chainId,
    eventType: "vault_withdraw",
    contractAddress: event.log.address,
    actor: event.args.to,
    valueNew: event.args.amount.toString(),
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });

  await ensureWallet(context.db, event.args.to, event.block.number, timestamp);
  await recordWalletActivity(context, event, event.args.to, "ops_vault_withdraw", "NARAOpsVault", {
    amount: event.args.amount,
    token: CONTRACTS.token.address,
    counterparty: event.log.address,
  });
  await updateWalletScore(context.db, event.args.to, timestamp, {
    transferInAmount: event.args.amount,
    netTransferAmount: event.args.amount,
  });
});

// NARAOpsVault:OwnershipTransferred
ponder.on("NARAOpsVault:OwnershipTransferred", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(admin_events).values({
    id,
    chainId,
    eventType: "ownership_transfer",
    contractAddress: event.log.address,
    actor: event.args.oldOwner,
    valueNew: event.args.newOwner,
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });
});
