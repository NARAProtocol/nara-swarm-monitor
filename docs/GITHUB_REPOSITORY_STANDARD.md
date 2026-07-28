# GitHub Repository Standard

This is the required publishing pattern for NARA Protocol repositories. Code is
the source of truth; repository presentation must explain verified behavior
without overstating readiness or security.

## Required Public Files

Every repository must include:

- a README with purpose, status, architecture, setup, verification, safety,
  documentation links, and explicit license status;
- `CONTRIBUTING.md` with branch, commit, test, and review rules;
- `SECURITY.md` with private reporting guidance and supported scope;
- a pull-request template and structured issue forms;
- CI using the locked dependency graph and documented quality gate;
- automated dependency update configuration.

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

Badges must link to real services. Never use “audited,” “secure,” “production
ready,” or coverage badges without current, independently verifiable evidence.

## Change Pattern

Every GitHub change follows this sequence:

1. Sync the default branch and create a focused branch.
2. Read repository-local agent and contribution rules.
3. Make one coherent change without unrelated cleanup.
4. Update code, tests, documentation, and configuration together.
5. Run the canonical verification command.
6. Audit the locked dependency tree and scan for secrets.
7. Commit using Conventional Commits.
8. Push the branch and open a pull request from its template.
9. Wait for required CI and review before merge.
10. Squash merge unless preserving individual commits has clear value.

Never push secrets, private keys, `.env` files, runtime databases, generated
runtime data, or unreviewed production addresses.

## Pull Request Evidence

Each pull request records the problem, scope, implemented behavior, security and
deployment impact, exact verification, documentation changes, and recovery
considerations. “Tests pass” without naming the gate is insufficient. Include
concise results, never sensitive logs.

## Release Standard

Before a tagged release, confirm the default branch is green, documentation
matches released code, dependency and secret checks pass, and breaking changes
include operator actions. Tag with semantic versioning and publish release notes
covering behavior, risk, migration, and rollback.

Do not call a deployment, release, audit, or feature complete while its stated
prerequisites remain unresolved.
