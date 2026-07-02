export type DexType = "uniswap_v4" | "unknown";

export const DEX_CONFIG = {
  dexType: (process.env.V4_DEX_TYPE || "uniswap_v4") as DexType,
  poolId: process.env.V4_UNISWAP_V4_POOL_ID,
  hookAddress: process.env.V4_LIQUIDITY_HOOK as `0x${string}` | undefined,
  vaultAddress: process.env.V4_LIQUIDITY_VAULT as `0x${string}` | undefined,
  compounderAddress: process.env.V4_LIQUIDITY_COMPOUNDER as `0x${string}` | undefined,
};
