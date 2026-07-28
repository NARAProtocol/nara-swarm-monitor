import { NARATokenAbi } from "../abis/NARATokenAbi";
import { NARAEngineAbi } from "../abis/NARAEngineAbi";
import { NARAPositionNFTAbi } from "../abis/NARAPositionNFTAbi";
import { NARABondDepositoryV4NFTAbi } from "../abis/NARABondDepositoryV4NFTAbi";
import { NARABondVaultAbi } from "../abis/NARABondVaultAbi";
import { NARAOpsVaultAbi } from "../abis/NARAOpsVaultAbi";
import { NARAEngineOpsRouterV1Abi } from "../abis/NARAEngineOpsRouterV1Abi";
import { NARALiquidityGrowthHookAbi } from "../abis/NARALiquidityGrowthHookAbi";
import { NARALiquidityGrowthVaultAbi } from "../abis/NARALiquidityGrowthVaultAbi";
import { NARALiquidityCompounderAbi } from "../abis/NARALiquidityCompounderAbi";
import {
  optionalFreshV4Address,
  optionalFreshV4Addresses,
  requireFreshStartBlock,
  requireFreshV4Address,
  requireFreshV4Addresses,
} from "./addressGuards";
import {
  NARABasketFeeCollectorAbi,
  NARABasketManagerAbi,
  NARAFractionalFactoryAbi,
  NARAFractionalPositionAbi,
  NARAStakingPoolAbi,
  NARAStakingPoolSYAbi,
  NARAGenesisRewardDistributorAbi,
  NARABribeRouterAbi,
} from "../abis/NARAEcosystemAbis";

const startBlock = requireFreshStartBlock();
export const MONITOR_PROFILE = process.env.MONITOR_PROFILE?.trim().toLowerCase() || "full";
if (MONITOR_PROFILE !== "core" && MONITOR_PROFILE !== "full") {
  throw new Error("MONITOR_PROFILE must be core or full.");
}
const isFullProfile = MONITOR_PROFILE === "full";
const disabledAddress = [] as const;
const profileAddress = (name: string) =>
  isFullProfile ? requireFreshV4Address(name) : optionalFreshV4Address(name) ?? disabledAddress;
const profileAddresses = (name: string) =>
  isFullProfile ? requireFreshV4Addresses(name) : optionalFreshV4Addresses(name);

export const CONTRACTS = {
  token: {
    address: requireFreshV4Address("V4_NARA_TOKEN"),
    abi: NARATokenAbi,
    startBlock,
  },
  engine: {
    address: requireFreshV4Address("V4_ENGINE"),
    abi: NARAEngineAbi,
    startBlock,
  },
  positionNft: {
    address: profileAddress("V4_POSITION_NFT"),
    abi: NARAPositionNFTAbi,
    startBlock,
  },
  bondDepositoryNft: {
    address: profileAddress("V4_BOND_DEPOSITORY_NFT"),
    abi: NARABondDepositoryV4NFTAbi,
    startBlock,
  },
  bondVault: {
    address: profileAddress("V4_BOND_VAULT"),
    abi: NARABondVaultAbi,
    startBlock,
  },
  opsVault: {
    address: profileAddress("V4_OPS_VAULT"),
    abi: NARAOpsVaultAbi,
    startBlock,
  },
  engineOpsRouter: {
    address: profileAddress("V4_ENGINE_OPS_ROUTER"),
    abi: NARAEngineOpsRouterV1Abi,
    startBlock,
  },
  stakingPool: { address: profileAddress("V4_STAKING_POOL"), abi: NARAStakingPoolAbi, startBlock },
  stakingPoolSy: { address: profileAddress("V4_STAKING_POOL_SY"), abi: NARAStakingPoolSYAbi, startBlock },
  fractionalFactory: { address: profileAddress("V4_FRACTIONAL_FACTORY"), abi: NARAFractionalFactoryAbi, childAbi: NARAFractionalPositionAbi, startBlock },
  liquidityHook: { address: requireFreshV4Address("V4_LIQUIDITY_GROWTH_HOOK"), abi: NARALiquidityGrowthHookAbi, startBlock },
  liquidityVault: { address: requireFreshV4Address("V4_LIQUIDITY_GROWTH_VAULT"), abi: NARALiquidityGrowthVaultAbi, startBlock },
  liquidityCompounder: { address: requireFreshV4Address("V4_LIQUIDITY_COMPOUNDER"), abi: NARALiquidityCompounderAbi, startBlock },
  basketManagers: { address: profileAddresses("V4_BASKET_MANAGERS"), abi: NARABasketManagerAbi, startBlock },
  basketFeeCollector: { address: profileAddress("V4_BASKET_FEE_COLLECTOR"), abi: NARABasketFeeCollectorAbi, startBlock },
  genesisRewardDistributor: { address: profileAddress("V4_GENESIS_REWARD_DISTRIBUTOR"), abi: NARAGenesisRewardDistributorAbi, startBlock },
  bribeRouter: { address: profileAddress("V4_BRIBE_ROUTER"), abi: NARABribeRouterAbi, startBlock },
};

export const ENGINE_OPS_ROUTER_ADDRESS = optionalFreshV4Address("V4_ENGINE_OPS_ROUTER");
export const BREAK_GLASS_SAFE_ADDRESS = optionalFreshV4Address("V4_BREAK_GLASS_SAFE");

export const TREASURY_ADDRESS = process.env.V4_TREASURY_ADDRESS
  ? requireFreshV4Address("V4_TREASURY_ADDRESS")
  : undefined;
export const FINAL_ADMIN_ADDRESS = process.env.V4_FINAL_ADMIN
  ? requireFreshV4Address("V4_FINAL_ADMIN")
  : undefined;
export const DEPLOYER_ADDRESS = process.env.DEPLOYER_ADDRESS
  ? requireFreshV4Address("DEPLOYER_ADDRESS")
  : undefined;
