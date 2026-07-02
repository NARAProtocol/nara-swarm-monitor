import { ponder } from "ponder:registry";
import { 
  wallets, 
  erc20_transfers, 
  locks, 
  claims, 
  nfts, 
  nft_transfers, 
  admin_events 
} from "ponder:schema";

// Hardcoded Base Mainnet chainId
const chainId = 8453;

// Helper to upsert wallets in Drizzle style
async function ensureWallet(db: any, address: string, blockNumber: bigint, timestamp: number) {
  if (address === "0x0000000000000000000000000000000000000000") return;
  await db.insert(wallets).values({
    id: address,
    address,
    firstSeenBlock: blockNumber,
    lastUpdatedAt: timestamp,
  }).onConflictDoNothing();
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
    user: event.args.account,
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

  await ensureWallet(context.db, event.args.account, event.block.number, timestamp);
});

ponder.on("NARAEngine:Unlocked", async ({ event, context }) => {
  const lockId = event.args.positionId;
  const id = `${chainId}-${lockId}`;

  await context.db.update(locks, { id }).set({
    status: "unlocked",
  });
});

ponder.on("NARAEngine:Extended", async ({ event, context }) => {
  const lockId = event.args.positionId;
  const id = `${chainId}-${lockId}`;

  const existing = await context.db.find(locks, { id });
  if (existing) {
    await context.db.update(locks, { id }).set({
      unlockEpoch: existing.unlockEpoch + event.args.additionalEpochs,
    });
  }
});

ponder.on("NARAEngine:RewardsClaimed", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(claims).values({
    id,
    chainId,
    user: event.args.account,
    rewardToken: "0x0000000000000000000000000000000000000000", // ETH (zero address)
    amount: event.args.amount,
    naraFeeAmount: 0n,
    tokenFeeAmount: 0n,
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });
});

ponder.on("NARAEngine:TokenRewardsClaimed", async ({ event, context }) => {
  const id = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(claims).values({
    id,
    chainId,
    user: event.args.account,
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

// 3. NFT Wrapping Handlers
ponder.on("NARAPositionNFT:PositionMinted", async ({ event, context }) => {
  const tokenId = `${chainId}-${event.args.tokenId}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(nfts).values({
    tokenId,
    chainId,
    tokenIdRaw: event.args.tokenId,
    owner: event.args.to,
    tier: 0,
    isGenesis: 0,
    isEternal: 0,
    mintedAtBlock: event.block.number,
    mintedAtTimestamp: timestamp,
  });
});

ponder.on("NARAPositionNFT:GenesisPositionMinted", async ({ event, context }) => {
  const tokenId = `${chainId}-${event.args.tokenId}`;
  const timestamp = Number(event.block.timestamp);

  await context.db.insert(nfts).values({
    tokenId,
    chainId,
    tokenIdRaw: event.args.tokenId,
    owner: event.args.to,
    tier: event.args.tier,
    isGenesis: 1,
    isEternal: event.args.eternal ? 1 : 0,
    mintedAtBlock: event.block.number,
    mintedAtTimestamp: timestamp,
  });
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

// 4. Admin Event Handlers
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
    valueOld: event.args.oldValue.toString(),
    valueNew: event.args.newValue.toString(),
    blockNumber: event.block.number,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp,
  });
});
