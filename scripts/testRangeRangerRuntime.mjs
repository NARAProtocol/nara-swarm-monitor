import assert from "node:assert/strict";
import {
  TICK_SPACING,
  tickToPriceUsdc,
  priceToTick,
  analyzeGridLiquidity,
  calculateMarketFlow,
  calculateDynamicBudgets,
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

console.log("Running Dynamic Range Ranger Runtime Tests...\n");

// 1. Test Tick <-> Price Math
{
  const testTick = 296520;
  const price = tickToPriceUsdc(testTick);
  assert.ok(price > 0.13 && price < 0.14, `Price at tick 296520 should be ~$0.132, got ${price}`);

  const recoveredTick = priceToTick(price, TICK_SPACING);
  assert.equal(recoveredTick, testTick, `Recovered tick ${recoveredTick} should match original ${testTick}`);
  console.log("✔ 1. Tick <-> Price conversion and alignment passed.");
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
  console.log("✔ 2. Liquidity topology & stale order detection passed.");
}

// 3. Test Dynamic Budget Calculation
{
  // Scenario A: Standard Safe balances ($1,500 USDC, 80,000 NARA)
  const budgets = calculateDynamicBudgets({
    safeUsdcBalance: 1500_000000n, // $1,500
    safeNaraBalance: 80000_000000000000000000n, // 80,000 NARA
    marketFlow: { volatilityScore: 1.0, netPressure: 0 },
  });

  // Base 35% of 1500 = $525 USDC, 25% of 80k = 20,000 NARA
  assert.equal(budgets.usdcBudget, 525);
  assert.equal(budgets.naraBudget, 20000);

  // Scenario B: Elevated volatility multiplier (1.4x)
  const volBudgets = calculateDynamicBudgets({
    safeUsdcBalance: 2000_000000n, // $2,000
    safeNaraBalance: 100000_000000000000000000n, // 100,000 NARA
    marketFlow: { volatilityScore: 1.4, netPressure: 0.4 },
  });

  // 2000 * 0.35 * 1.4 = $980
  assert.equal(volBudgets.usdcBudget, 980);
  // 100k * 0.25 * 1.4 = 35,000 NARA
  assert.equal(volBudgets.naraBudget, 35000);

  console.log("✔ 3. Dynamic reserve-aware budget calculation passed.");
}

// 4. Test 5-Tier Bracket Synthesis across Regimes
{
  const spotPrice = 0.1152;
  const currentTick = 297935;

  // 4A. Neutral Regime (5 tiers default)
  const neutralBuys = synthesizeBuyBracket(spotPrice, 600, currentTick, { netPressure: 0 });
  const neutralSells = synthesizeSellBracket(spotPrice, 20000, currentTick, { netPressure: 0 });

  assert.equal(neutralBuys.length, 5, "Neutral buys should produce 5 tiers");
  assert.equal(neutralSells.length, 5, "Neutral sells should produce 5 tiers");

  // Verify tick bounds: buys strictly > currentTick, sells strictly < currentTick
  for (const b of neutralBuys) {
    assert.ok(b.tickLower < b.tickUpper, `Buy #${b.bandIndex}: tickLower must be < tickUpper`);
    assert.ok(b.tickLower > currentTick, `Buy #${b.bandIndex}: tickLower must sit strictly below spot`);
  }
  for (const s of neutralSells) {
    assert.ok(s.tickLower < s.tickUpper, `Sell #${s.bandIndex}: tickLower must be < tickUpper`);
    assert.ok(s.tickUpper < currentTick, `Sell #${s.bandIndex}: tickUpper must sit strictly above spot`);
  }

  // 4B. Buy Pressure Regime (Market pumping: Sells skew higher into exponential ladder, Buys front-loaded)
  const pumpBuys = synthesizeBuyBracket(spotPrice, 700, currentTick, { netPressure: 0.5 });
  const pumpSells = synthesizeSellBracket(spotPrice, 25000, currentTick, { netPressure: 0.5 });

  assert.equal(pumpBuys.length, 5);
  assert.equal(pumpSells.length, 5);
  // Tier 1 pump buy should hold 40% of budget ($280)
  assert.equal(pumpBuys[0].usdcBudget, 280);
  assert.ok(pumpSells[4].maximumNaraInput > 0n);

  // 4C. Sell Pressure Regime (Market dumping: Buys average down deeper, Sells placed tighter)
  const dumpBuys = synthesizeBuyBracket(spotPrice, 600, currentTick, { netPressure: -0.5 });
  const dumpSells = synthesizeSellBracket(spotPrice, 20000, currentTick, { netPressure: -0.5 });

  assert.equal(dumpBuys.length, 5);
  assert.equal(dumpSells.length, 5);

  // 4D. Legacy 4-Tier Mode Compatibility
  const legBuys = synthesizeBuyBracket(spotPrice, 600, currentTick, { tierCount: 4 });
  const legSells = synthesizeSellBracket(spotPrice, 20000, currentTick, { tierCount: 4 });
  assert.equal(legBuys.length, 4, "Should support 4-tier legacy mode");
  assert.equal(legSells.length, 4, "Should support 4-tier legacy mode");

  console.log("✔ 4. Multi-tier bracket synthesis across Neutral, Pump, and Dump regimes passed.");
}

// 5. Test Atomic buildSafeBatchJson with 5-Tier Orders
{
  const spotPrice = 0.1152;
  const currentTick = 297935;
  const staleOrders = [{ orderId: 3n }, { orderId: 7n }];
  const buyBands = synthesizeBuyBracket(spotPrice, 600, currentTick);
  const sellBands = synthesizeSellBracket(spotPrice, 20000, currentTick);

  const batch = buildSafeBatchJson({
    chainId: 8453,
    staleOrders,
    buyBands,
    sellBands,
  });

  assert.equal(batch.version, "1.0");
  assert.equal(batch.chainId, "8453");

  // Calls breakdown with 5 tiers:
  // 2 cancellations + 1 usdc approve + 1 nara approve + 5 buy orders + 5 sell orders + 1 usdc clear + 1 nara clear + 1 assert
  // = 2 + 1 + 1 + 5 + 5 + 1 + 1 + 1 = 17 calls
  assert.equal(batch.transactions.length, 17, `Batch should contain 17 calls, got ${batch.transactions.length}`);

  assert.equal(batch.transactions[0].to.toLowerCase(), RANGE_MANAGER_ADDRESS.toLowerCase());
  assert.equal(batch.transactions[1].to.toLowerCase(), RANGE_MANAGER_ADDRESS.toLowerCase());
  assert.equal(batch.transactions[2].to.toLowerCase(), USDC_ADDRESS.toLowerCase());
  assert.equal(batch.transactions[3].to.toLowerCase(), NARA_ADDRESS.toLowerCase());
  assert.equal(batch.transactions[16].to.toLowerCase(), RANGE_MANAGER_ADDRESS.toLowerCase());

  console.log("✔ 5. Atomic All-In-One Safe Batch JSON synthesis (17 calls) passed.");
}

// 6. Test buildRangeRangerTelegramAlert Formatting
{
  const analysis = {
    spotPrice: 0.1152,
    closestBuy: { pUpper: 0.1095 },
    closestBuyDistancePct: 4.9,
    closestSell: { pLower: 0.1215 },
    closestSellDistancePct: 5.5,
    hasLiquidityGap: false,
  };
  const staleOrders = [{ orderId: 3n, pRange: "$0.16 – $0.22" }];
  const buyBands = synthesizeBuyBracket(0.1152, 600, 297935);
  const sellBands = synthesizeSellBracket(0.1152, 20000, 297935);

  const msg = buildRangeRangerTelegramAlert({
    reason: "Tactical Periodic Rebalance",
    analysis,
    buyBands,
    sellBands,
    staleOrders,
    safeUsdcBalance: 1335110000n,
    safeNaraBalance: 85200000000000000000000n,
    marketFlow: { netPressure: 0.35, volatilityScore: 1.25 },
    batchFilename: "deployments/UNEXECUTED-atomic-overhaul-51198900.json",
  });

  assert.ok(msg.includes("TACTICAL REBALANCE"), "Message should contain tactical rebalance banner");
  assert.ok(msg.includes("0.1152"), "Message should contain spot price");
  assert.ok(msg.includes("1,335.11 USDC"), "Message should format Safe USDC balance");
  assert.ok(msg.includes("Net Buying Pressure (+35%)"), "Message should display net buying pressure");
  assert.ok(msg.includes("1.25x"), "Message should display volatility multiplier");
  assert.ok(msg.includes("Dynamic Buy Ladder (5 Tiers"), "Message should list 5-tier buy ladder");
  assert.ok(msg.includes("Dynamic Sell Ladder (5 Tiers"), "Message should list 5-tier sell ladder");
  console.log("✔ 6. Tactical Range Ranger Telegram alert card formatting passed.");
}

// 7. Test buildAutonomousSuccessTelegramAlert Formatting
{
  const analysis = { spotPrice: 0.1152 };
  const staleOrders = [{ orderId: 21n }];
  const buyBands = synthesizeBuyBracket(0.1152, 600, 297935);
  const sellBands = synthesizeSellBracket(0.1152, 20000, 297935);

  const msg = buildAutonomousSuccessTelegramAlert({
    reason: "Volatility Shift >= 15%",
    analysis,
    buyBands,
    sellBands,
    staleOrders,
    safeUsdcBalance: 1335110000n,
    txHash: "0xe5382c9a83d171a9c9707ef49e5ac4cc1cb9e35d5e07dc6d5b4efe359dcf5917",
    blockNumber: 51198950,
    gasUsed: 4625336n,
  });

  assert.ok(msg.includes("AUTONOMOUS REBALANCE CONFIRMED"), "Message should contain confirmation header");
  assert.ok(msg.includes("0.1152"), "Message should contain spot price");
  assert.ok(msg.includes("0xe5382c9a"), "Message should contain tx hash");
  assert.ok(msg.includes("51198950"), "Message should contain block number");
  assert.ok(msg.includes("Deployed 5 Buy Bands"), "Message should report 5 deployed buy bands");
  assert.ok(msg.includes("Deployed 5 Sell Bands"), "Message should report 5 deployed sell bands");
  assert.ok(typeof executeAutonomousSafeBatch === "function", "executeAutonomousSafeBatch should be exported function");
  console.log("✔ 7. Autonomous execution Telegram card formatting passed.");
}

console.log("\n🎉 ALL DYNAMIC RANGE RANGER RUNTIME TESTS PASSED!\n");

