import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required and must come from the approved release handoff.`);
  return value;
}

function git(repository, args) {
  return execFileSync("git", ["-C", repository, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

const monitorRoot = resolve(import.meta.dirname, "..");
const workspaceRoot = resolve(requiredEnvironment("NARA_WORKSPACE_ROOT"));
const hardhatRoot = resolve(workspaceRoot, "nara-protocol-hardhat");
const originCommit = requiredEnvironment("NARA_PROTOCOL_ORIGIN_COMMIT");

assert.match(
  originCommit,
  /^[a-f0-9]{40}$/i,
  "NARA_PROTOCOL_ORIGIN_COMMIT must be the full 40-character merged protocol commit.",
);

const remote = git(hardhatRoot, ["remote", "get-url", "origin"]);
assert.match(
  remote,
  /github\.com[:/]NARAProtocol\/nara_protocol_v4(?:\.git)?$/i,
  "The configured protocol checkout does not use NARAProtocol/nara_protocol_v4 as origin.",
);

const resolvedCommit = git(hardhatRoot, ["rev-parse", `${originCommit}^{commit}`]);
assert.equal(
  resolvedCommit.toLowerCase(),
  originCommit.toLowerCase(),
  "NARA_PROTOCOL_ORIGIN_COMMIT does not resolve to the requested commit.",
);

git(hardhatRoot, ["rev-parse", "--verify", "refs/remotes/origin/main"]);
try {
  git(hardhatRoot, ["merge-base", "--is-ancestor", originCommit, "refs/remotes/origin/main"]);
} catch {
  throw new Error(
    "NARA_PROTOCOL_ORIGIN_COMMIT is not contained in the locally known origin/main. Fetch origin and use a merged release commit.",
  );
}

const headCommit = git(hardhatRoot, ["rev-parse", "HEAD"]);
assert.equal(
  headCommit.toLowerCase(),
  originCommit.toLowerCase(),
  "The protocol checkout HEAD must equal NARA_PROTOCOL_ORIGIN_COMMIT before compiling and synchronizing ABIs.",
);

const sourceStatus = git(hardhatRoot, ["status", "--porcelain", "--untracked-files=all"]);
assert.equal(
  sourceStatus,
  "",
  "The protocol checkout must be clean before compiling and synchronizing ABIs.",
);

const targets = [
  {
    exportName: "NARATokenAbi",
    source: "contracts/v4/NARAToken.sol",
    artifact: "artifacts/contracts/v4/NARAToken.sol/NARAToken.json",
    output: "abis/NARATokenAbi.ts",
  },
  {
    exportName: "NARAEngineAbi",
    source: "contracts/v4/NARAEngine.sol",
    artifact: "artifacts/contracts/v4/NARAEngine.sol/NARAEngine.json",
    output: "abis/NARAEngineAbi.ts",
  },
  {
    exportName: "NARAPositionNFTAbi",
    source: "contracts/v4/NARAPositionNFTV4.sol",
    artifact: "artifacts/contracts/v4/NARAPositionNFTV4.sol/NARAPositionNFTV4.json",
    output: "abis/NARAPositionNFTAbi.ts",
  },
  {
    exportName: "NARAEngineOpsRouterV1Abi",
    source: "contracts/v4/router/NARAEngineOpsRouterV1.sol",
    artifact: "artifacts/contracts/v4/router/NARAEngineOpsRouterV1.sol/NARAEngineOpsRouterV1.json",
    output: "abis/NARAEngineOpsRouterV1Abi.ts",
  },
  {
    exportName: "NARABondVaultAbi",
    source: "contracts/v4/NARABondVaultV4.sol",
    artifact: "artifacts/contracts/v4/NARABondVaultV4.sol/NARABondVaultV4.json",
    output: "abis/NARABondVaultAbi.ts",
  },
  {
    exportName: "NARABondDepositoryV4NFTAbi",
    source: "contracts/v4/NARABondDepositoryV4NFT.sol",
    artifact: "artifacts/contracts/v4/NARABondDepositoryV4NFT.sol/NARABondDepositoryV4NFT.json",
    output: "abis/NARABondDepositoryV4NFTAbi.ts",
  },
  {
    exportName: "NARAOpsVaultAbi",
    source: "contracts/v4/NARAOpsVaultV4.sol",
    artifact: "artifacts/contracts/v4/NARAOpsVaultV4.sol/NARAOpsVaultV4.json",
    output: "abis/NARAOpsVaultAbi.ts",
  },
  {
    exportName: "NARALiquidityGrowthHookAbi",
    source: "contracts/v4/NARALiquidityGrowthHook.sol",
    artifact: "artifacts/contracts/v4/NARALiquidityGrowthHook.sol/NARALiquidityGrowthHook.json",
    output: "abis/NARALiquidityGrowthHookAbi.ts",
  },
  {
    exportName: "NARALiquidityGrowthVaultAbi",
    source: "contracts/v4/NARALiquidityGrowthVault.sol",
    artifact: "artifacts/contracts/v4/NARALiquidityGrowthVault.sol/NARALiquidityGrowthVault.json",
    output: "abis/NARALiquidityGrowthVaultAbi.ts",
  },
  {
    exportName: "NARALiquidityCompounderAbi",
    source: "contracts/v4/NARALiquidityCompounderV4.sol",
    artifact: "artifacts/contracts/v4/NARALiquidityCompounderV4.sol/NARALiquidityCompounderV4.json",
    output: "abis/NARALiquidityCompounderAbi.ts",
  },
];

for (const target of targets) {
  const artifactPath = resolve(hardhatRoot, target.artifact);
  const outputPath = resolve(monitorRoot, target.output);
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));

  assert.equal(artifact.sourceName, target.source, `${target.artifact} has an unexpected sourceName.`);
  assert.ok(Array.isArray(artifact.abi), `${target.artifact} does not contain an ABI array.`);

  const body = [
    "// Generated from a pinned merged NARA v4 Hardhat release. Do not edit by hand.",
    `// Origin commit: ${originCommit}`,
    `// Source artifact: ${target.artifact}`,
    `export const ${target.exportName} = ${JSON.stringify(artifact.abi, null, 2)} as const;`,
    "",
  ].join("\n");

  writeFileSync(outputPath, body);
  console.log(`Wrote ${target.output} from ${originCommit}`);
}
