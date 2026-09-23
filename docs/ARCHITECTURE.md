# Architecture

Target design. Updated as rows in `docs/PROBLEM-REGISTER.md` close. Current-state findings live in dated `docs/internal/ARCHITECTURE-REVIEW-*.md`.

## Product

Research OS is the product (founder decision, 2026-09-15, `learning/research-os/INTEGRATION-PLAN.md`). Every surface built lives inside it. The canon and the citation rail are its backbone: read canon, cite, the author gets paid over x402 on Base, agents discover via feed402. K-12 is the first audience, libraries the first venue, and the five words (Access, Awareness, Understanding, Internalization, Production) are levels of interaction with one graph. The first release runs without a model.

One account per person (`app.identities` keyed on `auth.users.id`, unique wallet and handle) carries identity facts rather than product tiers:

| Fact on the account | Grants |
|---|---|
| email verified | learner surfaces, the workspace, the Academy, the map |
| class membership with a role | teacher, librarian, parent, peer, reviewer, researcher surfaces (`learning/research-os/CLASS.md`) |
| wallet linked | payouts as an author; citations settled to the wallet |
| agent key | free capped `/api/research`; paid insight tier with receipts |
| admin role | accept canon, fund payouts, mint Story IP as an optional post-payment step |

One citation economy: feed402 envelope + x402 EIP-3009 settlement on Base, signed server-side. The Story Iliad testnet + Walrus + `public.*` path from bucket 1.0 retires along with `/library`, `/knowledge`, `AuthorContext`, `CiteTokensContext`, and `IpMetadataContext`. `apps/labs` holds only what INTEGRATION-PLAN.md section 9 freezes.

The Academy stack is the reference pattern for every user-data route: verified caller (a cookie session read server-side, or a Bearer token from an agent), service-role client, private schema PostgREST never exposes, per-user filter enforced in code, RLS as second layer, documented 503 when the DB is paused. The Research OS routes follow it.

## Repo layout

```
apps/web           canon, protocol, kruse, access, academy, learn, ladder, sacred-history, author, agent, contribute, support
apps/labs          40 research tools + proxies, chat, research/agent, legacy web3 archive
services/gateway   one FastAPI: research-tools + photon + hte-serve; shared auth header, limit_req, otel
services/canon-pipeline
tools/             hypothesis-engine, canon-pipeline, feed, agf-* scripts
supabase/migrations
bucket-canon/      canonical content, git-tracked, served at request time
docs/              every root markdown except README, CONTRIBUTING, AGENTS, CLAUDE, LICENSE
```

Extract to own repos: `grants-gateway/`, `polingual/`. Move to `gdrive:AGFarms/Nucleus/bucket-foundation/` with a pointer README: `archaeology/`, `blog/`, `gtm/`, `manifesto-source/`, `museum/`, `figma-export/`, `checkpoints/`, `yt/`, `archive/`, `openalex*/`, `pubmed/`, `quantum/`, `arxiv/`, `gutenberg/`, `wikisource/`, `_intake/` bulk.

Branches: `main` is production and takes merges from `dev` only; `dev` is the PR target; engine work targets `hte/integration`, which Vercel never builds.

## Canonical storage map

| Data class | Store | Notes |
|---|---|---|
| Identity | `app.identities` in Supabase | id = `auth.users.id`; unique wallet, unique handle; replaces `author` + `academy_profiles` |
| Canon content | `bucket-canon/` in git | Request-time reads via `canon-fs.ts`; gdrive is a generated export; build asserts tracing covers every read dir |
| Canon metadata and graph | `app.canon_entries`, `app.canon_edges` | Pointers, hashes, branch, slug; bodies stay in git |
| Branch list | `src/data/branches.json` | Single source for layout, `canon.ts`, `canon-fs.ts`, JSON-LD, CLAUDE.md |
| Citations, receipts, payouts | `app.citations`, `app.payouts` | One row per envelope: hash, Arweave tx, EAS uid, price, payee; chain is the record, Postgres is the index |
| Academy | `app.academy_progress`, `app.academy_credentials`, `app.academy_profiles` | Current shape, FK to identities; localStorage stays primary when signed out |
| Agent keys, quotas, spend | `app.agent_keys`, `app.spend_ledger` now; Viatika ledger when wired | Atomic upsert per day and scope; replaces every in-memory counter and `Map` |
| Audit | `app.audit_log` | Actor, action, target, diff; 90-day prune; keep-alive cron writes here |
| Research corpora | flat files under `_intake/`, gdrive-mirrored | `photon-index.ts` reads `all.json` only; pgvector and sqlite are laptop research backends with nightly dump to gdrive |
| Embeddings | `_intake/embeddings-v2/` small files in git; weights on HF Hub | |
| Job state and logs | `_intake/**/.status.json`, runner logs, mirrored on completion | |

## Supabase free tier

500 MB DB, 1 GB storage, 50k MAU, pause after 7 idle days. Postgres holds pointers, hashes, metadata. Schema `app`, absent from `PGRST_DB_SCHEMAS`. RLS on every table. Migration per change via `supabase migration new`; CI fails a PR when a new `.from("t")` has no `CREATE TABLE`. Keep-alive: GitHub Actions cron every 5 days calls an authenticated route that writes `audit_log`.

## Secrets

Server-only names: `STORY_WALLET_PRIVATE_KEY` (renamed from `NEXT_PUBLIC_WALLET_PRIVATE_KEY`), `BUCKET_WALLET_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (one name everywhere), `NEXTAUTH_SECRET` (throw when unset in production), `VIATIKA_API_KEY`, `GATEWAY_SHARED_SECRET`. `NEXT_PUBLIC_*` holds only the anon key, site URL, Dynamic env id, feature flags. Laptop systemd units read from `~/.bashrc`; K3s from namespace secrets; nothing on disk in the repo.

## Ordered plan

1. Lock down: rename and server-side the Story key, delete the log; deny-by-default RLS on `public.*`; gateway shared secret + `limit_req`; per-IP bucket on every proxy.
2. Migrations hygiene: `academy_profiles.sql` into migrations; pull the 16 `graph` migrations; one service-role env name; branch policy merged to `main`.
3. `app.identities` with backfill; retire `/library`, `/knowledge`, legacy contexts, Story/Walrus path.
4. `app.spend_ledger` behind `/api/research`, `/api/chat`, tutor, hte campaigns; chat stays flagged off until then.
5. Real x402: server-side EIP-3009 signing, `app.citations` row per receipt, real `receipt.status`.
6. Collapse 40 proxies; CI gate with lint, tsc, build, pytest; re-enable ESLint.
7. Data out of git, `git filter-repo` once open branches land; extract grants-gateway and polingual.
8. `app.payouts`, `app.agent_keys`; author earnings, rate card, agent receipts pages. First revenue.
9. `apps/labs` split; merge duplicate page clusters; one `branches.json`; sitemap from data libs.
10. Laptop services to Hetzner or graceful degradation; wire hte into MCP; `hte-serve` under systemd.
11. NextAuth v5; `docs/` fold; one roadmap; mastery parity test.
