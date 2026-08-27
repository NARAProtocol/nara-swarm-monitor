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

Source merge, Railway deployment, production variable verification, and one
observed five-minute cycle are separate evidence. Do not describe the sentinel
as hosted until all four are recorded. The current onchain backlog is not
cleared by this monitor change.
