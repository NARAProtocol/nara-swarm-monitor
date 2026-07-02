export const BASE_CONFIG = {
  chainId: parseInt(process.env.CHAIN_ID || "8453"), // Base Mainnet
  mainRpcUrl: process.env.BASE_RPC_URL || "https://mainnet.base.org",
  backupRpcUrls: [
    process.env.BASE_BACKUP_RPC_URL_1 || "https://base.publicnode.com",
    process.env.BASE_BACKUP_RPC_URL_2 || "https://base.drpc.org",
  ],
  // Reorg confirmation blocks to prevent indexing unstable blocks
  reorgConfirmations: parseInt(process.env.REORG_CONFIRMATIONS || "3"),
};
