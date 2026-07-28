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
npm run sync:abis
npm run verify
```

Do not hand-edit generated ABI files.

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

Reviewers verify documentation and examples against active v4 code. Retired v3
or incident-stack addresses are never accepted as live defaults.
