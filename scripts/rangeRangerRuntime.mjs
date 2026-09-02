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

export function tickToPriceUsdc(tick) {
  const rawP = Math.pow(1.0001, Number(tick));
  return (1 / rawP) * 1e12;
}

export function priceToTick(priceUsdc, tickSpacing = TICK_SPACING) {
  if (priceUsdc <= 0) throw new Error("Price must be greater than zero");
  const exactTick = Math.log(1e12 / priceUsdc) / Math.log(1.0001);
  return Math.floor(exactTick / tickSpacing) * tickSpacing;
}

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
    if (order.status !== 1) continue;

    const pUpper = tickToPriceUsdc(order.tickLower);
    const pLower = tickToPriceUsdc(order.tickUpper);
    const orderData = {
      ...order,
      pLower,
      pUpper,
      pRange: `$${pLower.toFixed(4)} – $${pUpper.toFixed(4)}`,
    };

    if (pLower > spotPrice * 1.5 || pUpper < spotPrice * 0.5) {
      staleOrders.push(orderData);
    }

    if (Number(order.side) === 1) {
      buyOrders.push(orderData);
      const distPct = ((spotPrice - pUpper) / spotPrice) * 100;
      if (closestBuyDistancePct === null || distPct < closestBuyDistancePct) {
        closestBuyDistancePct = distPct;
        closestBuy = orderData;
      }
    } else if (Number(order.side) === 0) {
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

export function synthesizeBuyBracket(spotPrice, usdcBudgetTotal = 600, currentTick = null) {
  const bandRatios = [0.40, 0.30, 0.20, 0.10];
  const bandDisplacements = [
    { fromPct: 0.05, toPct: 0.09 },
    { fromPct: 0.09, toPct: 0.14 },
    { fromPct: 0.14, toPct: 0.21 },
    { fromPct: 0.21, toPct: 0.30 },
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
      minimumNaraOutput: (minNaraRaw * 98n) / 100n,
    });
  }

  return bands;
}

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

export function buildSafeBatchJson({
  chainId = 8453,
  safeAddress = TREASURY_SAFE_ADDRESS,
  staleOrders = [],
  buyBands = [],
  sellBands = [],
  strategyHash = keccak256(toHex(`NARA-ATOMIC-OVERHAUL-${Date.now()}`)),
  deadlineSeconds = 86400 * 7,
}) {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);
  const totalUsdcRequired = buyBands.reduce((acc, b) => acc + b.maximumUsdcInput, 0n);
  const totalNaraRequired = sellBands.reduce((acc, s) => acc + s.maximumNaraInput, 0n);

  const transactions = [];

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
    ? "\u{1F3F9} \u{26A0}\u{FE0F} [RANGE RANGER: ATOMIC OVERHAUL REQUIRED]"
    : "\u{1F3F9} \u{26A1} [RANGE RANGER: TACTICAL REBALANCE]";

  const staleLines = staleOrders.length > 0
    ? staleOrders.map((s) => `  \u2022 Cancel Order #${s.orderId}: ${s.pRange || "out-of-market"}`)
    : ["  \u2022 None"];

  const buyLines = buyBands.length > 0
    ? buyBands.map((b) => `  \u2022 Buy #${b.bandIndex}: ${b.targetPriceRange} ($${b.usdcBudget} USDC)`)
    : ["  \u2022 None"];

  const sellLines = sellBands.length > 0
    ? sellBands.map((s) => `  \u2022 Sell #${s.bandIndex}: ${s.targetPriceRange} (${s.naraBudget} NARA)`)
    : ["  \u2022 None"];

  const div = "\u2501".repeat(20);

  return [
    banner,
    div,
    `\u{1F4CA} Trigger: ${reason}`,
    `\u{1F4B0} Current Spot: $${analysis.spotPrice.toFixed(4)} USDC`,
    `\u{1F9F1} Nearest Buy: ${analysis.closestBuy ? `$${analysis.closestBuy.pUpper.toFixed(4)}` : "None"} (${buyGapText})`,
    `\u{1F3AF} Nearest Sell: ${analysis.closestSell ? `$${analysis.closestSell.pLower.toFixed(4)}` : "None"}`,
    div,
    `\u{1F3E6} Treasury Safe Available: $${formatUsdcNumber(Number(safeUsdcBalance) / 1e6)} USDC`,
    `\u{1F5D1}\u{FE0F} Atomic Cancellations (${staleOrders.length} stale orders):`,
    ...staleLines,
    `\u{1F7E2} Fresh Buy Ladder ($${buyBands.reduce((s, b) => s + b.usdcBudget, 0)} USDC):`,
    ...buyLines,
    `\u{1F534} Fresh Sell Ladder (${sellBands.reduce((s, b) => s + b.naraBudget, 0)} NARA):`,
    ...sellLines,
    div,
    `\u{1F4C1} Atomic Safe Batch Generated: ${batchFilename}`,
    "\u{1F449} Import JSON into Safe Transaction Builder to execute everything in 1 single transaction.",
  ].join("\n");
}

export async function executeAutonomousSafeBatch({
  publicClient,
  walletClient,
  safeAddress = TREASURY_SAFE_ADDRESS,
  transactions,
}) {
  const MULTISEND_CALL_ONLY = "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D";

  let packed = "0x";
  for (const tx of transactions) {
    const op = "00";
    const to = tx.to.toLowerCase().replace("0x", "");
    const val = BigInt(tx.value || 0).toString(16).padStart(64, "0");
    const dataBytes = tx.data.replace("0x", "");
    const dataLen = (dataBytes.length / 2).toString(16).padStart(64, "0");
    packed += op + to + val + dataLen + dataBytes;
  }

  const multiSendData = encodeFunctionData({
    abi: parseAbi(["function multiSend(bytes transactions)"]),
    functionName: "multiSend",
    args: [packed],
  });

  const nonce = await publicClient.readContract({
    address: safeAddress,
    abi: parseAbi(["function nonce() view returns (uint256)"]),
    functionName: "nonce",
  });

  const domain = { chainId: 8453, verifyingContract: safeAddress };
  const types = {
    SafeTx: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "operation", type: "uint8" },
      { name: "safeTxGas", type: "uint256" },
      { name: "baseGas", type: "uint256" },
      { name: "gasPrice", type: "uint256" },
      { name: "gasToken", type: "address" },
      { name: "refundReceiver", type: "address" },
      { name: "nonce", type: "uint256" },
    ],
  };
  const message = {
    to: MULTISEND_CALL_ONLY,
    value: 0n,
    data: multiSendData,
    operation: 1, // DelegateCall
    safeTxGas: 0n,
    baseGas: 0n,
    gasPrice: 0n,
    gasToken: "0x0000000000000000000000000000000000000000",
    refundReceiver: "0x0000000000000000000000000000000000000000",
    nonce: nonce,
  };

  const signature = await walletClient.signTypedData({
    account: walletClient.account,
    domain,
    types,
    primaryType: "SafeTx",
    message,
  });

  const SAFE_EXEC_ABI = parseAbi([
    "function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool)",
  ]);

  const hash = await walletClient.writeContract({
    address: safeAddress,
    abi: SAFE_EXEC_ABI,
    functionName: "execTransaction",
    args: [
      message.to,
      message.value,
      message.data,
      message.operation,
      message.safeTxGas,
      message.baseGas,
      message.gasPrice,
      message.gasToken,
      message.refundReceiver,
      signature,
    ],
    gas: 7_500_000n,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { hash, receipt, nonce };
}

export function buildAutonomousSuccessTelegramAlert({
  reason,
  analysis,
  buyBands = [],
  sellBands = [],
  staleOrders = [],
  safeUsdcBalance,
  txHash,
  blockNumber,
  gasUsed,
}) {
  const buyTotal = buyBands.reduce((s, b) => s + b.usdcBudget, 0);
  const sellTotal = sellBands.reduce((s, b) => s + b.naraBudget, 0);
  const div = "\u2501".repeat(20);

  return [
    "\u{1F3F9} \u{26A1} [RANGE RANGER: AUTONOMOUS REBALANCE CONFIRMED]",
    div,
    `\u{1F4CA} Trigger: ${reason}`,
    `\u{1F4B0} Current Spot: $${analysis.spotPrice.toFixed(4)} USDC`,
    `\u{1F517} Tx: https://basescan.org/tx/${txHash}`,
    `\u{1F9F1} Confirmed in Block #${blockNumber} (Gas Used: ${gasUsed.toString()})`,
    div,
    `\u{1F5D1}\u{FE0F} Cancelled & Settled: ${staleOrders.length} stale orders`,
    `\u{1F7E2} Deployed 4 Buy Bands ($${buyTotal} USDC)`,
    `\u{1F534} Deployed 4 Sell Bands (${sellTotal} NARA)`,
    `\u{1F3E6} Treasury Safe Available: $${formatUsdcNumber(Number(safeUsdcBalance) / 1e6)} USDC`,
    div,
    "\u2705 Order book is now perfectly centered around live market price.",
  ].join("\n");
}