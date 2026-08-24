# grants-gateway

Feed402-compliant paid grants-search API. X402 merchant on Base (Sepolia for
dev). Sibling to:

- `~/agfarms/feed402/`, protocol spec + reference impl (MIT/CC0)
- `~/agfarms/x402-research-gateway/`, production-pattern Go merchant
- `~/agfarms/kruse/`, production TS feed402 merchant on Hetzner K3s

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
npm run dev                          # in-memory fixture (5 fake grants)

# Real corpus from grants.gov / NIH / NSF / USAspending / 990:
python3 scripts/ingest.py            # ~10 min, idempotent, writes data/grants.db
GRANTS_STORE=sqlite npm run dev      # store=sqlite (NNNN rows)
```

The `GRANTS_STORE` env var picks the backing store. Default `memory`
(5 fixtures) so tests/CI keep working. Set to `sqlite` to read
`data/grants.db` produced by `scripts/ingest.py`. The DB file is
gitignored.

See `SMOKE-TEST.md` for ready-made curl examples against the real
corpus.

Type-check (no emit):

```bash
npm run typecheck
```

## Curl examples

The dev server runs in **stub-payment mode**, any `x-payment` header is
treated as valid. In production this is swapped for a real x402 facilitator
Check.

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

Raw, single grant:
```bash
curl -s -H 'x-payment: stub' \
  "localhost:8789/grants/raw?id=grants-gov:HHS-2026-NIH-AG-001" | jq
```

Query, search by topic + deadline:
```bash
curl -s -H 'x-payment: stub' \
  "localhost:8789/grants/query?topic=longevity&deadline_before=2026-12-31&min_amount=100000" | jq
```

Query, by funder:
```bash
curl -s -H 'x-payment: stub' \
  "localhost:8789/grants/query?funder=NSF" | jq
```

Insight, venture fit:
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

- **Payment verification** (`src/x402.ts`), two modes via
 `FEED402_VERIFY_MODE`. `stub` (default, dev/demos) accepts any non-empty
 `x-payment` header. `facilitator` POSTs the header to
 `${FEED402_FACILITATOR_URL}/verify` and trusts the verdict; the facilitator
 must enforce (a) on-chain payment to `FEED402_WALLET` on the configured
 chain and (b) amount ≥ tier `price_usd`. Production deploys set
 `FEED402_VERIFY_MODE=facilitator`.
- **Data layer**, two implementations:
 - `MemoryGrantsStore` (`src/data/grants-store.ts`), 5 fake fixtures
 for fast/offline dev. Default.
 - `SqliteGrantsStore` (`src/data/sqlite-grants-store.ts`), reads
 `data/grants.db` produced by `scripts/ingest.py` (Python stdlib +
 `sqlite3`). Pulls from grants.gov, NIH RePORTER, NSF Awards,
 USAspending, and IRS 990 / 990-PF (ProPublica). Toggle with
 `GRANTS_STORE=sqlite`. *(bead bkt-ugw, done.)*
- **Insight LLM** (`src/insight/synthesizer.ts`), two implementations:
 - `MockSynthesizer`, deterministic keyword-overlap. Default. No API key
 needed; CI uses this.
 - `AnthropicSynthesizer`, real Claude call via `@anthropic-ai/sdk`.
 Selected by `INSIGHT_SYNTH=anthropic` + `ANTHROPIC_API_KEY`. Model
 default `claude-sonnet-4-5` via `ANTHROPIC_MODEL`. Pre-ranks candidates
 by keyword overlap and ships top-K (default 8) to bound input tokens;
 output capped at 600 tokens. Hard budget guard: when projected cost
 exceeds 10x the tier price ($0.002), the call is logged and downgraded
 to `MockSynthesizer`. Emits a sibling-of-§3.2 envelope-level
 `provenance` block: `{model_id, candidates, prompt_sha256, ts}`.
 *(bead bkt-x2b, done.)*
- **Viatika metering** (`src/metering/viatika.ts`), `NoOpMeter`. Real
 vendor-API integration is a later bead (P3).

## Next beads

1. **bkt-ugw, Grants ingestion pipeline (P2).** Replace `MemoryGrantsStore`
 with `PostgresGrantsStore` populated nightly from grants.gov XML extract,
 NIH RePORTER API, NSF awards, and IRS 990-PF "Grants Paid". Stable id
 namespacing per source. Target: 10k+ active opportunities.
2. **bkt-???, Real LLM synthesizer (P2).** Implement `OpenAISynthesizer`
 and/or `AnthropicSynthesizer` behind the `Synthesizer` interface; emit
 §3.2 retrieval provenance with the actual model identifier; budget cap
 per /insight call.
3. **bkt-???, Viatika metering wire-up (P3).** Implement `HttpViatikaMeter`
 against the Viatika vendor public API (policy check + budget debit).
 Per CLAUDE.md Strategic Priority #6, metered AI/data routes through
 Viatika; do NOT roll a duplicate ledger.

## Status

- [x] Compiles cleanly under `npm run typecheck` (after `npm install`)
- [x] Boots on `npm run dev`, all three endpoints return valid envelopes
- [x] feed402 v0.2 manifest at `/.well-known/feed402.json`
- [x] Real grants corpus, 17,211 rows in `data/grants.db` (bkt-ugw)
- [x] Real LLM, `AnthropicSynthesizer` behind `INSIGHT_SYNTH=anthropic` (bkt-x2b)
- [x] Real x402 facilitator verification wired (`src/x402.ts`, mode=facilitator), bkt-2cu
- [x] Production K8s manifest + `deploy.sh` (mirrors `~/agfarms/kruse/`), bkt-2cu
- [x] Corpus baked into Docker image (no PVC, idempotent rebuilds), bkt-2cu
- [ ] Live on `grants-gateway.nucleus.agfarms.dev` (BLOCKED on creds, see below)
- [ ] Real Viatika metering (bead TBD)

### Deployment

**Service is deploy-ready but NOT YET LIVE.** All artifacts are in place:

- `src/x402.ts` ships real facilitator-mode verification (mirror of `~/agfarms/kruse/server.ts`).
- `Dockerfile` bakes the 17k-row SQLite corpus at build time (simplest persistence; no PVC).
- `deploy/k8s.yaml` targets `grants-gateway.nucleus.agfarms.dev` (sibling AGFarms TLS path) on namespace `grants`.
- `deploy.sh` mirrors `~/agfarms/kruse/deploy.sh`, `--seed-secret` for first deploy, plain run for rollouts.

**To go live (mainnet):**
```bash
DEPLOY_SERVER=5.161.236.151 SERVER_PASS=... \
FEED402_WALLET=0x... ANTHROPIC_API_KEY=sk-ant-... \
FEED402_CHAIN=base FEED402_VERIFY_MODE=facilitator \
FEED402_FACILITATOR_URL=https://facilitator.x402.rs \
INSIGHT_SYNTH=anthropic \
./deploy.sh --seed-secret
```

**Required secrets (rotate via `kubectl -n grants patch secret grants-env`):**
- `FEED402_WALLET`, Base mainnet 0x... Receiving payments
- `FEED402_FACILITATOR_URL`, x402 facilitator (e.g. https://facilitator.x402.rs)
- `FEED402_VERIFY_MODE=facilitator`, turns off stub
- `FEED402_CHAIN=base`, mainnet (use `base-sepolia` for staging)
- `ANTHROPIC_API_KEY`, for `INSIGHT_SYNTH=anthropic` (else falls back to MockSynthesizer)
- `INSIGHT_SYNTH=anthropic`

For staging, swap `FEED402_CHAIN=base-sepolia` and use a Sepolia-funded test wallet.

## License

MIT. Per Bucket Foundation: code MIT, protocol CC0.
