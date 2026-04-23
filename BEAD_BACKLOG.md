# Bead Backlog — "Make the Stack Participable"

Filed 2026-04-23. Nucleus API currently 401'd on `/api/portfolio/dispatch` (nginx basic-auth rejecting founder creds — see CLAUDE.md Strategic Priority "bkt-epic-infra"). These will be filed via `bd-remote` once that's unblocked. Priority 1 = blocker for external-dev / agent participation.

## Stack Reality Check (what works, what doesn't — 2026-04-23)

| Component | State | Blocker for external participation? |
|-----------|-------|-------------------------------------|
| bucket.foundation site | ✅ live at www.bucket.foundation, v0.2.0, mobile-responsive | No |
| bucket-foundation repo | ✅ public (github.com/bucket-foundation/bucket-foundation) | Needs CONTRIBUTING + .env.example + dev quickstart |
| feed402 spec + ref impl | ✅ public (gianyrox/feed402), boots locally, manifest valid | Wallet=0x000…, no hosted demo, no Docker one-liner |
| x402-research-gateway | ✅ public code (gianyrox/x402-research-gateway), compiles | **Not hosted anywhere.** No agent can actually pay the rail. |
| Viatika vendor integration | ✅ vendor live, we're a customer | Not ours to ship |
| Story Protocol / Walrus mint path | ❓ code exists, no docs for canon submitters | Submission path unclear |

**Blocking chain:** external dev watches demo video → goes to bucket.foundation → wants to try feed402 → no hosted endpoint to hit → bounces.

---

## Bucket Foundation repo (4 beads)

### bkt-cont-01 · P2 · CONTRIBUTING.md for external devs (canon + code paths)
Two contribution paths: (1) code PRs to the Next.js site, (2) canon submissions via Story Protocol IP NFT mint. Doc setup (`npm i`, `npm run dev`, env vars for Dynamic/Supabase/Story), canon submission criteria (axioms/laws/primary derivations only, not outcomes), MIT/CC0 licensing expectations. Link from README.

### bkt-cont-02 · P2 · README dev quickstart + stack diagram
Current README is mission-heavy, no dev quickstart. Add: clone → `npm i` → copy `.env.example` → `npm run dev` → localhost:3000. Stack diagram (Next14 + Dynamic + Supabase + Story Protocol + Walrus + Viatika). Badges (MIT, CC0 spec, Vercel, Next14).

### bkt-cont-03 · P2 · .env.example committed + secrets documented
No `.env.example` in repo. External devs have no clue which env vars are required. Ship: `NEXT_PUBLIC_DYNAMIC_ENV_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `STORY_RPC_URL`, `WALRUS_*` — placeholder values, link to where to get each key.

### bkt-cont-04 · **P1** · Wire bucket.foundation → x402-research-gateway live demo
Site talks about feed402/x402 citation protocol but has no live wire-up. Add `/research` page or widget that issues a real feed402 query against the hosted gateway (depends on `x402-gw-deploy-01`) and renders the cited envelope. Proves "claude is always doing research for me" concretely.

---

## x402-research-gateway repo (3 beads)

### x402-gw-deploy-01 · **P1** · Host at x402-research.agfarms.dev
**Gateway only runs locally — biggest blocker in the whole stack.** Repo has `Caddyfile`, `docker-compose.prod.yml`, `deploy.sh` — wire them up. Needs:
- DNS record: `x402-research.agfarms.dev` → Hetzner CPX42 IP
- K3s manifest in a new namespace (or Caddy standalone)
- Base Sepolia wallet key in K8s secret (fund with ~$5 USDC)
- Caddy ACME for TLS
- Health check: `GET /.well-known/feed402.json` returns 200
Without this, no external agent can pay the rail and the demo video promise is a lie.

### x402-gw-docs-01 · P2 · Agent-builder quickstart in README
Current README is internal-facing. Write "build an agent against this gateway in 5 min": manifest URL, auth pattern, raw/query/insight tier trade-offs, cURL + TypeScript + Python examples hitting `/insight` with a Base wallet sig. Link from `bucket.foundation/research`.

### x402-gw-ci-01 · P2 · GitHub Actions: build + e2e on PR
No CI. Add workflow: `go build`, unit tests, boot server + hit `/.well-known/feed402.json`, verify schema compliance against feed402/0.2. Required for external PRs to be reviewable + mergeable.

---

## feed402 repo (3 beads)

### feed402-wallet-01 · **P1** · Configure real Base Sepolia wallet in demo manifest
Current manifest wallet = `0x0000…0000`. Demo claims payment but goes nowhere. Burn a Base Sepolia test wallet into demo config + fund it with ~$5 USDC. Alternative: `DEMO_MODE=1` flag that fakes settlement with a clear `DEMO` banner in the receipt. Pick the real-wallet path for credibility.

### feed402-sync-01 · P3 · AGFarms/feed402 fork sync + CONTRIBUTING
AGFarms org fork exists but may drift from `gianyrox/feed402`. Set up daily upstream-sync workflow. Add `CONTRIBUTING.md`: spec changes = CC0, ref impl = MIT, bead-first rule for AGFarms-origin changes.

### feed402-docker-01 · P3 · `demo.sh` one-command Docker path
`demo.sh` requires node>=20 + `npm install`. Ship `Dockerfile` + `docker run farmera/feed402` one-liner. Lower barrier for evaluators to literal zero. Publish to Docker Hub.

---

## Cross-cutting / landing (1 bead)

### bkt-build-01 · P2 · `/build` landing page at bucket.foundation
New `/build` page: "integrate bucket in 10 min". Three paths:
1. **Run an agent** against the research gateway (code snippet + npx one-liner)
2. **Become a data merchant** via feed402 (clone template → fill manifest → push)
3. **Contribute a canon entry** (Story Protocol mint flow)

Each path: code snippet + repo link + expected output. Ties all three repos together so devs see the full stack. Link from header nav + demo video CTA.

---

## Priority-1 chain (do in this order)

1. `x402-gw-deploy-01` — host the gateway (unblocks everything)
2. `feed402-wallet-01` — real wallet in demo
3. `bkt-cont-04` — wire bucket.foundation → live gateway
4. `bkt-build-01` — `/build` landing

After that ladder is green, an external dev can watch the demo, hit `/build`, clone one repo, and have a working agent in <10 min.
