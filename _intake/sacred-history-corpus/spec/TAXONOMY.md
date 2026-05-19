# Sacred-History Corpus — Taxonomy & Placement

> **build the past. build history. bucket is the new renaissance.**
>
> Spec layer only. This document proposes *where* the sacred-history
> corpus sits relative to the existing 7-branch foundations canon, and
> *how* it is internally structured. It does not ingest anything, render
> anything, or commit anything to the master taxonomy. The master
> taxonomy is **ABSORPTION STAGE — working draft, not contract**
> (`bucket-canon/TAXONOMY_NOTES.md`); nothing here amends it.

Status: **FOUNDER-LOCKED 2026-05-19** (D1 SIBLING + D1a `-corpus`
decided; see `DECISIONS.md`). **Placement is data-driven and
revisitable — "sibling" is the current best fit, not a hard contract.**
A sub-slice may be reclassified later via a logged decision in
`TAXONOMY_NOTES.md` if the data shows it belongs elsewhere.
Date: 2026-05-19. Pillar: Product. Coordinated with the Data pillar
`BEAD-MANIFEST.md` (expected at
`_intake/sacred-history-corpus/BEAD-MANIFEST.md`; bead infra `bkt-`
instance is 404 as of 2026-05-19 — do not file beads, reference the
manifest).

---

## 1. The recommendation in one sentence

**The sacred-history corpus is a SIBLING corpus to the foundations
canon — exactly the relationship `longevity-canon` has to
`bucket-canon` — NOT an 8th canon branch.**

Proposed canonical location:

```
gdrive:AGFarms/Nucleus/research/sacred-history-corpus/
```

a peer of:

```
gdrive:AGFarms/Nucleus/research/bucket-canon/          ← foundations canon (7 branches)
gdrive:AGFarms/Nucleus/research/longevity-canon/       ← outcome corpus (sibling)
gdrive:AGFarms/Nucleus/research/sacred-history-corpus/  ← THIS (sibling, proposed)
```

## 2. Why a sibling, not an 8th branch

The canon contract (`MANIFESTO.md` §3–4, `PROTOCOL.md`) is explicit and
narrow. Canon holds **only foundations**: *axioms, real math, rules,
laws, principles, primary derivations*. Seven branches: mathematics,
physics, chemistry, information & computation, biophysics, cosmology,
mind. The discipline is "when in doubt, leave it out."

A corpus of *all religions, all sacred texts, all bible translations,
manuscript provenance, the sacred timeline, and cross-tradition
correlations* fails the canon test on every axis:

| Canon test | Sacred-history corpus | Verdict |
|---|---|---|
| Is the unit an axiom / primary derivation? | No. The unit is a text, a witness, a translation, a figure, a contested correlation. | ✗ not canon |
| Re-derivable if lost? | No. Scripture and manuscript provenance are *historical particulars*, not re-derivable truths. | ✗ not canon |
| Truth-evaluable by the canon filter? | No — and explicitly must not be. `canon-figures/08-tradition.md` already states the branch is *descriptive, not evaluative*: "Inclusion is not endorsement of a tradition's truth claims." | ✗ not canon |
| Small on purpose? | No. The corpus is intentionally *exhaustive* (all traditions, all witnesses). Exhaustiveness is the opposite of the canon discipline. | ✗ not canon |

It also passes the *sibling-corpus* test cleanly, the same way
longevity does:

- **It is an application-of / record-of layer, not a foundations
  layer.** Longevity is an *outcome* downstream of biophysics.
  Sacred-history is a *historical record* downstream of nothing — it
  is the raw human record of tradition, the thing `08-tradition`
  *figures* contributed *to*.
- **It has its own rights regime** (scripture copyright; see
  `RIGHTS-POLICY.md`) that the foundations canon does not need.
- **It cross-mirrors into the canon at the seam, never merges.**
  Just as a longevity paper that *also cites a canon biophysics axiom*
  gets cross-mirrored into `bucket-canon/05-biophysics/sub-outcomes/`,
  a sacred-history artifact that documents a **foundational reasoning
  structure** already recognized in `canon-figures/08-tradition.md`
  (negative theology, scholastic synthesis, dialectical theology) gets
  cross-referenced — *the figure/structure stays in 08-tradition; the
  textual/manuscript/correlation record stays in the sibling corpus*.

### The bucket 1.0 lineage argument (load-bearing)

`HISTORY.md` records that bucket 1.0 (Dec 2022) was literally a network
for **building and debating "theories of history WITH EVIDENCE"** —
its example placeholder content was *"The Pyramids exist"* and *"let's
make history a discussion."* The 2026 canon narrowed "theory" →
"axiom" and deleted discussion. **The sacred-history corpus is the
single closest living descendant of the 2022 thesis** — it is "build
the past / build history" applied to the most-contested historical
record humans have. It therefore belongs *near* bucket, honors the
original slogan, and is *deliberately kept out of the canon* — the
same boundary the 2022→2026 transition drew. Sibling placement
encodes that history correctly; an 8th branch would re-import the
exact category error the 2026 narrowing fixed.

## 3. The seam to the canon (the only contact point)

The corpus touches the canon at **exactly one controlled seam**, never
by merge:

```
sacred-history-corpus/                  bucket-canon/
  figures/<id>            ──(xref)──▶     07-mind/      (philosophy of religion qua mind)
  structures/<id>         ──(xref)──▶     08-tradition  (foundational reasoning structures: via negativa, scholastic method)
  (everything else)       ──(no seam)──   stays in the sibling corpus
```

Rule: **a figure or reasoning structure may be canon (in
`08-tradition` / `07-mind`); the texts they wrote, the manuscripts that
transmit them, the translations, the timeline, and every
cross-tradition correlation are NEVER canon — they live only in the
sibling corpus and are cited, contested, and provenance-tracked there.**

## 4. Proposed internal structure

Drill order: **tradition → text → witness/manuscript → translation →
claim.** Five depth levels plus three cross-cutting graphs (figures,
timeline, correlations) that span traditions.

```
sacred-history-corpus/
├── README.md                  ← folder contract (mirrors canon README pattern)
├── CORPUS_INDEX.md            ← authoritative manifest; not in index = not in corpus
├── TAXONOMY_NOTES.md          ← open questions + rename log (ABSORPTION STAGE)
├── _intake/                   ← holding area, tradition undecided
│
├── traditions/
│   └── <tradition-id>/                       e.g. judaism, christianity, islam,
│       │                                     hinduism, buddhism, sikhism, jainism,
│       │                                     zoroastrianism, daoism, bahai, ...
│       ├── tradition.json                    ← tradition node (see ENTITY-MODEL)
│       ├── branches/                         ← lineage/schism tree (claim-backed)
│       │   └── <branch-id>.json              e.g. sunni, shia, theravada, mahayana,
│       │                                     catholic, orthodox, protestant-lutheran
│       └── texts/
│           └── <text-id>/                    e.g. tanakh, quran, rigveda, pali-canon
│               ├── text.json                 ← work-level node (FRBR "work")
│               ├── witnesses/                ← manuscript / recension provenance
│               │   └── <witness-id>.json     e.g. codex-sinaiticus, dead-sea-1QIsa-a,
│               │                             aleppo-codex, sanaa-palimpsest
│               ├── translations/
│               │   └── <translation-id>.json e.g. kjv, lxx-rahlfs, vulgate, niv,
│               │                             esv, sahih-international, ...
│               │                             (full-text gate: see RIGHTS-POLICY)
│               └── claims/
│                   └── <claim-id>.json       ← textual claims / variant readings
│                                              (claim-with-evidence; ENTITY-MODEL)
│
├── figures/                   ← cross-tradition figure graph (prophets, founders,
│   └── <figure-id>.json         avatars, reformers); xref → canon-figures/08
│
├── entities/                  ← deities, councils, sects, orders, schools
│   └── <entity-id>.json
│
├── timeline/                  ← the sacred timeline (data only; TIMELINE-MODEL)
│   └── events/<event-id>.json
│
└── correlations/              ← cross-tradition correlations (AI + human)
    └── <correlation-id>.json    EVERY entry is a claim-with-evidence
                                  (ENTITY-MODEL §correlation; AI-BRANCH-ANALYSIS)
```

### Level definitions

| Level | Node | FRBR/Wikidata analogue | Notes |
|---|---|---|---|
| 1. **Tradition** | `traditions/<id>/tradition.json` | Wikidata "religion" (Q9174) | The top container. Tradition itself is *not* a claim; its boundary/definition *is* contestable and carries `disputed`. |
| 2. **Text** | `texts/<id>/text.json` | FRBR *Work* | The abstract work ("the Quran", "the Gospel of Mark"), independent of any manuscript or translation. |
| 3. **Witness / manuscript** | `witnesses/<id>.json` | FRBR *Item* + provenance | A physical or recensional witness (codex, scroll, papyrus, critical-edition base text). Provenance is itself claim-backed. |
| 4. **Translation** | `translations/<id>.json` | FRBR *Expression* | A specific rendering. **Rights-gated** — full text only for PD/open editions; copyrighted = citation+locator only (`RIGHTS-POLICY.md`). |
| 5. **Claim** | `claims/<id>.json` | — (bucket-native) | Any contestable assertion *about* the above: a variant reading, a dating, an authorship attribution, a translation-meaning dispute. Modeled as claim-with-evidence-and-provenance (`ENTITY-MODEL.md`). |

The three cross-cutting graphs (`figures/`, `timeline/`,
`correlations/`) span traditions and are joined to levels 1–5 by id
reference, never by containment.

## 5. Open questions (tracked in TAXONOMY_NOTES.md when corpus is seeded)

- **OQ-1.** Tradition granularity: is "Christianity" one tradition with
  a `branches/` tree, or are Catholic/Orthodox/Protestant top-level
  traditions? *Recommendation:* one tradition + branch tree, because
  schism relationships are themselves contestable claims best modeled
  inside one tradition node (see `ENTITY-MODEL.md` lineage).
- **OQ-2.** Where do non-scriptural-but-load-bearing texts go
  (Talmud, Hadith collections, Church Fathers, Puranas, sutras)?
  *Recommendation:* same `texts/` level with a `text_class` field
  (`scripture` | `commentary` | `liturgical` | `legal` | `narrative`).
- **OQ-3.** Syncretic / new religious movements / folk traditions —
  in scope for v1 or `_intake/` only? *Recommendation:* `_intake/`
  until the tradition-boundary claim has at least one scholarly
  citation; nothing enters `traditions/` uncited.
- **OQ-4.** Does the seam to `canon-figures/08-tradition.md` flow
  *both* ways (corpus → canon xref AND canon → corpus backlink)?
  *Recommendation:* yes, bidirectional id reference, but the canon
  side stays authoritative for *figures*; corpus stays authoritative
  for *texts/witnesses/translations/correlations*.
- **OQ-5.** Naming: `sacred-history-corpus` vs `tradition-corpus` vs
  `scripture-corpus`. *Recommendation:* keep `sacred-history-corpus`
  — it honors "build the past / build history" and scopes wider than
  scripture alone (covers timeline + figures + correlations).
- **OQ-6.** Folder word — **RESOLVED 2026-05-19 → `sacred-history-corpus`**
  (founder-locked, `OPEN-DECISIONS.md` D1a / `DECISIONS.md`). All path
  references across README/SOURCES/runner/manifest/spec renamed to
  `-corpus`. The word "canon" stays reserved for foundations-tier
  (`MANIFESTO.md §3-4`); the Data pillar `BEAD-MANIFEST.md` no longer
  targets `-canon`.

## 6. Non-goals (explicit)

- **Not** an 8th canon branch. Not a truth-evaluator of any tradition.
- **Not** a timeline *visualization*. The timeline is a *data
  contract* only (`TIMELINE-MODEL.md`); rendering is deferred to a
  downstream search/visualization tool that consumes this schema.
- **Not** a re-host of copyrighted scripture (`RIGHTS-POLICY.md`).
- **Not** a settler of religious disputes. Every contested item is a
  *claim with evidence*, surfaced and cited, never adjudicated.
