# NARA v4 Epoch Sentinel Resilience — 2026-08-28

Change ID: `NARA-20260828-v4-epoch-maintainer-resilience`

Protocol origin:
`4c0829dd8a34b1185e918a94fdbee19c16ead20a`

Origin repository: `NARAProtocol/nara_protocol_v4`

Network: Base (`8453`)

## Purpose

The protocol origin expands the guarded recurring recovery envelope after live
evidence showed GitHub scheduled events missing for up to 11 hours. This
downstream monitor change supplies the independent detection layer; it does not
copy a signer, dispatch a workflow, or write protocol state.

## Hosted policy

- Poll current and settled Engine epochs every five minutes independently of
  Ponder, Postgres, Commander, and summarization.
- Supervise and restart failed Ponder or Telegram child processes without
  terminating the sentinel loop.
- Treat backlog `0..1` as GREEN, `2..4` as YELLOW, and `5+` as RED. Backlog
  above eight remains explicitly write-blocking.
- Notify immediately on a status transition and repeat an unchanged non-green
  incident every 30 minutes.
- Try the primary and two configured backup Base RPCs sequentially without
  logging provider URLs.
- Keep the sentinel read-only: it contains no signer, private key, transaction,
  workflow dispatch token, or contract-write path.

## Activation boundary

The read-only sentinel is hosted and active:

- protected monitor PR `#24` merged as
  `def0d2aaab6aef34791f7afbbf8bb30eab545ee8`;
- the immutable merge was cherry-picked to the established Railway deployment
  branch as `1e203c4`;
- Railway deployment `66f20715-0039-43f3-adfb-e77c47600a71` reached
  `SUCCESS` with one active instance;
- production policy is healthy backlog `1`, critical backlog `5`, poll interval
  `300` seconds, and unresolved-alert repeat interval `1800` seconds;
- the first hosted poll reported RED at backlog `116` and routed the external
  alert; and
- the next five-minute polls reported backlogs `117` and `118` with
  `notification=cooldown`, proving recurrence and duplicate suppression.

The broad monitor cycle completed independently after deployment, and Ponder
resumed its existing backfill through crash recovery. A forced-primary-failure
rehearsal selected configured fallback provider `1` without printing a provider
URL.

This activation did not itself clear the onchain backlog. The protocol-side
keeper remains the only write path, and the monitor still contains no signer,
credential, workflow dispatch, or transaction code.

## Recovery observation

After the operator-approved protocol workflow dispatch `33123323400` confirmed
`advanceEpochs(100)` and `advanceEpochs(19)`, the sentinel's next independent
poll observed GREEN, backlog `0`, at Base block `50540546` and routed
`notification=recovered`. The preceding hosted observations were RED backlog
`118` with cooldown, RED backlog `119` with the 30-minute repeat, and RED
backlog `119` with cooldown. This proves the deployed sentinel reported both
the unresolved incident and its recovery without participating in the write.

The receipt-pinned protocol readback and transaction evidence are recorded in
`NARAProtocol/nara_protocol_v4` release record
`docs/releases/NARA-20260828-v4-epoch-maintainer-resilience.md` at immutable
commit `2dd03ac62c919cc5d4757a461723777074756088`.
