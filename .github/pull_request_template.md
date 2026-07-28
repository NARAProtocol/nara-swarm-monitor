## Summary

<!-- Explain the problem and implemented behavior. -->

## Scope

<!-- List affected monitor surfaces, configuration, and documentation. -->

## Security and deployment impact

<!-- State the impact. Write "None" only after checking. -->

## Verification

- [ ] `npm run verify`
- [ ] Generated ABI changes came from `npm run sync:abis`
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
