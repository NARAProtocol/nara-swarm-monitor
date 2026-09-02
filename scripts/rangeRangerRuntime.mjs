import { encodeFunctionData, parseAbi, keccak256, toHex } from "viem";

export const TICK_SPACING = 60;
export const USDC_DECIMALS = 6;
export const NARA_DECIMALS = 18;
export const SCALE_DECIMALS_DIFF = 10n ** 12n; // 18 - 6

export const RANGE_MANAGER_ADDRESS = "0xd58afa5eaB20B0ED287851Cf98f359AdEd58a69C";
export const TREASURY_SAFE_ADDRESS = "0x5050BC6dc3E07313D52D05cecD53f727D6CDa245";
export const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const NARA_ADDRESS = "0xB6333F5D4cEd8dffA80F3F13697D6aA3BB3f19c1";

export const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
]);

export const RANGE_MANAGER_ABI = parseAbi([
  "function currentPoolState() view returns (uint160 sqrtPriceX96, int24 tick, uint128 liquidity, uint24 protocolFee, uint24 lpFee)",
  "function getActiveOrderIds(uint256 offset, uint256 limit) view returns (uint256[] orderIds, uint256 nextOffset)",
  "function getOrder(uint256 orderId) view returns (uint256 tokenId, uint256 inputAmount, uint256 minimumOutputAmount, bytes32 strategyHash, uint128 liquidity, int24 tickLower, int24 tickUpper, uint64 createdBlock, uint64 creationDeadline, uint64 terminalBlock, uint8 side, uint8 status)",
  "function createBuyNaraOrder(int24 tickLower, int24 tickUpper, uint128 maximumUsdcInput, uint128 minimumNaraOutput, bytes32 strategyHash, uint64 deadline) returns (uint256 orderId, uint256 tokenId)",
  "function createSellNaraOrder(int24 tickLower, int24 tickUpper, uint128 maximumNaraInput, uint128 minimumUsdcOutput, bytes32 strategyHash, uint64 deadline) returns (uint256 orderId, uint256 tokenId)",
  "function assertOperationalClean() view returns (bool)",
]);

export function formatUsdcNumber(amountUsdc) {
  return Number(amountUsdc).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Computes human spot price in USDC per NARA from tick
 * Formula: Price = 1e12 / (1.0001 ^ tick)
 */
export function tickToPriceUsdc(tick) {
  const rawP = Math.pow(1.0001, Number(tick));
  return (1 / rawP) * 1e12;
}

/**
 * Computes tick from human USDC price, aligned to tickSpacing
 * Formula: tick = ln(1e12 / price) / ln(1.0001)
 */
export function priceToTick(priceUsdc, tickSpacing = TICK_SPACING) {
  if (priceUsdc <= 0) throw new Error("Price must be greater than zero");
  const exactTick = Math.log(1e12 / priceUsdc) / Math.log(1.0001);
  return Math.floor(exactTick / tickSpacing) * tickSpacing;
}

/**
 * Analyzes liquidity topology and distances to nearest active orders
 */
export function analyzeGridLiquidity(currentTick, activeOrders) {
  const spotPrice = tickToPriceUsdc(currentTick);

  let closestBuy = null;
  let closestBuyDistancePct = null;
  let closestSell = null;
  let closestSellDistancePct = null;

  const buyOrders = [];
  const sellOrders = [];

  for (const order of activeOrders) {
    if (order.status !== 1) continue; // Only active orders

    const pUpper = tickToPriceUsdc(order.tickLower);
    const pLower = tickToPriceUsdc(order.tickUpper);
    const orderData = { ...order, pLower, pUpper };

    if (order.side === 0) {
      // BUY order: sits below spot
      buyOrders.push(orderData);
      const distPct = ((spotPrice - pUpper) / spotPrice) * 100;
      if (closestBuyDistancePct === null || distPct < closestBuyDistancePct) {
        closestBuyDistancePct = distPct;
        closestBuy = orderData;
      }
    } else if (order.side === 1) {
      // SELL order: sits above spot
      sellOrders.push(orderData);
      const distPct = ((pLower - spotPrice) / spotPrice) * 100;
      if (closestSellDistancePct === null || distPct < closestSellDistancePct) {
        closestSellDistancePct = distPct;
        closestSell = orderData;
      }
    }
  }

  return {
    spotPrice,
    currentTick,
    activeBuyCount: buyOrders.length,
    activeSellCount: sellOrders.length,
    closestBuy,
    closestBuyDistancePct: closestBuyDistancePct !== null ? Math.max(0, closestBuyDistancePct) : null,
    closestSell,
    closestSellDistancePct: closestSellDistancePct !== null ? Math.max(0, closestSellDistancePct) : null,
    hasLiquidityGap: closestBuyDistancePct !== null ? closestBuyDistancePct > 20 : true,
  };
}

/**
 * Synthesizes an optimal front-heavy 4-band buy bracket under spot price
 */
export function synthesizeBuyBracket(spotPrice, usdcBudgetTotal = 600) {
  // Front-heavy distribution: 40% in band 1, 30% in band 2, 20% in band 3, 10% in band 4
  const bandRatios = [0.40, 0.30, 0.20, 0.10];
  const bandDisplacements = [
    { fromPct: 0.05, toPct: 0.09 }, // -5% to -9%
    { fromPct: 0.09, toPct: 0.14 }, // -9% to -14%
    { fromPct: 0.14, toPct: 0.21 }, // -14% to -21%
    { fromPct: 0.21, toPct: 0.30 }, // -21% to -30%
  ];

  const bands = [];
  for (let i = 0; i < bandDisplacements.length; i++) {
    const disp = bandDisplacements[i];
    const highPrice = spotPrice * (1 - disp.fromPct);
    const lowPrice = spotPrice * (1 - disp.toPct);
    const tickLower = priceToTick(highPrice); // Higher price = lower tick
    const tickUpper = priceToTick(lowPrice); // Lower price = higher tick

    // Ensure tickLower < tickUpper and both aligned
    const tLower = Math.min(tickLower, tickUpper);
    const tUpper = Math.max(tickLower, tickUpper);

    const budgetUsdc = Math.floor(usdcBudgetTotal * bandRatios[i]);
    const maxUsdcInput = BigInt(budgetUsdc) * 10n ** BigInt(USDC_DECIMALS);

    // Conservative minimum NARA output based on upper price limit with 2% margin
    const minNaraRaw = (maxUsdcInput * 10n ** 18n) / (BigInt(Math.floor(highPrice * 1e6)) + 1n);

    bands.push({
      bandIndex: i + 1,
      targetPriceRange: `$${lowPrice.toFixed(4)} – $${highPrice.toFixed(4)}`,
      tickLower: tLower,
      tickUpper: tUpper,
      usdcBudget: budgetUsdc,
      maximumUsdcInput: maxUsdcInput,
      minimumNaraOutput: (minNaraRaw * 98n) / 100n, // 2% slippage safety
    });
  }

  return bands;
}

/**
 * Builds a valid Safe Transaction Builder JSON payload
 */
export function buildSafeBatchJson({
  chainId = 8453,
  safeAddress = TREASURY_SAFE_ADDRESS,
  bands,
  strategyHash = keccak256(toHex(`NARA-RANGE-RANGER-${Date.now()}`)),
  deadlineSeconds = 86400 * 7, // 7 days
}) {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);
  const totalUsdcRequired = bands.reduce((acc, b) => acc + b.maximumUsdcInput, 0n);

  const transactions = [];

  // 1. Approve exact USDC to RangeManager
  transactions.push({
    to: USDC_ADDRESS,
    value: "0",
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [RANGE_MANAGER_ADDRESS, totalUsdcRequired],
    }),
    contractMethod: null,
    contractInputsValues: null,
  });

  // 2. Create each Buy Order
  for (const band of bands) {
    transactions.push({
      to: RANGE_MANAGER_ADDRESS,
      value: "0",
      data: encodeFunctionData({
        abi: RANGE_MANAGER_ABI,
        functionName: "createBuyNaraOrder",
        args: [
          band.tickLower,
          band.tickUpper,
          band.maximumUsdcInput,
          band.minimumNaraOutput,
          strategyHash,
          deadline,
        ],
      }),
      contractMethod: null,
      contractInputsValues: null,
    });
  }

  // 3. Final invariant check: assertOperationalClean
  transactions.push({
    to: RANGE_MANAGER_ADDRESS,
    value: "0",
    data: encodeFunctionData({
      abi: RANGE_MANAGER_ABI,
      functionName: "assertOperationalClean",
      args: [],
    }),
    contractMethod: null,
    contractInputsValues: null,
  });

  return {
    version: "1.0",
    chainId: String(chainId),
    createdAt: Date.now(),
    meta: {
      name: "Range Ranger Tactical Rebalance Batch",
      description: `Tactical 4-band buy bracket securing ${bands[0].targetPriceRange.split("–")[1]?.trim()} floor. Total: $${Number(totalUsdcRequired) / 1e6} USDC.`,
      txBuilderVersion: "1.18.0",
      createdFromSafeAddress: safeAddress,
    },
    transactions,
  };
}

/**
 * Builds Telegram alert message
 */
export function buildRangeRangerTelegramAlert({
  reason,
  analysis,
  bands,
  safeUsdcBalance,
  batchFilename,
}) {
  const buyGapText = analysis.closestBuyDistancePct !== null
    ? `${analysis.closestBuyDistancePct.toFixed(1)}% gap`
    : "No active buy support";

  const banner = analysis.hasLiquidityGap
    ? "?? ?? [RANGE RANGER: LIQUIDITY GAP ALERT]"
    : "?? ? [RANGE RANGER: TACTICAL REBALANCE]";

  const bandLines = bands.map(
    (b) => `  • Band #${b.bandIndex}: ${b.targetPriceRange} ($${b.usdcBudget} USDC)`,
  );

  return [
    banner,
    "????????????????????",
    `?? Trigger: ${reason}`,
    `?? Current Spot: $${analysis.spotPrice.toFixed(4)} USDC`,
    `?? Nearest Buy: ${analysis.closestBuy ? `$${analysis.closestBuy.pUpper.toFixed(4)}` : "None"} (${buyGapText})`,
    `?? Nearest Sell: ${analysis.closestSell ? `$${analysis.closestSell.pLower.toFixed(4)}` : "None"}`,
    "????????????????????",
    `?? Treasury Safe Available: $${formatUsdcNumber(Number(safeUsdcBalance) / 1e6)} USDC`,
    `?? Recommended 4-Band Ladder ($${bands.reduce((s, b) => s + b.usdcBudget, 0)} USDC):`,
    ...bandLines,
    "????????????????????",
    `?? Safe Batch Generated: ${batchFilename}`,
    "?? Import JSON into Safe Transaction Builder to deploy.",
  ].join("\n");
}
