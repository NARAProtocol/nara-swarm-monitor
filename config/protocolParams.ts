export const PROTOCOL_PARAMS = {
  maxBoostBps: 3000, // Max 30% discount/boost for bonds
  epochLengthSeconds: 900, // 15 mins epoch length
  decimals: 18,
  
  // Total fixed supply parameters
  maxTotalSupply: 1_000_000n * 10n ** 18n,
  
  // Hardcoded emission parameters
  initialBaseEmission: 500_000_000_000_000_000n, // 0.5 NARA base emission
  
  // Ops vault limit
  maxOpsVaultCap: 10_000n * 10n ** 18n,
};
