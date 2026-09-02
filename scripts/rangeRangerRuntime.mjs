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
  "function cancel(uint256 orderId, uint128 minNaraOut, uint128 minUsdcOut, uint64 deadline) returns (uint256 naraOut, uint256 usdcOut)",
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
  const staleOrders = [];

  for (const order of activeOrders) {
    if (order.status !== 1) continue; // Only active orders

    const pUpper = tickToPriceUsdc(order.tickLower);
    const pLower = tickToPriceUsdc(order.tickUpper);
    const orderData = { ...order, pLower, pUpper };

    // Mark as stale if order is > 50% away from current spot
    if (pLower > spotPrice * 1.5 || pUpper < spotPrice * 0.5) {
      staleOrders.push(orderData);
    }

    if (Number(order.side) === 1) {
      // BUY order: sits below spot
      buyOrders.push(orderData);
      const distPct = ((spotPrice - pUpper) / spotPrice) * 100;
      if (closestBuyDistancePct === null || distPct < closestBuyDistancePct) {
        closestBuyDistancePct = distPct;
        closestBuy = orderData;
      }
    } else if (Number(order.side) === 0) {
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
    staleOrders,
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
export function synthesizeBuyBracket(spotPrice, usdcBudgetTotal = 600, currentTick = null) {
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
    let tickLower = Math.min(priceToTick(highPrice), priceToTick(lowPrice));
    let tickUpper = Math.max(priceToTick(highPrice), priceToTick(lowPrice));

    if (currentTick !== null) {
      if (tickLower <= currentTick) tickLower = Math.floor(currentTick / TICK_SPACING) * TICK_SPACING + TICK_SPACING;
      if (tickUpper <= tickLower) tickUpper = tickLower + TICK_SPACING * 4;
    }

    const budgetUsdc = Math.floor(usdcBudgetTotal * bandRatios[i]);
    const maxUsdcInput = BigInt(budgetUsdc) * 10n ** BigInt(USDC_DECIMALS);
    const minNaraRaw = (maxUsdcInput * 10n ** 18n) / (BigInt(Math.floor(highPrice * 1e6)) + 1n);

    bands.push({
      bandIndex: i + 1,
      targetPriceRange: `$${lowPrice.toFixed(4)} – $${highPrice.toFixed(4)}`,
      tickLower,
      tickUpper,
      usdcBudget: budgetUsdc,
      maximumUsdcInput: maxUsdcInput,
      minimumNaraOutput: (minNaraRaw * 98n) / 100n, // 2% slippage safety
    });
  }

  return bands;
}

/**
 * Synthesizes an optimal 4-band sell bracket above spot price
 */
export function synthesizeSellBracket(spotPrice, naraBudgetTotal = 20000, currentTick = null) {
  const sellRatios = [0.25, 0.25, 0.25, 0.25];
  const sellDisplacements = [
    { fromPct: 0.15, toPct: 0.35 },
    { fromPct: 0.35, toPct: 0.65 },
    { fromPct: 0.65, toPct: 1.10 },
    { fromPct: 1.10, toPct: 1.80 },
  ];

  const bands = [];
  for (let i = 0; i < sellDisplacements.length; i++) {
    const disp = sellDisplacements[i];
    const lowPrice = spotPrice * (1 + disp.fromPct);
    const highPrice = spotPrice * (1 + disp.toPct);
    let tickLower = Math.min(priceToTick(highPrice), priceToTick(lowPrice));
    let tickUpper = Math.max(priceToTick(highPrice), priceToTick(lowPrice));

    if (currentTick !== null) {
      if (tickUpper >= currentTick) tickUpper = Math.floor(currentTick / TICK_SPACING) * TICK_SPACING - TICK_SPACING;
      if (tickLower >= tickUpper) tickLower = tickUpper - TICK_SPACING * 4;
    }

    const budgetNara = Math.floor(naraBudgetTotal * sellRatios[i]);
    const maxNaraInput = BigInt(budgetNara) * 10n ** BigInt(NARA_DECIMALS);
    const minUsdcRaw = ((maxNaraInput * BigInt(Math.floor(lowPrice * 1e6))) / 10n ** 18n * 98n) / 100n;

    bands.push({
      bandIndex: i + 1,
      targetPriceRange: `$${lowPrice.toFixed(4)} – $${highPrice.toFixed(4)}`,
      tickLower,
      tickUpper,
      naraBudget: budgetNara,
      maximumNaraInput: maxNaraInput,
      minimumUsdcOutput: minUsdcRaw,
    });
  }

  return bands;
}

/**
 * Builds an Atomic All-In-One Safe Transaction Builder JSON payload
 * Cancels stale orders + Approves Tokens + Deploys Buy & Sell Ladders + Clears Approvals + Asserts Clean
 */
export function buildSafeBatchJson({
  chainId = 8453,
  safeAddress = TREASURY_SAFE_ADDRESS,
  staleOrders = [],
  buyBands = [],
  sellBands = [],
  strategyHash = keccak256(toHex(`NARA-ATOMIC-OVERHAUL-${Date.now()}`)),
  deadlineSeconds = 86400 * 7, // 7 days
}) {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);
  const totalUsdcRequired = buyBands.reduce((acc, b) => acc + b.maximumUsdcInput, 0n);
  const totalNaraRequired = sellBands.reduce((acc, s) => acc + s.maximumNaraInput, 0n);

  const transactions = [];

  // Step 1: Cancel all stale / off-market orders (Assets instantly returned to Safe)
  for (const s of staleOrders) {
    transactions.push({
      to: RANGE_MANAGER_ADDRESS,
      value: "0",
      data: encodeFunctionData({
        abi: RANGE_MANAGER_ABI,
        functionName: "cancel",
        args: [BigInt(s.orderId), 0n, 0n, deadline],
      }),
      contractMethod: null,
      contractInputsValues: null,
    });
  }

  // Step 2: Approve required USDC
  if (totalUsdcRequired > 0n) {
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
  }

  // Step 3: Approve required NARA
  if (totalNaraRequired > 0n) {
    transactions.push({
      to: NARA_ADDRESS,
      value: "0",
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [RANGE_MANAGER_ADDRESS, totalNaraRequired],
      }),
      contractMethod: null,
      contractInputsValues: null,
    });
  }

  // Step 4: Deploy fresh Buy Bands
  for (const band of buyBands) {
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

  // Step 5: Deploy fresh Sell Bands
  for (const band of sellBands) {
    transactions.push({
      to: RANGE_MANAGER_ADDRESS,
      value: "0",
      data: encodeFunctionData({
        abi: RANGE_MANAGER_ABI,
        functionName: "createSellNaraOrder",
        args: [
          band.tickLower,
          band.tickUpper,
          band.maximumNaraInput,
          band.minimumUsdcOutput,
          strategyHash,
          deadline,
        ],
      }),
      contractMethod: null,
      contractInputsValues: null,
    });
  }

  // Step 6: Clear residual allowances to zero
  transactions.push({
    to: USDC_ADDRESS,
    value: "0",
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [RANGE_MANAGER_ADDRESS, 0n],
    }),
    contractMethod: null,
    contractInputsValues: null,
  });

  transactions.push({
    to: NARA_ADDRESS,
    value: "0",
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [RANGE_MANAGER_ADDRESS, 0n],
    }),
    contractMethod: null,
    contractInputsValues: null,
  });

  // Step 7: Final operational clean invariant check
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
      name: "NARA Elite Atomic Overhaul & Rebalance Batch",
      description: `Atomic overhaul: Cancels ${staleOrders.length} stale orders + Deploys ${buyBands.length} Buy Bands ($${Number(totalUsdcRequired) / 1e6} USDC) + Deploys ${sellBands.length} Sell Bands (${Number(totalNaraRequired) / 1e18} NARA).`,
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
  buyBands = [],
  sellBands = [],
  staleOrders = [],
  safeUsdcBalance,
  batchFilename,
}) {
  const buyGapText = analysis.closestBuyDistancePct !== null
    ? `${analysis.closestBuyDistancePct.toFixed(1)}% gap`
    : "No active buy support";

  const banner = analysis.hasLiquidityGap
    ? "?? ?? [RANGE RANGER: ATOMIC OVERHAUL REQUIRED]"
    : "?? ? [RANGE RANGER: TACTICAL REBALANCE]";

  const staleLines = staleOrders.length > 0
    ? staleOrders.map((s) => `  • Cancel Order #${s.orderId}: ${s.pRange || "out-of-market"}`)
    : ["  • None"];

  const buyLines = buyBands.map(
    (b) => `  • Buy #${b.bandIndex}: ${b.targetPriceRange} ($${b.usdcBudget} USDC)`,
  );

  const sellLines = sellBands.map(
    (s) => `  • Sell #${s.bandIndex}: ${s.targetPriceRange} (${s.naraBudget} NARA)`,
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
    `??? Atomic Cancellations (${staleOrders.length} stale orders):`,
    ...staleLines,
    `?? Fresh Buy Ladder ($${buyBands.reduce((s, b) => s + b.usdcBudget, 0)} USDC):`,
    ...buyLines,
    `?? Fresh Sell Ladder (${sellBands.reduce((s, b) => s + b.naraBudget, 0)} NARA):`,
    ...sellLines,
    "????????????????????",
    `?? Atomic Safe Batch Generated: ${batchFilename}`,
    "?? Import JSON into Safe Transaction Builder to execute everything in 1 single transaction.",
  ].join("\n");
}
