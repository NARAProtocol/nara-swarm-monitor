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
- [ ] `BASE_RPC_URL` is configured.
- [ ] `DATABASE_URL` is configured.
- [ ] `V4_START_BLOCK` is set from the fresh v4 deployment.
- [ ] `V4_EPOCH_LENGTH_SECONDS` is configured for the deployed engine.
- [ ] Fresh v4 contract addresses are set:
  - [ ] `V4_NARA_TOKEN`
  - [ ] `V4_ENGINE`
  - [ ] `V4_POSITION_NFT`
  - [ ] `V4_BOND_DEPOSITORY_NFT`
  - [ ] `V4_BOND_VAULT`
  - [ ] `V4_OPS_VAULT`
  - [ ] `V4_ENGINE_OPS_ROUTER`
  - [ ] `V4_BREAK_GLASS_SAFE`
- [ ] Optional address labels are set if known:
  - [ ] `V4_TREASURY_ADDRESS`
  - [ ] `V4_FINAL_ADMIN`
  - [ ] `DEPLOYER_ADDRESS`

## Address Safety

- [ ] `npm run validate:env` passes.
- [ ] No configured address is the zero address.
- [ ] No configured address is from the retired v3 stack.
- [ ] No configured address is from the retired v4 incident stack.
- [ ] The ops router address is the approved `NARAEngineOpsRouterV1`.
- [ ] The break-glass Safe is the approved emergency Safe.

## ABI Safety

- [ ] `npm run sync:abis` has been run after the latest active v4 Hardhat build.
- [ ] ABI files are generated from active v4 artifacts.
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
npm run sync:abis
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
