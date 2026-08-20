import { createConfig, factory } from "ponder";
import { CONTRACTS } from "./config/contracts";

export default createConfig({
  chains: {
    base: {
      id: parseInt(process.env.CHAIN_ID || "8453"),
      rpc: process.env.BASE_RPC_URL || "https://mainnet.base.org",
    },
  },
  contracts: {
    NARAToken: {
      chain: "base",
      abi: CONTRACTS.token.abi,
      address: CONTRACTS.token.address,
      startBlock: CONTRACTS.token.startBlock,
    },
    NARAEngine: {
      chain: "base",
      abi: CONTRACTS.engine.abi,
      address: CONTRACTS.engine.address,
      startBlock: CONTRACTS.engine.startBlock,
      includeCallTraces: true,
    },
    NARAEngineOpsRouterV1: {
      chain: "base",
      abi: CONTRACTS.engineOpsRouter.abi,
      address: CONTRACTS.engineOpsRouter.address,
      startBlock: CONTRACTS.engineOpsRouter.startBlock,
    },
    NARAPositionNFT: {
      chain: "base",
      abi: CONTRACTS.positionNft.abi,
      address: CONTRACTS.positionNft.address,
      startBlock: CONTRACTS.positionNft.startBlock,
    },
    NARABondDepositoryV4NFT: {
      chain: "base",
      abi: CONTRACTS.bondDepositoryNft.abi,
      address: CONTRACTS.bondDepositoryNft.address,
      startBlock: CONTRACTS.bondDepositoryNft.startBlock,
    },
    NARABondVault: {
      chain: "base",
      abi: CONTRACTS.bondVault.abi,
      address: CONTRACTS.bondVault.address,
      startBlock: CONTRACTS.bondVault.startBlock,
    },
    NARAOpsVault: {
      chain: "base",
      abi: CONTRACTS.opsVault.abi,
      address: CONTRACTS.opsVault.address,
      startBlock: CONTRACTS.opsVault.startBlock,
    },
    NARAStakingPool: { chain: "base", abi: CONTRACTS.stakingPool.abi, address: CONTRACTS.stakingPool.address, startBlock: CONTRACTS.stakingPool.startBlock },
    NARAStakingPoolSY: { chain: "base", abi: CONTRACTS.stakingPoolSy.abi, address: CONTRACTS.stakingPoolSy.address, startBlock: CONTRACTS.stakingPoolSy.startBlock },
    NARAFractionalFactory: { chain: "base", abi: CONTRACTS.fractionalFactory.abi, address: CONTRACTS.fractionalFactory.address, startBlock: CONTRACTS.fractionalFactory.startBlock },
    NARAFractionalPosition: {
      chain: "base",
      abi: CONTRACTS.fractionalFactory.childAbi,
      address: factory({
        address: CONTRACTS.fractionalFactory.address,
        event: CONTRACTS.fractionalFactory.abi[0],
        parameter: "fractional",
        startBlock: CONTRACTS.fractionalFactory.startBlock,
      }),
      startBlock: CONTRACTS.fractionalFactory.startBlock,
    },
    NARALiquidityGrowthHook: { chain: "base", abi: CONTRACTS.liquidityHook.abi, address: CONTRACTS.liquidityHook.address, startBlock: CONTRACTS.liquidityHook.startBlock },
    NARALiquidityGrowthVault: { chain: "base", abi: CONTRACTS.liquidityVault.abi, address: CONTRACTS.liquidityVault.address, startBlock: CONTRACTS.liquidityVault.startBlock },
    NARALiquidityCompounder: { chain: "base", abi: CONTRACTS.liquidityCompounder.abi, address: CONTRACTS.liquidityCompounder.address, startBlock: CONTRACTS.liquidityCompounder.startBlock },
    NARABasketManager: { chain: "base", abi: CONTRACTS.basketManagers.abi, address: CONTRACTS.basketManagers.address, startBlock: CONTRACTS.basketManagers.startBlock },
    NARABasketFeeCollector: { chain: "base", abi: CONTRACTS.basketFeeCollector.abi, address: CONTRACTS.basketFeeCollector.address, startBlock: CONTRACTS.basketFeeCollector.startBlock },
    NARAGenesisRewardDistributor: { chain: "base", abi: CONTRACTS.genesisRewardDistributor.abi, address: CONTRACTS.genesisRewardDistributor.address, startBlock: CONTRACTS.genesisRewardDistributor.startBlock },
    NARABribeRouter: { chain: "base", abi: CONTRACTS.bribeRouter.abi, address: CONTRACTS.bribeRouter.address, startBlock: CONTRACTS.bribeRouter.startBlock },
  },
});
