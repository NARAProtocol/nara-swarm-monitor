import { ponder } from "ponder:registry";
import { ecosystem_events } from "ponder:schema";

const chainId = Number(process.env.CHAIN_ID || "8453");

function json(value: unknown): string {
  return JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item);
}

async function record(surface: string, eventType: string, event: any, context: any) {
  await context.db.insert(ecosystem_events).values({
    id: `${chainId}-${event.transaction.hash}-${event.log.logIndex}`,
    chainId,
    surface,
    contractAddress: event.log.address.toLowerCase(),
    eventType,
    actor: (event.args.user ?? event.args.caller ?? event.args.keeper ?? event.args.buyer ?? event.args.seller ?? event.args.creator ?? null)?.toString().toLowerCase?.() ?? null,
    subject: (event.args.tokenId ?? event.args.id ?? event.args.positionTokenId ?? event.args.fractional ?? event.args.poolId ?? null)?.toString() ?? null,
    amount0: event.args.amount ?? event.args.naraIn ?? event.args.shares ?? event.args.naraCompounded ?? event.args.feeAmount ?? event.args.grossInput ?? event.args.grossOutput ?? null,
    amount1: event.args.sharesOut ?? event.args.naraOwed ?? event.args.usdcDistributed ?? event.args.liquidityAdded ?? event.args.feeAmount ?? null,
    metadata: json(event.args),
    blockNumber: event.block.number,
    blockHash: event.block.hash,
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    timestamp: Number(event.block.timestamp),
  }).onConflictDoNothing();
}

ponder.on("NARAStakingPool:Deposited", async ({ event, context }) => record("staking_pool", "deposit", event, context));
ponder.on("NARAStakingPool:RedemptionQueued", async ({ event, context }) => record("staking_pool", "redemption_queued", event, context));
ponder.on("NARAStakingPool:RedemptionClaimed", async ({ event, context }) => record("staking_pool", "redemption_claimed", event, context));
ponder.on("NARAStakingPool:Harvested", async ({ event, context }) => record("staking_pool", "harvest", event, context));
ponder.on("NARAStakingPool:UsdcIndexAdvanced", async ({ event, context }) => record("staking_pool", "usdc_index", event, context));
ponder.on("NARAStakingPool:EthIndexAdvanced", async ({ event, context }) => record("staking_pool", "eth_index", event, context));

ponder.on("NARAStakingPoolSY:Deposited", async ({ event, context }) => record("staking_pool_sy", "deposit", event, context));
ponder.on("NARAStakingPoolSY:Redeemed", async ({ event, context }) => record("staking_pool_sy", "redeem", event, context));
ponder.on("NARAStakingPoolSY:RewardsClaimed", async ({ event, context }) => record("staking_pool_sy", "usdc_claim", event, context));
ponder.on("NARAStakingPoolSY:EthRewardsClaimed", async ({ event, context }) => record("staking_pool_sy", "eth_claim", event, context));
ponder.on("NARAStakingPoolSY:UsdcIndexAdvanced", async ({ event, context }) => record("staking_pool_sy", "usdc_index", event, context));
ponder.on("NARAStakingPoolSY:EthIndexAdvanced", async ({ event, context }) => record("staking_pool_sy", "eth_index", event, context));

ponder.on("NARAFractionalFactory:FractionalCreated", async ({ event, context }) => record("fractional_factory", "created", event, context));
ponder.on("NARAFractionalPosition:Transfer", async ({ event, context }) => record("fractional_position", "transfer", event, context));
ponder.on("NARAFractionalPosition:Bound", async ({ event, context }) => record("fractional_position", "bound", event, context));
ponder.on("NARAFractionalPosition:RewardHarvested", async ({ event, context }) => record("fractional_position", "reward_harvest", event, context));
ponder.on("NARAFractionalPosition:EthRewardHarvested", async ({ event, context }) => record("fractional_position", "eth_harvest", event, context));
ponder.on("NARAFractionalPosition:PositionUnlocked", async ({ event, context }) => record("fractional_position", "unlock", event, context));
ponder.on("NARAFractionalPosition:PrincipalClaimed", async ({ event, context }) => record("fractional_position", "principal_claim", event, context));
ponder.on("NARAFractionalPosition:RewardClaimed", async ({ event, context }) => record("fractional_position", "reward_claim", event, context));
ponder.on("NARAFractionalPosition:EthRewardClaimed", async ({ event, context }) => record("fractional_position", "eth_claim", event, context));

ponder.on("NARALiquidityGrowthHook:PoolRegistered", async ({ event, context }) => record("liquidity_hook", "pool_registered", event, context));
ponder.on("NARALiquidityGrowthHook:ProtocolDepthSet", async ({ event, context }) => record("liquidity_hook", "depth_set", event, context));
ponder.on("NARALiquidityGrowthHook:ProtocolDepthProposed", async ({ event, context }) => record("liquidity_hook", "depth_proposed", event, context));
ponder.on("NARALiquidityGrowthHook:PoolFeeTaken", async ({ event, context }) => record("liquidity_hook", "pool_fee", event, context));
ponder.on("NARALiquidityGrowthHook:PoolFeeRecordFailed", async ({ event, context }) => record("liquidity_hook", "fee_record_failed", event, context));
ponder.on("NARALiquidityGrowthHook:FeeCurveSet", async ({ event, context }) => record("liquidity_hook", "fee_curve_set", event, context));
ponder.on("NARALiquidityGrowthHook:FeeCurveProposed", async ({ event, context }) => record("liquidity_hook", "fee_curve_proposed", event, context));

ponder.on("NARALiquidityGrowthVault:CompounderSet", async ({ event, context }) => record("liquidity_vault", "compounder_set", event, context));
ponder.on("NARALiquidityGrowthVault:CompounderFrozen", async ({ event, context }) => record("liquidity_vault", "compounder_frozen", event, context));
ponder.on("NARALiquidityGrowthVault:RouteModeSet", async ({ event, context }) => record("liquidity_vault", "route_mode", event, context));
ponder.on("NARALiquidityGrowthVault:PoolFeeRecorded", async ({ event, context }) => record("liquidity_vault", "pool_fee", event, context));
ponder.on("NARALiquidityGrowthVault:Compounded", async ({ event, context }) => record("liquidity_vault", "compound", event, context));
ponder.on("NARALiquidityGrowthVault:RoutedToEngine", async ({ event, context }) => record("liquidity_vault", "engine_route", event, context));
ponder.on("NARALiquidityGrowthVault:RoutedToGenesis", async ({ event, context }) => record("liquidity_vault", "genesis_route", event, context));
ponder.on("NARALiquidityGrowthVault:SplitProcessed", async ({ event, context }) => record("liquidity_vault", "split", event, context));
ponder.on("NARALiquidityGrowthVault:GenesisSplitProcessed", async ({ event, context }) => record("liquidity_vault", "genesis_split", event, context));

ponder.on("NARALiquidityCompounder:Compounded", async ({ event, context }) => record("liquidity_compounder", "compound", event, context));
ponder.on("NARALiquidityCompounder:RecoveryProposed", async ({ event, context }) => record("liquidity_compounder", "recovery_proposed", event, context));
ponder.on("NARALiquidityCompounder:RecoveryCancelled", async ({ event, context }) => record("liquidity_compounder", "recovery_cancelled", event, context));
ponder.on("NARALiquidityCompounder:PositionMigrated", async ({ event, context }) => record("liquidity_compounder", "position_migrated", event, context));
ponder.on("NARALiquidityCompounder:PoolTokensRecovered", async ({ event, context }) => record("liquidity_compounder", "tokens_recovered", event, context));
ponder.on("NARALiquidityCompounder:WoundDown", async ({ event, context }) => record("liquidity_compounder", "wound_down", event, context));

ponder.on("NARABasketManager:Transfer", async ({ event, context }) => record("basket_manager", "receipt_transfer", event, context));
ponder.on("NARABasketManager:BasketBought", async ({ event, context }) => record("basket_manager", "buy", event, context));
ponder.on("NARABasketManager:BasketSold", async ({ event, context }) => record("basket_manager", "sell", event, context));
ponder.on("NARABasketManager:BasketPartiallySold", async ({ event, context }) => record("basket_manager", "partial_sell", event, context));
ponder.on("NARABasketManager:UnderlyingWithdrawn", async ({ event, context }) => record("basket_manager", "withdraw", event, context));
ponder.on("NARABasketManager:UnderlyingPartiallyWithdrawn", async ({ event, context }) => record("basket_manager", "partial_withdraw", event, context));
ponder.on("NARABasketManager:HoldingFeeAccrued", async ({ event, context }) => record("basket_manager", "holding_fee", event, context));
ponder.on("NARABasketManager:ProtocolFeeAccrued", async ({ event, context }) => record("basket_manager", "fee_accrued", event, context));
ponder.on("NARABasketManager:AccruedFeeSwept", async ({ event, context }) => record("basket_manager", "fee_swept", event, context));

ponder.on("NARABasketFeeCollector:AllowedExecutorSet", async ({ event, context }) => record("basket_fee_collector", "executor_set", event, context));
ponder.on("NARABasketFeeCollector:AllowedSelectorSet", async ({ event, context }) => record("basket_fee_collector", "selector_set", event, context));
ponder.on("NARABasketFeeCollector:AllowlistFrozenSet", async ({ event, context }) => record("basket_fee_collector", "allowlist_frozen", event, context));
ponder.on("NARABasketFeeCollector:SwapExecuted", async ({ event, context }) => record("basket_fee_collector", "swap", event, context));
ponder.on("NARABasketFeeCollector:NaraRewardsDeposited", async ({ event, context }) => record("basket_fee_collector", "nara_rewards", event, context));
ponder.on("NARABasketFeeCollector:EthRewardsNotified", async ({ event, context }) => record("basket_fee_collector", "eth_rewards", event, context));

ponder.on("NARAGenesisRewardDistributor:EthRewardsNotified", async ({ event, context }) => record("genesis_distributor", "eth_notified", event, context));
ponder.on("NARAGenesisRewardDistributor:UndistributedEthQueued", async ({ event, context }) => record("genesis_distributor", "eth_queued", event, context));
ponder.on("NARAGenesisRewardDistributor:TokenRewardsNotified", async ({ event, context }) => record("genesis_distributor", "token_notified", event, context));
ponder.on("NARAGenesisRewardDistributor:UndistributedTokenQueued", async ({ event, context }) => record("genesis_distributor", "token_queued", event, context));
ponder.on("NARAGenesisRewardDistributor:GenesisRewardWeightSynced", async ({ event, context }) => record("genesis_distributor", "weight_synced", event, context));
ponder.on("NARAGenesisRewardDistributor:GenesisEthClaimed", async ({ event, context }) => record("genesis_distributor", "eth_claim", event, context));
ponder.on("NARAGenesisRewardDistributor:GenesisTokenClaimed", async ({ event, context }) => record("genesis_distributor", "token_claim", event, context));
ponder.on("NARAGenesisRewardDistributor:GenesisPositionClosed", async ({ event, context }) => record("genesis_distributor", "position_closed", event, context));
ponder.on("NARABribeRouter:BribeNotified", async ({ event, context }) => record("bribe_router", "bribe_notified", event, context));
