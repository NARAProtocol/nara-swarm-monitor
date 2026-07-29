## Summary

<!-- Explain the problem and implemented behavior. -->

## Scope

<!-- List affected monitor surfaces, configuration, and documentation. -->

## Cross-repository routing

For a repository-local change, write `not applicable` with a reason.

```text
Change-ID:
Producer repository:
Producer commit:
Artifact or ABI source:
Deployment manifest:
Chain and start block:
Depends-on:
Unblocks:
```

- [ ] The producer commit is merged and immutable.
- [ ] Production addresses and the start block came from verified evidence.
- [ ] The pinned `npm run check:ecosystem-drift` gate passed when producer ABIs or events changed.
- [ ] Backfill and public-documentation impact were reviewed.
- [ ] No uncommitted producer tree or hand-written replacement ABI was treated as authoritative.

## Security and deployment impact

<!-- State the impact. Write "None" only after checking. -->

## Verification

- [ ] `npm run verify`
- [ ] `npm run check:repository-policy`
- [ ] `npm run audit:github-settings` when GitHub settings or governance claims changed
- [ ] Generated ABI changes came from pinned `npm run sync:abis` output and record the origin commit
- [ ] No secrets, private RPC URLs, private keys, or `.env` files are included
- [ ] Documentation matches implemented behavior

Commands and results:

```text
npm run verify
```

## Recovery or rollback

<!-- Describe recovery for runtime changes, or explain why it is not applicable. -->

## Checklist

- [ ] The change is focused and contains no unrelated edits
- [ ] Fresh v4 addresses are environment-driven
- [ ] Retired addresses and write-capable behavior were not introduced
- [ ] Breaking configuration changes include migration instructions
