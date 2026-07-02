import { NARATokenAbi } from "../abis/NARATokenAbi";
import { NARAEngineAbi } from "../abis/NARAEngineAbi";
import { NARAPositionNFTAbi } from "../abis/NARAPositionNFTAbi";

export const CONTRACTS = {
  token: {
    address: (process.env.V4_NARA_TOKEN || "0x58c209B95350aFBEFa17137CEd209f8c4b7D896D") as `0x${string}`,
    abi: NARATokenAbi,
    startBlock: parseInt(process.env.V4_START_BLOCK || "0"),
  },
  engine: {
    address: (process.env.V4_ENGINE || "0x9E8cE51805b13a4d75c324F75B06ABc00d9b1E03") as `0x${string}`,
    abi: NARAEngineAbi,
    startBlock: parseInt(process.env.V4_START_BLOCK || "0"),
  },
  positionNft: {
    address: (process.env.V4_POSITION_NFT || "0xe447Bbf5CE59D584D354A29Ce6C0D73561F46748") as `0x${string}`,
    abi: NARAPositionNFTAbi,
    startBlock: parseInt(process.env.V4_START_BLOCK || "0"),
  },
};

export const TREASURY_ADDRESS = (process.env.V4_TREASURY_ADDRESS || "0xfe3A8678A9c729438BB11718bD1391E7Ab491E8e") as `0x${string}`;
export const FINAL_ADMIN_ADDRESS = (process.env.V4_FINAL_ADMIN || "0xC019Dc79412c4b20103ac4ce97B2615FF45D490d") as `0x${string}`;
export const DEPLOYER_ADDRESS = (process.env.DEPLOYER_ADDRESS || "0xcf222f05911e3AbeF77F2A552C623c122522F670") as `0x${string}`;
