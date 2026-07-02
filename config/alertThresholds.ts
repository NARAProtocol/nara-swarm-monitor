export const ALERT_THRESHOLDS = {
  // Max single transfer/burn of NARA that won't trigger alert (in raw tokens, not Wei)
  maxTreasuryMoveNara: parseFloat(process.env.ALERT_MAX_TREASURY_MOVE_NARA || "10000"),
  
  // Single claim expected cap (e.g. 5000 NARA)
  maxSingleClaimNara: parseFloat(process.env.ALERT_MAX_SINGLE_CLAIM_NARA || "5000"),
  
  // Maximum indexer lag in blocks before triggering severity 5
  maxIndexerLagBlocks: parseInt(process.env.ALERT_MAX_INDEXER_LAG_BLOCKS || "30"),
  
  // Concentrated supply wallet percentage (10%)
  maxWalletSupplySharePct: parseFloat(process.env.ALERT_MAX_WALLET_SHARE_PCT || "10.0"),
  
  // Failed transaction spike limit (reverts per hour)
  maxRevertsPerHour: parseInt(process.env.ALERT_MAX_REVERTS_PER_HOUR || "10"),
};
