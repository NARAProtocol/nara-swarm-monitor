# Contributing

Thank you for improving NARA Swarm Monitor. Changes must preserve its read-only,
fresh-v4-only, fail-closed security model.

## Before You Start

Read [AGENTS.md](AGENTS.md), the
[architecture](docs/MONITOR_ARCHITECTURE.md), and the
[repository standard](docs/GITHUB_REPOSITORY_STANDARD.md).

Create a focused branch:

```bash
git switch -c feat/short-description
```

Recommended prefixes are `feat/`, `fix/`, `docs/`, `test/`, `refactor/`,
`chore/`, and `security/`.

The `main` branch is protected. Do not use administrator access for routine
direct pushes. Push the focused branch, open a pull request, wait for the
required `verify` check, resolve conversations, and squash merge. Zero external
approvals are acceptable while the repository has only one active maintainer.
Administrators cannot bypass these requirements. GitHub Actions must be pinned
to immutable full-length commit SHAs.

## Development and Verification

```bash
npm ci
npm run verify
```

Copy `.env.example` to `.env.local` when runtime configuration is needed. Use
only verified fresh-v4 addresses. Never commit credentials, private keys, seed
phrases, environment files, or private RPC URLs.

If ABI files should change, regenerate them from active v4 Hardhat artifacts:

```bash
export NARA_WORKSPACE_ROOT=/absolute/path/to/FIELD-Token
export NARA_PROTOCOL_ORIGIN_COMMIT=<full-merged-40-character-commit>
npm run sync:abis
npm run verify
```

The protocol checkout must be clean, at that exact commit, and contain the
generated artifacts from that commit. Do not hand-edit generated ABI files or
copy them from an uncommitted producer tree.

## Commit Messages

Use Conventional Commits:

```text
<type>(optional-scope): concise imperative summary
```

Examples:

```text
feat(indexer): monitor liquidity compounder events
fix(alerts): deduplicate repeated treasury warnings
docs(runbook): document database recovery sequence
```

Keep unrelated changes in separate commits.

## Pull Requests

A pull request must explain the problem and implemented behavior, identify
affected surfaces, describe security and deployment risk, list exact
verification results, and update documentation when behavior changes.

Breaking configuration changes require migration instructions. Report
security-sensitive findings through [SECURITY.md](SECURITY.md), not a public
issue.

When repository settings change, run the read-only live audit:

```bash
npm run audit:github-settings
```

Reviewers verify documentation and examples against active v4 code. Retired v3
or incident-stack addresses are never accepted as live defaults.
