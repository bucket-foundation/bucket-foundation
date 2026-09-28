# Architecture Review 2026-09-14

Scope: full repo on branch `run/quantum-history-001` (127 ahead / 8 behind `origin/main`), including the hypothesis-engine work from the last 8 commits. Four parallel Sonnet reviews (web/API/auth, data layer, Python services, repo + product), synthesized here.

## System as-is

| Layer | What | Runs where |
|---|---|---|
| Web | Next.js 14 App Router, ~75 pages, ~60 API routes | Vercel |
| Auth | NextAuth v4 email magic link + Supabase adapter; Dynamic wallet; HS256 cookie for `/kruse`; Supabase token check for `/api/academy/*` | Vercel |
| DB | Supabase Postgres: `bucket` schema (2 tracked migrations + 1 untracked table), `public` schema (5 tables, zero migrations, anon-key writes from browser), `graph` schema (16 migrations on `origin/main`, absent on this branch) | Supabase |
| Payments | x402 buyer wallet in `/api/research`; Viatika meter stub always returns ok; Story, Walrus, Arweave/EAS dual-write for receipts | Vercel |
| research-tools gateway | FastAPI, 1715 lines, 40 tools, no auth, no rate limit | K3s `inst-bucket-foundation` |
| photon-api | FastAPI + own Postgres/pgvector, 6.5M rows | systemd on Hetzner |
| Academy tutor LLM | llama.cpp + bearer shim + reverse SSH tunnel | systemd on founder laptop |
| hypothesis-engine | stdlib Python, 863 tests, `hte-serve` on 127.0.0.1:8420, unwired to MCP | manual |
| canon-pipeline, mirrors | systemd timers, flat-file output | founder laptop |
| Git | 2.3 GB `.git`, 45 GB working tree, 10 data dirs tracked, 22 root markdown files, 20+ local branches, CI = 3 content-sync jobs, no lint/test/build gate | GitHub |

## Problems ranked

P0 security
1. `public.author`, `research`, `cite_tokens`, `ip_metadata`, `research_cite`: no migration, no RLS, browser inserts with anon key (`src/context/AuthorContext:40-47`, `CiteTokensContext:58`, `src/lib/story/index:179-229`). Any visitor can write rows.
2. `research-tools.agfarms.dev` accepts unauthenticated compute jobs from anyone; the Next.js proxies add only a static `x-bucket-proxy: v1` header. No nginx `limit_req`.
3. 54 API routes set `access-control-allow-origin: *` with no auth and no throttle. `canon/search` claims a rate limit in its comment and has none.

P0 identity
4. Three identity models (wallet via Dynamic, email via Supabase Auth, handle via `academy_profiles`) with no join table. One person yields two or three disconnected rows.

P1 cost
5. x402 daily spend cap is a module-level variable in a serverless function (`src/app/api/research/route.ts:92`); each warm instance has its own counter.

6. Viatika meter stub returns `balanceUsd: 999` (`src/lib/meter.ts:16-33`); `/api/chat` has a session gate and no per-user limit.

7. hypothesis-engine has no dollar ceiling per campaign, only reactive rate-limit backoff.

P1 reliability
8. Tutor LLM path and all mirror jobs run on the founder laptop. Laptop sleep = production outage.

9. `academy_profiles` DDL lives in `scripts/sql/`, never in `supabase/migrations/`; a fresh env misses it. Env var drift: `SUPABASE_SERVICE_ROLE_KEY` vs `SUPABASE_SERVICE_KEY` (`tools/hypothesis-engine/hte/corpus/production.py:516`).

10. This branch has 2 of 18 migrations; code depending on the `graph` schema ships here anyway.

11. `services/photon-api/server_pg.py:19-23` falls back to hardcoded `bucket/bucket` credentials.

P1 engineering
12. 40 research proxies duplicate the same 135-220 line scaffold (5,815 lines). One fix = 40 edits.
13. No CI gate: no lint, typecheck, build, or test on PR. 863 hte tests run only via local `make test`. `eslint.ignoreDuringBuilds: true`.
14. 2.3 GB git history from tracked corpora (`yt` 2.2G, `archive` 3.6G on disk, `openalex` 1G, `quantum` 802M, `pubmed` 234M, sqlite and .bin blobs up to 204M).
15. `next-auth@4` and `@auth/core@0.37` both installed: stalled v4 to v5 migration.

P2 product
16. ~45 of ~75 routes carry no connection to read → cite → pay author → agent discovery. Duplicates: about/mission/manifesto, contribute/join, contributors/m, academy/learn/library/knowledge.
17. No author earnings view, no rate card for citers or agents, no agent usage/receipt dashboard. `/cite-forever/v0.1` is the only page naming the payment flow and it is a prototype.

## Target data architecture on Supabase free tier

Free tier limits: 500 MB DB, 1 GB storage, 50k MAU, pause after 7 idle days. Postgres holds pointers, hashes, and metadata. Bodies, PDFs, corpora stay in git-lfs-free flat files on gdrive or Walrus. photon-api keeps its own container.

Schema `app`, never listed in `PGRST_DB_SCHEMAS`, reached only via same-origin Next.js routes using the service-role client after verifying the caller token (the pattern `/api/academy/progress` already uses). RLS enabled on every table as a second layer.

| Table | Key columns |
|---|---|
| identities | id = auth.users.id, wallet_address unique null, handle unique null, display_name, is_public |
| roles | identity_id, role (reader/author/agent/admin) |
| contributors | identity_id, github_handle, bio, links jsonb |
| canon_entries | id, kind (paper/claim/bridge/figure), branch, slug, title, source_ref, metadata jsonb, created_by, superseded_by |
| canon_edges | from_id, to_id, relation, evidence jsonb |
| citations | id, canon_entry_id, citer_identity_id, envelope_hash, arweave_tx_id, eas_uid, created_at; index (canon_entry_id, created_at) |
| payouts | id, citation_id, payee_identity_id, amount_usd, chain_tx_hash, status, settled_at |
| academy_progress, academy_credentials, academy_profiles | current shape, FK to identities |
| agent_keys | id, identity_id null, key_hash, scopes jsonb, quota_daily, quota_used, expires_at |
| spend_ledger | day, scope, usd; atomic upsert replaces the in-memory cap |
| audit_log | actor_identity_id, action, target_table, target_id, diff jsonb; pruned at 90 days |

User tiers: Reader (free, no wallet) browses everything. Author claims a wallet, sees citations and payouts. Agent uses free capped `/api/research` or pays per query at insight tier with a key and receipts. Admin mints, funds, accepts canon.

Migration workflow: `supabase migration new` per change, `supabase db diff` to verify, CI fails a PR if any new `.from("table")` has no `CREATE TABLE` in migrations. Keep-alive: GitHub Actions cron every 5 days hits an authenticated route and writes to `audit_log`.

## Ordered plan

1. Lock down: deny-by-default RLS on the five `public` tables; shared-secret header + nginx `limit_req` on research-tools; per-IP token bucket on all proxies and `canon/search`.
2. Migrations: move `academy_profiles.sql` into `supabase/migrations/`; pull the 16 `graph` migrations from `origin/main`; unify the service-role env var name.
3. Identities table with backfill from `auth.users`, `academy_profiles`, `author`. Move the four browser-write contexts onto server routes. Retire legacy `public` tables.
4. Durable spend: `spend_ledger` table behind `/api/research`, `/api/chat`, and hte campaigns.
5. Collapse 40 proxies into `src/app/api/research/[tool]/route.ts` + `TOOL_REGISTRY` + `src/lib/research-gateway.ts`.
6. CI: lint + typecheck + build + `pytest` for hte, research-tools, photon-api on every PR. Re-enable ESLint in builds.
7. Data out of git: move the 10 corpora dirs to gdrive/object storage, gitignore, then one coordinated `git filter-repo` once open branches merge.
8. `citations` + `payouts` tables, author earnings page, rate card page, agent key + receipt page. This is the first-revenue path.
9. Product cuts: merge about/mission/manifesto, contribute/join, contributors/m, academy/learn/library/knowledge. Move 34 research tools, chat, sacred-history, ladder to `apps/labs` on a subdomain.
10. Move laptop services (tutor LLM, mirrors) to Hetzner or add graceful degradation. Wire `hte.mcp_tool` into `bucket-mcp.py` and run `hte-serve` under systemd.
11. Finish NextAuth v5 migration before any new auth-gated surface. Fold 22 root markdown files into `docs/`, single `ROADMAP.md`.

## Repo layout target

```
apps/web          core site: canon, protocol, kruse, access, academy, author, agent
apps/labs         research tools, chat, sacred-history, ladder
services/gateway  one FastAPI: research-tools + photon + hte-serve, shared auth/limit/otel
services/canon-pipeline
tools/            agf-* scripts, hypothesis-engine
supabase/migrations
docs/
```

## Pass two

Exhaustive follow-up the same day: every page under `src/app`, the static Academy SPA, every storage location, and 30 directories pass one skipped. Findings are rows PR-021 through PR-055 in `docs/PROBLEM-REGISTER.md`. Headline additions: Story signing key read through a `NEXT_PUBLIC_` var in client-imported code; no real x402 payment exists on any path; canon is served from git while both CLAUDE.md files say gdrive; branch policy unmerged and violated by the current branch.
