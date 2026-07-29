import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REQUIRED_MONITOR_SURFACES } from "../src/surfaceCoverage.mjs";

const root = resolve(import.meta.dirname, "..");
function configuredWorkspace() {
  if (!process.env.NARA_WORKSPACE_ROOT) return null;

  const configured = resolve(process.env.NARA_WORKSPACE_ROOT);
  if (
    existsSync(resolve(configured, "nara-protocol-hardhat")) &&
    existsSync(resolve(configured, "nara-category-baskets-v1"))
  ) {
    return configured;
  }

  throw new Error("NARA_WORKSPACE_ROOT does not contain both required source repositories.");
}

function git(repository, args) {
  return execFileSync("git", ["-C", repository, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function requirePinnedRepository(workspace, repositoryName, commitVariable, remotePattern) {
  const expectedCommit = process.env[commitVariable];
  assert.match(
    expectedCommit ?? "",
    /^[a-f0-9]{40}$/i,
    `${commitVariable} must be the full 40-character merged origin commit`,
  );

  const repository = resolve(workspace, repositoryName);
  const remote = git(repository, ["remote", "get-url", "origin"]);
  assert.match(remote, remotePattern, `${repositoryName} origin is not the expected GitHub repository`);

  const resolvedCommit = git(repository, ["rev-parse", `${expectedCommit}^{commit}`]);
  assert.equal(
    resolvedCommit.toLowerCase(),
    expectedCommit.toLowerCase(),
    `${commitVariable} does not resolve to the requested commit`,
  );

  git(repository, ["rev-parse", "--verify", "refs/remotes/origin/main"]);
  try {
    git(repository, ["merge-base", "--is-ancestor", expectedCommit, "refs/remotes/origin/main"]);
  } catch {
    throw new Error(
      `${commitVariable} is not contained in the locally known origin/main; fetch origin and use a merged release commit`,
    );
  }

  return { repository, commit: expectedCommit };
}

const workspace = configuredWorkspace();
let pinnedRepositories = null;
if (workspace) {
  pinnedRepositories = {
    protocol: requirePinnedRepository(
      workspace,
      "nara-protocol-hardhat",
      "NARA_PROTOCOL_ORIGIN_COMMIT",
      /github\.com[:/]NARAProtocol\/nara_protocol_v4(?:\.git)?$/i,
    ),
    baskets: requirePinnedRepository(
      workspace,
      "nara-category-baskets-v1",
      "NARA_BASKETS_ORIGIN_COMMIT",
      /github\.com[:/]NARAProtocol\/nara_protocol_v4_baskets(?:\.git)?$/i,
    ),
  };
}

const abiText = readFileSync(resolve(root, "abis/NARAEcosystemAbis.ts"), "utf8");
const handlerText = readFileSync(resolve(root, "src/ecosystemIndex.ts"), "utf8");

const sources = {
  stakingPool: { repository: "protocol", path: "contracts/v4/composability/NARAStakingPoolV4.sol" },
  stakingPoolSy: { repository: "protocol", path: "contracts/v4/composability/NARAStakingPoolSYV4.sol" },
  fractionalFactory: {
    repository: "protocol",
    path: "contracts/v4/composability/NARAFractionalPositionFactoryV4.sol",
  },
  fractionalPosition: {
    repository: "protocol",
    path: "contracts/v4/composability/NARAFractionalPositionV4.sol",
  },
  liquidityHook: { repository: "protocol", path: "contracts/v4/NARALiquidityGrowthHook.sol" },
  liquidityVault: { repository: "protocol", path: "contracts/v4/NARALiquidityGrowthVault.sol" },
  liquidityCompounder: { repository: "protocol", path: "contracts/v4/NARALiquidityCompounderV4.sol" },
  basketManager: { repository: "baskets", path: "src/NARAImmutableBasketPositionManagerV1.sol" },
  basketFeeCollector: { repository: "baskets", path: "src/NARAIndexFeeCollectorV2.sol" },
  genesisRewardDistributor: {
    repository: "protocol",
    path: "contracts/v4/NARAGenesisRewardDistributorV4.sol",
  },
  bribeRouter: { repository: "protocol", path: "contracts/v4/router/BribeRouterV4.sol" },
};

for (const [surface, definition] of Object.entries(REQUIRED_MONITOR_SURFACES)) {
  const sourceDefinition = sources[surface];
  const pin = pinnedRepositories?.[sourceDefinition.repository];
  const source = pin ? git(pin.repository, ["show", `${pin.commit}:${sourceDefinition.path}`]) : null;
  for (const eventName of definition.events) {
    if (source && !(surface === "basketManager" && eventName === "Transfer")) {
      assert.match(
        source,
        new RegExp(`event\\s+${eventName}\\s*\\(`),
        `${surface}.${eventName} still exists in active source`,
      );
    }
    assert.match(abiText, new RegExp(`event ${eventName}\\(`), `${surface}.${eventName} exists in monitor ABI`);
  }
}

for (const match of handlerText.matchAll(/ponder\.on\("[^:]+:([^"]+)"/g)) {
  assert.match(abiText, new RegExp(`event ${match[1]}\\(`), `handler event ${match[1]} exists in ecosystem ABI`);
}

if (workspace) {
  console.log("Pinned merged-source to monitor-ABI drift checks passed.");
} else {
  console.log(
    "Monitor handler-to-ABI checks passed; pinned merged-source comparison requires NARA_WORKSPACE_ROOT, NARA_PROTOCOL_ORIGIN_COMMIT, and NARA_BASKETS_ORIGIN_COMMIT.",
  );
}
