import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const requiredFiles = [
  ".env.example",
  ".github/dependabot.yml",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/pull_request_template.md",
  ".github/workflows/monitor-ci.yml",
  ".gitattributes",
  ".gitignore",
  ".nvmrc",
  "AGENTS.md",
  "CONTRIBUTING.md",
  "README.md",
  "SECURITY.md",
  "docs/GITHUB_REPOSITORY_STANDARD.md",
  "package-lock.json",
  "package.json",
];

for (const file of requiredFiles) {
  assert.equal(existsSync(file), true, `${file} must exist`);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
assert.equal(packageJson.private, true, "package.json must keep the monitor private from npm publishing");
assert.equal(packageJson.engines?.node, ">=22", "package.json must require the supported Node.js baseline");
assert.match(packageJson.packageManager ?? "", /^npm@\d+\.\d+\.\d+$/, "package.json pins the npm toolchain");
assert.equal(
  packageJson.scripts?.["check:repository-policy"],
  "node scripts/checkRepositoryPolicy.mjs",
  "package.json exposes the repository policy gate",
);
assert.equal(
  packageJson.scripts?.["audit:github-settings"],
  "node scripts/auditGitHubSettings.mjs",
  "package.json exposes the live GitHub settings audit",
);

const nvmVersion = readFileSync(".nvmrc", "utf8").trim();
assert.equal(nvmVersion, "22", ".nvmrc matches the Node.js baseline");

const gitignoreLines = new Set(
  readFileSync(".gitignore", "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean),
);
for (const pattern of [
  ".env",
  ".env.*",
  "!.env.example",
  "/node_modules",
  "/generated/",
  "/.ponder/",
  "/coverage/",
  "/dist/",
  "*.log",
  "*.db",
  "*.sqlite",
  "*.sqlite3",
]) {
  assert.equal(gitignoreLines.has(pattern), true, `.gitignore must include ${pattern}`);
}

const workflowDirectory = ".github/workflows";
const workflowFiles = readdirSync(workflowDirectory)
  .filter((file) => /\.ya?ml$/i.test(file))
  .map((file) => join(workflowDirectory, file));
assert.ok(workflowFiles.length > 0, "at least one GitHub Actions workflow must exist");

for (const file of workflowFiles) {
  const workflow = readFileSync(file, "utf8");
  assert.match(workflow, /^permissions:\r?\n {2}contents: read\s*$/m, `${file} declares least-privilege contents: read`);
  assert.match(workflow, /^\s+timeout-minutes:\s*\d+\s*$/m, `${file} bounds job runtime`);
  assert.doesNotMatch(workflow, /\bpull_request_target\s*:/, `${file} must not use pull_request_target`);

  for (const [index, line] of workflow.split(/\r?\n/).entries()) {
    const match = line.match(/^\s*uses:\s*([^\s#]+)/);
    if (!match || match[1].startsWith("./")) {
      continue;
    }
    assert.match(
      match[1],
      /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@[0-9a-f]{40}$/,
      `${file}:${index + 1} pins every external action to a full commit SHA`,
    );
  }
}

const ci = readFileSync(".github/workflows/monitor-ci.yml", "utf8");
assert.match(ci, /\bnpm ci\b/, "CI installs the locked dependency graph");
assert.match(ci, /\bnpm run verify\b/, "CI runs the canonical verification gate");
assert.match(ci, /node-version:\s*"22"/, "CI uses the documented Node.js baseline");

const dependabot = readFileSync(".github/dependabot.yml", "utf8");
assert.match(dependabot, /package-ecosystem:\s*npm/, "Dependabot covers npm");
assert.match(dependabot, /package-ecosystem:\s*github-actions/, "Dependabot covers GitHub Actions");

const agents = readFileSync("AGENTS.md", "utf8");
assert.match(agents, /## Cross-Repository Role/, "AGENTS.md defines the repository's cross-repository authority");
assert.match(agents, /Never push directly to `main`/, "AGENTS.md prohibits direct default-branch pushes");

const pullRequestTemplate = readFileSync(".github/pull_request_template.md", "utf8");
for (const heading of [
  "## Summary",
  "## Scope",
  "## Cross-repository routing",
  "## Security and deployment impact",
  "## Verification",
  "## Recovery or rollback",
]) {
  assert.match(pullRequestTemplate, new RegExp(heading), `pull-request template includes ${heading}`);
}

const issueConfig = readFileSync(".github/ISSUE_TEMPLATE/config.yml", "utf8");
assert.match(issueConfig, /blank_issues_enabled:\s*false/, "blank issues stay disabled");
assert.match(
  issueConfig,
  /https:\/\/github\.com\/NARAProtocol\/nara-swarm-monitor\/security\/advisories\/new/,
  "issue configuration routes vulnerabilities to private reporting",
);

const security = readFileSync("SECURITY.md", "utf8");
assert.match(security, /GitHub private vulnerability reporting/i, "SECURITY.md documents private reporting");

const readme = readFileSync("README.md", "utf8");
assert.match(readme, /npm run verify/, "README documents the canonical verification command");
if (!existsSync("LICENSE")) {
  assert.match(readme, /No open-source license has been granted yet/i, "README states the current license status");
}

console.log("repository policy checks passed");
