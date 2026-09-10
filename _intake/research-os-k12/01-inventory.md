# Bucket Foundation Codebase Inventory

Repo: this checkout (repo root). Remote: `https://github.com/bucket-foundation/bucket-foundation.git` (org moved off `gianyrox/bucket-foundation`; `origin` now points at `bucket-foundation/bucket-foundation`). Current branch: `feat/hypothesis-engine`. Other branches: `main`, `data/sacred-history-ai-analysis`, `feat/polingual-live-fullindex-bkt-2ea`, `feat/polingual-vector-backbone-bkt-4zz`, `integrate-visual-merge`.

Scope note: this repo is far larger than the Next.js app alone. It holds the app, the full research canon, a standalone spaced-repetition "Academy" product, a hypothesis-engine research pipeline, and dozens of markdown research/governance trees. This inventory covers everything relevant to the education-OS gap question and names the rest for completeness.

---

## 1. Stack and deploy

**Framework**: Next.js 14.2.15 (App Router, `src/app/`), React 18, TypeScript 5, Tailwind 3.4. Package name `bucket-foundation`, version `0.2.0`, MIT license, `"private": false`.

**Key dependencies** (`package.json`):
| Area | Package | Version |
|---|---|---|
| Auth/wallet | `@dynamic-labs/sdk-react-core`, `@dynamic-labs/ethereum`, `@dynamic-labs/wagmi-connector` | ^3.4.2 |
| Auth (email) | `next-auth` ^4.24.11, `@auth/core` ^0.37.0, `@auth/supabase-adapter` ^1.7.4 |
| DB | `@supabase/supabase-js` ^2.45.6, `@supabase/ssr` ^0.5.1 |
| Chain | `viem` ^2.21.29, `wagmi` ^2.12.20 |
| IP/minting | `@story-protocol/core-sdk`, `@story-protocol/react-sdk` ^1.1.0-stable |
| Storage | `@pinata/sdk` ^2.1.0 (IPFS pinning) |
| AI | `@anthropic-ai/sdk` ^0.30.1 |
| 3D | `three`, `@react-three/fiber`, `@react-three/drei` |
| Misc | `jose`, `jszip`, `lz-string`, `ts-node` |

**Test setup**: none, in the conventional sense. No Jest/Vitest/Playwright config, no `*.test.*` files under `src/`. `package.json` `"test"` script runs one script, `scripts/test-kruse-token.ts`, a manual token check, not a suite. The standalone `learning/app/` sub-product has its own ad hoc node test scripts (`test-adaptive.js`, `test-assess-flow.mjs`, `test-assess.mjs`, `test-diagnostic.mjs`, `test-explorer.mjs`, `test-headless-flow.mjs`, `test-lang-flow.mjs`), none wired to CI.

**CI**: `.github/workflows/` has 3 workflows, none of them build/test/deploy gates:
- `feed.yml`: "canon-feed", regenerates `feed.json`/`feed.xml` from canon commits on push to `main`.
- `whats-new.yml`: generates a changelog-style "what's new" page from commit ranges.
- `mirror-war-gov.yml`: mirrors a declassified-government-docs corpus.
No lint/typecheck/test/build workflow exists. Deploy is presumably Vercel's GitHub auto-deploy (`.vercel/project.json` present, `@vercel/analytics` + `@vercel/speed-insights` wired in), not visible as a repo workflow.

**Env vars required** (names only, from `.env.example`, 37 total):
`ANTHROPIC_API_KEY`, `BKT_KRUSE_ALLOWED_RECIPIENTS`, `BKT_KRUSE_TOKEN_SECRET`, `BKT_KRUSE_TOKEN_VERSION`, `BUCKET_PERMANENCE_ENABLED`, `BUCKET_WALLET_PRIVATE_KEY`, `BUCKET_X402_PRIVATE_KEY`, `DATABASE_URL`, `EAS_CHAIN`, `EAS_CONTRACT_BASE`, `EAS_SCHEMA_REGISTRY`, `EAS_SCHEMA_UID`, `EMAIL_FROM`, `EMAIL_SERVER`, `FEED402_BASE_URL`, `IRYS_NODE_URL`, `IRYS_TOKEN`, `KRUSE_INDEX_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_CHAT_ENABLED`, `NEXT_PUBLIC_DYNAMIC_ENV_ID`, `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `PINATA_JWT`, `POLINGUAL_API_URL`, `POLINGUAL_TIMEOUT_MS`, `STORY_PRIVATE_KEY`, `STORY_RPC_URL`, `STORY_SPG_NFT_COLLECTION`, `SUPABASE_SERVICE_ROLE_KEY`, `VIATIKA_API_KEY`, `WALRUS_AGGREGATOR_URL`, `WALRUS_PUBLISHER_URL`, `X402_BUYER_PRIVATE_KEY`, `X402_DEFAULT_PAYOUT_WALLET`, `X402_NETWORK`, `X402_RESEARCH_GATEWAY_URL`.

Two Dynamic env-id vars are listed (`NEXT_PUBLIC_DYNAMIC_ENV_ID` and `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID`), unreconciled duplication, not a typo you should assume is dead.

---

## 2. App surface

Everything lives under `src/app/`. Page count and API route count below; "stub" = renders/returns a placeholder, thin wrapper, or a single hardcoded response with no real backing logic.

### Pages (selected, grouped)
| Route | What |
|---|---|
| `/` | Landing (thesis, manifesto teaser, canon teaser, protocol teaser) |
| `/about`, `/mission`, `/manifesto`, `/governance` | Static long-form pages rendering the root `.md` files |
| `/canon`, `/canon/[slug]`, `/canon/search`, `/canon/timeline`, `/canon/graph`, `/canon/claims`, `/canon/claims/[concept]/[slug]`, `/canon/bridges`, `/canon/bridges/[slug]`, `/canon/bridges/detected`, `/canon/bridges/detected/[slug]`, `/canon/[slug]/figures/[figure]` | The canon browser: branch pages, per-entry pages, a claim graph, a cross-branch "bridges" explorer |
| `/academy` | Iframe wrapper around the standalone `learning/app` static SPA (synced to `public/academy-app` at build time via `scripts/sync-academy.mjs`), see §7 |
| `/ladder` | Renders the L0-L5 depth ladder (`src/lib/depth-ladder.ts`) |
| `/learn`, `/library`, `/knowledge` | Additional content/index pages over the canon |
| `/research`, `/research/atlas`, `/research/agent`, `/research/datasets`, `/research/datasets/[slug]`, `/research/education`, `/research/education/[slug]`, `/research/education/knowledge-access-gradient`, `/research/papers`, `/research/papers/[slug]`, `/research/tools`, `/research/tools/<40 tool slugs>` | The research surface: an agent UI, 40 individual "instrument" pages (see API §), a papers index, dataset browser, the education-atlas synthesis page |
| `/protocol`, `/protocol/envelope`, `/protocol/agent-trust` | Protocol spec pages (mirrors `PROTOCOL.md`) |
| `/cite-forever/v0.1` | The citation license page |
| `/contribute`, `/contributors`, `/contributors/[handle]`, `/join`, `/support` | Contribution/onboarding pages |
| `/m/[handle]` | Public learner "mastery profile" page (server-rendered, service-role assembled): real, wired to Academy progress/credentials |
| `/chat` | A general chat UI over `/api/chat` |
| `/kruse`, `/kruse/search` | Standalone Kruse-corpus reader/search (separate token-gated feature, see `BKT_KRUSE_*` env vars) |
| `/access`, `/build`, `/verify`, `/sacred-history`, `/whats-new` | Misc single-purpose pages |

### API routes (`src/app/api/`)
| Group | Endpoints | Notes |
|---|---|---|
| `/api/research` | 1 route | The zero-key feed402 research proxy (raw/query/insight tiers): real, documented in code comments as the trust-model contract |
| `/api/research-agent` | agent logic (`agent.ts`, `llm.ts`) | Plan→retrieve→synthesize→cite agent over canon + the 40 tools |
| `/api/research/<40 tool slugs>` (afmcurveml, aggregatepredict, calciumtraceml, causaldesigner, cellsegtrack, channeldwell, chromatinaccess, citationgraph, cryotriage, faircheck, figureminer, geosummary, grantdraft, grnaoptimizer, hhfit, labbrain, materialsfeaturizer, methodsmatcher, mlreprocard, paperradar, patchseqml, powerplan, proteinscout, protocolgpt, quantumbiorag, replicheck, reviewguard, rnafmembeds, rnastructure, screenserver, seqalign, spikefeatures, stabilitydesigner, stoichbalance, survivalfit, timeseriesforecast, toxinchannelfinder, tractionforceml, trajmine, unitdimcheck) | 39 narrow research-instrument endpoints, one Next.js route each, mirrored by a UI page each under `research/tools/<slug>` |
| `/api/academy/progress` | GET/POST | Real: reads/writes `bucket.academy_progress` via service-role client, RLS-backed |
| `/api/academy/profile` | GET | Real: assembles a public mastery profile |
| `/api/academy/credential/issue`, `/api/academy/credential/[id]`, `/api/academy/credential/verify` | Real: issues/reads/revokes/verifies signed VC-JWT credentials (Open Badges 3.0 / W3C VC, EdDSA) |
| `/api/academy/issuer` | Issuer metadata endpoint for the credential system |
| `/api/academy/tutor` | POST | Real, and hardened: a grounded, citation-validated, abstention-capable Socratic tutor (see §7) |
| `/api/auth/[...nextauth]` | NextAuth handler (email/passwordless via Supabase adapter) |
| `/api/canon/search` | Full-text search over canon entries |
| `/api/chat` | General chat endpoint (Anthropic-backed) |
| `/api/indexnow/ping` | SEO indexing webhook |
| `/api/jsonld` | JSON-LD structured-data emitter |
| `/api/kruse`, `/api/kruse/search` | Kruse corpus reader/search, gated by `BKT_KRUSE_TOKEN_SECRET` |
| `/api/photon/[id]`, `/api/photon/search` | A separate content surface ("photon"), not otherwise documented in the files read |
| `/api/polingual` | Language-learning backend (see `POLINGUAL.md`, `polingual/` dir, `learning/app/polingual/`) |

No route inspected reads as a hollow stub returning hardcoded JSON; the smaller `/api/research/tools/*` endpoints were not individually opened, so their depth (real ML inference vs. thin heuristic) is unverified here and should be spot-checked before relying on the "40 tools" claim as production-grade.

---

## 3. Data model

**Supabase migrations**: only 2 files exist, both scoped to the Academy, not to the canon or the main site:
- `supabase/migrations/20260612000000_academy_progress.sql`: creates a private `bucket` schema (deliberately NOT exposed over the shared multi-tenant PostgREST) and `bucket.academy_progress(user_id, branch, data jsonb, updated_at)`, PK `(user_id, branch)`, full RLS (own_select/insert/update/delete), a touch-updated-at trigger. `data` is the exact client-side FSRS/XP/streak blob keyed by branch.
- `supabase/migrations/20260626000000_academy_credentials.sql`: `bucket.academy_credentials(id, user_id, handle, jwt, credential jsonb, issued_at, revoked_at, revocation_reason)`, RLS, indexes on `user_id` and `handle`. Stores only `handle` as PII, no email, no numeric score (explicit compliance note against exposing a "rating").

No other tables exist in this repo (no `profiles`, `courses`, `enrollments`, `classrooms`, `assignments`, `roles` tables). There is no migration for canon content, canon claims, bridges, papers, or research tools, those all live as static files (`.md`/`.yaml`/`.json`) in the repo tree, read at request time or build time, not in Postgres.

**Roles**: none. No `role` column, no teacher/student/admin distinction anywhere in schema or auth code. The only "role" usages found in `src/` are unrelated: Supabase's `service_role` API key concept, ARIA `role="dialog"`/`role="note"` attributes, chat-message `role: "user"|"assistant"`, and a citation-graph node's academic `role` field (awarder/PI/co-PI/etc.).

**Minors / age gating**: no code path references minors, COPPA, parental consent, or age verification. Auth is either wallet-based (Dynamic, for authors/contributors) or passwordless email-OTP via Supabase Auth (for Academy learners); neither collects or checks age.

**Graph / prerequisite structure, the closest existing thing to what the gap analysis needs**: two separate, non-unified graphs exist.
1. **Canon graph** (`src/app/canon/graph`, `/canon/bridges*`): a citation/concept-bridge graph across the 11 canon branches (see §7), built from `_bridges/*.md` cross-references and detected-bridge JSON, not a learner-facing prerequisite DAG.
2. **Academy concept graph** (`learning/app/corpus/*.json`, consumed by `src/lib/academy/corpus.ts` + `src/lib/academy/mastery.ts`): a real, machine-readable, directed prerequisite graph. Each **Concept Atom** has `id, title, shell (prereq|nucleus|frontier), type (concept|equation|method|result|definition|theorem|law), requires: [atom ids], equation?, summary, depths:{eli5,core,deep}, note, sources, resources:[{label,url}], art_prompt, quiz:[{level: recall|apply|derive|teach, prompt, answer, eq?}], lesson`. `unlocks` and `leverage` (a centrality/reach score) are **derived at load time**, not authored, by walking `requires` edges backward (`ensureLeverage()` in `corpus.ts`). This is a real dependency DAG with topological structure, but it is scoped to 7 STEM branches + a meta "learning to learn" deck + a language deck, at "general-exam"/adult zero-prior-knowledge level, not standards-aligned K-12 grade bands. No grade-level (`grade 3`, `elementary`, `middle school`, `high school`, `kindergarten`) language appears anywhere in the learning docs or content, confirmed by grep.

**Learner state / progress model**: exists, and it is richer than a simple percentage. `src/lib/academy/mastery.ts` (a server-side TS port of the client engine in `learning/app/js/{fsrs,engine,adaptive}.js`) computes, per concept: FSRS `stability`/`retrievability` (spaced-repetition memory state), an Elo-lite `proficiency` score from graded quiz attempts, a fused `mastery = proficiency^α · retention^β`, a `mastered` boolean (≥0.70), an inferred `depth` on a 4-rung ladder (**Recall → Apply → Derive → Teach-back**, `DEPTH_LABEL` in `mastery.ts`), and a qualitative `confidence` band (`emerging`/`developing`/`established`) driven by evidence volume/recency. Concepts additionally carry a coarse `shell` position (`prereq`/`nucleus`/`frontier`). This is **not** the requested 5-state model (Access/Awareness/Understanding/Internalization/Production); it is a 4-depth mastery ladder over quiz performance, plus a separate, unrelated **site-level** 6-rung ladder (`src/lib/depth-ladder.ts`, L0-L5: basic literacy → K-12/secondary → undergraduate → graduate/professional → frontier → producing new knowledge) that maps *site sections* (Academy → Canon → Tools → Agent) onto a consume-vs-produce access gradient, not individual concept-node states. The two ladders are conceptually related (both are staged-mastery models) but are different axes: one is per-concept quiz-evidence depth, the other is per-learner site-journey stage, and neither has a "production envelope" (claim + evidence + sources + transfer proof) artifact type.

**Storage buckets**: no Supabase Storage bucket configuration found in the migrations or `src/lib/supabase/`. Media (art anchors, PDFs) appears to be handled externally (Pinata/IPFS via `PINATA_JWT`, Walrus via `WALRUS_*` env vars, Irys via `IRYS_*`), not Supabase Storage.

---

## 4. Auth and identity

- **Dynamic** (`src/providers/Web3Providers.tsx`, `src/context/AuthorContext.tsx`): wallet-connect auth via `@dynamic-labs/sdk-react-core` + `DynamicWagmiConnector`, used for **authors/contributors** (people minting or claiming canon contributions), keyed off `primaryWallet`. Gracefully degrades to bare children if `NEXT_PUBLIC_DYNAMIC_ENV_ID`/`NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` is unset (e.g. static prerender).
- **Supabase Auth** (passwordless email-OTP), used for **Academy learners** (progress sync, credentials). Confirmed in the migration SQL comments, not a separate provider file read directly.
- **NextAuth** (`@auth/core`, `@auth/supabase-adapter`, `/api/auth/[...nextauth]`) is also present as a third auth surface; its exact relationship to the Supabase-OTP path used by Academy was not fully traced from the files read, worth reconciling before building on it (possible duplicate/legacy auth path).
- **Roles**: none (see §3). **Minors**: not handled anywhere (see §3).

---

## 5. Payments

**x402**: implemented, but **testnet/dev-grade, not confirmed production-live**.
- `src/app/api/research/route.ts` is the reference implementation: a "zero-key" proxy where the **server's own wallet** settles x402 payment to an upstream gateway (`X402_RESEARCH_GATEWAY_URL`), invisibly to the caller; if settlement fails, it serves already-paid canon content instead of ever handing the caller a payment challenge. This "paid-to-cite, not pay-to-proceed" design is documented at length in `PROTOCOL.md §3.1` as a direct fix to a real safety-agent refusal encountered during development (`/protocol/agent-trust`).
- `X402_NETWORK`, `X402_BUYER_PRIVATE_KEY`, `BUCKET_X402_PRIVATE_KEY`, `X402_DEFAULT_PAYOUT_WALLET` are required env vars but no default network value was found hardcoded in the route; it is operator-configured.
- **Fee routing to authors**: designed but not evidenced as executing end-to-end in this repo. `PROTOCOL.md §4.1` specifies a `cite` block (`price_usd`, `payout_wallet`, `license`) as **passive, forward-looking license metadata**, what a downstream *publisher* would owe an author on paid re-publication, `reader_owes` is always `0`. There is no code path in the files read that executes an author payout; the sidecar schema and the envelope shape exist, the settlement-to-author leg was not located.
- **Facilitator**: no named third-party x402 facilitator service found; settlement is direct wallet-to-gateway per the route comments.

**Story Protocol (IP minting)**: **testnet only**, confirmed live in code. `src/lib/story/index.ts` hardcodes `https://testnet.storyrpc.io` as the default RPC and `wal-aggregator-testnet.staketab.org` for metadata URIs. `scripts/simpleMintAndRegister.ts`, `simpleMintAndRegisterSpg.ts`, `registerDerivativeNonCommercial.ts`, `registerDerivativeCommercial.ts`, `createSpgNftCollection.ts` are real, runnable CLI scripts, not stubs, but point at testnet by default. `EAS_CHAIN` (Ethereum Attestation Service, used alongside Story for on-chain claims) defaults to `base-sepolia` per `scripts/register-eas-schema.ts` and `scripts/test-permanence.ts` (which explicitly requires "all on testnet" funded keys from a Base Sepolia faucet).

**Stripe**: not integrated in this repo (no `stripe` dependency in `package.json`); billing/metering is designed to route through the Viatika vendor (`VIATIKA_API_KEY` env var present, `TODO: Viatika-metering` comment found in the tutor route), not yet wired.

---

## 6. feed402 / PROTOCOL.md

- **Spec status**: `PROTOCOL.md`, draft v0.1, "everything here is subject to change until v1.0."
- **Envelope shape** (every `/api/research` response): `{ data, citation, receipt: { tier, status, price_usd: 0, paid_by }, cite: { applies_to, reader_owes: 0, price_usd, payout_wallet, license }, tags, canon_tier, foundation_branches, provenance, agent_action_required: false, payment_required_from_you: false }`. `receipt.status` is `served_from_canon | settled`.
- **Bucket sidecar schema** (`canon.json`, `PROTOCOL.md §4.1`): `version, sha256, title, authors:[{name,orcid,wallet}], doi, source:{url,x402_endpoint,license}, purchase:{x402_receipt,network,paid_usd,paid_at,buyer_wallet}, cite:{price_usd,payout_wallet,license}, tags, canon_tier, foundation_branches, provenance:[...]`.
- **`/llms.txt`** (`public/llms.txt`): live, agent-facing onramp. States "no wallet required," documents the `tier` query param (`insight` default, `query`, `raw`), links `/llms-full.txt`, `/.well-known/feed402.json`, `/.well-known/mcp.json`, `/.well-known/ai-plugin.json`, and lists the free-to-read page index (canon branches, protocol, governance, etc.).
- **Tiers**: `raw` (full records), `query` (ranked citations), `insight` (default, richest, best for agent loops), matching the org-level feed402 three-tier model described in the global CLAUDE.md.
- **Agent-trust design**: `/protocol/agent-trust` and `PROTOCOL.md §3.1` document a real incident, a safety-tuned agent refused an earlier version of this endpoint because it looked like "fetch a document, then perform a payment it instructs you to make." The fix (server-side-only settlement, no `receipt.challenge` field, explicit `agent_action_required:false`) is implemented in the current route, a concrete, shipped anti-injection pattern worth reusing for any K-12 agent-facing endpoint.

---

## 7. Content

### Canon (`bucket-canon/`)
1,129 files total. Now **11 top-level branches**, not the 7 named in the org CLAUDE.md (which is stale on this point):

| Branch | Files |
|---|---|
| `05-biophysics` | 502 |
| `02-physics` | 167 |
| `07-mind` | 125 |
| `06-cosmology` | 72 |
| `01-mathematics` | 61 |
| `03-chemistry` | 57 |
| `08-deep-history` | 48 |
| `_bridges` (cross-branch) | 45 |
| `04-information` | 32 |
| `09-sacred-texts` | 11 |
| `09-art` | 9 |

Per-branch layout: `CANON_INDEX.md` (authoritative manifest, "if not listed here it is not canon"), `<topic>/CANON_INDEX.md` + `primary-papers.yaml` + `primary-papers.bib` + `queries.txt` per sub-topic, `sub-claims/<figure-or-idea>/` for smaller claim writeups, `_intake/` for unreviewed passes, `README.md` per branch. `08-deep-history` and `09-art`/`09-sacred-texts` are recent additions beyond the org-level "seven branches" description and beyond what the gdrive mirror currently reflects (see §10).

**Entry frontmatter** (`primary-papers.yaml` record shape): `id (bkt-<hash>), title, authors:[{family,given,orcid}], year, venue:{name,issn,publisher}, doi, canonical_url, oa_status:{is_oa,oa_url,license,repository}, citation_count, concepts:[...], sources_consulted, fetched_at, canon_score (0-100), canon_score_reasons:[...], canon_branch_hints`. This is a **citation/provenance** schema (bibliographic quality gate), not a pedagogical or prerequisite schema, no tier, no grade level, no "requires" field.

### canon-figures/
10 branch files (`01-mathematics.md` … `10-earth.md`) of contributor/figure profiles, plus `bios/` (11 individual bios: Curie, Einstein, Helmholtz, Hilbert, Maxwell, Mendeleev, Newton, Pauling, Poincaré, Turing, von Neumann), `figures.json`, `SCHEMA.md`, `CONTRIBUTORS.md`.

### _intake/
Holding area for unclassified artifacts (e.g. `_intake/kruse-blog-corpus/articles/*`), per branch and at root.

### yt/, papers/, arxiv/, pubmed/, openalex*/, gutenberg/, wikisource/
Present as top-level ingest directories (not inspected in full here); these are the raw-corpus legal-ingest trees the org CLAUDE.md and `KNOWLEDGE-ARCHITECTURE.md` describe as feeding the canon.

### The Academy content layer (`learning/`): the actual pedagogical unit
This is the part of the repo closest to a "Research OS for K-12" prototype, and it is a separate design track from the canon, sitting alongside it. Design docs: `learning/KNOWLEDGE-ARCHITECTURE.md`, `learning/PRODUCT.md`, `learning/EPIC.md`, `learning/README.md`. Thesis: teach the "nucleus" (high-centrality concepts) of each field rather than a full syllabus, via a **directed dependency graph** with three concentric shells (prereq → nucleus → frontier), using FSRS spaced repetition (Anki's engine) plus Duolingo-style engagement (streaks, XP, skill tree).

**Concept Atom** is the unit (spec in `KNOWLEDGE-ARCHITECTURE.md §2`, matches the real JSON in `learning/app/corpus/`): id, branch, shell, title, type, requires, unlocks, equation, mastery_signal (recall|apply|derive|teach), sources, canon_ref (links back to `bucket-canon/`), art_prompt, plus body prose at 3 depths + quiz prompts.

**Corpus counts** (`learning/app/corpus/*.json`, `atoms` array length):
| Deck | Atoms |
|---|---|
| `00-learning-to-learn` | 10 |
| `01-mathematics` | 55 |
| `02-physics` | 55 |
| `03-chemistry` | 55 |
| `04-information` | 60 |
| `biophysics` (05) | 133 (pilot branch, most built-out) |
| `06-cosmology` | 59 |
| `07-mind` | 60 |
| `lang-core` (language deck, not a canon branch) | 244 |
| **Total (7 STEM branches + meta)** | **487** |
| **Total incl. language deck** | **731** |

Shell distribution across all 731 atoms: `nucleus` 421, `frontier` 168, `prereq` 142. Type distribution: `concept` 217, `equation` 104, `result` 88, `method` 66, `definition` 7, `theorem` 4, `law` 1 (244 untyped, mostly the language deck).

**Engine** (`learning/app/js/`): real client-side JS, not scaffolding, 9,201 lines across `fsrs.js`, `engine.js`, `adaptive.js` (proficiency/retention fusion), `onboarding.js` (493 lines), `polingual.js` (697 lines, language-specific), `tutor.js` (332 lines), `lang-emoji.js`, served as a static SPA (`learning/app/index.html`, a PWA with `manifest.webmanifest` + `sw.js`) and iframed into `/academy` by `src/app/academy/page.tsx`. Synced into `public/academy-app/` at build time by `scripts/sync-academy.mjs` (a `predev`/`prebuild` hook).

**Server-side mirrors** exist so the public site can read Academy state without shipping the whole client engine: `src/lib/academy/mastery.ts` (FSRS/proficiency math, 260 lines, explicitly commented as "a faithful TS port" kept in sync by hand with the vanilla-JS original, a duplication-maintenance risk), `src/lib/academy/corpus.ts` (176 lines, corpus loader + leverage computation), `src/lib/academy/profile.ts` (153 lines, public profile assembly), `src/lib/academy/credential/{build,consistency,issuer,sign,store,types}.ts` (Open Badges 3.0 / W3C Verifiable Credential issuance, EdDSA-signed).

**AI tutor** (`src/app/api/academy/tutor/route.ts`, 422 lines): a hardened "constrained AI" implementation, worth reusing as a pattern. Grounds every answer in client-supplied verified atom content only (no free-generation of facts), abstains on out-of-grounding questions, validates every citation against a closed allow-list of the atom's own `sources`/`resources` (drops unresolvable ones server-side, never trusts model-parsed links), returns explicit `confidence` + `abstained` flags, and documents its own safety floor inline against `learning/research/people/LEARNING-SCIENCE-AND-AI-SAFETY.md §6` (S1-S7 non-negotiables enforced in code, not just prompted).

**Education-atlas research** (`src/content/education/`): a separate research corpus (`THE-KNOWLEDGE-ACCESS-GRADIENT.md`, `EDUCATION_PROBLEMS.md`, `REFORM_THESIS.md`, plus `foundations/01-04`, `deep/01-04`, `landscape/01-07`) backing the `/mission` and `/research/education` pages and the L0-L5 ladder's world-access percentages (L1 "K-12/secondary" = 62.4% world access, L4 "frontier" = 0.14%, L5 "producing new knowledge" = 0.06%). This is analysis/thesis content about education access, not K-12 curriculum content itself, and it explicitly disclaims scope: `about/page.tsx` states Bucket reforms "the knowledge layer" and explicitly does **not** address "schooling logistics, K-12 funding, the floor-access crisis."

**No provenance/tiering/prerequisite metadata unifies canon and Academy.** `canon_ref` on a Concept Atom is a soft pointer into `bucket-canon/`, not a shared schema; the canon's `canon_score`/`canon_tier` (bibliographic quality) and the Academy's `shell`/`mastery_signal` (pedagogical depth) are different vocabularies with no join table.

---

## 8. Governance docs

- **GOVERNANCE.md** (99 lines): nonprofit governance structure, conflict-of-interest disclosure for the founder (bucket.foundation is legally separate from AGFarms, held in founder's personal capacity pending formal nonprofit filing).
- **MANIFESTO.md** (126 lines): the "build the past / build history / bucket is the new renaissance" thesis; canon commitment stated as "foundations only, axioms, real math, laws, principles, primary derivations," explicitly excluding outcomes/commentary/transcripts.
- **HISTORY.md** (281 lines): archaeology of the 2022 Figma prototype (4-verb social network: build/discuss/discover/publish) through the 2026 pivot to the current thesis; documents the loss of the `discuss` verb and the evidence-to-theory UX pipeline.
- **nonprofit-application/**: a full 1023-EZ-style packet, 9 files (`00-BASE-INFO-MEMO`, `00-COVER-LETTER`, `01-APPLICATION`, `02-NARRATIVE`, `03-BUDGET`, `04-BOARD-AND-GOVERNANCE`, `05-CONFLICT-OF-INTEREST-POLICY`, `06-ARTICLES-OF-INCORPORATION-DRAFT`, `07-FORM-1023-EZ-WORKSHEET`, `README.md`). Filing status not verifiable from the repo alone.
- **README.md** (155 lines): standard repo overview, MIT license, `homepage: https://bucket.foundation`.
- **Licensing commitments**: MIT for code (`package.json` `"license": "MIT"`, `LICENSE` file present), CC-BY-4.0 for canon prose per multiple corpus-meta notes (e.g. biophysics corpus `license: "CC-BY-4.0 (prose) / facts not copyrightable (equations)"`), CC0-in-intent for the feed402 protocol spec (per org CLAUDE.md, not independently re-verified inside this repo's `PROTOCOL.md` license line).
- **Design constraint that most limits an education-OS pivot**: canon holds **foundations only** (axioms/laws/principles/primary derivations), not the applied, worked, scaffolded content a K-12 learner needs day to day; that gap is exactly what the separate `learning/` Academy layer was built to bridge, and it currently only reaches 7 STEM branches at adult/general-exam depth.

---

## 9. Brand and design assets

`brand/` contains **no logo/mark files**, only strategy research: `brand/README.md`, `brand/research/{01-books-frameworks-canon,02-case-studies,03-modern-strategies-2020-2026,04-videos-talks-social-podcasts,05-downstream-effects,06-frameworks-extracted,BRAND-RESEARCH,INDEX}.md`, and `brand/workshop/{FRAMEWORK.md,FRAMEWORK.pdf}`. Actual rendered brand assets live in `public/`: `bucket_logo.webp`, `bucket_logo_turq_1200x628_....png` (a social-share logo card), `first-image.png`, `craiyon_233134_....png` (an AI-generated mountain-goat mark), plus `public/brand/`, `public/textures/`, and per-page OG images generated at build time (not enumerated here). No design-token file (no `tokens.json`/`tokens.css`) was found, unlike other AGFarms ventures that use the org's Figma L5 pipeline.

---

## 10. gdrive canon mirror

`rclone lsf "gdrive:AGFarms/Nucleus/research/bucket-canon/" -R --max-depth 2` succeeded and returned a **stale, differently-shaped** snapshot versus the local repo:
```
01-mathematics/  02-physics/  03-chemistry/  04-information/
05-biophysics/   06-cosmology/  07-mind/
CANON_INDEX.md  README.md  TAXONOMY_NOTES.md  _archive/  _intake/
<branch>/CANON.md  <branch>/README.md   (each of the 7 branches)
05-biophysics/sub-01-hydrogen/  sub-02-mitochondria/  sub-03-dna/
  sub-04-bioelectrochemistry/  sub-05-biomagnetism/  sub-06-life-energy/
  sub-outcomes/
```
This mirror has only 7 branches (missing local's `08-deep-history`, `09-art`, `09-sacred-texts`, `_bridges`), a `CANON.md` file per branch not present locally, and a biophysics sub-taxonomy (`sub-01-hydrogen` etc.) that does not match the local `bucket-canon/05-biophysics/` topic folders (`becker/`, `bioelectric-lineage/`, `melanin/`, `mitochondria/`, `peptides/`, `radiosynthesis/`, `concepts/`). **The gdrive mirror and the local repo have diverged**, treat gdrive as out of date for any gap analysis; use the local repo as the source of truth.

---

## 11. TODOs / open work signals

No `bd list` access (Dolt server at `127.0.0.1:3309` does not have the `bkt` database loaded from this shell, skipped per instructions). Local bead artifacts exist as flat files instead: `.beads/` (directory), `BEAD_BACKLOG.md` (32,211 bytes), `BEADS-PENDING.jsonl` (45,778 bytes, one JSON object per line, pending bead queue). 78 `TODO`/`FIXME`/`XXX` markers found under `src/` (`grep -rn` count), one concrete example read directly: a Viatika-metering TODO left in `src/app/api/academy/tutor/route.ts`. `CHANGELOG.md` (0.2.0, "Unreleased" section empty) and `ROADMAP.md` exist at root but were not opened in full for this pass.

---

## 12. Recent git activity

Last 30 commits (current branch `feat/hypothesis-engine`) show three concurrent tracks: a **hypothesis-engine** research pipeline (Gödel addresses, timeline data structures, Bayesian truth scores, subjective-logic opinions, a LaTeX+Lean4 paper toolchain, 278 tests, all unrelated to Academy/canon), a **Quantum Atlas** book-build effort (8 chapters, 184 cards, multi-reader revision cycles), and routine **voice-lint / feed-bot** commits (`feed: 0 events (bot) [skip ci]`, `style(voice): ...` sweeps). No commit in the visible window touches the Academy/mastery/depth-ladder code directly, that work is older; `git log` for `src/lib/academy/` and `learning/` would need a path-scoped query to date it precisely (not run here to stay within scope). Branches beyond `main`/`feat/hypothesis-engine`: `data/sacred-history-ai-analysis`, `feat/polingual-live-fullindex-bkt-2ea`, `feat/polingual-vector-backbone-bkt-4zz`, `integrate-visual-merge`, none merged into `main` as of this snapshot.

---

## What is real vs aspirational

| Claim in docs | What the code does |
|---|---|
| "One knowledge graph in tiers across all subjects" (target state) | Two separate, unjoined graphs: a citation/bridge graph over 11 canon branches (`bucket-canon/`, bibliographic quality metadata, no prerequisite edges), and a prerequisite DAG over only 7 STEM branches + 1 meta deck (`learning/app/corpus/`, 487 atoms, real `requires`/derived-`unlocks` edges). No single graph spans all subjects; canon's 11 branches and Academy's 7 branches don't fully overlap (canon has `08-deep-history`, `09-art`, `09-sacred-texts` with no Academy equivalent). |
| "Frontier-backward routing from a target concept to what the learner already holds" | Not implemented as a routing feature. The Academy graph supports forward topological walk (`requires`→`unlocks`) and a derived `leverage`/reach score, but there is no query path that starts at a target concept and backward-chains to a learner's held-state frontier; `mastery.ts` only rolls up state per branch, it does not plan a path. |
| "Five learner states per node: Access, Awareness, Understanding, Internalization, Production" | Does not exist as named. Closest analogues are two different, non-matching ladders: a 4-rung per-concept quiz-depth ladder (Recall→Apply→Derive→Teach-back, `mastery.ts`) and an unrelated 6-rung per-learner site-journey ladder (L0-L5 basic-literacy→producing-new-knowledge, `depth-ladder.ts`). Neither is per-node with 5 states; no "Access" or "Awareness" state exists at all. |
| "Student workspace with constrained AI" | Partially real. `/api/academy/tutor` is a constrained, grounded, citation-validated, abstention-capable tutor scoped to one concept atom at a time (a strong pattern to reuse). There is no persistent "workspace" UI (notebook, draft space, saved work) found; the Academy's UI is a study/quiz loop (`learning/app/`), not a production workspace. |
| "Teacher view" | Does not exist. No role system, no classroom/cohort data model, no teacher-facing route or component found anywhere in the repo. |
| "Production envelope = claim + evidence + sources + transfer proof" | Does not exist as an artifact type. The closest adjacent concept is the Academy's Verifiable Credential (Open Badges 3.0), which certifies *that* a learner reached a mastery threshold on a branch, not a structured claim+evidence+transfer-proof object per concept or project. |
| "Citation payments over x402" | Designed and partially implemented server-side (feed402 envelope, `cite` block, PROTOCOL.md §4). Reader-side payment is real and live in the "zero-key" sense (server settles invisibly or falls back to canon). Author payout on downstream paid re-publication is spec'd as passive metadata only; no code path executes an actual author payout. Story Protocol minting scripts are real but default to **testnet** (Story testnet RPC, Base Sepolia EAS), not confirmed mainnet. |
| "Free to any learner" | True for the Academy's nucleus paths today: `/academy` requires no payment, `PRODUCT.md`'s free tier is "full access to the nucleus paths of every branch," and this matches the shipped code (no paywall found gating `/academy` or `/api/academy/*`). Pro/Scholar paid tiers described in `PRODUCT.md` (PDF import, exam simulator, Story Protocol minting for learners) are **roadmap only**, no billing code, no Stripe dependency, `VIATIKA_API_KEY` present but unwired (explicit TODO in the tutor route). |
| "K-12" framing | Used only as a demographic/statistical label (`depth-ladder.ts` names L1 "K-12/secondary" citing a 62.4% world-access figure from the education-atlas research). No content, quiz, or UI in the repo is calibrated to K-12 grade bands, ages, or standards; a grep for grade-level language across `learning/` and `src/content/education/` returned zero matches. The Academy's actual reading level is "zero-prior-knowledge adult" aimed at general-exam prep, per the biophysics corpus's own meta notes. |
| "Seven branches" (org CLAUDE.md) / canon taxonomy is fixed | Local repo has grown to 11 branches (`01`-`09` plus `_bridges`, and both a `09-art` and `09-sacred-texts` sharing the `09` prefix, an unreconciled numbering collision). The gdrive canon mirror lags further behind, at 7 branches with a different biophysics sub-taxonomy than local. Treat the branch count and taxonomy as actively in flux, not settled. |
