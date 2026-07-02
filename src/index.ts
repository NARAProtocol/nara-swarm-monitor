import { ponder } from "ponder:registry";
import { 
  wallets, 
  erc20_transfers, 
  locks, 
  claims, 
  nfts, 
  nft_transfers, 
  admin_events,
  alerts,
  ops_router_events,
  direct_engine_admin_call_events,
  admin_config_events,
} from "ponder:schema";
import {
  CONTRACTS,
  BREAK_GLASS_SAFE_ADDRESS,
  ENGINE_OPS_ROUTER_ADDRESS,
} from "../config/contracts";

// Dynamic chainId lookup from environment
const chainId = Number(process.env.CHAIN_ID || "8453");
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Helper to upsert wallets in Drizzle style
async function ensureWallet(db: any, address: string, blockNumber: bigint, timestamp: number) {
  if (address === ZERO_ADDRESS) return;
  await db.insert(wallets).values({
    address,
    firstSeenBlock: blockNumber,
    lastUpdatedAt: timestamp,
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
    const alertId = `${chainId}-direct-engine-admin-${event.transaction.hash}-${traceIndex}`;
    const fingerprint = `direct-engine-admin:${role}:${functionName}:${caller}`;

    await context.db.insert(alerts).values({
      id: alertId,
      fingerprint,
      severity: 5,
      ruleId: "direct_engine_admin_call_unapproved",
      title: "Unsafe direct NARAEngine admin call",
      description: `${functionName} (${role}) was called on NARAEngine by ${caller}; approved callers are ${approvedOpsRouter} and ${approvedBreakGlassSafe}.`,
      status: "open",
      firstSeenAt: timestamp,
      lastSeenAt: timestamp,
      occurrenceCount: 1,
    }).onConflictDoNothing();
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
});

ponder.on("NARAEngine:Unlocked", async ({ event, context }) => {
  const lockId = event.args.positionId;
  const id = `${chainId}-${lockId}`;

  await context.db.update(locks, { id }).set({
    status: "unlocked",
    unlockedAtBlock: event.block.number,
    unlockedAtTimestamp: Number(event.block.timestamp),
    unlockTxHash: event.transaction.hash,
    unlockTo: event.args.owner,
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
  const tokenId = `${chainId}-${event.args.tokenId}`;
  const timestamp = Number(event.block.timestamp);

  const existing = await context.db.find(nfts, { tokenId });
  if (existing) {
    await context.db.update(nfts, { tokenId }).set({
      positionId: event.args.positionId,
      owner: event.args.owner,
    });
  } else {
    await context.db.insert(nfts).values({
      tokenId,
      chainId,
      tokenIdRaw: event.args.tokenId,
      positionId: event.args.positionId,
      owner: event.args.owner,
      tier: 0,
      isGenesis: 0,
      isEternal: 0,
      mintedAtBlock: event.block.number,
      mintedAtTimestamp: timestamp,
    });
  }
});

ponder.on("NARAPositionNFT:GenesisPositionMinted", async ({ event, context }) => {
  const tokenId = `${chainId}-${event.args.tokenId}`;
  const timestamp = Number(event.block.timestamp);

  const existing = await context.db.find(nfts, { tokenId });
  if (existing) {
    await context.db.update(nfts, { tokenId }).set({
      positionId: event.args.positionId,
      tier: event.args.tierId,
      isGenesis: 1,
      isEternal: event.args.eternal ? 1 : 0,
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
      mintedAtBlock: event.block.number,
      mintedAtTimestamp: timestamp,
    });
  }
});

ponder.on("NARAPositionNFT:Transfer", async ({ event, context }) => {
  const tokenId = `${chainId}-${event.args.tokenId}`;
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  const existing = await context.db.find(nfts, { tokenId });
  if (existing) {
    await context.db.update(nfts, { tokenId }).set({
      owner: event.args.to,
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
