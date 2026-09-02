import assert from "node:assert/strict";
import {
  TICK_SPACING,
  tickToPriceUsdc,
  priceToTick,
  analyzeGridLiquidity,
  synthesizeBuyBracket,
  buildSafeBatchJson,
  buildRangeRangerTelegramAlert,
  RANGE_MANAGER_ADDRESS,
  USDC_ADDRESS,
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

// 2. Test analyzeGridLiquidity
{
  const currentTick = 296520; // Spot ~$0.1326
  const activeOrders = [
    {
      orderId: 1n,
      side: 0, // BUY
      status: 1, // ACTIVE
      tickLower: 298800, // Price ~$0.105
      tickUpper: 301200, // Price ~$0.083
    },
    {
      orderId: 2n,
      side: 1, // SELL
      status: 1, // ACTIVE
      tickLower: 291600, // Price ~$0.216
      tickUpper: 294000, // Price ~$0.170
    },
  ];

  const analysis = analyzeGridLiquidity(currentTick, activeOrders);
  assert.equal(analysis.activeBuyCount, 1);
  assert.equal(analysis.activeSellCount, 1);
  assert.ok(analysis.closestBuyDistancePct > 15, `Buy distance should be > 15%, got ${analysis.closestBuyDistancePct}%`);
  assert.ok(analysis.closestSellDistancePct > 15, `Sell distance should be > 15%, got ${analysis.closestSellDistancePct}%`);
  console.log("? 2. Liquidity topology & distance analysis passed.");
}

// 3. Test synthesizeBuyBracket
{
  const spotPrice = 0.1326;
  const usdcBudget = 600;
  const bands = synthesizeBuyBracket(spotPrice, usdcBudget);

  assert.equal(bands.length, 4, "Should generate exactly 4 bands");
  const totalBudget = bands.reduce((s, b) => s + b.usdcBudget, 0);
  assert.equal(totalBudget, usdcBudget, `Total band budget should sum to ${usdcBudget}`);

  for (const b of bands) {
    assert.ok(b.tickLower < b.tickUpper, `Band #${b.bandIndex}: tickLower must be < tickUpper`);
    assert.equal(b.tickLower % TICK_SPACING, 0, `Band #${b.bandIndex}: tickLower must be multiple of ${TICK_SPACING}`);
    assert.equal(b.tickUpper % TICK_SPACING, 0, `Band #${b.bandIndex}: tickUpper must be multiple of ${TICK_SPACING}`);
    assert.ok(b.maximumUsdcInput > 0n, "maximumUsdcInput must be > 0");
    assert.ok(b.minimumNaraOutput > 0n, "minimumNaraOutput must be > 0");
  }
  console.log("? 3. Front-heavy 4-band buy bracket synthesis passed.");
}

// 4. Test buildSafeBatchJson
{
  const spotPrice = 0.1326;
  const bands = synthesizeBuyBracket(spotPrice, 600);
  const batch = buildSafeBatchJson({
    chainId: 8453,
    bands,
  });

  assert.equal(batch.version, "1.0");
  assert.equal(batch.chainId, "8453");
  assert.equal(batch.transactions.length, 6, "Batch should have 1 approve + 4 order creations + 1 assertion = 6 txs");

  // Tx 0: USDC approve to RangeManager
  assert.equal(batch.transactions[0].to.toLowerCase(), USDC_ADDRESS.toLowerCase());
  // Txs 1-4: createBuyNaraOrder
  for (let i = 1; i <= 4; i++) {
    assert.equal(batch.transactions[i].to.toLowerCase(), RANGE_MANAGER_ADDRESS.toLowerCase());
  }
  // Tx 5: assertOperationalClean
  assert.equal(batch.transactions[5].to.toLowerCase(), RANGE_MANAGER_ADDRESS.toLowerCase());
  console.log("? 4. Safe Transaction Builder JSON encoding passed.");
}

// 5. Test buildRangeRangerTelegramAlert
{
  const analysis = {
    spotPrice: 0.1326,
    closestBuy: { pUpper: 0.105 },
    closestBuyDistancePct: 20.8,
    closestSell: { pLower: 0.170 },
    hasLiquidityGap: true,
  };
  const bands = synthesizeBuyBracket(0.1326, 600);
  const msg = buildRangeRangerTelegramAlert({
    reason: "Liquidity Gap > 20% Detected",
    analysis,
    bands,
    safeUsdcBalance: 2236909858n,
    batchFilename: "deployments/UNEXECUTED-rebalance-50751200.json",
  });

  assert.ok(msg.includes("RANGE RANGER"), "Message should contain banner");
  assert.ok(msg.includes("0.1326"), "Message should contain spot price");
  assert.ok(msg.includes("2,236.91 USDC"), "Message should format Safe USDC balance");
  assert.ok(msg.includes("Band #1"), "Message should list bands");
  console.log("? 5. Telegram alert formatting passed.");
}

console.log("\n?? ALL RANGE RANGER RUNTIME TESTS PASSED!\n");
