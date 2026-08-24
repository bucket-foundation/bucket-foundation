# Canon ↔ Web Wiring Audit

**Generated 2026-05-14.** gap analysis between what canon content exists in this repo and on `agf-supabase-db`, vs what's queryable at `bucket.foundation` and `polingual.com`.

**Short answer:** the web is *partially* wired. Branches, claim cards, and bridges work. Figures, evidence linking, and per-photon retrieval do not. The photon database (`polingual.photons` on `agf-supabase-db`) currently holds only `kind=word` photons, zero claims, zero figures, zero evidence, zero quotes.

---

## Gap matrix

| Asset | Exists locally / on disk | bucket.foundation status | polingual.photons (DB) |
|---|---|---|---|
| **Branches** (10 dirs) | ✅ `bucket-canon/01-mathematics` … `bucket-canon/10-earth` | ✅ `/canon` and `/canon/<slug>` (10 routes, 200) | ❌ |
| **Claim cards** (599) | ✅ `bucket-canon/<branch>/sub-claims/<concept>/<slug>.md`, all 599 with provenance + excerpts | ⚠️ `/canon/claims/<concept>/<slug>` works for the 599 already promoted (200); branch detail pages do not list per-branch claims | ❌ |
| **Concepts** (per-branch sub-folders) | ✅ `01-mathematics/sub-claims/{chaos-theory, godel, …}` | ⚠️ `/canon/claims/<concept>` listing works but is not linked from the branch page | ❌ |
| **Figures** (99 canonical) | ✅ `canon-figures/figures.json` (12 math + 11 physics + 6 chem + 8 info + 19 biophysics + 8 cosmology + 7 mind + 11 tradition + 10 art + 10 earth = 99) | ❌ **98 of 99 figures 404.** `src/lib/canon.ts` `BRANCHES[].figures` is hand-curated and only contains Einstein. `figures.json` is not read by the web. | ❌ |
| **Figure bios** | ✅ `canon-figures/bios/*.md` | ❌ Not surfaced | ❌ |
| **Evidence per claim** (599 sets, each with K nearest-evidence chunks) | ✅ `_intake/embeddings/claim-evidence.jsonl` (599 lines, ~5.5 MB) | ✅ `/canon/claims/<concept>/<slug>` reads `getEvidenceFor(...)` and renders the evidence list inline | ❌ |
| **Bridges** (cross-branch primitives) | ✅ `bucket-canon/_bridges/detected-v2/` (13 detected) + `_intake/embeddings/bridge-judgments.jsonl` (102) | ✅ `/canon/bridges` (200, renders by axis: sound, time, light, information, energy, water, quantum…) | ❌ |
| **Knowledge graph** (full canon graph) | ✅ `_intake/training/kg.{gpickle,nodes.jsonl,embeddings.npy,stats.json}` + multi-branch-graph.v2.json | ⚠️ `/canon/graph` exists (200), verify it renders the kg or just a placeholder | ❌ |
| **Claim embeddings** (599 × 768-d nomic) | ✅ `_intake/embeddings/claims-vectors.f32.bin` + `claims-meta.sqlite` | ⚠️ `/canon/search` works (200), uses brute-force cosine on the 599 vectors at server start | ❌ |
| **Quotes / excerpts** | ✅ Each claim card has `## Excerpt` block with the verbatim quote + timestamp + source URL | ✅ Rendered on `/canon/claims/<concept>/<slug>` | ❌ |
| **Words** | - | - | ✅ **6 564 942** photons across 35 languages |

---

## Where the wiring is broken

### 1. `BRANCHES[].figures` is hand-curated and stale

In `src/lib/canon.ts`:

```ts
{ num: "01", slug: "mathematics",   …, figures: [] },               // empty!
{ num: "02", slug: "physics",       …, figures: [{ slug: "einstein", … }] }, // 1 of 11
{ num: "03", slug: "chemistry",     …, figures: [] },
{ num: "04", slug: "information",   …, figures: [] },
{ num: "05", slug: "biophysics",    …, figures: [] },
{ num: "06", slug: "cosmology",     …, figures: [] },
{ num: "07", slug: "mind",          …, figures: [] },
{ num: "08", slug: "deep-history",  …, figures: [] },
// 09 art and 09 sacred-texts also empty
```

`generateStaticParams()` in `src/app/canon/[slug]/figures/[figure]/page.tsx` only generates pages
for the figures in `BRANCHES`, so 98 of 99 routes return 404.

**Fix**: import `canon-figures/figures.json` at build time and populate `BRANCHES[].figures` from it.
One file change. Same render pipeline. Every figure page works.

### 2. Branch detail pages don't list per-branch claims

`/canon/mathematics` is 200 but its body has no link to the 35 mathematics claims that exist
under `bucket-canon/01-mathematics/sub-claims/<concept>/<slug>.md`. The only path to a claim is via
`/canon/claims` (concept index) or the search box.

**Fix**: read `bucket-canon/<num>-<slug>/sub-claims/**` at build time and add a "claims (N)" section
to each branch page, grouped by concept.

### 3. The photon database has no canon content at all

`polingual.photons` is 6.5 M `kind=word`. Per `PHOTON-SPEC.md` we have 13 valid kinds, `word, phrase,
Sentence, claim, evidence, hypothesis, axiom, bridge, figure, site, object, manuscript, concept`,
And only the first is in the DB. The 599 curated claims, 99 figures, ~600 evidence sets, 13 bridges,
And the knowledge graph all live in repo files or sqlite.

This means:

- The PostgREST API at `https://db.agfarms.dev/rest/v1/photons` cannot serve a claim or a figure.
- Polingual cannot show claims or figures.
- External merchants (feed402) cannot pay-for-once-and-cite a claim photon.
- Search across word + claim + figure in a single query is impossible.

**Fix**: ingest all canon content into `polingual.photons` as the appropriate kind. Then bucket.foundation
Can go on using the repo as its CMS for editing, but every page can *also* read the same photon from
the database. The repo becomes the write path, the photon DB becomes the read path.

### 4. No live wiring between disk and web

Today bucket.foundation reads `bucket-canon/` at **build time** (`export const dynamic = "force-static"`
On every canon page). Adding a new claim file requires a Vercel rebuild before it shows up. The same
data isn't queryable via any API, the only programmatic access is the github tarball.

**Fix**: once canon content is in `polingual.photons`, every canon page can be dynamic again, the
Write path stays repo-based (with a CI job that diff-loads new files into the DB on every commit),
And the read path stops needing a rebuild.

### 5. Polingual.com doesn't know canon exists

A user on polingual.com searching for "light" gets 6.5 M word photons across 35 languages. They never
see the 30+ canon claims about light in `bucket-canon/02-physics/sub-claims/...` and `05-biophysics`.
Once claims are photons, they show up in the same search ranked by tier, canon-tier claims always
rank above functional-tier words for the same surface.

---

## Inventory: what's already built that just needs to be ingested

```
bucket-canon/
├── 01-mathematics/sub-claims/           35 markdown claim cards
├── 02-physics/sub-claims/               136
├── 03-chemistry/sub-claims/              13
├── 04-information/sub-claims/             9
├── 05-biophysics/sub-claims/            198
├── 06-cosmology/sub-claims/              52
├── 07-mind/sub-claims/                  105
├── 08-deep-history/sub-claims/           42
├── 09-art/sub-claims/                     0
├── 09-sacred-texts/sub-claims/            9
└── _bridges/detected-v2/                 13 cross-branch primitives
                                          ─────
                                          599 claim files + 13 bridge files

canon-figures/
├── figures.json                          99 canonical figures across 10 branches
└── bios/                                 per-figure bio markdowns

_intake/embeddings/
├── claims-meta.sqlite                    599 claims metadata
├── claims-vectors.f32.bin                599 × 768-d nomic-embed-text vectors (1.8 MB)
├── claim-evidence.jsonl                  599 evidence sets (top-K per claim)
├── bridge-judgments.jsonl                102 bridge judgments
├── multi-branch-graph.v2.json            full canon graph
└── corpus/                               source corpus per claim

_intake/training/
├── kg.gpickle                            networkx full canon graph
├── kg-nodes.jsonl                        node metadata
├── kg-embeddings.npy                     node2vec embeddings
└── tier-predictions.jsonl                tier label per claim
```

Total local canon: **599 claims + 99 figures + 13 bridges + 600 evidence sets**, and zero of it
Is in the photon database.

---

## What "fully wired" looks like

When done, every one of these queries returns coherent results from the same `polingual.photons` table:

```bash
# search any surface across words AND claims AND figures
curl 'https://db.agfarms.dev/rest/v1/photons?surface=ilike.%godel%&apikey=...' \
  -H 'Accept-Profile: polingual'
# → en:godel word, claim:godels-incompleteness-theorem, figure:kurt-godel, …

# all claims for a branch
curl 'https://db.agfarms.dev/rest/v1/photons?kind=eq.claim&branch=cs.{02-physics}&apikey=...' \
  -H 'Accept-Profile: polingual'
# → 136 physics claims

# all figures for a branch
curl 'https://db.agfarms.dev/rest/v1/photons?kind=eq.figure&branch=cs.{05-biophysics}&apikey=...' \
  -H 'Accept-Profile: polingual'
# → 19 biophysics figures

# evidence for a claim (via photon_edges)
curl 'https://db.agfarms.dev/rest/v1/photon_edges?src_id=eq.photon:claim:godel:001&predicate=eq.cites'
# → list of evidence photons (transcripts, articles, papers)

# every photon ever cited by every claim about a figure (graph traversal)
# → photon_edges joined on photons twice
```

And every page on bucket.foundation reads from the same table the API serves, instead of from
filesystem at build time.

---

## Action items

The new beads added to the roadmap to close these gaps:

| Bead | Effort | Priority |
|---|---|---|
| Wire `figures.json` into `BRANCHES[].figures` (98 figures fixed) | 0.5 d | **P0** |
| Branch page: list per-branch claims (grouped by concept) | 0.5 d | P1 |
| Ingest 99 figures into `polingual.photons` as `kind=figure` | 0.5 d | P1 |
| Ingest 599 claims into `polingual.photons` as `kind=claim` | 1 d | P1 |
| Ingest 599 evidence sets as `kind=evidence` + `photon_edges` rows (predicate=cites) | 1 d | P1 |
| Ingest 13 detected bridges as `kind=bridge` + `photon_edges` (predicate=bridges_to) | 0.5 d | P1 |
| Branch + claim + figure pages: read from `polingual.photons` (not filesystem) | 1 d | P2 |
| CI job: on every commit, diff-load new canon content into the DB | 0.5 d | P2 |
| Polingual search ranks canon photons above functional words | 0.5 d | P2 |

Total: **5.5 dev-days to fully tie the web to the canon and the canon to the photon graph.**

The biggest single win: **photon DB becomes the universal substrate**, so claims/figures/evidence/words all live in one place, queryable by the same API, citeable by the same id format, payable via the same x402 envelope. That's the renaissance index from the manifesto.
