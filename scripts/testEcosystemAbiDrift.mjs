import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REQUIRED_MONITOR_SURFACES } from "../src/surfaceCoverage.mjs";

const root = resolve(import.meta.dirname, "..");
const workspace = resolve(root, "..");
const abiText = readFileSync(resolve(root, "abis/NARAEcosystemAbis.ts"), "utf8");
const handlerText = readFileSync(resolve(root, "src/ecosystemIndex.ts"), "utf8");

const sources = {
  stakingPool: "nara-protocol-hardhat/contracts/v4/composability/NARAStakingPoolV4.sol",
  stakingPoolSy: "nara-protocol-hardhat/contracts/v4/composability/NARAStakingPoolSYV4.sol",
  fractionalFactory: "nara-protocol-hardhat/contracts/v4/composability/NARAFractionalPositionFactoryV4.sol",
  fractionalPosition: "nara-protocol-hardhat/contracts/v4/composability/NARAFractionalPositionV4.sol",
  liquidityHook: "nara-protocol-hardhat/contracts/v4/NARALiquidityGrowthHook.sol",
  liquidityVault: "nara-protocol-hardhat/contracts/v4/NARALiquidityGrowthVault.sol",
  liquidityCompounder: "nara-protocol-hardhat/contracts/v4/NARALiquidityCompounderV4.sol",
  basketManager: "nara-category-baskets-v1/src/NARAImmutableBasketPositionManagerV1.sol",
  basketFeeCollector: "nara-category-baskets-v1/src/NARAIndexFeeCollectorV2.sol",
  genesisRewardDistributor: "nara-protocol-hardhat/contracts/v4/NARAGenesisRewardDistributorV4.sol",
  bribeRouter: "nara-protocol-hardhat/contracts/v4/router/BribeRouterV4.sol",
};

for (const [surface, definition] of Object.entries(REQUIRED_MONITOR_SURFACES)) {
  const source = readFileSync(resolve(workspace, sources[surface]), "utf8");
  for (const eventName of definition.events) {
    if (!(surface === "basketManager" && eventName === "Transfer")) {
      assert.match(source, new RegExp(`event\\s+${eventName}\\s*\\(`), `${surface}.${eventName} still exists in active source`);
    }
    assert.match(abiText, new RegExp(`event ${eventName}\\(`), `${surface}.${eventName} exists in monitor ABI`);
  }
}

for (const match of handlerText.matchAll(/ponder\.on\("[^:]+:([^"]+)"/g)) {
  assert.match(abiText, new RegExp(`event ${match[1]}\\(`), `handler event ${match[1]} exists in ecosystem ABI`);
}

console.log("Active-source to monitor-ABI drift checks passed.");
