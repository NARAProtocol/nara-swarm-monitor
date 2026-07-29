# Repository Governance

Last locally verified: 2026-07-29

Repository: `NARAProtocol/nara-swarm-monitor`

Default branch: `main`

This document explains how the repository-level NARA standard is enforced. It
does not replace live GitHub settings or claim that a particular deployment of
the monitor is running.

## Two enforcement layers

### Version-controlled policy

`npm run check:repository-policy` verifies:

- required README, contribution, security, issue, and pull-request files;
- a locked npm dependency graph and private npm package status;
- Node.js and npm toolchain alignment;
- Dependabot coverage for npm and GitHub Actions;
- explicit read-only workflow permissions;
- bounded CI execution and cancellation of superseded runs;
- immutable full-length commit pins for external Actions;
- rejection of `pull_request_target`;
- ignored environment, database, log, coverage, and generated runtime files;
- cross-repository routing fields; and
- truthful license status.

This gate is part of `npm run verify`, which is the required branch-protection
check.

### Live GitHub policy

`npm run audit:github-settings` reads the GitHub API through the authenticated
GitHub CLI and verifies:

- `main` is protected and must be current before merging;
- the `verify` status check is required;
- signed commits and linear history are required;
- force pushes and branch deletion are disabled;
- administrators cannot bypass protection;
- review conversations must be resolved;
- squash is the only merge strategy and merged branches are deleted;
- default workflow-token permissions are read-only;
- workflows cannot approve pull requests;
- only selected Actions are allowed and full-SHA pinning is required;
- CodeQL default setup is configured;
- dependency alerts and Dependabot security updates are enabled;
- secret scanning and push protection are enabled; and
- private vulnerability reporting is enabled.

The live audit performs no write. It fails if a required setting is absent.

GitHub currently reports optional non-provider secret patterns and validity
checks as disabled at the repository level. They are not represented as
enabled. The mandatory baseline still includes provider secret scanning, push
protection, dependency alerts, private reporting, and the repository's local
tracked/untracked credential-pattern scan.

## Protected change flow

1. Start from the current protected `main`.
2. Create a focused branch.
3. Read `AGENTS.md` and the cross-repository handoff when applicable.
4. Implement one coherent change with tests and synchronized documentation.
5. Run `npm run verify`.
6. Run `npm run audit:github-settings` when governance or GitHub-state claims
   are involved.
7. Inspect every staged and untracked file.
8. Scan for secrets and confirm no environment or signing material is present.
9. Commit with a focused Conventional Commit.
10. Push the branch and open or update a pull request.
11. Wait for the required `verify` check and resolve every conversation.
12. Squash merge; never bypass protection.

## Cross-repository evidence

The monitor is downstream of the protocol and baskets repositories. ABI and
event changes require full merged producer commits. Production addresses and
start blocks require verified deployment evidence. The pull request records
the producer repository, full commit, generated artifact source, sanitized
manifest, chain, start block, dependencies, and downstream public-documentation
impact.

Runtime cycles never synchronize ABIs. A release-time ABI update must use the
explicit pinned commands documented in `docs/COMMANDS.md`.

## Security boundary

- The monitor is read-only and holds no signing key.
- Runtime addresses are environment-driven and fail closed.
- Retired v3 and incident-stack addresses are prohibited.
- Environment files, databases, logs, and generated runtime state are ignored.
- Private reports use GitHub private vulnerability reporting.
- No open-source license has been granted unless a future owner-approved
  `LICENSE` file explicitly changes that state.

## Verification commands

```bash
npm ci
npm run verify
npm run audit:github-settings
git diff --check
git status --short
```

The live audit requires `gh auth login` for an account with access to read the
repository's security and branch settings. It never prints authentication
tokens or environment values.
