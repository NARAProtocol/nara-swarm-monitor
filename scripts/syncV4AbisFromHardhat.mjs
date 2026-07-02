import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const monitorRoot = resolve(__dirname, "..");
const hardhatRoot = resolve(monitorRoot, "..", "nara-protocol-hardhat");

const targets = [
  {
    exportName: "NARATokenAbi",
    artifact: "artifacts/contracts/v4/NARAToken.sol/NARAToken.json",
    output: "abis/NARATokenAbi.ts",
  },
  {
    exportName: "NARAEngineAbi",
    artifact: "artifacts/contracts/v4/NARAEngine.sol/NARAEngine.json",
    output: "abis/NARAEngineAbi.ts",
  },
  {
    exportName: "NARAPositionNFTAbi",
    artifact: "artifacts/contracts/v4/NARAPositionNFTV4.sol/NARAPositionNFTV4.json",
    output: "abis/NARAPositionNFTAbi.ts",
  },
  {
    exportName: "NARAEngineOpsRouterV1Abi",
    artifact: "artifacts/contracts/v4/router/NARAEngineOpsRouterV1.sol/NARAEngineOpsRouterV1.json",
    output: "abis/NARAEngineOpsRouterV1Abi.ts",
  },
  {
    exportName: "NARABondVaultAbi",
    artifact: "artifacts/contracts/v4/NARABondVaultV4.sol/NARABondVaultV4.json",
    output: "abis/NARABondVaultAbi.ts",
  },
  {
    exportName: "NARABondDepositoryAbi",
    artifact: "artifacts/contracts/v4/NARABondDepositoryV4NFT.sol/NARABondDepositoryV4NFT.json",
    output: "abis/NARABondDepositoryAbi.ts",
  },
  {
    exportName: "NARAOpsVaultAbi",
    artifact: "artifacts/contracts/v4/NARAOpsVaultV4.sol/NARAOpsVaultV4.json",
    output: "abis/NARAOpsVaultAbi.ts",
  },
];

for (const target of targets) {
  const artifactPath = resolve(hardhatRoot, target.artifact);
  const outputPath = resolve(monitorRoot, target.output);
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
  const abi = artifact.abi;

  if (!Array.isArray(abi)) {
    throw new Error(`${target.artifact} does not contain an ABI array.`);
  }

  const body = [
    "// Generated from active v4 Hardhat artifacts. Do not edit by hand.",
    `// Source: ../nara-protocol-hardhat/${target.artifact}`,
    `export const ${target.exportName} = ${JSON.stringify(abi, null, 2)} as const;`,
    "",
  ].join("\n");

  writeFileSync(outputPath, body);
  console.log(`Wrote ${target.output}`);
}
