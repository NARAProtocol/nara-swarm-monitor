import { parseAbiItem } from "viem";

export const USDC_DECIMALS = 6;
export const NARA_DECIMALS = 18;
export const POOL_FEE_TAKEN_EVENT = parseAbiItem(
  "event PoolFeeTaken(bytes32 indexed poolId, address indexed sender, address indexed currency, uint256 amountIn, uint256 feeAmount, uint16 feeBps, bool isBuy)",
);
export const REALIZED_FEE_EVENT = parseAbiItem(
  "event RealizedFee(address indexed currency, uint64 indexed termsVersion, bool exactInput, uint256 requested, uint256 gross, uint256 poolInput, uint256 fee, uint256 output)",
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

export function formatNara(rawAmount) {
  const amount = BigInt(rawAmount);
  const unit = 10n ** BigInt(NARA_DECIMALS);
  const whole = amount / unit;
  const fraction = (amount % unit).toString().padStart(NARA_DECIMALS, "0").slice(0, 4).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function normalizeHookSwapEvent(args, options = {}) {
  if (args?.gross !== undefined) {
    const currency = String(args?.currency ?? "");
    const isUsdc = Boolean(options.usdcAddress)
      && currency.toLowerCase() === String(options.usdcAddress).toLowerCase();
    const amountIn = BigInt(args.gross ?? 0n);
    const feeAmount = BigInt(args.fee ?? 0n);
    const output = BigInt(args.output ?? 0n);
    const feeBps = amountIn > 0n ? Number((feeAmount * 10_000n) / amountIn) : 0;
    return {
      poolId: options.poolId ?? null,
      sender: args.sender ?? null,
      currency,
      amountIn,
      feeAmount,
      feeBps,
      isBuy: isUsdc && output > 0n,
      naraOut: isUsdc ? output : null,
      isV5RealizedFee: true,
    };
  }
  return {
    poolId: args?.poolId ?? null,
    sender: args?.sender ?? null,
    currency: args?.currency ?? null,
    amountIn: BigInt(args?.amountIn ?? 0n),
    feeAmount: BigInt(args?.feeAmount ?? 0n),
    feeBps: Number(args?.feeBps ?? 0),
    isBuy: Boolean(args?.isBuy),
    naraOut: null,
    isV5RealizedFee: false,
  };
}

export function isLargeCanonicalBuy(args, options) {
  if (args?.gross !== undefined) {
    const normalized = normalizeHookSwapEvent(args, options);
    return normalized.isBuy && normalized.amountIn >= options.minimumUsdcRaw;
  }
  return Boolean(args?.isBuy)
    && String(args?.poolId ?? "").toLowerCase() === options.poolId.toLowerCase()
    && String(args?.currency ?? "").toLowerCase() === options.usdcAddress.toLowerCase()
    && BigInt(args?.amountIn ?? 0n) >= options.minimumUsdcRaw;
}

export function largeBuyDeliveryId(chainId, transactionHash, logIndex) {
  return `${chainId}:${String(transactionHash).toLowerCase()}:${Number(logIndex)}`;
}

export function buildLargeBuyTelegramMessage(details) {
  const shortBuyer = `${details.buyer.slice(0, 6)}...${details.buyer.slice(-4)}`;
  const feePct = (Number(details.feeBps) / 100).toFixed(2);
  const lines = [
    "🟢 🐋 NARA POOL BUY DETECTED",
    "━━━━━━━━━━━━━━━━━━━━",
    `💵 Amount In: ${formatUsdc(details.amountIn)} USDC`,
  ];
  if (details.naraOut && BigInt(details.naraOut) > 0n) {
    lines.push(`🪙 NARA Out: ${formatNara(details.naraOut)} NARA`);
  }
  lines.push(
    `🛡️ Hook Fee: ${formatUsdc(details.feeAmount)} USDC (${feePct}%)`,
    `👤 Buyer: ${shortBuyer}`,
    `🧱 Block: #${details.blockNumber}`,
    "━━━━━━━━━━━━━━━━━━━━",
    `🔗 BaseScan: https://basescan.org/tx/${details.transactionHash}`,
  );
  return lines.join("\n");
}

export function buildLargeBuyTestMessage(options) {
  return [
    "🟢 🧪 NARA BUY ALERT TEST",
    "━━━━━━━━━━━━━━━━━━━━",
    `📊 Threshold: ${formatUsdc(options.minimumUsdcRaw)} USDC`,
    `🧱 Start Block: #${options.startBlock}`,
    "✅ Status: Live & Listening on Base Mainnet",
    "━━━━━━━━━━━━━━━━━━━━",
    "All future Uniswap v4 buys at or above the threshold will trigger an instant alert.",
  ].join("\n");
}
