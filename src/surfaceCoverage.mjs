// Read-only coverage contract for active v4 surfaces not yet represented by the
// original core Ponder handlers. This module never creates a wallet client and
// never submits transactions.

export const REQUIRED_MONITOR_SURFACES = Object.freeze({
  stakingPool: {
    env: "V4_STAKING_POOL",
    events: ["Deposited", "RedemptionQueued", "RedemptionClaimed", "Harvested", "UsdcIndexAdvanced", "EthIndexAdvanced"],
  },
  stakingPoolSy: {
    env: "V4_STAKING_POOL_SY",
    events: ["Deposited", "Redeemed", "RewardsClaimed", "EthRewardsClaimed", "UsdcIndexAdvanced", "EthIndexAdvanced"],
  },
  fractionalFactory: {
    env: "V4_FRACTIONAL_FACTORY",
    events: ["FractionalCreated"],
  },
  fractionalPosition: {
    env: "V4_FRACTIONAL_POSITION",
    events: ["Transfer", "Bound", "RewardHarvested", "EthRewardHarvested", "PositionUnlocked", "PrincipalClaimed", "RewardClaimed", "EthRewardClaimed"],
  },
  liquidityHook: {
    env: "V4_LIQUIDITY_GROWTH_HOOK",
    events: ["PoolRegistered", "ProtocolDepthSet", "ProtocolDepthProposed", "PoolFeeTaken"],
  },
  liquidityVault: {
    env: "V4_LIQUIDITY_GROWTH_VAULT",
    events: ["PoolFeeRecorded", "CompounderSet", "CompounderFrozen", "RouteModeSet", "Compounded", "RoutedToEngine", "RoutedToGenesis"],
  },
  liquidityCompounder: {
    env: "V4_LIQUIDITY_COMPOUNDER",
    events: ["Compounded", "RecoveryProposed", "RecoveryCancelled", "PositionMigrated", "PoolTokensRecovered", "WoundDown"],
  },
  basketManager: {
    env: "V4_BASKET_MANAGERS",
    events: ["Transfer", "BasketBought", "BasketSold", "BasketPartiallySold", "UnderlyingWithdrawn", "ProtocolFeeAccrued", "AccruedFeeSwept"],
  },
  basketFeeCollector: {
    env: "V4_BASKET_FEE_COLLECTOR",
    events: ["RouteProposed", "RouteExecuted", "RouteCancelled", "UsdcConvertedAndNotified", "NaraRewardsDeposited", "EthRewardsNotified"],
  },
  genesisRewardDistributor: {
    env: "V4_GENESIS_REWARD_DISTRIBUTOR",
    events: ["EthRewardsNotified", "UndistributedEthQueued", "TokenRewardsNotified", "UndistributedTokenQueued", "GenesisRewardWeightSynced", "GenesisEthClaimed", "GenesisTokenClaimed", "GenesisPositionClosed"],
  },
  bribeRouter: {
    env: "V4_BRIBE_ROUTER",
    events: ["BribeNotified"],
  },
});

export function coverageGaps(configured = {}) {
  const gaps = [];
  for (const [surface, definition] of Object.entries(REQUIRED_MONITOR_SURFACES)) {
    const value = configured[definition.env];
    if (typeof value !== "string" || value.trim() === "") {
      gaps.push({ surface, env: definition.env, reason: "address_unset" });
    }
  }
  return gaps;
}

export function eventCoverageGaps(registered = {}) {
  const gaps = [];
  for (const [surface, definition] of Object.entries(REQUIRED_MONITOR_SURFACES)) {
    const actual = new Set(registered[surface] ?? []);
    for (const eventName of definition.events) {
      if (!actual.has(eventName)) gaps.push({ surface, eventName });
    }
  }
  return gaps;
}

export function evaluateSurfaceObservation(observation) {
  const alerts = [];
  const evidence = {
    surface: observation.surface,
    eventName: observation.eventName,
    txHash: observation.txHash,
    blockNumber: observation.blockNumber,
  };

  if (observation.kind === "reward_checkpoint_exposure" && observation.uncheckpointedValue > 0n) {
    alerts.push({
      ruleId: "historical_reward_checkpoint_exposure",
      severity: 5,
      fingerprint: `${observation.surface}:${observation.asset}`,
      evidence: { ...evidence, asset: observation.asset, observedValue: observation.uncheckpointedValue.toString() },
    });
  }
  if (observation.kind === "noncanonical_nara_pool") {
    alerts.push({
      ruleId: "noncanonical_nara_pool_used",
      severity: 5,
      fingerprint: `${observation.manager}:${observation.poolId}`,
      evidence: { ...evidence, manager: observation.manager, poolId: observation.poolId },
    });
  }
  if (observation.kind === "compounder_configuration" && (!observation.frozen || !observation.codeHashMatches)) {
    alerts.push({
      ruleId: "compounder_not_verified_and_frozen",
      severity: 5,
      fingerprint: `${observation.vault}:${observation.compounder}`,
      evidence: { ...evidence, vault: observation.vault, compounder: observation.compounder, frozen: observation.frozen },
    });
  }
  if (observation.kind === "pol_recovery_proposed") {
    alerts.push({
      ruleId: "pol_recovery_proposed",
      severity: 5,
      fingerprint: `${observation.compounder}:${observation.eta}`,
      evidence: { ...evidence, compounder: observation.compounder, recipient: observation.recipient, eta: String(observation.eta) },
    });
  }
  if (observation.kind === "basket_solvency" && observation.accounted > observation.balance) {
    alerts.push({
      ruleId: "basket_asset_insolvent",
      severity: 5,
      fingerprint: `${observation.manager}:${observation.asset}`,
      evidence: {
        ...evidence,
        manager: observation.manager,
        asset: observation.asset,
        accounted: observation.accounted.toString(),
        balance: observation.balance.toString(),
      },
    });
  }
  if (observation.kind === "redemption_coverage" && observation.reserved > observation.liquid) {
    alerts.push({
      ruleId: "redemption_liquidity_deficit",
      severity: 4,
      fingerprint: observation.pool,
      evidence: {
        ...evidence,
        pool: observation.pool,
        reserved: observation.reserved.toString(),
        liquid: observation.liquid.toString(),
      },
    });
  }
  if (observation.kind === "epoch_backlog" && observation.backlog > 8n) {
    alerts.push({
      ruleId: "epoch_backlog_above_jit_limit",
      severity: 5,
      fingerprint: String(observation.chainId),
      evidence: { ...evidence, backlog: observation.backlog.toString(), thresholdValue: "8" },
    });
  }
  return alerts;
}

export function canonicalEventId(chainId, txHash, logIndex) {
  return `${chainId}-${txHash.toLowerCase()}-${logIndex}`;
}

export function replayAndReconcile(events) {
  const canonical = new Map();
  for (const event of events) {
    const id = canonicalEventId(event.chainId, event.txHash, event.logIndex);
    const existing = canonical.get(id);
    if (existing && existing.blockHash !== event.blockHash) {
      // Deterministic reorg replacement: the latest canonical observation wins.
      canonical.set(id, { ...event, id });
    } else if (!existing) {
      canonical.set(id, { ...event, id });
    }
  }
  const totals = {};
  for (const event of canonical.values()) {
    const key = `${event.surface}:${event.eventType}`;
    totals[key] = (totals[key] ?? 0n) + BigInt(event.amount ?? 0);
  }
  return { rows: [...canonical.values()], totals };
}

export function reconcileDirectState(snapshot) {
  const observations = [];
  for (const basket of snapshot.baskets ?? []) {
    for (const asset of basket.assets) {
      observations.push({
        kind: "basket_solvency",
        surface: "basketManager",
        eventName: "directState",
        manager: basket.manager,
        asset: asset.asset,
        accounted: BigInt(asset.accounted),
        balance: BigInt(asset.balance),
        blockNumber: snapshot.blockNumber,
      });
    }
  }
  if (snapshot.stakingPool) {
    observations.push({
      kind: "redemption_coverage",
      surface: "stakingPool",
      eventName: "directState",
      pool: snapshot.stakingPool.address,
      reserved: BigInt(snapshot.stakingPool.reserved),
      liquid: BigInt(snapshot.stakingPool.liquid),
      blockNumber: snapshot.blockNumber,
    });
  }
  if (snapshot.engine) {
    observations.push({
      kind: "epoch_backlog",
      surface: "engine",
      eventName: "directState",
      chainId: snapshot.chainId,
      backlog: BigInt(snapshot.engine.currentEpoch) - BigInt(snapshot.engine.settledEpoch),
      blockNumber: snapshot.blockNumber,
    });
  }
  if (snapshot.compounder) {
    observations.push({
      kind: "compounder_configuration",
      surface: "liquidityVault",
      eventName: "directState",
      vault: snapshot.compounder.vault,
      compounder: snapshot.compounder.address,
      frozen: snapshot.compounder.frozen,
      codeHashMatches: snapshot.compounder.codeHash === snapshot.compounder.expectedCodeHash,
      blockNumber: snapshot.blockNumber,
    });
  }
  return observations.flatMap(evaluateSurfaceObservation);
}
