import { createConfig } from "ponder";
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
    },
    NARAPositionNFT: {
      chain: "base",
      abi: CONTRACTS.positionNft.abi,
      address: CONTRACTS.positionNft.address,
      startBlock: CONTRACTS.positionNft.startBlock,
    },
  },
});
