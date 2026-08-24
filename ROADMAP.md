# Polingual + Photon Graph, Roadmap

> Forward plan, bead-shaped. Each item is sized and prioritised; the corresponding ready-to-POST
> payload lives in `BEADS-PENDING.jsonl` and can be dispatched as a real `bkt-` bead the moment the
> `bucket-foundation` Nucleus instance's `/issues` route is restored. Until then, the plan here is
> authoritative.

**State as of 2026-05-14 (post-bulk-3 load):**

| Metric | Value |
|---|---|
| Total photons | **6 564 942** across 35 languages |
| Largest langs | en 1.2 M · la 825 K · es 755 K · it 574 K · ru 423 K · pt 400 K · fr 378 K · de 334 K · sv 298 K · fi 237 K |
| API | `https://db.agfarms.dev/rest/v1/photons` (PostgREST, `Accept-Profile: polingual`) |
| Frontend | `https://www.polingual.com` (Next.js 15 on Vercel; 4-tier search with pg_trgm) |
| Search latency | 20-120 ms on 6.5 M corpus (after `pg_trgm` GIN indexes on `surface` + `lower(surface)`) |
| Last refresh | 2026-05-12 (kaikki Wiktionary dumps) |
| Repo | `gianyrox/bucket-foundation` (this) |
| Tools | `~/agfarms/tools/canon/photon-kaikki-bulk3.py`, `~/agfarms/tools/canon/load-photons-server-side.sh` |

Predicates currently in the photon graph: only the trivial set (`relations: []` on every photon today,
Nothing's connected yet). Everything below is about turning the bag of photons into a graph and a
working renaissance index.

---

## P0, Blocker

### bkt-roadmap-01 · Restore `bkt-` bead-filing path

The instance's `/issues` route is returning 404 (`text/plain` body, server-side Go origin rather than nginx
auth). All `bd-remote create` calls fail. Org-level fallback also rejects the local creds.

Required for everything else to file beads at all.

- Diagnose why the nucleus pod in `inst-bucket-foundation` namespace dropped the `/issues` handler.
- Either restore the route or update `.beads/remote.json` + `CLAUDE.md` to point at a working dispatch path.
- Document the resolution.

**Effort:** 30 min · **Owner:** engineering · **Depends on:**,

---

## P1, Translation graph

The photon corpus is currently a *bag*, every photon has `relations: []`. The single biggest lever
move is connecting them. Wiktionary's `translations:` arrays on English entries already encode the
graph; we just need to walk them.

### bkt-roadmap-02 · Extract Wiktionary `translations:` arrays into photon edges

Re-parse the cached `English.jsonl` (and Latin.jsonl, French.jsonl, etc., many languages carry
translation arrays). Map each entry's `translations: [{lang, word, sense, code}]` list to
`relations: [{predicate: "translates", to: "photon:word:<lang>:<surface>"}]` on the source photon.
Symmetric: also add the reverse edge on the target photon if it exists.

- Update `photon-kaikki-bulk3.py` (or a sibling `photon-edges.py`) to read translations.
- Emit edges as a separate CSV (`edges.csv`) with `(src_id, predicate, dst_id, payload jsonb)`.
- New table: `polingual.photon_edges (src_id, predicate, dst_id, payload, PK(src_id, predicate, dst_id))`.
- GIN index on `src_id` and `dst_id` for fast traversal.

**Effort:** 1 day · **Owner:** engineering · **Depends on:** bkt-roadmap-01

### bkt-roadmap-03 · `GET /api/photon/<id>/translations`

Polingual API endpoint that returns all `translates` edges for a photon, grouped by target language.
Powers the word-detail page's "translations across N languages" section.

- Update `polingual/src/lib/photon-db.ts` with `getTranslations(id)`.
- Add `polingual/src/app/api/photon/[id]/translations/route.ts`.
- Cache 5 min (edges change rarely).

**Effort:** 0.5 day · **Owner:** engineering · **Depends on:** bkt-roadmap-02

### bkt-roadmap-04 · Word-detail UI: translations panel

On `/word/<id>`, show a collapsible panel "translates to (N languages)" with one row per target language.
Click-through to the destination photon.

**Effort:** 0.5 day · **Owner:** engineering · **Depends on:** bkt-roadmap-03

### bkt-roadmap-05 · Dedicated `polingual.translations` denormalised view

For fast lookup `from=en&to=la&q=love` queries, build a materialised view:
`(src_lang, src_surface, dst_lang, dst_surface, src_id, dst_id, gloss, source)`.
b-tree index on `(src_lang, dst_lang, lower(src_surface))`.

**Effort:** 0.5 day · **Owner:** engineering · **Depends on:** bkt-roadmap-02

### bkt-roadmap-06 · `GET /api/translate?from=en&to=la&q=love`

The dedicated translate endpoint. Returns target-lang surface forms + gloss + source-of-truth.
Powers the future `/translate` page.

**Effort:** 0.5 day · **Owner:** engineering · **Depends on:** bkt-roadmap-05

---

## P1, Semantic embeddings

Matching today is on surface form. Adding `bge-small-en-v1.5` (384-d) embeddings of `meaning_en`
lets us find semantically similar photons even when surface forms differ wildly across languages.

### bkt-roadmap-07 · Install `pgvector` on `agf-supabase-db`

```sql
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE polingual.photons ADD COLUMN semantic_vec vector(384);
```

**Effort:** 15 min · **Owner:** engineering · **Depends on:**,

### bkt-roadmap-08 · Embed 6.5 M photons with `bge-small-en-v1.5`

- Run on a GPU machine (local box has CUDA; server's CPU would take 12+ hours).
- Batch size 256, expect ~1-2 hours wall time on a single 4090-class GPU.
- Stream results to `embeddings.csv` (id, semantic_vec).
- `UPDATE polingual.photons SET semantic_vec = ... FROM staging`.
- HNSW index: `CREATE INDEX idx_photons_semantic_vec ON polingual.photons USING hnsw (semantic_vec vector_cosine_ops)`.

**Effort:** 1 day · **Owner:** data + engineering · **Depends on:** bkt-roadmap-07

### bkt-roadmap-09 · `GET /api/photon/search?semantic=...`

New search mode: embed the query string with the same model client-side or server-side, then
`ORDER BY semantic_vec <=> $1 LIMIT k`. Returns nearest neighbours across all languages.

- Server-side embedding via a small Python sidecar (FastAPI on the agfarms box, port 8200).
- Update `polingual/src/lib/photon-db.ts` with `semanticSearch(q)`.
- UI toggle: "match" (current) vs "meaning" (semantic).

**Effort:** 1 day · **Owner:** engineering · **Depends on:** bkt-roadmap-08

---

## P2, Phonetic embeddings

The IPA column is populated for English, Latin, Ancient Greek and others (~1 M photons). Char-level
encoding of IPA strings to a fixed 64-d vector enables homophone clustering across languages
(*amour* / *amor* / *Amor* / *love*, different IPA from each other but each clusters with its
Own cognates).

### bkt-roadmap-10 · IPA char encoder + 64-d phonetic vectors

- Build an IPA char vocabulary from the existing 1 M IPA strings.
- Train a 1-layer phonetic autoencoder (or use a fixed bag-of-trigrams hash).
- Compute `phonetic_vec vector(64)` for every photon that has IPA.
- HNSW index.

**Effort:** 1 day · **Owner:** data · **Depends on:** bkt-roadmap-07

### bkt-roadmap-11 · `GET /api/photon/search?phonetic=...`

Find rhyming/sound-alike photons.

**Effort:** 0.5 day · **Owner:** engineering · **Depends on:** bkt-roadmap-10

---

## P1, Sentence-level photons

`PHOTON-SPEC.md` envisions 13 kinds: word, phrase, sentence, claim, evidence, hypothesis, axiom,
Bridge, figure, site, object, manuscript, concept. We have one (word). Next is **claim**, because
That's what opens up the bucket-canon → photon-graph pipeline.

### bkt-roadmap-12 · Claim photon ingest format spec

Settle the JSON shape for a claim photon:
- `kind: "claim"`, `surface: "the claim sentence"`, `meaning_en: <surface>` (or canonical paraphrase).
- New columns / payload fields: `cites: [photon-ids]`, `supports: [photon-ids]`, `refutes: [photon-ids]`.
- Branch tags from canon-bucket taxonomy.
- Provenance: source URL, paragraph offset, page, retrieval timestamp.

**Effort:** 0.5 day · **Owner:** product + engineering · **Depends on:**,

### bkt-roadmap-13 · `POST /api/photon/ingest`

Accept a single photon or NDJSON stream. Validate against `PHOTON-SPEC`. Write to staging
table → idempotent insert.

**Effort:** 1 day · **Owner:** engineering · **Depends on:** bkt-roadmap-12

### bkt-roadmap-14 · First claim ingest: 1 000 from bucket-canon

Hand-pick 1 000 canon-tier claims from the bucket-canon gdrive (mathematics + physics first).
Annotate with `cites` edges to source photons or external URLs.

**Effort:** 1 day · **Owner:** product (curation) · **Depends on:** bkt-roadmap-13

### bkt-roadmap-15 · Claim-detail page on polingual.com

Different layout from the word page: claim text → cites/supports/refutes graph → branch tags.

**Effort:** 1 day · **Owner:** engineering · **Depends on:** bkt-roadmap-14

---

## P2
Search ranking + relevance.

Current scoring (`exact > prefix > contains > FTS`) doesn't account for tier, branch, or frequency.
Add a real weighted score.

### bkt-roadmap-16 · Zipf-frequency column

Compute per-language Zipf rank for every surface form from a real frequency corpus
(OpenSubtitles, Wikipedia frequency, etc.). Add `frequency real` column. Higher frequency = higher rank
Weight.

**Effort:** 1 day · **Owner:** data · **Depends on:**,

### bkt-roadmap-17 · Weighted relevance score

Replace the boolean tier scoring in `lib/photon-db.ts` with `score = match_kind_weight × tier_weight × log(frequency)`.

**Effort:** 0.5 day · **Owner:** engineering · **Depends on:** bkt-roadmap-16

---

## P2, Autonomous refresh

Kaikki ships new dumps every ~2 weeks. Schedule a refresh.

### bkt-roadmap-18 · systemd timer for weekly kaikki refresh

- `/etc/systemd/system/polingual-refresh.{service,timer}` on `prod-hetzner-1`.
- Runs `photon-kaikki-bulk3.py` (download new, parse, load).
- Idempotent, INSERT ON CONFLICT DO NOTHING handles dupes.

**Effort:** 0.5 day · **Owner:** engineering · **Depends on:**,

### bkt-roadmap-19 · Refresh diff alerting

After each run, compute delta vs prior total. If `|new − prior| / prior > 5%`, post a Discord/Telegram alert.

**Effort:** 0.5 day · **Owner:** engineering · **Depends on:** bkt-roadmap-18

---

## P2
Polingual UI polish.

### bkt-roadmap-20 · Language picker

With 35 languages, results are noisy. Let users pin 3-5 favorites (cookie-stored). Search defaults to filter+rank by pinned.

**Effort:** 0.5 day · **Owner:** engineering · **Depends on:**,

### bkt-roadmap-21 · OG images for `/word/<id>`

Auto-generate per-word OG cards (surface + IPA + first definition + language flag). `next/og` route.

**Effort:** 0.5 day · **Owner:** engineering · **Depends on:**,

### bkt-roadmap-22 · `/translate` page

Dedicated UI for the `/api/translate` endpoint. From-lang/to-lang dropdowns, query box, results.

**Effort:** 0.5 day · **Owner:** engineering · **Depends on:** bkt-roadmap-06

### bkt-roadmap-23 · Etymology view

When etymology edges exist (future ingest from Wiktionary's `etymology_text`), show as a tree on
word detail page.

**Effort:** 1 day · **Owner:** engineering · **Depends on:** bkt-roadmap-02 (need edge infra)

---

## P3
Documentation + DevX.

### bkt-roadmap-24 · `INGEST.md`
How to add a new source.

End-to-end runbook: kaikki, wordnet, custom JSONL, x402 paid feeds.

**Effort:** 0.5 day · **Owner:** docs · **Depends on:** bkt-roadmap-13

### bkt-roadmap-25 · OpenAPI spec for `/api/photon/*`

Generate from the route handlers + PostgREST introspection. Serve at `/api/openapi.json`.

**Effort:** 0.5 day · **Owner:** engineering · **Depends on:**,

### bkt-roadmap-26 · `PHOTON-SPEC.md` versioning

Tag the current spec as `v0.2` (edges, embeddings, and multiple kinds are all in).
Add a changelog. Define backward-compat rules for additive fields.

**Effort:** 0.5 day · **Owner:** product · **Depends on:** bkt-roadmap-12

---

## P3, Monetisation

### bkt-roadmap-27 · Wire polingual API to feed402 / x402-research-gateway

Per Bucket Foundation's PROTOCOL.md, three tiers: raw / query / insight at $0.010 / $0.005 / $0.002.
Photon API is a candidate first AGFarms-internal merchant on feed402.

**Effort:** 2 days · **Owner:** engineering · **Depends on:** bkt-roadmap-13, bkt-roadmap-25

### bkt-roadmap-28 · Per-photon citation format

`GET /api/photon/<id>/cite?format=bibtex|csl-json|jsonld`, produces a paid-for-once citation that
survives Wiktionary revisions (we mint a stable id + content hash).

**Effort:** 1 day · **Owner:** engineering · **Depends on:** bkt-roadmap-13

---

## Summary by effort

| Bucket | Effort | Beads |
|---|---|---|
| P0 blocker | 0.5 d | 1 |
| P1 translation graph | 3 d | 5 |
| P1 semantic embeddings | 2.25 d | 3 |
| P1 sentence/claim photons | 3.5 d | 4 |
| P2 phonetic embeddings | 1.5 d | 2 |
| P2 ranking | 1.5 d | 2 |
| P2 refresh | 1 d | 2 |
| P2 UI polish | 2.5 d | 4 |
| P3 docs | 1.5 d | 3 |
| P3 monetisation | 3 d | 2 |
| **Total** | **~20 dev-days** | **28 beads** |

The first three P1 epics (translation graph + semantic embeddings + first claim ingest) are the
Real renaissance win. After those three, polingual becomes more than a fast Wiktionary mirror:
It becomes a queryable graph of word/meaning/claim photons across 35 languages, exactly the
photon-substrate Bucket Foundation's MANIFESTO.md envisions.

**Next action when you're ready:** unblock `bkt-roadmap-01` (instance `/issues` route), then file all 28 as real `bkt-` beads from `BEADS-PENDING.jsonl`.
