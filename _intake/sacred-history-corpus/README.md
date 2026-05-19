# Sacred-History Corpus — _intake holding area

**build the past. build history. bucket is the new renaissance.**

This is the staging area for the **Sacred-History Corpus**: an ongoing,
rights-aware index of the world's religions, sacred texts, scripture
translations, manuscript locations, the sacred/historical timeline, and the
graph of people / avatars / entities / correlations / branches across
traditions.

## What this is — and what it is NOT

This corpus is a **SIBLING corpus**, exactly like `longevity-canon` is a
sibling of `bucket-canon`. It is **NOT an eighth canon branch.**

Bucket's master canon (`gdrive:AGFarms/Nucleus/research/bucket-canon/`) holds
**only foundations** — axioms, real math, rules, laws, principles, primary
derivations — across seven branches (mathematics, physics, chemistry,
information & computation, biophysics, cosmology, mind). Religion is **not a
foundation in that sense**: sacred texts are *primary sources of human
meaning-making and history*, not derivations of physical reality. So this
corpus sits **next to** the canon, the same way longevity (an *outcome* canon)
sits next to it:

```
gdrive:AGFarms/Nucleus/research/
├── bucket-canon/            ← master canon: 7 foundation branches
├── longevity-canon/         ← sibling: outcome canon (downstream of biophysics)
└── sacred-history-corpus/   ← sibling: THIS corpus (primary-source / history)
```

> **Placement note (founder-locked 2026-05-19):** this is a **sibling
> corpus *now*, and the placement is data-driven and revisitable.** It is
> NOT a hard contract. If the data shows a portion belongs elsewhere
> (e.g. a reasoning structure that is genuinely foundations-tier), that
> sub-slice may be reclassified later via a logged decision in
> `TAXONOMY_NOTES.md`. "Sibling" is the current best fit, not a vow.

- It does **not** get a number (`08-...`) inside `bucket-canon/`.
- It **may** cross-reference the `07-mind` branch where a text bears on the
  *mind* foundation (e.g. phenomenology of contemplative states), the same
  way longevity cross-mirrors into `05-biophysics/sub-outcomes/longevity/`.
  That cross-mirror is a future, separate decision — not part of this slice.

### Why it belongs in Bucket at all

Bucket's first slogan is literally **build the past**. The original bucket 1.0
(Dec 2022 Figma) was a 4-verb social network for collaboratively building and
debating *theories of history* with evidence. A rights-aware, citeable,
provenance-tracked index of humanity's sacred record is the single largest
"build the past" dataset that exists. It is the natural primary-source spine
for the `build history` mandate, and a candidate substrate for Story Protocol
citeable-mint once the canon-wiring is built.

## gdrive target

Canon-tier, deduplicated, citeable artifacts will live at:

```
gdrive:AGFarms/Nucleus/research/sacred-history-corpus/
```

following the **Canon folder contract** (see any
`gdrive:AGFarms/Nucleus/research/<topic>-canon/README.md`):

- Only canon-tier artifacts (authoritative editions, critical apparatus,
  manuscript provenance dossiers, annotated cross-tradition indexes).
- `CANON_INDEX.md` at the root is the authoritative manifest.
- Updates are idempotent (re-running the pipeline converges, never duplicates).
- Superseded editions move to `_archive/<YYYY-MM>/`.
- No PII, no raw bulk scrapes, no draft commentary.

This `_intake/sacred-history-corpus/` directory is the **holding/working
area** — runners land work here; only reviewed, canon-tier outputs are
promoted to the gdrive canon. The pipeline → canon wiring is a queued bead
(see `BEAD-MANIFEST.md`), **not built in this slice**.

## Discipline & rights posture (HARD)

This program is explicitly **bounded, disciplined, and rights-aware**.

1. **No mass downloads.** Every runner defaults to `--dry-run` and only
   *lists* what it would fetch (counts + URLs). A human flips a runner to
   live, per source, after reviewing the rights row in `SOURCES.md`.
2. **Public-domain / open-licensed full text only.** Copyrighted modern
   translations are **metadata-only** (structure, verse counts, edition IDs,
   canonical URLs) — never full text. Rights are tracked per source in
   `SOURCES.md`; anything not clearly PD/open is flagged metadata-only.
3. **Manuscript provenance is first-class.** Where a digitised manuscript or
   shelfmark exists (Vatican, BL, e-codices, DSS, Sinaiticus), we record the
   location/provenance (Wikidata P195 collection, P276 location) even when we
   cannot mirror the images.
4. **Idempotent, resumable, recurring.** Same systemd `--user` timer pattern
   as `pursue-mirror.*`, but **recurring** (re-checks for new editions /
   manuscripts forever) rather than self-disabling.
5. **Citation-only by default.** The model mirrors what feed402 / the Kruse
   Index do: snippets + canonical URL + provenance, full text only where the
   license unambiguously permits.

## Phase 1 — LIVE for PD/open sources only (founder-locked 2026-05-19)

Founder greenlit "do what you can and must" on 2026-05-19. Phase 1 is now
**LIVE for the clean/open sources only** (see `DECISIONS.md`). The
`RIGHTS-POLICY.md` two-tier gate is the **adopted operating default** and
satisfies the P1 rights interlock **for public-domain / open sources only**.
Copyrighted / NC / unclear sources stay **metadata-only and remain gated** —
their `LIVE_GUARD` is NOT removed.

| Source | License | Phase-1 posture |
|---|---|---|
| Sefaria index | index open; per-text license read at fetch | **LIVE** — structural index only, NO text bodies |
| SuttaCentral | CC0 (Bilara/sc-data) | **LIVE** — structure (menu) only this slice; CC0 |
| Tanzil Quran | Tanzil license (verbatim Arabic, free, no-mod) | **LIVE** — metadata + verbatim Arabic editions |
| ctext.org | PD source text; ToS = no bulk, rate-limited | **LIVE** — enumerate only, ToS-respecting, no bulk |
| Wikidata SPARQL | CC0 | **LIVE** — one bounded query (LIMIT 500) |

This is the **proof run** — bounded and idempotent, not a full historical
backfill. Everything else in `SOURCES.md` is **inventoried, gated, NOT
wired** (copyrighted = metadata-only, guards retained).

## Files in this directory

- `README.md` — this file
- `SOURCES.md` — full rights-aware source inventory (all traditions)
- `runners/` — idempotent dry-run-default runners + systemd unit templates
- `BEAD-MANIFEST.md` — ready-to-file `bkt-` epic + child beads
  (bkt instance API is currently 404 — manifest is staged, NOT filed;
  see its "FILE WHEN API RETURNS" section for file-order)
- `DECISIONS.md` — founder-locked decisions log (2026-05-19): corpus
  naming, RIGHTS-POLICY adoption, two-tier gate, Phase-1 go-live,
  recurring timer, local-compute model
- `spec/` — strategy/spec layer (TAXONOMY, RIGHTS-POLICY, ENTITY-MODEL,
  TIMELINE-MODEL, AI-BRANCH-ANALYSIS, OPEN-DECISIONS)
