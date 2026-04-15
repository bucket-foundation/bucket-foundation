# bucket.foundation protocol — v0.1 (draft)

> The open spec for **pay-once, cite-forever** research buckets over x402.

## Status

**Draft v0.1.** Everything in this document is subject to change until v1.0. Open an issue or PR to propose changes.

---

## 1. Goals

1. A paper should cost the network **once**.
2. Once bought, it should be **citeable forever** by anyone running a compatible bucket.
3. The author should receive the citation fee **directly**, not through a publisher.
4. The protocol should be **boring**: HTTP, JSON, SHA-256, and signatures. Nothing exotic.
5. Implementations should be **federatable**: anyone can run a bucket, mirror another bucket, or fork the whole network.

## 2. Non-goals

- Peer review (that's a layer on top).
- Reputation or ranking of papers (a layer on top).
- Replacing existing publishers (they are free to expose x402 endpoints too).
- Being a blockchain. The only on-chain part is the x402 payment and the optional citation receipt.

---

## 3. A bucket

A **bucket** is a content-addressed folder that holds one research artifact.

```
bucket/<sha256>/
├── paper.<ext>       # the artifact itself (PDF, HTML, JSON, dataset…)
├── canon.json        # REQUIRED — the sidecar manifest (see §4)
└── receipt.x402      # OPTIONAL — the x402 payment receipt that funded this bucket
```

- `<sha256>` is the SHA-256 of `paper.<ext>`, hex-encoded, lowercase.
- Any storage backend is acceptable: filesystem, S3, IPFS, Walrus, Arweave, Google Drive, a USB stick. The protocol only requires that a given `<sha256>` address resolves to the same bytes everywhere.
- A bucket with a missing or invalid `canon.json` is **not a canon bucket**. It still exists; it just cannot be cited through this protocol.

## 4. The sidecar (`canon.json`)

The sidecar is a JSON object. All fields are UTF-8. Unknown fields MUST be preserved by implementations.

### 4.1 Schema (draft v0.1)

```json
{
  "version": "bucket.foundation/v0.1",
  "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "title": "Plain-English title of the work",
  "authors": [
    { "name": "Jane Doe", "orcid": "0000-0001-2345-6789", "wallet": "0x…" }
  ],
  "doi": "10.1234/example.2026.001",
  "source": {
    "url": "https://source.example.org/paper/12345",
    "x402_endpoint": "https://source.example.org/x402/paper/12345",
    "license": "CC-BY-4.0"
  },
  "purchase": {
    "x402_receipt": "0x…",
    "network": "base",
    "paid_usd": "0.25",
    "paid_at": "2026-04-14T00:00:00Z",
    "buyer_wallet": "0x…"
  },
  "cite": {
    "price_usd": "0.05",
    "payout_wallet": "0x…",
    "license": "bucket.foundation/cite-forever/v0.1"
  },
  "tags": ["biophysics", "magnetic-field", "foundation:05-biophysics"],
  "canon_tier": "candidate",
  "foundation_branches": ["05-biophysics"],
  "provenance": [
    {
      "action": "fetched",
      "at": "2026-04-14T00:00:00Z",
      "by": "bucket.foundation/v0.1",
      "via": "viatika-research-gateway/v1"
    }
  ]
}
```

### 4.2 Required fields

- `version` — must start with `bucket.foundation/v`.
- `sha256` — must match the hash of `paper.<ext>`.
- `title` — non-empty.
- `source.url` — the origin the bytes were fetched from.
- `cite.payout_wallet` — where citation fees go.

### 4.3 Canon tier

`canon_tier` is one of:

| Tier | Meaning |
|---|---|
| `draft` | Fetched and sidecar-ed, not reviewed. Not eligible for minting. Usable for private research. |
| `candidate` | Reviewed by a human or high-confidence agent, passed a provisional canon filter. Eligible for mint. |
| `canon` | Final, minted as an IP NFT, appears on the public canon. |

Tiers are **advisory**, not enforced by the protocol. Different buckets can disagree on tier and still interoperate.

### 4.4 Foundation branches

`foundation_branches` is an array from this controlled vocabulary (this list is **advisory**, not normative):

| Branch | Scope |
|---|---|
| `01-mathematics` | Axioms, real math, proofs |
| `02-physics` | Laws, symmetries, field theories |
| `03-chemistry` | Bonding, thermodynamics, primary reactions |
| `04-information` | Shannon, Turing, complexity, coding |
| `05-biophysics` | Hydrogen, mitochondria, DNA, bioelectrochemistry, biomagnetism |
| `06-cosmology` | Spacetime, early universe, black holes |
| `07-mind` | Consciousness, cognition, perception foundations |

Implementations MAY define their own branches. Federated buckets SHOULD preserve branches they don't understand.

---

## 5. The x402 fetch flow

```
1. Client asks bucket:    do you have <doi> or <query>?
2. Bucket checks storage: SHA match → serve locally, charge cite price.
3. If miss, bucket routes to an x402-gated source (e.g. a research gateway).
4. Source returns HTTP 402 Payment Required with an x402 challenge.
5. Bucket's buyer wallet signs the payment on Base (or any x402 network).
6. Source returns HTTP 200 with the paper bytes.
7. Bucket computes SHA-256, writes bucket/<sha256>/paper.<ext> and canon.json.
8. Bucket serves the paper to the original client and charges cite price.
9. Every subsequent client hits step 2 — pay-once, cite-forever.
```

### 5.1 x402 endpoint shape (source side)

Any HTTP endpoint that returns `402 Payment Required` with an `X-Payment` header describing the x402 challenge is compatible. See [x402.org](https://x402.org/) for the full spec.

### 5.2 Citation receipt (optional)

When a bucket charges a client for a citation, it MAY emit a `cite.receipt` object in response:

```json
{
  "cite_receipt": {
    "sha256": "e3b0c44…",
    "cited_at": "2026-04-14T00:00:00Z",
    "payer_wallet": "0x…",
    "payout_wallet": "0x…",
    "paid_usd": "0.05",
    "tx": "0x…"
  }
}
```

Receipts are **advisory and auditable**. They are not required for the citation to be valid.

---

## 6. Federation

Two buckets federate by mirroring each other's `<sha256>` addresses. Since every bucket address is a content hash, mirroring is idempotent: either both sides have the same bytes or they don't. There is no "authoritative" bucket — there is only the first bucket that paid.

A federated network of buckets looks like BitTorrent for papers, plus a citation-fee layer.

---

## 7. What this protocol does NOT say

- How to rank, recommend, or search buckets. (Build your own index.)
- How to handle takedowns. (Run your own bucket; honor your own jurisdiction.)
- How to price a paper or a citation. (Author sets it, market adjusts.)
- What happens to old buckets when a paper is retracted. (Add a `retracted_at` field in v0.2.)

These are deliberately out of scope. The protocol is the minimum viable coordination layer — everything else is an implementation choice.

---

## 8. Versioning & compatibility

- `version` in the sidecar drives compatibility.
- Minor versions (`v0.1 → v0.2`) MUST be backwards-compatible — new fields only.
- Major versions (`v0.x → v1.0`) MAY break. A clean break is healthier than a rotting spec.
- Implementations SHOULD advertise supported versions in an `X-Bucket-Protocol` response header.

---

## 9. Contributing to this spec

Open an issue or a pull request at **https://github.com/gianyrox/bucket-foundation**.

Changes to this document require:

1. A written rationale (what problem does this solve?).
2. At least one reference implementation or test vector.
3. A migration note for buckets already deployed.

That's it. No foundation (lowercase), no governance token, no voting. The maintainer merges. Forks are encouraged.
