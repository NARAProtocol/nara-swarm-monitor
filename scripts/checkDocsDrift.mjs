import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function envKeysFromExample() {
  const text = readFileSync(".env.example", "utf8");
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => line.slice(0, line.indexOf("=")).trim());
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const commandsDocs = readFileSync("docs/COMMANDS.md", "utf8");
const envDocs = readFileSync("docs/ENVIRONMENT_VARIABLES.md", "utf8");
const runbook = readFileSync("docs/OPERATOR_RUNBOOK.md", "utf8");
const checklist = readFileSync("docs/DEPLOYMENT_CHECKLIST.md", "utf8");
const recovery = readFileSync("docs/RECOVERY_PROCEDURES.md", "utf8");

for (const scriptName of Object.keys(packageJson.scripts)) {
  assert.match(commandsDocs, new RegExp(`npm run ${escapeRegExp(scriptName)}`), `docs/COMMANDS.md documents npm run ${scriptName}`);
}

for (const envKey of envKeysFromExample()) {
  assert.match(envDocs, new RegExp(`\\b${escapeRegExp(envKey)}\\b`), `docs/ENVIRONMENT_VARIABLES.md documents ${envKey}`);
}

const runtimeOrder = [
  "npm run sync:abis",
  "npm run validate:env",
  "npm run scan:failed",
  "npm run commander",
  "npm run summarize",
  "npm run notify",
  "npm run api",
];
let previousIndex = -1;
for (const command of runtimeOrder) {
  const index = runbook.indexOf(command);
  assert.notEqual(index, -1, `docs/OPERATOR_RUNBOOK.md includes ${command}`);
  assert.ok(index > previousIndex, `docs/OPERATOR_RUNBOOK.md keeps ${command} in runtime order`);
  previousIndex = index;
}

for (const phrase of [
  "No private keys",
  "No transactions",
  "No protocol writes",
  "No secret printing",
]) {
  assert.match(runbook, new RegExp(escapeRegExp(phrase), "i"), `runbook includes ${phrase}`);
  assert.match(checklist, new RegExp(escapeRegExp(phrase), "i"), `deployment checklist includes ${phrase}`);
  assert.match(recovery, new RegExp(escapeRegExp(phrase), "i"), `recovery procedures include ${phrase}`);
}

console.log("docs drift checks passed");

