import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const repository = process.env.NARA_GITHUB_REPOSITORY ?? "NARAProtocol/nara-swarm-monitor";
assert.match(repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "NARA_GITHUB_REPOSITORY must be owner/name");

function ghJson(path) {
  const result = spawnSync("gh", ["api", path], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  if (result.error) {
    throw result.error;
  }
  assert.equal(result.status, 0, `gh api ${path} failed: ${result.stderr.trim()}`);
  return result.stdout.trim() ? JSON.parse(result.stdout) : null;
}

function ghNoContent(path) {
  const result = spawnSync("gh", ["api", path], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (result.error) {
    throw result.error;
  }
  assert.equal(result.status, 0, `gh api ${path} failed: ${result.stderr.trim()}`);
}

const repo = ghJson(`repos/${repository}`);
assert.equal(repo.default_branch, "main", "default branch must be main");
assert.equal(repo.private, false, "repository must remain public");
assert.equal(repo.allow_squash_merge, true, "squash merge must be enabled");
assert.equal(repo.allow_merge_commit, false, "merge commits must be disabled");
assert.equal(repo.allow_rebase_merge, false, "rebase merge must be disabled");
assert.equal(repo.delete_branch_on_merge, true, "merged branches must be deleted");
assert.equal(repo.allow_update_branch, true, "pull requests must support safe branch updates");
assert.equal(repo.web_commit_signoff_required, true, "web commits must require signoff");
assert.equal(repo.has_wiki, false, "unused wiki must stay disabled");
assert.ok(repo.description?.trim(), "repository description must be populated");

const protection = ghJson(`repos/${repository}/branches/main/protection`);
assert.equal(protection.required_status_checks?.strict, true, "required checks must use a current branch");
assert.ok(
  protection.required_status_checks?.contexts?.includes("verify"),
  "the canonical verify check must be required",
);
assert.equal(protection.required_signatures?.enabled, true, "signed commits must be required");
assert.equal(protection.enforce_admins?.enabled, true, "administrators must not bypass protection");
assert.equal(protection.required_linear_history?.enabled, true, "linear history must be required");
assert.equal(protection.allow_force_pushes?.enabled, false, "force pushes must be disabled");
assert.equal(protection.allow_deletions?.enabled, false, "branch deletion must be disabled");
assert.equal(
  protection.required_conversation_resolution?.enabled,
  true,
  "review conversations must be resolved",
);

const workflowPermissions = ghJson(`repos/${repository}/actions/permissions/workflow`);
assert.equal(workflowPermissions.default_workflow_permissions, "read", "default GITHUB_TOKEN permission must be read");
assert.equal(
  workflowPermissions.can_approve_pull_request_reviews,
  false,
  "workflows must not approve pull requests",
);

const actionsPermissions = ghJson(`repos/${repository}/actions/permissions`);
assert.equal(actionsPermissions.enabled, true, "GitHub Actions must be enabled");
assert.equal(actionsPermissions.allowed_actions, "selected", "only selected Actions must be allowed");
assert.equal(actionsPermissions.sha_pinning_required, true, "Actions must require full-length SHA pinning");

const selectedActions = ghJson(`repos/${repository}/actions/permissions/selected-actions`);
assert.equal(selectedActions.github_owned_allowed, true, "GitHub-owned Actions must be allowed");
assert.equal(selectedActions.verified_allowed, false, "unlisted verified Actions must not be globally allowed");
assert.deepEqual(selectedActions.patterns_allowed, [], "no broad third-party Action patterns may be allowed");

const privateReporting = ghJson(`repos/${repository}/private-vulnerability-reporting`);
assert.equal(privateReporting.enabled, true, "private vulnerability reporting must be enabled");

const codeql = ghJson(`repos/${repository}/code-scanning/default-setup`);
assert.equal(codeql.state, "configured", "CodeQL default setup must be configured");
for (const language of ["actions", "javascript-typescript"]) {
  assert.ok(codeql.languages?.includes(language), `CodeQL must scan ${language}`);
}

assert.equal(repo.security_and_analysis?.dependabot_security_updates?.status, "enabled", "Dependabot security updates must be enabled");
assert.equal(repo.security_and_analysis?.secret_scanning?.status, "enabled", "secret scanning must be enabled");
assert.equal(
  repo.security_and_analysis?.secret_scanning_push_protection?.status,
  "enabled",
  "secret scanning push protection must be enabled",
);
const optionalSecretScanning = {
  nonProviderPatterns:
    repo.security_and_analysis?.secret_scanning_non_provider_patterns?.status ??
    "unavailable",
  validityChecks:
    repo.security_and_analysis?.secret_scanning_validity_checks?.status ??
    "unavailable",
};

const topics = ghJson(`repos/${repository}/topics`);
for (const topic of ["base", "indexer", "monitoring", "nara-protocol", "ponder", "typescript"]) {
  assert.ok(topics.names?.includes(topic), `repository topics must include ${topic}`);
}

ghNoContent(`repos/${repository}/vulnerability-alerts`);

console.log(`GitHub settings audit passed for ${repository}`);
console.log(
  `Optional GitHub secret analysis: non-provider patterns=${optionalSecretScanning.nonProviderPatterns}, validity checks=${optionalSecretScanning.validityChecks}`,
);
