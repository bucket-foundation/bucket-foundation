# grants-gateway

feed402-compliant paid grants-search API. x402 merchant on Base (Sepolia for
dev). Sibling to:

- `~/agfarms/feed402/` — protocol spec + reference impl (MIT/CC0)
- `~/agfarms/x402-research-gateway/` — production-pattern Go merchant
- `~/agfarms/kruse/` — production TS feed402 merchant on Hetzner K3s

This is **scaffold v0.1**: in-memory fixture (5 fake-content grants with real
schema), mock LLM synthesizer, Viatika metering as no-op. All endpoints work
end-to-end against the fixture.

## Tiers

| Method | Path | Tier | Price | What |
|---|---|---|---|---|
| GET | `/grants/raw?id=<grant_id>` | raw | $0.010 | Single grant record (full) |
| GET | `/grants/query?topic=&deadline_before=&min_amount=&max_amount=&funder=&eligibility=` | query | $0.005 | Structured search |
| GET | `/grants/insight?venture=<slug>&topic=<text>` | insight | $0.002 | Venture-fit synthesis + gap analysis |

All responses follow the feed402 §3 envelope:

```json
{
  "data": { ... },
  "citation": { "type": "source", "source_id": "...", "canonical_url": "..." },
  "receipt": { "tier": "...", "price_usd": 0.005, "tx": "stub:...", "paid_at": "..." }
}
```

## Run locally

```bash
cd grants-gateway
cp .env.example .env
npm install
npm run dev
# → listening on :8789
```

Type-check (no emit):

```bash
npm run typecheck
```

## Curl examples

The dev server runs in **stub-payment mode** — any `x-payment` header is
treated as valid. In production this is swapped for a real x402 facilitator
check.

Discovery:
```bash
curl -s localhost:8789/.well-known/feed402.json | jq
```

Without payment (expect 402):
```bash
curl -i "localhost:8789/grants/query?topic=longevity"
# HTTP/1.1 402 Payment Required
# x-payment-required: {"chain":"base-sepolia","wallet":"0x00...","price_usd":0.005,"unit":"call","tier":"query"}
```

Raw — single grant:
```bash
curl -s -H 'x-payment: stub' \
  "localhost:8789/grants/raw?id=grants-gov:HHS-2026-NIH-AG-001" | jq
```

Query — search by topic + deadline:
```bash
curl -s -H 'x-payment: stub' \
  "localhost:8789/grants/query?topic=longevity&deadline_before=2026-12-31&min_amount=100000" | jq
```

Query — by funder:
```bash
curl -s -H 'x-payment: stub' \
  "localhost:8789/grants/query?funder=NSF" | jq
```

Insight — venture fit:
```bash
curl -s -H 'x-payment: stub' \
  "localhost:8789/grants/insight?venture=bucket-foundation&topic=open-source%20citation%20infrastructure" | jq
```

## Architecture

```
src/
├── server.ts                  # Hono app — three routes + /.well-known/feed402.json
├── types.ts                   # feed402 envelope/manifest + Grant/Insight domain types
├── x402.ts                    # Payment middleware (STUB)
├── data/
│   └── grants-store.ts        # GrantsStore interface + MemoryGrantsStore (5 fixtures)
├── insight/
│   └── synthesizer.ts         # Synthesizer interface + MockSynthesizer (keyword overlap)
└── metering/
    └── viatika.ts             # ViatikaMeter interface + NoOpMeter / HttpViatikaMeter (stub)
```

Every replaceable component is behind an interface so the next three beads
can swap implementations without touching `server.ts`.

## What's stubbed

- **Payment verification** (`src/x402.ts`) — any `x-payment` header passes.
  Production: facilitator signature check.
- **Data layer** (`src/data/grants-store.ts`) — 5 in-memory fixtures.
  Real schema, fake content. Ingestion pipeline is bead **bkt-ugw** (P2).
- **Insight LLM** (`src/insight/synthesizer.ts`) — keyword-overlap mock.
  Real OpenAI/Anthropic call is a later bead (P2).
- **Viatika metering** (`src/metering/viatika.ts`) — `NoOpMeter`. Real
  vendor-API integration is a later bead (P3).

## Next beads

1. **bkt-ugw — Grants ingestion pipeline (P2).** Replace `MemoryGrantsStore`
   with `PostgresGrantsStore` populated nightly from grants.gov XML extract,
   NIH RePORTER API, NSF awards, and IRS 990-PF "Grants Paid". Stable id
   namespacing per source. Target: 10k+ active opportunities.
2. **bkt-??? — Real LLM synthesizer (P2).** Implement `OpenAISynthesizer`
   and/or `AnthropicSynthesizer` behind the `Synthesizer` interface; emit
   §3.2 retrieval provenance with the actual model identifier; budget cap
   per /insight call.
3. **bkt-??? — Viatika metering wire-up (P3).** Implement `HttpViatikaMeter`
   against the Viatika vendor public API (policy check + budget debit).
   Per CLAUDE.md Strategic Priority #6 — metered AI/data routes through
   Viatika; do NOT roll a duplicate ledger.

## Status

- [x] Compiles cleanly under `npm run typecheck` (after `npm install`)
- [x] Boots on `npm run dev`, all three endpoints return valid envelopes
- [x] feed402 v0.2 manifest at `/.well-known/feed402.json`
- [ ] Real grants corpus (bkt-ugw)
- [ ] Real LLM (bead TBD)
- [ ] Real Viatika metering (bead TBD)
- [ ] Deployed (NOT in this scaffold; Dockerfile + deploy/k8s.yaml ready)

## License

MIT. Per Bucket Foundation: code MIT, protocol CC0.
