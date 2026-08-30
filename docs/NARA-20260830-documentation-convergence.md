# NARA Monitor Documentation Convergence

Change ID: `NARA-20260830-documentation-convergence`

## Immutable producer handoff

- Protocol: `NARAProtocol/nara_protocol_v4` protected `main` commit
  `dae88079dd336e22bdefde6f45e3b01389d554cb`.
- Baskets: `NARAProtocol/nara_protocol_v4_baskets` protected `main` commit
  `2213f4a7e9fe3af984fc4b157d92169c91b015a0`.
- Chain: Base mainnet, chain ID `8453`.
- Verified scan start: `49718979`, the fresh v4 launch receipt block recorded
  by the canonical deployment evidence.

## State language

The canonical v4 core contracts and NARA/USDC pool are live with real assets in
a technical live-testing phase. That fact is not a claim that a public product
or every interface is available, production-ready, audited, safe, legally
approved, or available in any jurisdiction.

The active NARA token is
`0xB6333F5D4cEd8dffA80F3F13697D6aA3BB3f19c1`. The historical `0x65E...`
token is retired evidence and must not be configured as current.

The Position NFT Phase-2 baseline is deployed, tested under the recorded
release gates, source-verified, and Safe-finalized. Its canonical manifest still
records `integrationReady: false`, so the monitor leaves `V4_POSITION_NFT`
unset in the `core` profile. Deployment alone does not authorize consumer
integration.

Baskets have no verified production deployment manifest and remain preview-
only. The monitor must not invent basket addresses or imply availability.

## Communications boundary

Monitor alerts, scores, reports, wallet views, and summaries are operational
telemetry. They are not investment research, trading signals, personalized
advice, suitability assessments, asset rankings, or recommendations to
transact. This repository contains no evidence of a completed jurisdiction-
specific qualified legal review. Technical review and warning language do not
establish legal compliance.

## Change scope

This release aligns documentation and operator-facing copy, corrects the scan
start, keeps optional alerts fail-closed by default, and removes promotional
wallet labels. It changes no contract, ABI, address binding, protocol role,
transaction authority, or onchain state.
