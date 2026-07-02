import { NARATokenAbi } from "../abis/NARATokenAbi";
import { NARAEngineAbi } from "../abis/NARAEngineAbi";
import { NARAPositionNFTAbi } from "../abis/NARAPositionNFTAbi";
import { NARABondDepositoryV4NFTAbi } from "../abis/NARABondDepositoryV4NFTAbi";
import { NARABondVaultAbi } from "../abis/NARABondVaultAbi";
import { NARAOpsVaultAbi } from "../abis/NARAOpsVaultAbi";
import { NARAEngineOpsRouterV1Abi } from "../abis/NARAEngineOpsRouterV1Abi";
import { requireFreshStartBlock, requireFreshV4Address } from "./addressGuards";

const startBlock = requireFreshStartBlock();

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
    address: requireFreshV4Address("V4_POSITION_NFT"),
    abi: NARAPositionNFTAbi,
    startBlock,
  },
  bondDepositoryNft: {
    address: requireFreshV4Address("V4_BOND_DEPOSITORY_NFT"),
    abi: NARABondDepositoryV4NFTAbi,
    startBlock,
  },
  bondVault: {
    address: requireFreshV4Address("V4_BOND_VAULT"),
    abi: NARABondVaultAbi,
    startBlock,
  },
  opsVault: {
    address: requireFreshV4Address("V4_OPS_VAULT"),
    abi: NARAOpsVaultAbi,
    startBlock,
  },
  engineOpsRouter: {
    address: requireFreshV4Address("V4_ENGINE_OPS_ROUTER"),
    abi: NARAEngineOpsRouterV1Abi,
    startBlock,
  },
};

export const ENGINE_OPS_ROUTER_ADDRESS = CONTRACTS.engineOpsRouter.address;
export const BREAK_GLASS_SAFE_ADDRESS = requireFreshV4Address("V4_BREAK_GLASS_SAFE");

export const TREASURY_ADDRESS = process.env.V4_TREASURY_ADDRESS
  ? requireFreshV4Address("V4_TREASURY_ADDRESS")
  : undefined;
export const FINAL_ADMIN_ADDRESS = process.env.V4_FINAL_ADMIN
  ? requireFreshV4Address("V4_FINAL_ADMIN")
  : undefined;
export const DEPLOYER_ADDRESS = process.env.DEPLOYER_ADDRESS
  ? requireFreshV4Address("DEPLOYER_ADDRESS")
  : undefined;
