# GitHub Repository Standard

This is the required publishing pattern for NARA Protocol repositories. Code is
the source of truth; repository presentation must explain verified behavior
without overstating readiness or security.

## Non-Negotiable Default-Branch Protection

Every active repository must protect its default branch. For NARA repositories,
the required baseline is:

- changes enter through pull requests, not routine direct pushes;
- the repository's canonical CI job is a required status check;
- the branch must be current with the base branch before merge;
- all review conversations must be resolved;
- force pushes are disabled;
- branch deletion is disabled;
- squash merge is the default merge method;
- administrators are subject to the same protection with no bypass;
- signed commits and linear history are required on the default branch;
- solo-maintainer repositories may require zero external approvals;
- repositories with active independent maintainers should require at least one
  approval.

There is no routine or emergency administrator bypass. Urgent changes still use
a focused branch, pull request, required checks, and squash merge. If GitHub is
unavailable, preserve the local change and wait; do not weaken protection.

Branch protection is GitHub state, not repository code. After creating or
changing a repository, verify the live GitHub settings rather than assuming
this document enforces them.

For this repository, use:

```bash
npm run audit:github-settings
```

The command is read-only and fails if the live settings fall below this
standard.

## Required Public Files

Every repository must include:

- a README with purpose, status, architecture, setup, verification, safety,
  documentation links, and explicit license status;
- `CONTRIBUTING.md` with branch, commit, test, and review rules;
- `SECURITY.md` with private reporting guidance and supported scope;
- a pull-request template and structured issue forms;
- CI using the locked dependency graph and documented quality gate;
- automated dependency update configuration;
- dependency alerts and automated security fixes;
- secret scanning with push protection;
- default CodeQL scanning for supported languages;
- least-privilege Actions permissions;
- immutable full-length commit SHAs for every referenced GitHub Action.

Add a `LICENSE` only after the owner deliberately chooses its legal terms. Never
imply open-source rights that have not been granted.

## README Pattern

Use this order unless a project documents an exception:

1. Name and truthful status badges.
2. One-sentence purpose.
3. Safety or production-status warning.
4. Verified capabilities.
5. Architecture or data flow.
6. Deployment profiles or supported scope.
7. Minimal quick start.
8. Operating commands.
9. One canonical verification command.
10. Documentation index.
11. Security model.
12. Current limitations.
13. License status.

Badges must link to real services. Never use "audited," "secure," "production
ready," or coverage badges without current, independently verifiable evidence.

## Change Pattern

Every GitHub change follows this sequence:

1. Synchronize the protected default branch.
2. Create a focused `agent/`, `feat/`, `fix/`, `docs/`, or `chore/` branch.
3. Read repository-local agent and contribution rules.
4. Make one coherent change without unrelated cleanup.
5. Update code, tests, documentation, and configuration together.
6. Run the canonical verification command.
7. Audit the locked dependency tree and scan for secrets.
8. Inspect the staged diff and commit using Conventional Commits.
9. Push only the focused branch and open a pull request from its template.
10. Wait for required CI, resolve conversations, and confirm merge eligibility.
11. Squash merge unless preserving individual commits has documented value.
12. Delete the merged branch and synchronize the local default branch.

Never push directly to the protected default branch. Never push secrets,
private keys, `.env` files, runtime databases, generated runtime data, or
unreviewed production addresses.

## Machine-Enforced Repository Policy

NARA repositories should make their local baseline executable instead of
depending on prose alone. This repository runs:

```bash
npm run check:repository-policy
```

inside `npm run verify`. The gate checks required public files, locked
dependency installation, issue and pull-request templates, dependency update
coverage, least-privilege workflow permissions, bounded CI execution,
full-length Action SHA pins, ignored secret-bearing files, toolchain alignment,
and license-status wording.

Live GitHub settings remain a separate evidence surface and are checked with
`npm run audit:github-settings`.

## Pull Request Evidence

Each pull request records the problem, scope, implemented behavior, security and
deployment impact, exact verification, documentation changes, and recovery
considerations. "Tests pass" without naming the gate is insufficient. Include
concise results, never sensitive logs.

## Release Standard

Before a tagged release, confirm the default branch is green, documentation
matches released code, dependency and secret checks pass, and breaking changes
include operator actions. Tag with semantic versioning and publish release notes
covering behavior, risk, migration, and rollback.

Do not call a deployment, release, audit, or feature complete while its stated
prerequisites remain unresolved.
