export type DexType = "v2" | "v3" | "aerodrome" | "unknown";

export const DEX_CONFIG = {
  dexType: (process.env.V4_DEX_TYPE || "v3") as DexType,
  poolAddress: (process.env.V4_DEX_POOL || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  // V3 specific params if applicable
  positionManagerAddress: (process.env.V4_DEX_POSITION_MANAGER || "0x0000000000000000000000000000000000000000") as `0x${string}`,
};
