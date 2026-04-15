# bucket.foundation

> **Open-source research data protocol over x402.**
> Pay once per paper. Cite it forever. No gatekeepers.

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![protocol](https://img.shields.io/badge/protocol-x402-purple.svg)](./PROTOCOL.md)
[![status](https://img.shields.io/badge/status-alpha-orange.svg)](#status)

---

## What it is

`bucket.foundation` is an open protocol and a reference publishing site for research that can be **paid for once and cited forever**.

- You pay for a paper once, over **[x402](https://x402.org/)** — HTTP-native micropayments on an L2.
- The paper lands in a **bucket** — a content-addressed folder with a sidecar manifest (`canon.json`) that records provenance, license, and citation metadata.
- Any downstream agent, research tool, or human can cite the bucketed paper from a local copy, forever, at zero marginal x402 cost.
- Citations route fees back to the author through a simple on-chain receipt, not through publishers.

This repo contains:

1. **`PROTOCOL.md`** — the open spec (sidecar schema, x402 endpoint shape, canon contract).
2. **`src/`** — a reference Next.js site that fetches, mints, and displays bucketed papers. The site is optional. The protocol is not.
3. **`LICENSE`** — MIT. Fork it, run your own bucket, federate.

## The thesis in one paragraph

Research access is broken. Readers pay publishers for papers they may not need. Authors pay publishers to print what they already wrote. Independent researchers can't cite what they can't afford, and can't read what they can't cite. `bucket.foundation` flips the loop: **the paper is a one-time x402 purchase with forever citation rights.** A bucket is a durable, content-addressed copy of a paper plus a sidecar manifest. Once a bucket exists, the marginal cost of citing that paper is zero; the fee attached to each citation flows to the original author, not to a publisher that already got paid. The protocol is open and the reference implementation is MIT-licensed so anyone can run a bucket, federate, mirror, and compete.

## The protocol, in 90 seconds

```
┌──────────┐    x402 payment      ┌──────────────────┐
│  client  │ ───────────────────► │  paper source    │
│ (agent,  │                      │ (any x402-gated  │
│ reader,  │ ◄─── paper + hash ── │  research API)   │
│  app)    │                      └──────────────────┘
└────┬─────┘
     │ write to bucket
     ▼
┌──────────────────────────────────────────┐
│  bucket/<sha256>/                        │
│    paper.pdf        ← the paper itself   │
│    canon.json       ← sidecar manifest   │
│    receipt.x402     ← payment receipt    │
└──────────────────────────────────────────┘
     │
     ▼  citeable forever, zero marginal cost
```

A bucket is just a folder. A sidecar is just JSON. An x402 endpoint is just HTTP 402. There is nothing novel to deploy — the novelty is the convention, the license, and the citation economics built on top.

## Quick start

```bash
git clone https://github.com/gianyrox/bucket-foundation
cd bucket-foundation
cp .env.example .env.local    # fill in your keys
npm install
npm run dev                   # http://localhost:3000
```

See **[PROTOCOL.md](./PROTOCOL.md)** for the spec. See **[CONTRIBUTING.md](./CONTRIBUTING.md)** to help.

## Status

| Piece | State |
|---|---|
| Protocol spec (`PROTOCOL.md`) | Draft v0.1 |
| Sidecar schema (`canon.json`) | Draft v0.1 |
| Reference site (Next.js) | Dormant — being revived |
| x402 buyer client | Planned — depends on [x402](https://x402.org/) vendor gateway |
| Story Protocol IP mint (optional) | Shipped in prior version, kept |
| Federation / mirroring spec | Not yet drafted |
| Open contributors welcome | **Yes** |

This project was dormant between Feb 2025 and April 2026. It is being revived as an **open-source protocol first** and a site second. Expect rough edges.

## Prior art & credits

- **[x402](https://x402.org/)** — the HTTP 402 micropayment protocol this builds on.
- **[Story Protocol](https://www.story.foundation/)** — IP NFT infrastructure used by the reference site to mint licenses.
- **[Walrus](https://www.walrus.xyz/)** — storage layer for bucketed papers in the reference site.
- **[Dynamic](https://www.dynamic.xyz/)** — wallet auth used by the reference site.
- **Research gateways** that expose x402 endpoints on top of PubMed, arXiv, OpenAlex, PubChem — `bucket.foundation` is a consumer, not a replacement.

## Why "foundation"

Because the canon holds **only foundations** — axioms, real math, rules, laws, principles, primary derivations. Outcomes (longevity, disease, cognition, climate) are downstream applications. A bucket of foundations is worth more than a landfill of outcomes.

## License

[MIT](./LICENSE). Fork it.
