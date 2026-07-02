import assert from "node:assert/strict";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const treasury = "0x9000000000000000000000000000000000000009";
const epochLengthSeconds = 900;

function nftId(tokenId) {
  return `8453-${tokenId}`;
}

function lockId(positionId) {
  return `8453-${positionId}`;
}

function createState() {
  return {
    nfts: new Map(),
    locks: new Map(),
  };
}

function transfer(state, { tokenId, from = ZERO_ADDRESS, to, block = 1n, timestamp = 1_700_000_000 }) {
  const id = nftId(tokenId);
  const existing = state.nfts.get(id);
  if (existing) {
    state.nfts.set(id, {
      ...existing,
      owner: to.toLowerCase(),
      lastOwnerUpdateBlock: block,
      lastOwnerUpdateTimestamp: timestamp,
    });
  } else {
    state.nfts.set(id, {
      tokenId: id,
      tokenIdRaw: BigInt(tokenId),
      positionId: null,
      minter: null,
      owner: to.toLowerCase(),
      positionAccount: null,
      principalAmount: null,
      durationEpochs: null,
      tier: 0,
      isGenesis: 0,
      isEternal: 0,
      genesisRoundId: null,
      genesisTierId: null,
      genesisRewardMultiplierBps: null,
      genesisRewardWeight: null,
      lastOwnerUpdateBlock: block,
      lastOwnerUpdateTimestamp: timestamp,
    });
  }
  return { from: from.toLowerCase(), to: to.toLowerCase() };
}

function positionMinted(state, seed) {
  const id = nftId(seed.tokenId);
  const existing = state.nfts.get(id);
  const updates = {
    positionId: BigInt(seed.positionId),
    minter: seed.minter.toLowerCase(),
    owner: seed.owner.toLowerCase(),
    positionAccount: seed.account.toLowerCase(),
    principalAmount: BigInt(seed.amount),
    durationEpochs: BigInt(seed.durationEpochs),
  };
  state.nfts.set(id, existing ? { ...existing, ...updates } : {
    tokenId: id,
    tokenIdRaw: BigInt(seed.tokenId),
    ...updates,
    tier: 0,
    isGenesis: 0,
    isEternal: 0,
    genesisRoundId: null,
    genesisTierId: null,
    genesisRewardMultiplierBps: null,
    genesisRewardWeight: null,
    lastOwnerUpdateBlock: seed.block ?? 1n,
    lastOwnerUpdateTimestamp: seed.timestamp ?? 1_700_000_000,
  });
}

function genesisPositionMinted(state, seed) {
  const id = nftId(seed.tokenId);
  const existing = state.nfts.get(id);
  const updates = {
    positionId: BigInt(seed.positionId),
    tier: seed.tierId,
    isGenesis: 1,
    isEternal: seed.eternal ? 1 : 0,
    genesisRoundId: seed.roundId,
    genesisTierId: seed.tierId,
    genesisRewardMultiplierBps: seed.rewardMultiplierBps,
    genesisRewardWeight: BigInt(seed.rewardWeight),
  };
  state.nfts.set(id, existing ? { ...existing, ...updates } : {
    tokenId: id,
    tokenIdRaw: BigInt(seed.tokenId),
    minter: null,
    owner: ZERO_ADDRESS,
    positionAccount: null,
    principalAmount: null,
    durationEpochs: null,
    ...updates,
    lastOwnerUpdateBlock: null,
    lastOwnerUpdateTimestamp: null,
  });
}

function lock(state, seed) {
  state.locks.set(lockId(seed.positionId), {
    id: lockId(seed.positionId),
    positionId: BigInt(seed.positionId),
    user: seed.user.toLowerCase(),
    amount: BigInt(seed.amount),
    activationEpoch: BigInt(seed.activationEpoch),
    unlockEpoch: BigInt(seed.unlockEpoch),
    weight: BigInt(seed.weight),
    status: seed.status ?? "locked",
    timestamp: seed.timestamp,
  });
}

function positionCurrentStateRows(state) {
  return [...state.locks.values()].map((lockRow) => {
    const nftRow = [...state.nfts.values()].find((row) => row.positionId === lockRow.positionId);
    let owner = ZERO_ADDRESS;
    let ownerSource = "unknown";
    let ownerStatus = "unknown_until_transfer";

    if (nftRow && nftRow.owner !== ZERO_ADDRESS) {
      owner = nftRow.owner;
      ownerSource = "nft_owner";
      ownerStatus = "known";
    } else if (nftRow && nftRow.owner === ZERO_ADDRESS) {
      ownerSource = "nft_owner_unknown";
    } else if (lockRow.user !== ZERO_ADDRESS) {
      owner = lockRow.user;
      ownerSource = "engine_lock_owner";
      ownerStatus = "known";
    }

    const estimatedUnlockTimestamp = lockRow.timestamp +
      Number(lockRow.unlockEpoch - lockRow.activationEpoch) * epochLengthSeconds;

    return {
      ...lockRow,
      owner,
      ownerSource,
      ownerStatus,
      tokenId: nftRow?.tokenId ?? null,
      isWrapped: nftRow ? 1 : 0,
      isGenesis: nftRow?.isGenesis ?? 0,
      genesisRewardWeight: nftRow?.genesisRewardWeight ?? 0n,
      estimatedUnlockTimestamp,
    };
  });
}

function walletPositionSummary(rows) {
  const byWallet = new Map();
  for (const row of rows) {
    const current = byWallet.get(row.owner) ?? {
      wallet: row.owner,
      ownerStatus: row.ownerStatus,
      rawPositionCount: 0,
      nftPositionCount: 0,
      lockedNara: 0n,
    };
    if (row.isWrapped) current.nftPositionCount += 1;
    else current.rawPositionCount += 1;
    if (row.status === "locked") current.lockedNara += row.amount;
    byWallet.set(row.owner, current);
  }
  return [...byWallet.values()];
}

function unlockCliffs(rows, now, seconds) {
  return rows.filter((row) =>
    row.status === "locked" &&
    row.estimatedUnlockTimestamp >= now &&
    row.estimatedUnlockTimestamp <= now + seconds
  );
}

function treasuryLockedPositions(rows) {
  return rows.filter((row) =>
    row.status === "locked" &&
    row.owner === treasury.toLowerCase() &&
    row.ownerStatus !== "unknown_until_transfer"
  );
}

{
  const state = createState();
  const owner = "0x1000000000000000000000000000000000000001";
  transfer(state, { tokenId: 1, to: owner });
  positionMinted(state, {
    tokenId: 1,
    positionId: 11,
    minter: owner,
    owner,
    account: "0xa000000000000000000000000000000000000001",
    amount: 100n,
    durationEpochs: 12n,
  });
  const row = state.nfts.get(nftId(1));
  assert.equal(row.owner, owner.toLowerCase(), "Transfer before PositionMinted keeps final owner");
  assert.equal(row.positionId, 11n, "Transfer before PositionMinted adds positionId metadata");
  assert.equal(row.positionAccount, "0xa000000000000000000000000000000000000001", "Position account metadata is stored");
  assert.equal(row.principalAmount, 100n, "Principal metadata is stored");
}

{
  const state = createState();
  const ownerA = "0x2000000000000000000000000000000000000002";
  const ownerB = "0x2000000000000000000000000000000000000003";
  positionMinted(state, {
    tokenId: 2,
    positionId: 22,
    minter: ownerA,
    owner: ownerA,
    account: "0xa000000000000000000000000000000000000002",
    amount: 200n,
    durationEpochs: 24n,
  });
  transfer(state, { tokenId: 2, from: ownerA, to: ownerB });
  const row = state.nfts.get(nftId(2));
  assert.equal(row.owner, ownerB.toLowerCase(), "PositionMinted before Transfer keeps final owner");
  assert.equal(row.positionId, 22n, "PositionMinted before Transfer keeps position metadata");
  assert.equal(row.durationEpochs, 24n, "PositionMinted before Transfer keeps duration metadata");
}

{
  const state = createState();
  const owner = "0x3000000000000000000000000000000000000003";
  genesisPositionMinted(state, {
    tokenId: 3,
    positionId: 33,
    roundId: 1,
    tierId: 2,
    rewardMultiplierBps: 15_000,
    rewardWeight: 333n,
    eternal: true,
  });
  assert.equal(state.nfts.get(nftId(3)).owner, ZERO_ADDRESS, "Genesis before Transfer starts unknown");
  transfer(state, { tokenId: 3, to: owner });
  const row = state.nfts.get(nftId(3));
  assert.equal(row.owner, owner.toLowerCase(), "GenesisPositionMinted before Transfer does not leave final owner zero");
  assert.equal(row.genesisRewardWeight, 333n, "Genesis metadata remains after Transfer");
}

{
  const state = createState();
  const owner = "0x4000000000000000000000000000000000000004";
  transfer(state, { tokenId: 4, to: owner });
  genesisPositionMinted(state, {
    tokenId: 4,
    positionId: 44,
    roundId: 2,
    tierId: 3,
    rewardMultiplierBps: 20_000,
    rewardWeight: 444n,
    eternal: false,
  });
  const row = state.nfts.get(nftId(4));
  assert.equal(row.owner, owner.toLowerCase(), "Transfer before GenesisPositionMinted keeps owner");
  assert.equal(row.genesisRoundId, 2, "Transfer before GenesisPositionMinted adds Genesis round metadata");
  assert.equal(row.genesisTierId, 3, "Transfer before GenesisPositionMinted adds Genesis tier metadata");
}

{
  const state = createState();
  const rawOwner = "0x5000000000000000000000000000000000000005";
  const nftOwner = "0x5000000000000000000000000000000000000006";
  lock(state, {
    positionId: 55,
    user: rawOwner,
    amount: 500n,
    activationEpoch: 10n,
    unlockEpoch: 20n,
    weight: 50n,
    timestamp: 1_700_000_000,
  });
  lock(state, {
    positionId: 66,
    user: "0xa000000000000000000000000000000000000006",
    amount: 600n,
    activationEpoch: 10n,
    unlockEpoch: 20n,
    weight: 60n,
    timestamp: 1_700_000_000,
  });
  positionMinted(state, {
    tokenId: 6,
    positionId: 66,
    minter: nftOwner,
    owner: nftOwner,
    account: "0xa000000000000000000000000000000000000006",
    amount: 600n,
    durationEpochs: 10n,
  });

  const summary = walletPositionSummary(positionCurrentStateRows(state));
  assert.equal(summary.find((row) => row.wallet === rawOwner.toLowerCase()).rawPositionCount, 1, "wallet_position_summary counts raw positions");
  assert.equal(summary.find((row) => row.wallet === nftOwner.toLowerCase()).nftPositionCount, 1, "wallet_position_summary counts NFT positions");
}

{
  const state = createState();
  const now = 1_700_000_000;
  const owner = "0x6000000000000000000000000000000000000006";
  lock(state, { positionId: 71, user: owner, amount: 71n, activationEpoch: 0n, unlockEpoch: 96n, weight: 1n, timestamp: now });
  lock(state, { positionId: 72, user: owner, amount: 72n, activationEpoch: 0n, unlockEpoch: 400n, weight: 1n, timestamp: now });
  lock(state, { positionId: 73, user: owner, amount: 73n, activationEpoch: 0n, unlockEpoch: 800n, weight: 1n, timestamp: now });
  const rows = positionCurrentStateRows(state);

  assert.deepEqual(unlockCliffs(rows, now, 86_400).map((row) => row.positionId), [71n], "unlock_cliffs_24h returns expected rows");
  assert.deepEqual(unlockCliffs(rows, now, 604_800).map((row) => row.positionId), [71n, 72n], "unlock_cliffs_7d returns expected rows");
}

{
  const state = createState();
  lock(state, { positionId: 81, user: treasury, amount: 81n, activationEpoch: 0n, unlockEpoch: 10n, weight: 1n, timestamp: 1_700_000_000 });
  lock(state, { positionId: 82, user: "0x8000000000000000000000000000000000000008", amount: 82n, activationEpoch: 0n, unlockEpoch: 10n, weight: 1n, timestamp: 1_700_000_000 });
  genesisPositionMinted(state, {
    tokenId: 83,
    positionId: 83,
    roundId: 1,
    tierId: 1,
    rewardMultiplierBps: 10_000,
    rewardWeight: 83n,
    eternal: true,
  });
  lock(state, { positionId: 83, user: ZERO_ADDRESS, amount: 83n, activationEpoch: 0n, unlockEpoch: 10n, weight: 1n, timestamp: 1_700_000_000 });

  const treasuryRows = treasuryLockedPositions(positionCurrentStateRows(state));
  assert.equal(treasuryRows.length, 1, "treasury_locked_positions only includes configured treasury address");
  assert.equal(treasuryRows[0].owner, treasury.toLowerCase(), "treasury row owner is configured treasury");
}

console.log("Seeded position intelligence tests passed.");
