import { parseAbi } from "viem";

export const NARAStakingPoolAbi = parseAbi([
  "event Deposited(address indexed user,uint256 naraIn,uint256 sharesOut)",
  "event RedemptionQueued(address indexed user,uint256 indexed id,uint256 shares,uint256 naraOwed,uint64 readyEpoch)",
  "event RedemptionClaimed(address indexed user,uint256 indexed id,uint256 naraOut)",
  "event Harvested(address indexed keeper,uint256 naraCompounded,uint256 usdcDistributed,uint256 keeperBounty)",
  "event PositionOpened(uint256 indexed tokenId,uint256 netAmount)",
  "event PositionClosed(uint256 indexed tokenId,uint256 naraReturned)",
  "event UsdcIndexAdvanced(uint256 newIndexRay,uint256 distributed)",
  "event EthIndexAdvanced(uint256 newIndexRay,uint256 distributed)",
]);

export const NARAStakingPoolSYAbi = parseAbi([
  "event Deposited(address indexed caller,address indexed receiver,address indexed tokenIn,uint256 amountIn,uint256 sharesOut)",
  "event Redeemed(address indexed caller,address indexed receiver,uint256 sharesIn,uint256 amountOut)",
  "event RewardsClaimed(address indexed user,uint256 usdcAmount)",
  "event EthRewardsClaimed(address indexed user,address indexed to,uint256 ethAmount)",
  "event UsdcIndexAdvanced(uint256 newIndexRay,uint256 distributed)",
  "event EthIndexAdvanced(uint256 newIndexRay,uint256 distributed)",
]);

export const NARAFractionalFactoryAbi = parseAbi([
  "event FractionalCreated(uint256 indexed tokenId,address indexed fractional,address indexed creator)",
]);

export const NARAFractionalPositionAbi = parseAbi([
  "event Transfer(address indexed from,address indexed to,uint256 amount)",
  "event Bound(uint256 indexed tokenId,uint256 fractionCount,address indexed owner)",
  "event RewardHarvested(uint256 naraEmission,uint256 usdc)",
  "event EthRewardHarvested(uint256 ethAmount)",
  "event PositionUnlocked(uint256 principalReturned)",
  "event PrincipalClaimed(address indexed user,uint256 naraAmount)",
  "event RewardClaimed(address indexed user,uint256 naraEmission,uint256 usdc)",
  "event EthRewardClaimed(address indexed user,uint256 ethAmount)",
]);

export const NARALiquidityGrowthHookAbi = parseAbi([
  "event PoolRegistered(bytes32 indexed poolId,address indexed currency0,address indexed currency1,uint24 fee,int24 tickSpacing)",
  "event ProtocolDepthSet(address indexed currency,uint256 depth)",
  "event ProtocolDepthProposed(address indexed currency,uint256 depth,uint48 eta)",
  "event PoolFeeTaken(bytes32 indexed poolId,address indexed sender,address indexed currency,uint256 amountIn,uint256 feeAmount,uint16 feeBps,bool isBuy)",
  "event PoolFeeRecordFailed(bytes32 indexed poolId,address indexed sender,address indexed currency,uint256 amount,uint16 feeBps,bool isBuy)",
  "event FeeCurveSet(bool indexed isBuyCurve,(uint32 mediumPressureBps,uint32 highPressureBps,uint32 extremePressureBps,uint16 baseFeeBps,uint16 mediumFeeBps,uint16 highFeeBps,uint16 extremeFeeBps,uint16 maxFeeBps) curve)",
  "event FeeCurveProposed(bool indexed isBuyCurve,(uint32 mediumPressureBps,uint32 highPressureBps,uint32 extremePressureBps,uint16 baseFeeBps,uint16 mediumFeeBps,uint16 highFeeBps,uint16 extremeFeeBps,uint16 maxFeeBps) curve,uint48 eta)",
]);

export const NARALiquidityGrowthVaultAbi = parseAbi([
  "event HookSet(address indexed hook)",
  "event CompounderSet(address indexed compounder)",
  "event CompounderFrozen(address indexed compounder)",
  "event CompoundKeeperSet(address indexed keeper,bool allowed)",
  "event EngineSet(address indexed engine)",
  "event GenesisRewardDistributorSet(address indexed distributor)",
  "event RouteModeSet(uint8 indexed mode)",
  "event PoolFeeRecorded(address indexed currency,address indexed sender,uint256 amount,uint16 feeBps,bool isBuy)",
  "event Compounded(address indexed caller,address indexed compounder,uint256 tokenAmount,uint256 baseAmount,uint256 baseBounty,uint256 liquidityAdded)",
  "event RoutedToEngine(address indexed caller,uint256 tokenAmount,uint256 baseAmount)",
  "event RoutedToGenesis(address indexed caller,uint256 baseAmount)",
  "event SplitProcessed(address indexed caller,uint256 tokenToEngine,uint256 baseToEngine,uint256 tokenToCompound,uint256 baseToCompound,uint256 liquidityAdded)",
  "event GenesisSplitProcessed(address indexed caller,uint256 baseToGenesis,uint256 tokenToCompound,uint256 baseToCompound,uint256 liquidityAdded)",
]);

export const NARALiquidityCompounderAbi = parseAbi([
  "event Compounded(uint256 indexed positionTokenId,uint256 naraUsed,uint256 usdcUsed,uint256 liquidityAdded,uint256 naraBanked,uint256 usdcBanked)",
  "event PositionMinted(uint256 indexed positionTokenId)",
  "event PositionMigrated(address indexed to,uint256 indexed positionTokenId)",
  "event PoolTokensRecovered(address indexed to,uint256 naraAmount,uint256 usdcAmount)",
  "event WoundDown(address indexed to,uint256 positionTokenId,uint256 naraAmount,uint256 usdcAmount)",
  "event RecoveryProposed(uint8 indexed kind,address indexed to,uint64 eta)",
  "event RecoveryCancelled()",
]);

export const NARABasketManagerAbi = parseAbi([
  "event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)",
  "event BasketBought(address indexed buyer,address indexed receiver,bytes32 indexed categoryId,uint256 tokenId,address paymentToken,uint256 grossInput,uint256 feeAmount,address referrer)",
  "event BasketSold(address indexed seller,address indexed receiver,bytes32 indexed categoryId,uint256 tokenId,address outputToken,uint256 grossOutput,uint256 feeAmount)",
  "event BasketPartiallySold(address indexed seller,address indexed receiver,bytes32 indexed categoryId,uint256 tokenId,address outputToken,uint256 grossOutput,uint256 feeAmount,bool closed)",
  "event UnderlyingWithdrawn(address indexed owner,address indexed receiver,uint256 indexed tokenId,uint256[] amounts,uint256[] feeAmounts)",
  "event UnderlyingPartiallyWithdrawn(address indexed owner,address indexed receiver,uint256 indexed tokenId,address[] assets,uint256[] amounts,uint256[] feeAmounts,bool closed)",
  "event HoldingFeeAccrued(uint256 indexed tokenId,uint64 periodSeconds,uint256[] feeAmounts)",
  "event ProtocolFeeAccrued(address indexed token,uint256 amount)",
  "event AccruedFeeSwept(address indexed asset,uint256 amount,address indexed feeRecipient)",
]);

export const NARABasketFeeCollectorAbi = parseAbi([
  "event AllowedExecutorSet(address indexed executor,bool allowed)",
  "event AllowedSelectorSet(address indexed executor,bytes4 indexed selector,bool allowed)",
  "event AllowlistFrozenSet()",
  "event SwapExecuted(address indexed executor,address indexed tokenIn,address indexed tokenOut,uint256 amountInMax,uint256 amountInActual,uint256 amountOutActual)",
  "event NaraRewardsDeposited(uint256 amount)",
  "event EthRewardsNotified(uint256 amount)",
]);

export const NARAGenesisRewardDistributorAbi = parseAbi([
  "event EthRewardsNotified(address indexed sender,uint256 ethReceived,uint256 ethAllocated,uint256 totalRewardWeight,uint256 accEthPerRewardWeightRay)",
  "event UndistributedEthQueued(address indexed sender,uint256 ethReceived,uint256 pendingUndistributedEth)",
  "event TokenRewardsNotified(address indexed sender,address indexed token,uint256 amountReceived,uint256 amountAllocated,uint256 totalRewardWeight,uint256 accTokenPerRewardWeightRay)",
  "event UndistributedTokenQueued(address indexed sender,address indexed token,uint256 amountReceived,uint256 pendingUndistributedToken)",
  "event GenesisRewardWeightSynced(uint256 indexed tokenId,uint256 oldRewardWeight,uint256 newRewardWeight,uint256 accruedEth)",
  "event GenesisEthClaimed(uint256 indexed tokenId,address indexed owner,address indexed to,uint256 amount)",
  "event GenesisTokenClaimed(uint256 indexed tokenId,address indexed owner,address indexed to,uint256 amount)",
  "event GenesisPositionClosed(uint256 indexed tokenId,address indexed owner)",
]);

export const NARABribeRouterAbi = parseAbi([
  "event BribeNotified(address indexed caller,address indexed token,uint256 amount)",
]);
