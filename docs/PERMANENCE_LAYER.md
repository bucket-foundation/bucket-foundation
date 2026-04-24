# Permanence Layer — EAS + Arweave/Irys Dual-Write

**Status:** Prototype (feature-flagged OFF). Shipped 2026-04-23.
**Author:** Engineering pillar
**Related:** `docs/BLOCKCHAIN_LANDSCAPE.md`, `PROTOCOL.md`

---

## 1. The Problem

Today the bucket.foundation citation rail depends on two things that fail the "citeable forever" test:

1. **Walrus storage is lease-based.** Max duration is ~2 years, priced per-epoch ([Walrus docs](https://docs.wal.app/docs/system-overview/storage-costs)). A citation that vanishes in 2 years is not a citation.
2. **Story Protocol is a single L1** with ~$2/day in revenue. If Story goes dark, the IP NFTs we minted become orphans with no independent existence proof.

We need a permanence substrate that outlives both.

## 2. The Solution — Dual Write

Every citation envelope gets written to **two** independent, pay-once-forever rails:

- **EAS (Ethereum Attestation Service) on Base** — the attestation is the citation *receipt* (who, what, when, license). Indexed by easscan.org, queryable for free forever. Gas-only, no custodian.
- **Arweave via Irys** — the full envelope JSON is the citation *artifact*. Pay-once permanent storage. Arweave miners economically committed to 200-year durability minimum.

Both IDs are written back into the envelope's `provenance[]` array, so a reader can independently verify:

```
envelope.provenance[] += [
  { action: "attested",        via: "eas:base-sepolia",  uid: "0x..." },
  { action: "stored_permanent", via: "irys:arweave",       tx_id: "..." }
]
```

Story Protocol, if we keep it, becomes a *third* optional write for programmable licensing — but the canonical existence proof lives in EAS + Arweave.

## 3. EAS Schema — `BucketCitation`

```
bytes32 artifactHash        // keccak256 of canonical JSON (sorted keys)
string  canonicalUrl        // citation.canonical_url
string  arweaveTxId         // Irys/Arweave tx id of full envelope
address payoutWallet        // cite.payout_wallet
uint256 pricePerCiteUsdcE6  // cite.price_usd * 1_000_000
string  license             // "bucket.foundation/cite-forever/v0.1"
string[] foundationBranches // e.g. ["05-biophysics"]
string  canonTier           // "candidate" | "canon" | "foundation"
uint64  publishedAt         // unix seconds
```

Register once per chain via `scripts/register-eas-schema.ts`. The resulting schema UID goes into `EAS_SCHEMA_UID` env.

## 4. Cost Math

| Rail | Unit cost | 1k citations | 1M citations |
|---|---|---|---|
| EAS on Base | ~$0.0005 / attestation | $0.50 | $500 |
| Irys (5 KB envelope) | ~$0.005 / MB forever | ~$0.025 | ~$25 |
| **Total** | ~$0.0006 / citation | **$0.52** | **$525** |

Versus Walrus (~$0.0001 / 2 years) the dual-write is ~6x more per write but removes the recurring re-upload. Break-even is immediate at the "forever" horizon.

## 5. Migration Path

1. **Hot cache, cold canon.** Walrus stays as the hot read path (sub-200ms blob reads). EAS+Arweave becomes the cold source of truth.
2. **Lazy re-attest.** On first read of any existing envelope, if it lacks `provenance[].action == "attested"`, run `permanentize()` and update Supabase with the enriched envelope.
3. **New writes dual-written from day one** once `BUCKET_PERMANENCE_ENABLED=true`.
4. **Story Protocol unchanged** — keep minting for programmable licensing; treat the mint as decorative, not load-bearing.

## 6. What's Shipped Today

- `src/lib/permanence/{eas,irys,dual-write}.ts` — helpers, viem-based, dynamic imports.
- `src/app/api/research/route.ts` — feature-flagged call site (off by default).
- `scripts/register-eas-schema.ts` — one-shot schema registration (requires funded key).
- `scripts/test-permanence.ts` — end-to-end dry-run against Base Sepolia + Irys devnet.
- `.env.example` — new vars: `BUCKET_WALLET_PRIVATE_KEY`, `EAS_CONTRACT_BASE`, `EAS_SCHEMA_UID`, `IRYS_NODE_URL`, `IRYS_TOKEN`, `BUCKET_PERMANENCE_ENABLED`.

## 7. Open Questions

- Solana EAS equivalent? Investigate SAS (Solana Attestation Service) when we add the Solana rail (§ blockchain memo A).
- Batch attestation UX — EAS supports `multiAttest`; worth wiring when QPS justifies it.
- Verifier tool — a public `/verify?uid=0x...` page that resolves attestation → Arweave blob → diff against live envelope. Queued as `bkt-` bead.
