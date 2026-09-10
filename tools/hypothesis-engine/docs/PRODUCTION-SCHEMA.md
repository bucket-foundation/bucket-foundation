Production Schema
==================

The JSON shape `hte.corpus.production` reads, and the reasoning behind
every field it carries and every mapping decision `production.py` makes
turning that JSON into an `hte.corpus.Corpus`. `docs/RESEARCH-OS-
INTEGRATION.md`'s own finding is why this schema exists: the production
record is the one real bridge between Research OS and this engine, and
seven of `RESEARCH-QUESTIONS.md`'s forty-nine questions need it before
they are runnable at all.

## Where this schema comes from

`learning/research-os/PLAN.md` §5, on the `feat/research-os-k12` branch,
gives a production a YAML shape: `id`, `atom_ids`, `claim`, `stance`,
`evidence_spans`, `slots`, `checks`, `learner_state_at_submission`,
`review`, `registration`, `payout`. That shape is a strict superset of
what `hte.evidence.EvidenceItem` carries, built for one claim at a time.
The schema below keeps its field names and its stance vocabulary
(`supports`/`refutes`/`extends`) but restructures around a production
holding *many* claims (a student's own production commonly argues more
than one thing), and drops every field this engine's own belief fusion
never reads: `atom_ids` (a Bucket Academy concept-graph id, no analog in
this engine's slot-filled address space), `checks` (the workspace's own
`check`-tool verdicts, a Research OS record this adapter does not need to
re-derive since a production only reaches the engine after those checks
already ran), `learner_state_at_submission` (a Research OS learner-state
field, out of scope per `RESEARCH-OS-INTEGRATION.md`'s own question map),
and `registration`/`payout` (x402, Dynamic, Story Protocol, and payee
data the engine's own module map does not touch, per that same file's
"What the engine does not touch" section).

## The JSON shape

One production is one JSON object (a directory of productions is one
object per file, or a file holding a JSON array of them):

```json
{
  "id": "prod-001",
  "created_at": "2026-02-10T00:00:00Z",
  "author_role": "student",
  "grade_band": "6-8",
  "school_or_district_id": "district-a",
  "research_question": "RQ19: does a reviewed production's detectability and tier move the engine's ranked hypotheses in a calibrated direction?",
  "claims": [
    {
      "text": "...",
      "stance": "supports",
      "slots": {"actor": "student-researcher", "action": "raised", "object": "tier-assignment", "place": "classroom-workspace", "mechanism": null},
      "interval": {"start": 2026, "end": 2026},
      "evidence": [
        {
          "source_id": "src-hte-self-report-2026-02",
          "locator": "self-report.json:calibration_summary",
          "quote": "...",
          "kind": "model_prior",
          "tier": "T3",
          "citations": [{"type": "feed402_envelope", "value": "env-hte-fixture-2026-02-10"}]
        }
      ]
    }
  ],
  "review": {
    "status": "accepted",
    "history": [
      {"status": "draft", "date": "2026-02-10"},
      {"status": "peer-reviewed", "date": "2026-02-17"},
      {"status": "teacher-reviewed", "date": "2026-02-24"},
      {"status": "accepted", "date": "2026-03-02"}
    ]
  },
  "provenance": "phase-0-quantum-history-pilot"
}
```

### Field by field

- **`id`**: this production's own id, unique within a corpus. Also
  doubles as the id another production cites when it quotes this one
  (see "Stemma," below), so it never changes once minted.
- **`created_at`**: an ISO-8601 timestamp, the moment this record was
  first drafted. Becomes the production's own `Source.date`.
- **`author_role`**: one of `student`, `teacher`, `researcher`, `agent`.
  Not projected into any `EvidenceItem` field (see "Two provenance
  fields, on purpose," below); kept losslessly on the raw `Production`
  object `load_raw()` returns.
- **`grade_band`**: a free-text grade band (the shipped fixtures use
  `"6-8"`, `"9-10"`, `"11-12"`); no fixed enum, since a corpus outside
  Phase 0's own grades 9-12 quantum-history subject may band grades
  differently.
- **`school_or_district_id`**: a pseudonymous id (`"district-a"`,
  never a real school or district name), matching the "identity, no
  roster" contract `RESEARCH-OS-INTEGRATION.md`'s own "What the engine
  needs from Research OS" section states: an opaque id is enough to
  weight a source by track record; nothing about which real school it
  names is ever needed.
- **`research_question`**: free text naming which question this
  production speaks to. The shipped fixtures prefix this with the
  question's own number from `RESEARCH-QUESTIONS.md` (`"RQ19: ..."`)
  purely for traceability; nothing in `production.py` parses that
  prefix.
- **`claims`**: one production's own list of claims, each shaped as
  below. A production with an empty `claims` list is valid JSON and
  contributes no evidence or ground truth, but is still a `Source` (see
  "Sources," below).
- **`review`**: this production's own status and its full transition
  history, covered under "Review status and dates."
- **`provenance`**: a short free-text tag naming which pilot or cohort
  this record claims to come from (the shipped fixtures use
  `"phase-0-quantum-history-pilot"` and `"phase-0-education-atlas-
  pilot"`). See "Two provenance fields, on purpose."

### A claim

- **`text`**: the claim's own sentence, learner-authored (or teacher- or
  researcher-authored, per `author_role`).
- **`stance`**: `supports`, `refutes`, or `extends`, `PLAN.md` §5's own
  three-way vocabulary, relative to whatever the claim argues about
  (another claim, an atom, a prior production). Mapped onto `hte.
  evidence.Stance`'s two-way split at ingestion: `supports` and `extends`
  both read as `Stance.POSITIVE` (both stand behind their own slot
  reading), `refutes` reads as `Stance.NEGATIVE`.
- **`slots`**: the five concept slots a placement hypothesis fills
  (`actor`, `action`, `object`, `place`, `mechanism`; `hte.concepts.
  Slot`'s first four plus `MECHANISM`, skipping `TIME` and `RELATION`
  the way every other slot-bearing record in this engine skips them
  too). Each value is either `null` (the claim asserts nothing for that
  slot; `hte.evidence.EvidenceItem`'s own docstring calls this reading
  "not asserted") or a concept id from `hte/data/vocab-production-
  seed.json`. `production.py` validates every non-null slot value
  against that vocabulary at load time and raises `ValueError` on an
  unresolvable id, rather than silently dropping it.
- **`interval`**: an `hte.timeline.Interval` (`{"start": <year>, "end":
  <year>}`, an optional `"uncertainty"` block per `Interval.from_dict`'s
  own default) naming when the claim's own subject happened, or `null`
  when the claim names no date. Distinct from `review.history`'s dates,
  which say when the *record itself* moved through review; the subject's
  own date is a separate field.
- **`evidence`**: this claim's own evidence entries, below. Every entry
  under one claim inherits that claim's own `slots`/`interval`/`stance`;
  an evidence entry carries no slot fields of its own; it exists to
  support that one claim's single reading.

### An evidence entry

- **`source_id`**: which source this entry quotes. Either an external
  cited source's own id (any string this production's author chose,
  `"src-lit-auchincloss-2014"`, `"src-hte-self-report-2026-02"`) or
  another production's own `id` in the same corpus. The second case is
  what makes a stemma edge (below): a production quoting another
  production's own claim rather than a fresh external citation.
- **`locator`**: a human-readable locator inside that source (a page, a
  section, a JSON path into a self-report file).
- **`quote`**: the exact quoted span, matching the `quote` tool's own
  no-paraphrase contract (`PLAN.md` §4).
- **`kind`**: one of `hte.evidence.EvidenceKind`'s nine values. The
  shipped fixtures use `"textual"` for literature and for a citation to
  another production's own claim text, and `"model_prior"` for a
  citation to the engine's own generated self-report or calibration
  record, the same "an estimate a model produced" extension `hte.corpus.
  education_atlas`'s own module docstring documents for its observation
  rows.
- **`tier`**: one of `hte.evidence.Tier`'s six values, chosen per entry
  by whoever authored the fixture (a peer-reviewed paper reads `T2`; the
  engine's own self-report or calibration output, one step more derived,
  reads `T3` or `T4`). Not derived from `review.status`: a production's
  own maturity and its cited evidence's own reliability are different
  axes, and conflating them would double-count a signal `hte.belief`
  already scores twice, once per tier and once per detectability.
- **`citations`**: zero or more `{"type": "doi" | "url" |
  "feed402_envelope", "value": "..."}` entries, the concrete identifier
  behind `source_id`. See "Where citations live" for why these do not
  become a first-class field on the ingested `EvidenceItem`.

### Review status and dates

Five statuses: `draft`, `peer-reviewed`, `teacher-reviewed`, `accepted`,
`retracted`. The first four form an ordered maturity ladder
(`_STATUS_ORDER` in `production.py`); `retracted` sits off that ladder
entirely, a terminal withdrawal rather than a fifth rung, so it can never
be passed as `status_min` and always bypasses whatever `status_min` a
caller does pass.

`review.status` is the production's own current status; `review.history`
is every status it has held, each with the date it moved there. This
review record lives at the *production* level rather than per claim, matching
`PRODUCTION-SCHEMA.md`'s own field list and `PLAN.md` §5's own
`review.teacher`/`review.bucket_reviewer` block, which likewise reviews
the production as a whole. A single retracted claim inside an otherwise-
accepted production is therefore modeled as its own, small, single-claim
production (the shipped fixtures' `prod-010` does exactly this) rather
than a per-claim status override: a real correction naturally attaches to
the record that carried the mistaken claim, and a production small enough
to hold one claim is the natural shape for a claim narrow enough to need
retracting on its own.

`status_min` (default `"peer-reviewed"` on both `load` and
`load_supabase`) filters which productions contribute any `EvidenceItem`
or `GroundTruthEvent` at all: a production below `status_min` on the
ladder is skipped entirely, except a retracted one, which is always
ingested (see "Retraction," below) regardless of where `status_min` sits.
The default excludes a bare `draft`: an unreviewed record has not yet
cleared the review PLAN.md §5 requires before a citation fee attaches
(Auchincloss and others 2014's own missing-instrument finding, the same
citation RQ21 draws on), so it should not reach belief fusion by default
either.

## Corpus mapping

Every mapping rule below lives in `_build_corpus`.

- **Sources.** One `Source` per production (`kind=TEXTUAL`, `date` its
  own `created_at`), created for *every* production regardless of
  whether it passes `status_min`, so a citation naming a filtered-out
  production still resolves to a real `Source` rather than a dangling
  id. One more `Source` per distinct externally-cited `source_id`
  (`kind`: the first evidence entry that cites it, first-seen wins),
  created lazily as claims are read, never up front, since the full set
  of external sources is not known until every claim has been read once.
- **EvidenceItems.** One per claim's own evidence entry (not one per
  claim: a claim with three evidence entries yields three
  `EvidenceItem`s, each inheriting that one claim's own slots, interval,
  and stance). Its id is `f"{production.id}-c{claim_index}-e{evidence_
  index}"`. Only productions passing `status_min` (or retracted, which
  always passes) contribute any.
- **Stemma.** When an evidence entry's own `source_id` names another
  production in the same corpus, that citing production's own `Source`
  gains the cited production's id as a `stemma_parents` entry. A
  citation chain of depth two, production `X` citing `Y`, `Y` citing
  `Z`, is two such edges, discovered independently as `X`'s and
  `Y`'s own claims are each read in turn; nothing in `production.py`
  walks the chain itself; `hte.belief`'s own stemma-aware fusion does
  that once it reads `Source.stemma_parents`.
- **Retraction.** A retracted production's own `EvidenceItem`s carry
  `is_absence=True` and `stance=Stance.NEGATIVE`, overriding whatever
  the underlying claim's own `stance` field says. `hte.corpus.fixtures`'
  own `gt-gamma-downgrade` card sets the precedent this follows: a
  correction is still worth keeping in the corpus, scaled by
  detectability the way `Eq. detectability` already treats an absence
  finding, rather than deleted outright as if the claim had never been
  asserted. A claim's own declared `stance` describes its relation to
  whatever it argued about; retraction describes whether the research
  record still stands behind it at all, a different axis, so it
  overrides at ingestion instead of blending with the claim's own value.
- **Ground truth.** One `GroundTruthEvent` per claim whose production is
  `accepted`, passing `status_min` on its own being insufficient: a
  `teacher-reviewed` production still lacks the "named human sign-off"
  `PLAN.md` §5 requires before a claim counts as settled. That claim must
  also be non-retracted, with at
  least one evidence entry and a non-null `interval`. Its `id` is shared
  with that claim's first `EvidenceItem`, the same one-id-shared-
  between-both-records convention `hte.corpus.fixtures` and `hte.corpus.
  education_atlas` both use, so `hte.calibrate`'s holdout logic finds a
  real evidence item at that id. `year` is the claim's own `interval.
  start` (the subject's own date); `discovery_year` is the year `review.
  history` recorded `"accepted"` (the record's own date), so a holdout
  by review date, which `RESEARCH-OS-INTEGRATION.md` names as the
  reason this adapter exists (question 19's own calibration campaign),
  is a real, distinct axis from the subject's own date rather than a
  restatement of it.

### Two provenance fields, on purpose

`hte.evidence.EvidenceItem.provenance` is, across every adapter this
package ships, a fixed, coarse, per-pipeline literal: `"fixture"`,
`"education-atlas-observation"`, `"education-atlas-doc-paragraph"`, never
a per-record free-text string. This adapter keeps that convention: every
`EvidenceItem` it builds carries the literal `"k12-production"`
(`EVIDENCE_PROVENANCE_TAG`), regardless of which specific production it
came from.

A production's own JSON `provenance` field is a second, different thing:
richer, per-record, free text naming which pilot or cohort that one
record claims to come from. It never overwrites the coarse per-item tag;
it stays on the raw `Production` object `load_raw()`/`load()`'s own
lossless parse returns, available to any caller who wants it without
forcing every `EvidenceItem` in the corpus to carry a different string.

### Where citations live

`hte.evidence.EvidenceItem` has no dedicated field for a citation
identifier (a DOI, a URL, a feed402 envelope id); the closest existing
field is `EvidenceSpan.locator`, "a human-readable locator inside that
document." This adapter folds a claim's own `citations` list into that
locator (`f"{locator} (cite: {type}:{value}; ...)"`), the same "no better
field exists yet, reuse the closest one and document the reuse" move
`hte.corpus.education_atlas`'s own module docstring makes for `MODEL_
PRIOR`. Nothing is lost: the raw `Citation` objects stay intact on the
`ClaimEvidence.citations` tuple `load_raw()` returns; only the *ingested*
`EvidenceItem`'s own locator string carries the folded, human-readable
form.

## Loading

```python
from hte.corpus import production

# from the shipped fixtures (or $PRODUCTION_FIXTURES_DIR)
corpus = production.load()                       # status_min="peer-reviewed"
corpus = production.load(status_min="accepted")  # only settled claims
raw = production.load_raw()                       # every Production, unfiltered, lossless

# from a live Research OS deployment (needs SUPABASE_URL / SUPABASE_SERVICE_KEY)
corpus = production.load_supabase(table="productions")
```

`load_supabase` reads `03-data-services.md` section J's own Supabase row
(`table="productions"` by default) over the Supabase REST API
(`GET {url}/rest/v1/{table}?select=*`), the same Postgres-plus-`jsonb`
substrate `PLAN.md` §6 already commits Research OS to for Phase 0. No
argument or environment value it reads is ever printed, logged, or
folded into a raised error's own message.
