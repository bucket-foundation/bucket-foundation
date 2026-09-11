Build-History Campaigns
========================

A build-history campaign is a full `hte.runner.run_campaign` pass over a
corpus whose own subject is the historical record itself rather than a
single chapter's prose (`quantum-history`) or a classroom's own data
(`education-atlas`, `production`): generation, critique, belief scoring,
tournament, calibration, and export, followed by `hte.canon_writeback.
write_back`, the path that turns whichever survivors clear a credence
floor into canon-facing material. The name matches the org thesis this
work is named for: "build the past. build history. bucket is the new
renaissance." (`CLAUDE.md`). `sacred-history` (this document's own
subject) is the first corpus built for this purpose; any later one
(mythology, historiography of science, comparative law) runs the same
three-command sequence below.

## The corpus contract

A build-history corpus adapter (`hte/corpus/<name>.py`) owes `hte.corpus.
Corpus` exactly what every other adapter owes it, `Source`s keyed by a
stable id, `EvidenceItem`s with a real, locatable span and the five
concept slots read off the source data itself, `GroundTruthEvent`s for
whatever the corpus marks as settled, and a `RetrievalEnvelope` per
fetch. `hte.corpus.sacred_history` reads `src/data/sacred-history.json`
(13 traditions, 22 figures, 49 AI-branch-analysis correlations, 21
timeline events) this way; its own module docstring carries the
field-by-field mapping. Two design
choices worth surfacing at this level, since a future build-history
adapter will face the same two questions:

- **What counts as "evidence" when the corpus's own unit is already a
  claim?** `sacred-history`'s 49 correlations are already claims
  with their own calibrated `confidence` (`_intake/sacred-history-
  corpus/tools/build-entity-graph.py`'s `0.40 cos + 0.25 fuzzy + 0.10
  motif` formula, the same formula `main.tex`'s belief model calls
  `e_i_blended_A`). This engine treats that confidence as one evidence
  item's own evidentiary weight `e_i`, carried into `views["blended_a"]`
  verbatim, never as the hypothesis's own belief: a hypothesis pools
  zero or more such items through `hte.belief.score` before its own
  `(b, d, u, a)` means anything. Confusing the two is exactly the
  mistake this document's own routing guidance (below) exists to head
  off.
- **What is "ground truth" when most of the corpus is contested by
  design?** `ENTITY-MODEL.md`'s own claim invariants define `confidence`
  as the corpus's own weight of cited support, and every one of this
  corpus's 49 correlations carries `stance: "contested"`. Ground truth
  here comes from a different, narrower field: `timeline[].disputed ==
  False` (claims marked accepted), 11 of this corpus's 21 dated events.

## Credence floors

`hte.canon_writeback.select_above_floor` keeps a candidate only when
`P(h) = b + a*u >= floor_P` **and** `u <= floor_u_max` (defaults `0.6`/
`0.5`). Both must hold: `P(h)` alone cannot tell an unexamined hypothesis
(no linked evidence, `u = 1.0`, reading at its prior `a`) from an
examined, moderately-believed one at the same value, and the whole point
of a floor over engine output is to keep the former out of
`bucket-canon/`. This run's own numbers (below) are the concrete case
that motivates the `u` half of the floor: a majority of this run's
highest-`P` survivors carry `u = 1.0` and `b = 0`, high prior, zero
examination, and the floor excludes every one of them.

## Why write-back stops at `candidate`

`hte.canon_writeback.write_back` never writes `canon_tier: canon`. Per
`GOVERNANCE.md`, promotion from `candidate` to `canon` is a human review
step; an engine run, however well-calibrated, is not that step. Every
card, the branch `INDEX.md`, the `CANON-INGESTION-INDEX.md` addendum,
the feed402 envelope, and the Research OS bridge export (below) all
carry `candidate` (or, for the bridge export, the constant `canon_tier:
"candidate"` field) regardless of how high a hypothesis's own `P(h)`
reads.

## Command lines

```bash
cd tools/hypothesis-engine

# the campaign itself (this run: HTE_LLM_WORKERS=4, seeds=3, ~2h15m wall)
HTE_LLM_WORKERS=4 python3 -m hte.cli campaign run --corpus sacred-history --seeds 3

# dry-run write-back: lists every card path it would write, touches nothing
python3 -m hte.cli_pipeline run --corpus sacred-history \
  --from-run runs/sacred-history/<timestamp> --writeback --branch 07-mind \
  --signoff gianyrox --dry-run

# the real write-back plus the paper stage, publish (commit + gdrive) skipped
python3 -m hte.cli_pipeline run --corpus sacred-history \
  --from-run runs/sacred-history/<timestamp> --writeback --branch 07-mind \
  --signoff gianyrox --skip-publish
```

`--signoff` names a human approver and is required whenever `--writeback`
is passed: `hte.canon_writeback.write_back` hard-refuses (`ValueError`)
before touching any file if it is missing or blank, per `learning/
research-os/PLAN.md` section 10 and `GOVERNANCE.md`, no unattended write
into `bucket-canon/`.

`--corpus` is still required alongside `--from-run` (`hte.pipeline.
run_pipeline`'s own period-choice stage reads it even when the campaign
itself is skipped); `sacred-history` names no ranked `hte.periods.Period`
today, so that stage reads `"skipped"` either way.

## This run's own numbers

- **Corpus**: 13 sources, 64 evidence items (49 correlation claims + 15
  counter-consideration refutations), 11 ground-truth events, 42 of 64
  evidence items (66%) linked to at least one hypothesis address
  (`link_threshold=0.6`).
- **Generation**: 4,763 distinct addresses produced across 3 seeds (150
  combinatorial + 6,467 evidence-driven per seed before dedup), 400 kept
  after the `max_hypotheses` cap.
- **Critic filter**: 299 of 400 survived (101 rejected, every rejection a
  concrete contradiction the critic role cited by name, an attested
  lifetime outside the stated interval, or a place naming no tradition
  either actor belongs to; zero rejected on plausibility alone, matching
  the role's own instruction).
- **Preservation critique**: run over all 299 survivors (299 calls, one
  `truncation`, zero `refusals`, `hte.llm.ModelTruncation`'s own default
  substituted for the one truncated call, per `run.log`).
- **Tournament**: 299 hypotheses rated over 2 Swiss-style rounds (38
  judge calls).
- **Coverage** (Good-Turing / Chao1 over the 4,763-address frontier):
  observed 4,763, Chao1 estimate 88,573, missing mass 0.044, coverage
  interval `[0.023, 1.0]` (the wide upper bound is this estimator's own
  documented behavior at low sample fractions).
- **Robustness**: 97.3% of survivors read `stable` (projected posterior
  spread `< 0.5`) across the four prior profiles (`consensus`, `skeptic`,
  `fringe`, `uniform`).
- **Target-blind check**: 20% rate, `steady=True`, first run (no prior
  rate to compare against yet).
- **Calibration**: `mode="kfold"` (`choose_holdout_mode`'s own read: all
  11 ground-truth events set `discovery_year == year`, so discovery-date
  holdout would split every one onto one side of any cutoff and score
  nothing). **`n_holdout_events=0` in every one of the 5 folds**,
  `brier_score=None` throughout, a real finding worth explaining:
  `sacred-history`'s ground truth (tradition-founding/composition/
  council events, one subject each) shares no address with this
  corpus's own frontier (built from figure-to-figure correlation slots,
  ACTOR and OBJECT both filled by figures, never a tradition alone), so
  the k-fold holdout's own event-to-hypothesis match finds nothing to
  score against, on either side of any fold. A future sacred-history
  campaign wanting a real calibration number needs ground truth that
  shares the frontier's own slot shape, a dated CORRELATION marked
  accepted (this corpus's 49 correlations are all `stance: "contested"`
  today) rather than a dated tradition event.
- **Refusals**: zero, across every role, this whole run
  (`MANIFEST.json["refusals"] == {}`).
- **Wall time**: 2h 15m 20s end to end (`18:08:35Z` to `20:23:55Z`,
  2026-09-10), `HTE_LLM_WORKERS=4`. Per-role cumulative call time, summed
  across the 4 parallel workers rather than elapsed wall time: generator 76s (1
  call), critic 2,880s (50 batched calls), preservation critic 13,738s
  (299 calls, by far the dominant cost), judge 1,782s (38 calls).
- **Timeline export**: 9 bins, 80 event views. **Only one of the 9
  declared time bins (`-600s`, index 9) carries any `ranked_hypotheses`
  at all**; the other 8 (`300s` through `1900s`) read empty. This
  traces to `hte.runner._time_bins_for`'s own behavior, upstream of
  this adapter: the declared `time_bins` are drawn from the corpus's own 11 ground-truth
  years, and only three of those (Confucius -551, Laozi -571, Mahavira
  -540) land in the same century bin an evidence-driven hypothesis's own
  interval also lands in; every other declared bin corresponds to a
  ground-truth year with no correlation-evidence-driven hypothesis
  sharing its century. `hte.export.timeline_views` only ever looks
  inside the bins it is given, so the other 262 of 299 survivors, real,
  scored, critic-approved hypotheses, are absent from every `bins[]`
  entry, present only in `event_views` (by OBJECT/PLACE) with no slot or
  opinion detail there. `hte.canon_writeback.reconstruct_candidates`
  logs this gap by short id and skips those 262 for lack of a persisted
  slot record to rebuild from (see its own docstring); this is a real
  ceiling on how much of a wide-spanning-corpus's frontier this write-
  back path can currently reach, worth a future `hte.runner`/`hte.export`
  fix (carrying a hypothesis's own address, not just its containing
  bin's index, into every `event_views` entry too) rather than something
  this task's own scope reaches into `hte/export.py` to fix, per this
  package's own "under active parallel edit elsewhere" caution.
- **Top hypotheses by `P(h)`, among the 37 reconstructable survivors**
  (all from the one populated bin, `-600s`): the top 7 by `P(h)` are all
  variants of *Buddha [ACTION] Confucius, in the context of Buddhism*
  (`P` 0.971 down to 0.953, Elo 2701-2900), one per ACTION/MECHANISM
  combination the combinatorial generator swept over that single frozen
  (actor, object, place) anchor. **Every one of them carries `u = 1.0`,
  `b = 0.0`**: their high `P(h)` comes entirely from a high prior base
  rate `a`, with no linked evidence behind it, exactly the case this
  document's own "Credence floors" section names. Only one of the 37
  carries `u < 1.0` at all (a supported reading with `b > 0`), and its
  own `P(h)` sits below `floor_P`. **Zero of 299 survivors (zero of the
  37 this write-back path could reconstruct) clear both `P >= 0.6` and
  `u <= 0.5` in this run.** `hte.canon_writeback.write_back --branch
  07-mind` therefore wrote zero hypothesis cards, an `INDEX.md` with zero
  rows, a `CANON-INGESTION-INDEX.md` addendum stating exactly that, and a
  feed402 envelope with an empty `hypotheses` array: the expected output
  of a floor doing its job over a frontier this run's own meta-review
  already flagged as under-differentiated below.
- **Meta-review's own read of the frontier** (full text in `MANIFEST.
  json["counts"]["meta_review"]`): two anchor pairs (Manu-Confucius,
  Manu-Deucalion) absorb a disproportionate share of the 299 survivors
  through pure action/mechanism permutation while actor/object/place/
  interval stay frozen; the five non-consensus ACTOR concepts
  (`mythicist-non-historicity`, `euhemerist-deification`,
  `hyperdiffusionist-borrowing`, `channeled-modern-revelation`, `deity-
  literal-agent`) and the skeptical MECHANISM concepts appear only
  inside the flood-myth correlation cluster and never cross-applied to
  the axial-age or Abrahamic-lineage clusters; only about 16 of 299
  hypotheses anywhere in the frontier carry any positive belief
  (`b > 0`), and every one of those backs a mainstream `maps-to`/
  `entity-graph-resolver` reading, no skeptical hypothesis has accrued
  belief anywhere yet. This reads as a generation-diversity finding
  about this corpus's own evidence shape (49 correlations concentrated
  on a handful of figure pairs), separate from any error in scoring.

## The Research OS bridge export

`hte/bridge_export.py`'s `export_for_bridge` reuses the same
reconstruction to emit the `EngineHypothesisInput` shape PR #14's
`src/lib/research-os/engine-bridge.ts` consumes, plus fields two later
seam checks (PR #27, PR #28) asked for:

- **`tierAssigned` is left `None`, always.** `buildEngineNode` feeds it
  straight into `graph.nodes.tier` via `engineTierToGraphTier`
  (defaulting to `6` when absent). PR #28's own review found that column
  already overloaded, a K-12 grade band (3-12) on one row shape and the
  canon-bridge sentinel (`90`) on another; `hte.evidence.Tier`'s "T1"
  .."T6" source-reliability ladder is a third, unrelated meaning, and a
  real value there would collide with a grade-1-through-6 node. The
  source-reliability tier travels in the additive `source_tier` field
  instead, until `graph.nodes` gets a column of its own for it.
- **Every export carries the full opinion**, `{"b", "d", "u", "a", "P"}`,
  not just `posterior`. **Routing guidance, from the PR #27 seam check**:
  rank and gate on `opinion.P`, capped by a ceiling on `opinion.u`, never
  on a linked evidence item's own `views["blended_a"]` (the entity-graph
  resolver's per-citation confidence score, described above); a
  hypothesis's own belief is the pooled result `hte.belief.score`
  produces from that evidence, a different number from any single
  item's own weight read straight through.
  `graph.edges.confidence` is a provenance scalar on the graph side with
  no wiring to engine credence yet, this note exists so a future wiring
  pass does not reach for the wrong number.
- Two more additive, constant fields: `canon_tier: "candidate"` (always,
  snake_case to match the graph schema's own column convention) and
  `origin: "engine"`.
- `slots` widens the interface's own `Record<string, string | null>`
  to `{id, label}` per slot; `evidenceRefs` stays the documented bare
  `string[]` (`buildEngineEdges` maps each entry straight to a `cites`
  edge target slug) with the source citation carried separately in an
  additive `evidenceCitations` field instead.

Full field-by-field mapping and rationale: `hte/bridge_export.py`'s own
top docstring; the same content, and the follow-up on `tierAssigned`/
`opinion`, is posted as two comments on PR #14.

## The PR #22 canon-importer seam

`hte.canon_writeback.write_back`'s cards (`bucket-canon/<branch>/
hypotheses/<address-short>.md`) are a fourth on-disk canon shape,
alongside `sub-claims/` cards, YAML dossiers, and `concepts/` cards.
Checked against PR #22's own merged canon importer
(`src/lib/research-os/ingest/canon.ts`, `src/lib/canon-primary.ts`,
`scripts/research-os/ingest/canon-import.ts`): that importer hardcodes
`BRANCH = "02-physics"` and only ever looks for one exact filename per
concept folder, `primary-papers.yaml`. It carries no markdown or
frontmatter reader at all, so these cards are outside its scan surface
entirely, by omission (the importer never lists a branch directory for
markdown) rather than by an explicit exclusion rule. Nothing on the
engine side needs to change for `canon_tier: candidate` to be respected
here; a future importer that does learn to read this shape should key
its own canon-tier check off the card's own `**canon_tier:**` line
(always `candidate`, never `canon`). `tools/hypothesis-engine/tests/
test_canon_writeback.py::test_write_back_cards_are_invisible_to_the_
pr22_canon_importer` is a faithful copy of `findPrimaryFiles`'s own
two-part gate, run over this module's own emitted cards. Full finding
posted as a comment on PR #22.

## What the sacred-history data lacked

- **No `derives_from` or transmission edge field.** `ENTITY-MODEL.md`'s
  own `lineage` node type, where such an edge would live, is not
  populated in `src/data/sacred-history.json` as of 2026-09-10. `hte.
  corpus.sacred_history`'s own stemma is inferred from cross-tradition
  correlation dating asymmetry instead (documented in its own module
  docstring), a defensible proxy, never a fact this corpus states
  outright.
- **No dated correlation.** Every one of the 49 correlations concerns
  two figures, never a date of its own; this module reconstructs an
  interval from the two sides' own traditions' earliest-attested years
  when known, `None` when neither side's tradition is dated at all
  (`greek`, `mesopotamian` as of 2026-09-10). A future edition of this
  corpus that dates a correlation directly would let evidence-driven
  hypotheses carry a real interval instead of this proxy.
- **No accepted or majority-scholarly correlation.** All 49 carry
  `stance: "contested"`; none can become ground truth by this module's
  own "attested by two independent kinds, non-contested stance" rule
  (the code path exists, exercised at zero events this run, per the
  calibration finding above).
- **No per-tradition dating for `greek` or `mesopotamian`.** Both
  traditions appear in figures and correlations but never in the
  timeline export, so `hte.corpus.sacred_history.ingest`'s own stemma
  inference and interval reconstruction both read `None` for either
  side of a correlation touching them.

## Data fixes

Dated 2026-09-10.

Four fixes to `hte.corpus.sacred_history` and `src/data/sacred-
history.json`, each addressing one gap named above; full rationale in
the module's own top docstring.

- **Dating.** Every tradition now carries a span (`(earliest, latest)`
  year across its own `timeline` events) in place of a single earliest
  year; `greek` and `mesopotamian`, named nowhere in this bundle's `timeline`,
  now read from `_EXTERNAL_TRADITION_ANCHORS`, a documented, cited
  constant in the adapter (`mesopotamian`: the Standard Babylonian
  Epic of Gilgamesh, c. 1200 BCE, George 2003; `greek`: the Hesiodic
  *Catalogue of Women*, c. 700 BCE, West 1985). Every correlation's own
  `interval` derives from its two sides' spans, the overlap when they
  overlap, the union when they do not, always `uncertainty: uniform`
  over its own bounds; `views["interval_is_overlap"]` records which
  reading produced it.
- **Transmission.** Every cross-tradition correlation now emits a
  stemma edge on `Source.stemma_parents`, a directed edge for a
  resolved `direction` field, an undirected `shared_source` relation
  (a mutual pair, the edge present on both sides) for every correlation
  this bundle ships today, since none carries a `direction` value. This
  data is ready for `hte.belief.effective_count`'s discount; neither
  `hte.runner.run_campaign` nor `hte.calibrate.holdout_kfold` threads
  `Corpus.sources` into `hte.belief.score`'s `sources=` parameter yet,
  so the discount itself is not live in either path as of this fix.
- **Slot alignment and ground truth.** Three correlations added,
  additive, the original 49 untouched, all human-curated and
  non-contested: `utnapishtim`↔`noah` (flood and ark, `stance:
  "majority-scholarly"`), `moses`↔`muhammad` (lawgiver and
  mountain-revelation, `stance: "traditional"`), `confucius`↔`jesus`
  (the reciprocity maxim, `stance: "majority-scholarly"`). Each carries
  `evidence[]` naming two independent kinds and a real interval, so
  `_correlation_items`'s existing ground-truth rule fires for the first
  time this corpus has shipped; each `GroundTruthEvent.id` equals its
  own correlation's `EvidenceItem.id`, the id `hte.calibrate`'s
  `ev_by_id.get(g.id)` lookup reads, so the ground truth shares the
  frontier's own figure-correlation slot shape by construction. Tier
  moved off a flat `T4` too: `_TIER_BY_SOURCE` reads `T3` for these 3,
  `T4` for the 49 AI-derived candidates.

### Numbers before and after

Both runs: `HTE_LLM_MODE=fake`, `--seeds 2`, `hte campaign run --corpus
sacred-history` (fake mode swaps every LLM role for a deterministic
stand-in, so these numbers are not comparable to this document's own
3-seed real-LLM run above; they isolate this fix's own effect on
calibration and linkage, holding the LLM path fixed at fake on both
sides of the diff).

| Metric | Before | After |
|---|---|---|
| Evidence linked (of total) | 36 of 64 (56%) | 36 of 70 (51%) |
| Calibration mode | kfold | kfold |
| Held-out events | 0 | 3 |
| Covered by a matching placement | 0 | 3 |
| Coverage of truth | `None` | 1.0 |
| Brier score | `None` | 0.353 |
| Reconstructable survivors (`hte.canon_writeback.reconstruct_candidates`) | 3 | 6 |
| Survivors with `b > 0` | 1 | 4 |

The mode-selection reason string is unchanged (`choose_holdout_mode`
still reads every ground-truth event's `discovery_year == year` and
picks `kfold`); what changed is `n_holdout_events` moving off zero,
since 3 of the corpus's now-14 ground-truth events share an id with a
real, figure-slotted `EvidenceItem` for the first time.

`hte calibrate --corpus sacred-history` (the standalone CLI; `--diagnose`
is absent from `hte.cli` on `main` as of this fix, so this is the
fallback path) still reports `coverage_of_truth=0.0` on both sides of
this diff: that command always runs `calibrate.run_holdout`, the
discovery-date holdout, and every ground-truth event in this corpus
carries `discovery_year == year`, so `holdout_by_discovery_date` puts
every one of them on one side of any cutoff regardless of which events
exist. This fix's own coverage gain shows up in the campaign's own embedded
calibration step (`choose_holdout_mode` → `holdout_kfold`, the table
above); this standalone command's own numbers stay flat.

## Interval-rule fix

Dated 2026-09-10, a follow-up to "Data fixes" above: PR #58's own merge
review named a High finding against the "union when the spans don't
overlap" half of `_correlation_interval`. Two traditions that never
coexisted bounded a correlation's own interval from the earlier span's
own start to the later span's own end, the full recorded span of each
side rather than the window the parallel could have formed in;
51 of the corpus's 52 correlations landed on the union branch, and
`clm-corr-motif-parallel-99eb113edd` (Utnapishtim ↔ Noah) read
`(-1200, 1947)`, a 3147-year `UNIFORM` interval driven by Judaism's own
1947 Dead Sea Scrolls discovery event, a `timeline` entry with no
connection to the flood narrative this correlation names.

`_correlation_interval` now reads three rules instead of two,
`views["interval_rule"]` naming which one produced each correlation's
own interval:

- **`overlap`**, unchanged: both tradition spans known and overlapping
  in time gives their overlap.
- **`transmission_window`**, the fix: both spans known and NOT
  overlapping gives the span between the earlier tradition's own
  earliest attestation and the later tradition's own earliest
  attestation (`min(a_lo, b_lo)` to `max(a_lo, b_lo)`) instead of the
  two full spans' union, the window in which the parallel could have
  formed, never stretched out to either side's own latest recorded
  event.
- **`anchor`**, unchanged: only one side's tradition is dated at all
  gives that one span verbatim.

`views["anchor_used"]` is present (`1.0`) whenever either side's own
tradition span rests on `_EXTERNAL_TRADITION_ANCHORS` (`mesopotamian` or
`greek` as of 2026-09-10) rather than a `timeline`-dated span, so a
future reader of a narrow `transmission_window` interval can still see
when one of its two endpoints is a documented external convention
rather than this corpus's own `timeline` data.

### Interval width before and after

Same 52 correlations, same `sacred-history.json`, `_correlation_interval`
run against the pre-fix and post-fix module:

| Metric | Before | After |
|---|---|---|
| Median interval width | 2144 years | 939.5 years |
| Max interval width | 3447 years | 2434 years |
| Correlations under a 1000-year interval | 19 of 52 (36.5%) | 30 of 52 (57.7%) |
| Correlations on the union/transmission-window branch | 51 of 52 | 51 of 52 |
| Utnapishtim ↔ Noah interval | `(-1200, 1947)`, 3147 years | `(-1200, -250)`, 950 years |

The Utnapishtim ↔ Noah item now lands on `(-1200, -250)`: `-1200` is
`_EXTERNAL_TRADITION_ANCHORS["mesopotamian"]` (the Standard Babylonian
Gilgamesh recension, George 2003), `-250` is Judaism's own earliest
dated `timeline` attestation (the Septuagint translation of the Hebrew
scriptures, `anc-septuagint`), and `views["anchor_used"] = 1.0` flags
the Mesopotamian side's own dependence on the external anchor. 51 of 52
correlations stay on the non-overlap branch (only the corpus's one
`"overlap"` correlation is unaffected by this fix); none move to
`"anchor"`, since every one of this bundle's 13 traditions carries a
span as of 2026-09-10.

### Campaign and calibration numbers before and after

Both runs: `HTE_LLM_MODE=fake hte campaign run --corpus sacred-history
--seeds 2` and `HTE_LLM_MODE=fake hte calibrate --diagnose --corpus
sacred-history`, run against the pre-fix and post-fix module, everything
else held fixed.

| Metric | Before | After |
|---|---|---|
| Campaign `calibration_brier` | 0.35266401971222877 | 0.35266401971222877 |
| Calibration mode | kfold | kfold |
| Held-out events | 3 | 3 |
| Covered by a matching placement | 3 | 3 |
| Coverage of truth | 1.0 | 1.0 |
| Brier score (`hte calibrate --diagnose`) | 0.35266401971222877 | 0.35266401971222877 |
| Diagnostics reasons for the uncovered remainder | all 0 | all 0 |

Every number above is identical before and after, byte-for-byte across
`calibration.json`, `CALIBRATION.md`, and `DIAGNOSTICS.md`. This is
expected: `_correlation_items` sets `GroundTruthEvent.year =
interval.start`, and `_correlation_interval`'s
own fix only moves `interval.end` on the non-overlap branch (`min(a_lo,
b_lo)`, the transmission-window's own lower bound, equals the old
union's own lower bound in both rules); `holdout_kfold`'s coverage
check, `interval.start <= g.year <= interval.end`, is satisfied by
construction regardless of how wide `interval.end` runs. This is the
PR #58 review's own point restated as a measurement: coverage and
non-refutation here were never a function of interval width, so the fix
could not and does not move them; what it moves is the interval itself,
the one artifact any consumer that is not `holdout_kfold` (a future
Allen-relation disjointness check, a human reading `EvidenceItem.
interval` directly) would have read as 3147 years of uncertainty where
950 stand.
