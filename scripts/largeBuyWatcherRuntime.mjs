import { parseAbiItem } from "viem";

export const USDC_DECIMALS = 6;
export const POOL_FEE_TAKEN_EVENT = parseAbiItem(
  "event PoolFeeTaken(bytes32 indexed poolId, address indexed sender, address indexed currency, uint256 amountIn, uint256 feeAmount, uint16 feeBps, bool isBuy)",
);

export function parseUsdcThreshold(raw, name = "LARGE_BUY_ALERT_MIN_USDC") {
  const value = String(raw ?? "").trim();
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,6}))?$/.exec(value);
  if (!match) throw new Error(`${name} must be a positive USDC amount with at most 6 decimals`);
  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] ?? "").padEnd(USDC_DECIMALS, "0"));
  const parsed = whole * (10n ** BigInt(USDC_DECIMALS)) + fraction;
  if (parsed <= 0n) throw new Error(`${name} must be greater than zero`);
  return parsed;
}

export function formatUsdc(rawAmount) {
  const amount = BigInt(rawAmount);
  const unit = 10n ** BigInt(USDC_DECIMALS);
  const whole = amount / unit;
  const fraction = (amount % unit).toString().padStart(USDC_DECIMALS, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function isLargeCanonicalBuy(args, options) {
  return Boolean(args?.isBuy)
    && String(args?.poolId ?? "").toLowerCase() === options.poolId.toLowerCase()
    && String(args?.currency ?? "").toLowerCase() === options.usdcAddress.toLowerCase()
    && BigInt(args?.amountIn ?? 0n) >= options.minimumUsdcRaw;
}

export function largeBuyDeliveryId(chainId, transactionHash, logIndex) {
  return `${chainId}:${String(transactionHash).toLowerCase()}:${Number(logIndex)}`;
}

export function buildLargeBuyTelegramMessage(details) {
  return [
    "🐋 NARA LARGE BUY",
    `Buy size: ${formatUsdc(details.amountIn)} USDC`,
    `Buyer: ${details.buyer}`,
    `Hook fee: ${formatUsdc(details.feeAmount)} USDC (${details.feeBps} BPS)`,
    `Block: ${details.blockNumber}`,
    `Transaction: https://basescan.org/tx/${details.transactionHash}`,
  ].join("\n");
}

export function buildLargeBuyTestMessage(options) {
  return [
    "✅ NARA large-buy alert test",
    `Threshold: ${formatUsdc(options.minimumUsdcRaw)} USDC`,
    `Monitoring from Base block: ${options.startBlock}`,
    "Future canonical NARA/USDC buys at or above the threshold will trigger an alert.",
  ].join("\n");
}
