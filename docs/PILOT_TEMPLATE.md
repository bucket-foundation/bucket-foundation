# bucket.foundation × {{PARTNER}} — 30-Day Pilot

**Start date:** {{START_DATE}}
**Duration:** 30 days
**Fee:** zero
**Scope:** {{N_ARTIFACTS}} canon-tier artifacts, bucket-enabled end to end.

This is the reference pilot one-pager. One page. Stone-tablet terms. Paste into the first "yes" reply.

---

## Scope

- {{N_ARTIFACTS}} artifacts from {{PARTNER}}'s existing portfolio.
- 30 days from {{START_DATE}}.
- Zero fee during pilot. No token. No equity. No lock-in.
- Bucket is a nonprofit. {{PARTNER}} retains full ownership of the underlying IP.

## What bucket does

1. **Mint a feed402 envelope** for each of the {{N_ARTIFACTS}} artifacts — canonical URL, artifact hash, canon-branch tag, payout-wallet address.
2. **Attach a payout wallet** supplied by {{PARTNER}} (DAO treasury, author EOA, or multisig). Every citation routes USDC directly to that address on Base.
3. **Serve the feed402 endpoint** — AI agents discover, pay, and cite via x402. Three tiers: raw ($0.010), query ($0.005), insight ($0.002).
4. **Dual-write the permanence layer** — every citation is attested to Ethereum Attestation Service and archived to Arweave, per `docs/PERMANENCE_LAYER.md`. Paid for once, cited forever.
5. **Publish the live dashboard** — read-only metrics URL, shared with {{PARTNER}} on day one.

## What {{PARTNER}} provides

- List of {{N_ARTIFACTS}} canonical URLs (one per line, plaintext).
- One payout-wallet address per artifact (or one shared wallet for all).
- Author or DAO sign-off that citation revenue may flow to the listed wallet.
- One tweet or announcement post on launch day. That is the only marketing ask.

## Dashboard

Read-only, per-pilot: `https://bucket.foundation/pilots/{{PARTNER}}`

Live metrics:

- Citations per artifact (30-day rolling + total)
- USDC paid out per wallet
- Tier mix (raw / query / insight)
- Top citing agents (wallet-level)
- EAS attestation count + Arweave archive links

## Exit criteria (day 30 review)

| Outcome | Next step |
|---|---|
| ≥ 10 citations per artifact (mean) | **Extend.** Move to standing agreement. Scope up the portfolio. |
| 1–9 citations per artifact (mean) | **Iterate.** Joint review — tier pricing, discovery surface, canon-branch fit. Extend 30 days. |
| Zero citations total | **Joint post-mortem.** Public writeup. No-fault wind-down. Bucket keeps the feed402 endpoints live indefinitely for the artifacts already minted; {{PARTNER}} owes nothing. |

## Data ownership

- {{PARTNER}} owns the underlying research content.
- {{PARTNER}} and the authors own the payout wallets and the USDC received.
- Bucket owns the rail: the feed402 envelopes, the x402 endpoints, the EAS schema, the dashboard code.
- All bucket code is **MIT**. All bucket spec is **CC-BY** (CC0-in-intent — see `PROTOCOL.md`).
- No PII, no private scrape data, no exclusive rights — ever.

## Contact + escalation

- **Primary:** Gian Dichio — `gian@bucket.foundation` — @gianyrox (X/GitHub/Telegram)
- **Backup:** `hello@bucket.foundation`
- **Technical (integration):** GitHub issues on `gianyrox/bucket-foundation` (will transfer to `AGFarms/bucket-foundation` on 501(c)(3) reinstatement)
- **Escalation:** if anything is broken or unclear, reply to the thread you received this doc in. Response within 24 hours or the pilot is paused until it is resolved — at no cost to {{PARTNER}}.

---

**build the past. build history. bucket is the new renaissance.**
