import assert from "node:assert/strict";
import {
  TICK_SPACING,
  tickToPriceUsdc,
  priceToTick,
  analyzeGridLiquidity,
  synthesizeBuyBracket,
  synthesizeSellBracket,
  buildSafeBatchJson,
  buildRangeRangerTelegramAlert,
  buildAutonomousSuccessTelegramAlert,
  executeAutonomousSafeBatch,
  RANGE_MANAGER_ADDRESS,
  USDC_ADDRESS,
  NARA_ADDRESS,
} from "./rangeRangerRuntime.mjs";

console.log("Running Range Ranger Runtime Tests...\n");

// 1. Test Tick <-> Price Math
{
  const testTick = 296520;
  const price = tickToPriceUsdc(testTick);
  assert.ok(price > 0.13 && price < 0.14, `Price at tick 296520 should be ~$0.132, got ${price}`);

  const recoveredTick = priceToTick(price, TICK_SPACING);
  assert.equal(recoveredTick, testTick, `Recovered tick ${recoveredTick} should match original ${testTick}`);
  console.log("? 1. Tick <-> Price conversion and alignment passed.");
}

// 2. Test analyzeGridLiquidity & Stale Order Detection
{
  const currentTick = 328635; // Spot ~$0.0053
  const activeOrders = [
    {
      orderId: 3n,
      side: 0, // SellNara
      status: 1, // ACTIVE
      tickLower: 291480, // Price ~$0.1608 - $0.2197 (stale)
      tickUpper: 294600,
    },
    {
      orderId: 7n,
      side: 0, // SellNara
      status: 1,
      tickLower: 277380, // Price ~$0.6020 - $0.8998 (stale)
      tickUpper: 281400,
    },
    {
      orderId: 10n,
      side: 1, // BuyNara
      status: 1,
      tickLower: 329100, // Price ~$0.0051 (fresh buy)
      tickUpper: 329520,
    },
  ];

  const analysis = analyzeGridLiquidity(currentTick, activeOrders);
  assert.equal(analysis.staleOrders.length, 2, "Should detect exactly 2 stale orders");
  assert.equal(analysis.activeBuyCount, 1);
  assert.equal(analysis.activeSellCount, 2);
  console.log("? 2. Liquidity topology & stale order detection passed.");
}

// 3. Test synthesizeBuyBracket & synthesizeSellBracket
{
  const spotPrice = 0.0053;
  const buyBands = synthesizeBuyBracket(spotPrice, 600, 328635);
  const sellBands = synthesizeSellBracket(spotPrice, 20000, 328635);

  assert.equal(buyBands.length, 4, "Should generate exactly 4 buy bands");
  assert.equal(sellBands.length, 4, "Should generate exactly 4 sell bands");

  for (const b of buyBands) {
    assert.ok(b.tickLower < b.tickUpper, `Buy band #${b.bandIndex}: tickLower must be < tickUpper`);
    assert.ok(b.tickLower > 328635, `Buy band #${b.bandIndex}: tickLower must sit strictly below spot`);
  }
  for (const s of sellBands) {
    assert.ok(s.tickLower < s.tickUpper, `Sell band #${s.bandIndex}: tickLower must be < tickUpper`);
    assert.ok(s.tickUpper < 328635, `Sell band #${s.bandIndex}: tickUpper must sit strictly above spot`);
  }
  console.log("? 3. Two-sided Buy & Sell bracket synthesis passed.");
}

// 4. Test Atomic buildSafeBatchJson (All-in-one overhaul)
{
  const spotPrice = 0.0053;
  const staleOrders = [{ orderId: 3n }, { orderId: 7n }];
  const buyBands = synthesizeBuyBracket(spotPrice, 600, 328635);
  const sellBands = synthesizeSellBracket(spotPrice, 20000, 328635);

  const batch = buildSafeBatchJson({
    chainId: 8453,
    staleOrders,
    buyBands,
    sellBands,
  });

  assert.equal(batch.version, "1.0");
  assert.equal(batch.chainId, "8453");

  // Calls breakdown:
  // 2 cancellations + 1 usdc approve + 1 nara approve + 4 buy orders + 4 sell orders + 1 usdc clear + 1 nara clear + 1 assert
  // = 2 + 1 + 1 + 4 + 4 + 1 + 1 + 1 = 15 calls
  assert.equal(batch.transactions.length, 15, `Batch should contain 15 calls, got ${batch.transactions.length}`);

  // Calls 0-1: cancel stale orders
  assert.equal(batch.transactions[0].to.toLowerCase(), RANGE_MANAGER_ADDRESS.toLowerCase());
  assert.equal(batch.transactions[1].to.toLowerCase(), RANGE_MANAGER_ADDRESS.toLowerCase());

  // Call 2: USDC approval
  assert.equal(batch.transactions[2].to.toLowerCase(), USDC_ADDRESS.toLowerCase());

  // Call 3: NARA approval
  assert.equal(batch.transactions[3].to.toLowerCase(), NARA_ADDRESS.toLowerCase());

  // Call 14: assertOperationalClean
  assert.equal(batch.transactions[14].to.toLowerCase(), RANGE_MANAGER_ADDRESS.toLowerCase());

  console.log("? 4. Atomic All-In-One Safe Batch JSON synthesis passed.");
}

// 5. Test buildRangeRangerTelegramAlert
{
  const analysis = {
    spotPrice: 0.0053,
    closestBuy: { pUpper: 0.0040 },
    closestBuyDistancePct: 24.5,
    closestSell: null,
    hasLiquidityGap: true,
  };
  const staleOrders = [{ orderId: 3n, pRange: "$0.16 – $0.22" }];
  const buyBands = synthesizeBuyBracket(0.0053, 600, 328635);
  const sellBands = synthesizeSellBracket(0.0053, 20000, 328635);

  const msg = buildRangeRangerTelegramAlert({
    reason: "Liquidity Gap > 20% Detected",
    analysis,
    buyBands,
    sellBands,
    staleOrders,
    safeUsdcBalance: 2236909858n,
    batchFilename: "deployments/UNEXECUTED-atomic-overhaul-50751200.json",
  });

  assert.ok(msg.includes("ATOMIC OVERHAUL"), "Message should contain atomic overhaul banner");
  assert.ok(msg.includes("0.0053"), "Message should contain spot price");
  assert.ok(msg.includes("2,236.91 USDC"), "Message should format Safe USDC balance");
  assert.ok(msg.includes("Cancel Order #3"), "Message should list stale cancellations");
  assert.ok(msg.includes("Buy #1"), "Message should list fresh buy bands");
  assert.ok(msg.includes("Sell #1"), "Message should list fresh sell bands");
  console.log("? 5. Atomic Telegram alert card formatting passed.");
}


// 6. Test buildAutonomousSuccessTelegramAlert
{
  const analysis = { spotPrice: 0.0727 };
  const staleOrders = [{ orderId: 21n }];
  const buyBands = [{ bandIndex: 1, usdcBudget: 320 }];
  const sellBands = [{ bandIndex: 1, naraBudget: 5000 }];

  const msg = buildAutonomousSuccessTelegramAlert({
    reason: "Volatility Shift >= 15%",
    analysis,
    buyBands,
    sellBands,
    staleOrders,
    safeUsdcBalance: 2521320000n,
    txHash: "0xe5382c9a83d171a9c9707ef49e5ac4cc1cb9e35d5e07dc6d5b4efe359dcf5917",
    blockNumber: 50792858,
    gasUsed: 4125336n,
  });

  assert.ok(msg.includes("AUTONOMOUS REBALANCE CONFIRMED"), "Message should contain confirmation header");
  assert.ok(msg.includes("0.0727"), "Message should contain spot price");
  assert.ok(msg.includes("0xe5382c9a"), "Message should contain tx hash");
  assert.ok(msg.includes("50792858"), "Message should contain block number");
  assert.ok(typeof executeAutonomousSafeBatch === "function", "executeAutonomousSafeBatch should be exported function");
  console.log("✔ 6. Autonomous execution Telegram card formatting passed.");
}


// 6. Test buildAutonomousSuccessTelegramAlert
{
  const analysis = { spotPrice: 0.0727 };
  const staleOrders = [{ orderId: 21n }];
  const buyBands = [{ bandIndex: 1, usdcBudget: 320 }];
  const sellBands = [{ bandIndex: 1, naraBudget: 5000 }];

  const msg = buildAutonomousSuccessTelegramAlert({
    reason: "Volatility Shift >= 15%",
    analysis,
    buyBands,
    sellBands,
    staleOrders,
    safeUsdcBalance: 2521320000n,
    txHash: "0xe5382c9a83d171a9c9707ef49e5ac4cc1cb9e35d5e07dc6d5b4efe359dcf5917",
    blockNumber: 50792858,
    gasUsed: 4125336n,
  });

  assert.ok(msg.includes("AUTONOMOUS REBALANCE CONFIRMED"), "Message should contain confirmation header");
  assert.ok(msg.includes("0.0727"), "Message should contain spot price");
  assert.ok(msg.includes("0xe5382c9a"), "Message should contain tx hash");
  assert.ok(msg.includes("50792858"), "Message should contain block number");
  assert.ok(typeof executeAutonomousSafeBatch === "function", "executeAutonomousSafeBatch should be exported function");
  console.log("✔ 6. Autonomous execution Telegram card formatting passed.");
}

console.log("\n🎉 ALL ATOMIC RANGE RANGER RUNTIME TESTS PASSED!\n");
