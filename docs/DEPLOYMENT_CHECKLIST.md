# NARA Swarm Monitor Deployment Checklist

Use this checklist before starting or restarting the monitor stack.

## Scope

- Active v4 only.
- No v3 addresses.
- No retired incident-stack addresses.
- No mocks.
- No mining.
- No jackpot.
- No Solidity edits.
- No protocol writes.

## Required Configuration

- [ ] `CHAIN_ID` is set for the intended chain.
- [ ] `MONITOR_PROFILE=core` for the current deployed stack, or `full` only
      after every deferred address exists.
- [ ] `BASE_RPC_URL` is configured.
- [ ] `DATABASE_URL` is configured.
- [ ] `DATABASE_SCHEMA` is a dedicated schema such as `nara_v4_monitor`, not a
      schema owned by another Ponder app.
- [ ] `V4_START_BLOCK` is set from the fresh v4 deployment.
- [ ] `V4_EPOCH_LENGTH_SECONDS` is configured for the deployed engine.
- [ ] Fresh v4 contract addresses are set:
  - [ ] `V4_NARA_TOKEN`
  - [ ] `V4_ENGINE`
  - [ ] `V4_LIQUIDITY_GROWTH_HOOK`
  - [ ] `V4_LIQUIDITY_GROWTH_VAULT`
  - [ ] `V4_LIQUIDITY_COMPOUNDER`
- [ ] For `MONITOR_PROFILE=full`, the deferred addresses are also set:
  - [ ] `V4_POSITION_NFT`
  - [ ] `V4_BOND_DEPOSITORY_NFT`
  - [ ] `V4_BOND_VAULT`
  - [ ] `V4_OPS_VAULT`
  - [ ] `V4_ENGINE_OPS_ROUTER`
  - [ ] `V4_BREAK_GLASS_SAFE`
  - [ ] `V4_STAKING_POOL`
  - [ ] `V4_STAKING_POOL_SY`
  - [ ] `V4_FRACTIONAL_FACTORY`
  - [ ] `V4_BASKET_FEE_COLLECTOR`
  - [ ] `V4_BASKET_MANAGERS` contains at least one address
  - [ ] `V4_GENESIS_REWARD_DISTRIBUTOR`
  - [ ] `V4_BRIBE_ROUTER`
- [ ] Optional address labels are set if known:
  - [ ] `V4_TREASURY_ADDRESS`
  - [ ] `V4_FINAL_ADMIN`
  - [ ] `DEPLOYER_ADDRESS`

The `core` profile is the current production-compatible monitor scope. The
`full` profile remains fail-closed while deferred contracts are absent. Do not
invent addresses or deploy unrelated components to satisfy it.

## Address Safety

- [ ] `npm run validate:env` passes.
- [ ] No configured address is the zero address.
- [ ] No configured address is from the retired v3 stack.
- [ ] No configured address is from the retired v4 incident stack.
- [ ] The ops router address is the approved `NARAEngineOpsRouterV1`.
- [ ] The break-glass Safe is the approved emergency Safe.

## ABI Safety

- [ ] The producer remotes were fetched and the handoff records full merged commits.
- [ ] The protocol checkout was clean and exactly at `NARA_PROTOCOL_ORIGIN_COMMIT`.
- [ ] The protocol build passed at that commit before `npm run sync:abis`.
- [ ] ABI files record the full origin commit and generated artifact source.
- [ ] The pinned `npm run check:ecosystem-drift` gate passed.
- [ ] No archived v3 ABI is imported.
- [ ] `npm run codegen` passes.
- [ ] `npm run typecheck` passes.

## Runtime Safety

- [ ] No private keys are configured or required.
- [ ] No signer is configured or required.
- [ ] No transactions are sent or required.
- [ ] No transaction permissions are configured or required.
- [ ] No protocol writes are possible from monitor runtime.
- [ ] No secret printing appears in smoke commands or logs.
- [ ] `BASE_RPC_URL` is read-only RPC access.
- [ ] Ponder can connect to the database.
- [ ] `COMMANDER_SQL_URL` points at the local Ponder SQL endpoint.
- [ ] API binds to `127.0.0.1` by default.
- [ ] API access is read-only.
- [ ] Notification secrets are present only for enabled channels.
- [ ] `NOTIFY_CHANNELS` contains only intended channels.
- [ ] `FORCE_NOTIFY=false` for normal operation.

## Smoke Commands

```bash
npm run validate:env
npm run check:docs
npm run check:secrets
npm test
npm run codegen
npm run typecheck
npm run monitor:health
```

Then start the long-running service:

```bash
npm run start
```

Run one read-only reporting cycle after Ponder is indexing:

```bash
npm run monitor:cycle
```
