import assert from "node:assert/strict";

const NARA = 10n ** 18n;
const whaleThreshold = 100_000n * NARA;
const largeTransferThreshold = 100_000n * NARA;
const shortTermDurationEpochs = 96n;
const epochLengthSeconds = 900n;

const treasury = "0x1000000000000000000000000000000000000001";
const router = "0x2000000000000000000000000000000000000002";
const breakGlass = "0x3000000000000000000000000000000000000003";
const unknownAdmin = "0x4000000000000000000000000000000000000004";
const genesisHolder = "0x5000000000000000000000000000000000000005";
const whale = "0x6000000000000000000000000000000000000006";
const transferWallet = "0x7000000000000000000000000000000000000007";
const counterparty = "0x8000000000000000000000000000000000000008";

function normalize(address) {
  return address.toLowerCase();
}

function emptyScore(wallet) {
  return {
    wallet: normalize(wallet),
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
    riskScore: 0n,
    convictionScore: 0n,
  };
}

function state() {
  return {
    labels: new Map(),
    scores: new Map(),
  };
}

function labelsFor(s, wallet) {
  return s.labels.get(normalize(wallet)) ?? new Set();
}

function addLabel(s, wallet, label) {
  const key = normalize(wallet);
  const labels = s.labels.get(key) ?? new Set();
  labels.add(label);
  s.labels.set(key, labels);
}

function scoreFor(s, wallet) {
  const key = normalize(wallet);
  const score = s.scores.get(key) ?? emptyScore(key);
  s.scores.set(key, score);
  return score;
}

function amountScore(amount) {
  return amount / NARA;
}

function lockConvictionScore(amount, durationEpochs, wrapped, genesisRewardWeight = 0n) {
  return amountScore(amount) + (durationEpochs * 10n) + (wrapped ? 100n : 0n) + amountScore(genesisRewardWeight);
}

function lockRiskScore(amount, durationEpochs, timestamp) {
  const estimatedUnlockTimestamp = BigInt(timestamp) + durationEpochs * epochLengthSeconds;
  let score = 0n;
  if (durationEpochs <= shortTermDurationEpochs) score += 50n;
  if (estimatedUnlockTimestamp <= BigInt(timestamp) + 86_400n) score += amountScore(amount);
  else if (estimatedUnlockTimestamp <= BigInt(timestamp) + 604_800n) score += amountScore(amount) / 2n;
  return score;
}

function addProtocolLabels(s) {
  addLabel(s, treasury, "treasury");
  addLabel(s, router, "router");
  addLabel(s, breakGlass, "break_glass");
}

function lockPosition(s, wallet, { amount, durationEpochs, timestamp = 1_700_000_000 }) {
  const score = scoreFor(s, wallet);
  score.rawPositionCount += 1;
  score.lockedAmount += amount;
  score.activeLockedAmount += amount;
  score.avgLockDurationEpochs = BigInt(durationEpochs);
  score.convictionScore += lockConvictionScore(amount, BigInt(durationEpochs), false);
  score.riskScore += lockRiskScore(amount, BigInt(durationEpochs), timestamp);

  const unlockTimestamp = BigInt(timestamp) + BigInt(durationEpochs) * epochLengthSeconds;
  if (unlockTimestamp <= BigInt(timestamp) + 86_400n) {
    score.unlocking24hAmount += amount;
    score.unlocking7dAmount += amount;
  } else if (unlockTimestamp <= BigInt(timestamp) + 604_800n) {
    score.unlocking7dAmount += amount;
  }

  if (amount >= whaleThreshold) addLabel(s, wallet, "whale");
}

function genesisPosition(s, wallet, rewardWeight) {
  const score = scoreFor(s, wallet);
  score.genesisPositionCount += 1;
  score.genesisRewardWeight += rewardWeight;
  score.convictionScore += 500n + amountScore(rewardWeight);
  addLabel(s, wallet, "genesis_holder");
}

function directUnknownAdminCall(s, wallet) {
  const score = scoreFor(s, wallet);
  score.riskScore += 1000n;
  addLabel(s, wallet, "unknown");
  addLabel(s, wallet, "admin");
}

function transferIn(s, wallet, amount) {
  const score = scoreFor(s, wallet);
  score.transferInAmount += amount;
  score.netTransferAmount += amount;
}

function transferOut(s, wallet, amount) {
  const score = scoreFor(s, wallet);
  score.transferOutAmount += amount;
  score.netTransferAmount -= amount;
  score.riskScore += amount >= largeTransferThreshold ? 100n + amountScore(amount) : 5n;
}

{
  const s = state();
  addProtocolLabels(s);
  assert.equal(labelsFor(s, treasury).has("treasury"), true, "treasury wallet gets treasury label");
  assert.equal(labelsFor(s, router).has("router"), true, "router wallet gets router label");
  assert.equal(labelsFor(s, breakGlass).has("break_glass"), true, "break glass wallet gets break_glass label");
}

{
  const s = state();
  genesisPosition(s, genesisHolder, 2_500n * NARA);
  assert.equal(labelsFor(s, genesisHolder).has("genesis_holder"), true, "wallet with Genesis position gets genesis_holder label");
  assert.equal(scoreFor(s, genesisHolder).genesisRewardWeight, 2_500n * NARA, "Genesis reward weight is tracked");
}

{
  const s = state();
  lockPosition(s, whale, { amount: whaleThreshold, durationEpochs: 2880n });
  assert.equal(labelsFor(s, whale).has("whale"), true, "wallet with large locked amount gets whale label");
}

{
  const s = state();
  const smallShort = "0x9000000000000000000000000000000000000001";
  const largeLong = "0x9000000000000000000000000000000000000002";
  lockPosition(s, smallShort, { amount: 100n * NARA, durationEpochs: 96n });
  lockPosition(s, largeLong, { amount: 1_000n * NARA, durationEpochs: 2880n });
  assert.equal(
    scoreFor(s, largeLong).convictionScore > scoreFor(s, smallShort).convictionScore,
    true,
    "conviction score increases with lock amount and duration",
  );
}

{
  const s = state();
  const before = scoreFor(s, unknownAdmin).riskScore;
  directUnknownAdminCall(s, unknownAdmin);
  assert.equal(scoreFor(s, unknownAdmin).riskScore > before, true, "risk score increases with direct unknown admin call");
}

{
  const s = state();
  lockPosition(s, "0xa000000000000000000000000000000000000001", { amount: 10n * NARA, durationEpochs: 96n });
  lockPosition(s, "0xa000000000000000000000000000000000000002", { amount: 20n * NARA, durationEpochs: 400n });
  assert.equal(scoreFor(s, "0xa000000000000000000000000000000000000001").unlocking24hAmount, 10n * NARA, "unlocking 24h amount appears correctly");
  assert.equal(scoreFor(s, "0xa000000000000000000000000000000000000002").unlocking7dAmount, 20n * NARA, "unlocking 7d amount appears correctly");
}

{
  const s = state();
  transferIn(s, transferWallet, 1_000n * NARA);
  transferOut(s, transferWallet, 250n * NARA);
  transferIn(s, counterparty, 250n * NARA);
  assert.equal(scoreFor(s, transferWallet).netTransferAmount, 750n * NARA, "wallet transfer net amount is correct");
}

console.log("Seeded wallet intelligence tests passed.");
