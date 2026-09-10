# History Hypothesis Engine core

The address space, subjective-logic belief model, and the timeline, concept,
and evidence records that feed them, for `papers/history-hypothesis-engine/
main.tex` and its Lean counterparts under `Bucket.*`.

This package builds the whole loop `main.tex` §8 diagrams: intervals and
Allen relations, concept vocabulary, the Gödel address scheme, placement
and sequence hypotheses, evidence items carrying their own best-effort
extracted slots, the evidence-to-hypothesis linker, and the belief
scorer; the generator, the structural-unknowns layer, the ranking
tournament, and timeline export; the headless-Claude wrapper and every
LLM-backed engine-loop role (generator, critic, unknown-unknown,
preservation critic, judge, meta-review, self-report, and the extraction
ensemble); two corpora (`quantum/07-history` and a synthetic fixture set)
and the retrieval-provenance shape their ingestion carries; the
event-targeted discovery-date holdout and Brier-score calibration; and
`run_campaign`, the one call that wires all of it together, plus the
`hte` console script over it. The evolver's own
recombine/split/generalize moves (`neighbors`' one-slot mutation is built;
the larger moves are not) and the gap-node active-learning queue's live
wiring into a running campaign (`hte.unknowns.GapNode`/`value_of_information`/
`active_priority` are built; nothing yet calls them from `hte.runner`)
are the two pieces still open.

## Module map

| Module | Mirrors | Holds |
|---|---|---|
| `hte/timeline.py` | `Bucket.Timeline` | `Interval`, `Uncertainty`, `AllenRelation`, `relate`/`converse`, the resolution ladder, `auto_resolution`/`bin_label` (a corpus-anchored rung and its "1900s"-style label, in place of a bare bin index), calendar conversion (BCE/CE, BP, ka), century time bins, `Period`/`NodeLevel`/`DatePosterior` |
| `hte/concepts.py` | `Bucket.Concept` | `Slot`, `ConsensusStatus`, `Concept`, `Vocabulary` (always carries `OTHER` per slot, append-only vocab index, Dirichlet-process `new_concept_probability`), the shipped seed vocabulary |
| `hte/address.py` | `Bucket.Address` | `SlotTuple`, `encode_indices`/`decode_indices` (placement), `encode_sequence_indices`/`decode_sequence_indices`, `short_id`, and the concept-id-facing `encode`/`decode` wrappers |
| `hte/hypothesis.py` | `Bucket.Hypothesis` | `Placement`, `Sequence`, `Hypothesis` (address, `claims`, `depends_on`, `meta`), JSON round trip, `prior_logit` |
| `hte/evidence.py` | (plain data, `def:evidence`) | `EvidenceKind`, `EvidenceFamily`, `Tier`, `Stance`, `EvidenceSpan`, `Source`, `EvidenceItem` (carrying its own best-effort extracted `actor`/`action`/`object`/`place`/`mechanism`/`interval`/`stance`, `bkt-hte-evidence-slots`) |
| `hte/belief.py` | `Bucket.Belief` | `Opinion`, `fuse`, `Constants`, `D`, `cross_kind_bonus`, `effective_count`, detectability (`load_detectability_table`, `detectability`, `detectability_scale`), `edge_strength`, `cluster_weight`, `weight`, `pooled_weight`, `score` |
| `hte/link.py` | (none; a linking layer with no Lean counterpart) | `link_evidence` (fills `EvidenceItem.supports`/`refutes` by slot matching against a hypothesis population, `bkt-hte-evidence-slots`), `slot_match_score` (exact-id or fuzzy-label per-slot comparator, shared with `hte.calibrate`) |
| `hte/llm.py` | none (own layer) | `complete`, the cached, schema-validated `claude -p` wrapper every role calls; `resolve_model`, `escalation_model`, `cache_stats`; `LLMError` and its three subclasses |
| `hte/roles.py` | `main.tex` §8, `IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §7 | One function per engine-loop role: `generate`, `critique`, `unknown_unknown`, `preservation_critique`, `judge`, `meta_review`, `self_report`, `extract` (the ensemble-of-3, agreement-scored, opus-escalated extractor, `bkt-hte-extraction-ensemble`; its schema additively carries the same slot fields `hte.evidence.EvidenceItem` does, `bkt-hte-evidence-slots`) |
| `hte/corpus/` | `main.tex` §8's retrieval-envelope paragraph | `Corpus`, `GroundTruthEvent`, `RetrievalEnvelope` (`bkt-hte-retrieval-provenance`, fixture mode only); `quantum_history.ingest` (parses `quantum/07-history/*.md`) and `fixtures.build` (a tiny synthetic corpus of the same shape) |
| `hte/calibrate.py` | `main.tex` §9 | `holdout_by_discovery_date`, `run_holdout` (event-targeted: a held-out event's own matching placement at the right date scored against `1`, its top wrong-interval competitor against `0`), `fit_constants`, `write_calibration`, `brier_score`, `calibration_curve` (`bkt-hte-holdout`) |
| `hte/runner.py` | `main.tex` §8's whole engine loop | `run_campaign`, `RunArtifacts`, `Logger` |
| `hte/cli.py` | none (own layer) | The `hte` console script: `campaign run`, `calibrate`, `views` |
| `hte/generate.py` | (none; generator is out of `Bucket.*`'s scope) | `enumerate_placements` (lazy product, `OTHER` included, its own `span_start`/`bin_width` override the module-default TIME_BIN axis), `neighbors` (one-slot mutation, one-bin time shift, sequence relation change), `from_evidence` (the four evidence-driven generators: evidence-cluster, claim-gap, contradiction, cross-period-analogy; same `span_start`/`bin_width` override), `sequences_from` (Allen-relation pairing) |
| `hte/unknowns.py` | `Bucket.Unknowns` (Good-Turing/Chao1 only) | `good_turing_missing_mass`, `chao1`, `coverage_interval`, `prior_profiles`, `robustness`, `surprise`, `GapNode`, `value_of_information`, `active_priority` |
| `hte/tournament.py` | (none; out of `Bucket.*`'s scope) | `Judge`, `Critic`, `run` (Elo-seeded Swiss-style tournament), `critic_filter` |
| `hte/export.py` | (none; a display/export layer) | `timeline_views` (per-bin, per-event, per-pair JSON), `write_views` (`timeline.json` + `TIMELINE.md`) |

## Design notes for the next agent

- **TIME_BIN is numeric; it has no concept vocabulary of its own.** The paper buckets time
  into 200 century bins across a 20,000-year span for its own vocabulary
  sizing (`main.tex` §Combinatorics). `hte.timeline.time_bin_index` computes
  that index directly from an astronomical year; `hte.address.encode` and
  `Placement.slot_tuple`/`Placement.address` take it as an explicit
  `time_bin` argument rather than resolving it through `Vocabulary`, the
  way ACTOR/ACTION/OBJECT/PLACE/MECHANISM are resolved.
- **A hypothesis's prior logit sums only its five concept-bearing slots.**
  `Placement.prior_logit` and `Hypothesis.prior_logit` sum ACTOR/ACTION/
  OBJECT/PLACE/MECHANISM's concept `prior_logit`; TIME_BIN contributes
  nothing, matching the paper's own worked example (fixing ACTION/OBJECT/
  PLACE/TIME_BIN and varying only ACTOR and MECHANISM moves `L_prior` by
  exactly the two varied concepts' priors). `Sequence.prior_logit` sums
  both member placements' priors; the paper states a prior formula for a
  placement only, so this sum is this package's own documented extension;
  no such value is read off the source material.
- **`hte.belief.score` takes a whole `Hypothesis`, so it can call `prior_logit` itself.** It reads
  `hypothesis.address` for evidence matching and calls
  `hypothesis.prior_logit(vocab)` for the base rate, so a generator only
  has to build one `Hypothesis` object per candidate and hand it straight
  to the scorer.
- **Detectability is opt-in.** `score`/`pooled_weight`/`cluster_weight` all
  take an optional detectability table and `period`; an absence-of-evidence
  `EvidenceItem` (`is_absence=True`) is only scaled by detectability when
  both are supplied, otherwise it reads at the flat-tier, high-
  detectability default (`delta = 1.0`).
- **`n_eff` needs `Source` objects to do anything.** `pooled_weight`'s
  `sources` argument is optional; without it, each kind's effective count
  falls back to a raw item count. Pass a `{source_id: Source}` mapping (and
  optionally `stemma_edge_weights`) to get the real stemma discount.
- **The generator/tournament layer owns `L(h)` and `Theta_temporal`.**
  `hte.belief` stops at the opinion `(b, d, u, a)` and its projection `P(h)
  = b + a*u`. The ranking score `L(h) = logit(P(h)) + Theta_temporal(h)`
  (`Eq. rank`) is not implemented anywhere in this package: `hte.
  tournament.run` seeds Elo from the projection alone, with no
  `Theta_temporal` shift, since that term needs a period's date posterior
  compared against a hypothesis's stated interval, a concern no module
  here otherwise touches.
- **`Hypothesis.meta` is this package's generator-provenance field.**
  `hte.generate.from_evidence` sets `meta["generator"]` (one of
  `"evidence-cluster"`, `"claim-gap"`, `"contradiction"`,
  `"cross-period-analogy"`) and `meta["evidence"]` (the evidence item ids
  behind it) on every hypothesis it produces; `Hypothesis.from_placement`/
  `from_sequence` leave it at its default `{}`. `to_dict`/`from_dict` carry
  it, so it survives a `save`/`load` round trip.
- **`hte.generate` and `hte.tournament` have no address-space or Lean
  counterpart to consult.** This file's own earlier line naming the
  generator, tournament, and evolver as out of `Bucket.*`'s scope still
  holds for the proof layer; the choices below are this package's own,
  made against the paper's prose (`main.tex` §Combinatorial hypothesis
  space, §Structural unknowns, §Engine loop) instead of against a
  theorem.
- **`prior_profiles`' shift table.** Four profiles over a `Vocabulary`
  (`IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §6d), keyed by `ConsensusStatus` and
  keeping every concept's id, slot, label, and vocabulary-index position
  fixed, only `prior_logit` moves:

  | consensus_status | consensus | skeptic     | fringe   | uniform |
  |-------------------|-----------|-------------|----------|---------|
  | CONSENSUS         | v         | v           | v        | 0.0     |
  | CONTESTED         | v         | min(v, 0.0) | v + 1.0  | 0.0     |
  | FRINGE            | v         | v - 2.0     | -v + 2.0 | 0.0     |
  | OTHER             | v (= 0.0) | v           | v        | 0.0     |

  FRINGE's two non-consensus profiles mirror each other,
  `fringe(v) = -skeptic(v)`, so a fringe actor's consensus prior reads
  further negative under skeptic and swings positive under fringe, while a
  consensus actor's own prior never moves except flattening to zero under
  uniform.
- **`chao1` matches `Bucket.Unknowns.chao1` exactly; it is a different
  formula from the classic bias-corrected estimator.** The Lean
  definition's `f2 = 0` fallback is `S_obs + f1(f1-1)/2`; the textbook
  Chao1 bias-corrected form for that case divides by `2(f2+1)` instead of
  `2`. `hte.unknowns.chao1` and
  `hte.unknowns.coverage_interval` both use the Lean formula, so a value
  computed here matches `Bucket.Unknowns.chao1_ge_sObs`'s own proof
  obligation, `chao1(...) >= S_obs`, under the identical arithmetic.
- **`from_evidence`'s claim-gap generator sweeps each concept slot in
  turn instead of one fixed "the" gap slot.** Nothing in `EvidenceItem`
  marks which slot a piece of evidence leaves unresolved, so this generator
  reads "one slot missing" as every one of the five concept slots, taken
  one at a time, holding the other four plus TIME_BIN at the address the
  evidence already names.
- **`from_evidence`'s contradiction generator reads "both readings" as
  the item's own `supports` and `refutes` lists.** An item with both
  non-empty already names two addresses it takes an opposed stance on;
  this generator decodes and emits both, tagged `meta["reading"]`
  (`"supported"`/`"refuted"`), rather than searching across items for a
  pair that disagrees about one address.
- **`from_evidence`'s cross-period generator copies into one other bin,
  chosen by `seed`.** "A placement copied to another bin" is singular; when
  more than one other time bin is attested elsewhere in the same evidence
  set, `seed % len(other_bins)` picks one deterministically instead of
  fanning out into every one of them.
- **`unknowns.robustness` and `tournament.run` both take an optional,
  additive keyword beyond their required parameters.** `robustness`'s
  `population` (default `None`) turns on the rank-spread reading described
  in `IDEAL-STATE-AND-UNKNOWNS-SPEC.md` §6d without changing the required
  call shape; `run`'s pairing tie-break is `seed`-derived per the
  signature already given, with no extra parameter needed.
- **`unknowns.value_of_information` reads "expected change in projected
  probability weighted by `u`" as `u^2`.** `Eq. voi`'s own justification
  for treating `Delta u_expected` as well defined without running the
  named retrieval is that new evidence always shrinks `u` (`Eq.
  opinion-sum`), so a hypothesis's own uncertainty mass already stands in
  for "expected change in `P`." Applying the described weighting by `u`
  again gives `u^2`, summed over every hypothesis address `gap.would_move`
  names with both a materialized hypothesis and a recorded opinion.
- **`unknowns.active_priority` takes `gap` but reads none of its fields.**
  It is accepted for parity with `Eq. voi`'s own `voi(gap)` notation and
  so a caller can read `gap.cost` or another field alongside the call; the
  five-factor sum itself names no field of `gap`, only the five explicit
  keyword arguments and their `weights`.
- **`tournament.critic_filter` hands the critic a plain-dict view of the
  hypothesis alongside the object.** `critic(h, h.to_dict())`, so a
  rule-based or model-backed critic can pattern-match on fields without
  the dataclass API. The contract for the returned report is a single
  key, `report.get("reject", False)`; anything else in the report is the
  caller's own, carried through in the `(hypothesis, report)` pairs
  `critic_filter` returns for every survivor.
- **`tournament.run` does not reseed Elo mid-tournament.** `main.tex`'s
  own "every fixed number of rounds, `Eq. opinion-sum` recomputes exactly
  and Elo reseeds from it" needs evidence and a vocabulary to recompute an
  opinion, a dependency this module does not carry. `run` executes one
  full tournament from a fixed `opinions` snapshot; a caller wanting the
  paper's reseed re-scores and calls `run` again.
- **`export.timeline_views`' `time_bins` are plain century-bin indices,**
  the same `hte.timeline.time_bin_index` units `hte.generate.
  enumerate_placements` takes, not `Interval` objects, so both modules
  read a bin the same way.
- **`hte.llm`'s system prompt is one fixed constant rather than a per-call
  parameter.** `complete()`'s own signature carries no `system_prompt`
  argument, so the one instruction every role's prompt needs, treat
  trained recall as low-tier `model-prior` evidence, lives once in
  `hte.llm.SYSTEM_PROMPT` instead of being repeated, and risking drift, in
  every role's own prompt text in `hte.roles`.
- **Every `claude -p` call passes `--setting-sources ""` and its own fixed
  system prompt, never `--bare`.** `--setting-sources ""` skips this
  repository's own CLAUDE.md, skills, and hooks so a role prompt costs
  only the tokens it contains; `--bare` was tried first and rejected, it
  requires `ANTHROPIC_API_KEY` or `apiKeyHelper` explicitly and refuses
  the OAuth/keychain login this machine uses (`claude --bare`
  returned `"Not logged in"` against this session's own working login,
  confirmed empirically before `hte/llm.py` was written this way).
- **`_write_cache` never sorts a cached response's keys.** An earlier draft
  wrote every cache file with `json.dumps(..., sort_keys=True)`. That is
  fine for the file on disk in isolation, but `hte.roles.meta_review`'s
  whole response dict gets embedded, by Python `repr`, into `self_report`'s
  own prompt (`hte.runner.run_campaign`'s `run_summary["meta_review"]`):
  the *live*, in-memory call orders that dict however the model returned
  it, while a *replayed* call orders it alphabetically, so the two builds
  of `self_report`'s prompt landed on two different cache keys for what
  should have been the identical call, and a cache seeded from a live run
  could not replay itself. Fixed 2026-09-09 by dropping `sort_keys=True`
  from the cache writer, so a value read back from cache reproduces the
  exact key order it was cached with. Any future role that embeds one
  role's whole response dict into another role's prompt should keep this
  in mind: prefer extracting the specific fields you need over embedding
  a raw dict, since a raw-dict embed is the one place cache round-tripping
  can change a prompt's text without changing its meaning.
- **The cache key is `sha256(model, prompt)`, deliberately excluding
  `role` and `schema`.** Two roles issuing the identical prompt to the
  identical model read the identical cached answer instead of paying for
  it twice; `schema` is a property of the call site, so two different
  schemas over the identical prompt would collide on this key if that
  ever happened; no call site in `hte.roles` does that today.
- **`hte.roles.extract`'s three ensemble passes differ in prompt text on
  purpose, not just in random sampling.** Each pass gets its own fixed
  "angle" sentence (`_EXTRACT_PASS_ANGLES`) folded into its prompt, so the
  three calls hash to three different cache keys instead of one prompt
  called three times (which would cache-hit on the second and third call
  and collapse the ensemble to a single opinion). Agreement is scored by
  exact-quote overlap after whitespace normalization, across the three
  passes' distinct quotes; escalation to the `escalation` model fires
  when fewer than `EXTRACT_AGREEMENT_THRESHOLD` of the distinct quotes
  were seen by two or more passes.
- **`hte.roles.extract` never trusts a model's own character offsets.**
  Every kept item's span is re-anchored by searching `document_text` for
  the model's quoted text verbatim (`_locate_span`); an item whose quote
  cannot be found this way (paraphrased rather than quoted) is dropped
  rather than given a fabricated span, since an LLM's own character
  counting is not reliable enough to hand straight to `EvidenceSpan`.
- **`hte.corpus.quantum_history` parses its corpus by regular expression,
  not by LLM.** The `quantum/07-history/*.md` card format already states
  a milestone's date, actor, significance, and `T1`-`T6` tier citation in
  one bulleted line, and a claim's tier in another; no extraction pass
  would improve on reading that structure directly, so this module makes
  no LLM call and needs no cache to run in tests.
- **`GroundTruthEvent.discovery_year` is documented equal to the event's
  own year, for both shipped corpora.** `main.tex` §9 assumes a claim's
  discovery date can differ from the event it describes; neither corpus
  this package ships states that difference anywhere, so this is this
  package's own simplification; neither corpus supplies the value.
- **The quantum-history corpus ships its own vocabulary,
  `hte/data/vocab-seed-quantum-history.json`, rather than reusing
  `hte.concepts.load_seed_vocabulary`'s Neolithic-farmers seed.** Its
  actors are physicists and labs; its one fringe row (quantum-mysticism
  popularizers) stands in for the ancient-history seed's extraterrestrials,
  so prior-profile robustness and the target-blind self-report have a
  non-consensus reading to test against in this domain too.
- **Fixed 2026-09-10: a 126-year corpus no longer collapses into two
  century time bins.** `hte.address.DEFAULT_SPAN_START`/
  `DEFAULT_BIN_WIDTH` still size TIME_BIN for `main.tex`'s own 20,000-year
  archaeological span, and every module-level default still reads them,
  but `hte.runner.run_campaign` no longer just accepts those defaults
  unconditionally: `hte.timeline.auto_resolution` picks the finest rung
  giving 8-40 bins over a corpus's own ground-truth span (quantum
  history's 1900-2026 range lands on decade bins), `hte.runner.
  _resolve_time_binning` anchors bin 0 at that span's own earliest year
  (`hte.timeline.bin_bounds`) instead of the paper's own -20,000, and
  `hte.generate.enumerate_placements`/`from_evidence` both take
  `span_start`/`bin_width` overrides threaded from there, so every
  hypothesis a run generates addresses under the same corpus-anchored
  axis. `hte.timeline.bin_label` renders a bin as `"1900s"` rather than a
  bare index. A config that pins `resolution` to a named rung instead
  reuses the paper's own fixed span at that rung's width, for exact
  backward compatibility (`tests/test_runner.py`'s frozen replay-only
  cache pins `"century"` for exactly this reason).
- **Fixed 2026-09-10: evidence is now linked to hypothesis addresses
  before scoring.** `main.tex` §9 assumes a prior generation pass has
  already done this; until `hte.link.link_evidence` was added, nothing in
  this package did, so `EvidenceItem.supports`/`refutes` stayed empty for
  the whole frontier and every survivor's opinion read `u=1.0`, `b=0`,
  `d=0`, differentiated only by the prior base rate `a`, confirmed
  empirically by the meta-review role's own read of the first unattended
  quantum-history run ("all 35 opinions have u=1.0, b=0, d=0 -- no
  evidence has differentiated any hypothesis yet"). `hte.corpus.
  quantum_history` and `hte.roles.extract` now both populate
  `EvidenceItem`'s own extracted slots (`actor`/`action`/`object`/
  `place`/`mechanism`/`interval`/`stance`, best-effort word-overlap or
  LLM-named, `bkt-hte-evidence-slots`), and `hte.runner.run_campaign`
  calls `link_evidence` on the full frontier before the critic filter and
  belief scoring both run. `hte.calibrate.run_holdout` was rewritten to
  match: it now reads the same per-item slots directly (building one
  placement candidate per pre-cutoff item, `hte.concepts.other_id` filling
  any slot the item names nothing for) rather than pooling a source's own
  subject, since a prior generation-and-linking pass is exactly what
  `main.tex` §9 assumed and this package now runs. `mu` is still excluded
  from `fit_constants`'s grid on `main.tex` §9's own word that it "takes
  no recalibration pass of its own."
- **`hte.runner.run_campaign`'s preservation critique reads the shipped
  ancient-history detectability table (`hte/data/detectability-seed.json`)
  against a modern-history hypothesis.** Neither shipped corpus assigns a
  `period_id` to its placements, and no period-keyed detectability table
  exists for quantum history, so the table `roles.preservation_critique`
  sees is illustrative and domain-mismatched by construction; the role's
  own prompt asks the model to read it as context rather than as this
  hypothesis's own period, and in practice the model's response says so.
  A real modern-history detectability table is future work and stays unbuilt
  here.
- **The fixture corpus is about a comet; the chemical compound vocabulary stays unused.**
  `hte/corpus/fixtures.py`'s first draft (2026-09-09) used a synthesized-
  compound scale-up scenario; one of its combinatorial placements drew a
  live Sonnet content refusal from the preservation-critic role
  (`API Error: ... Details: [bio]`), so the corpus was rewritten around an
  astronomical sighting instead, a toy domain no slot combination reads as
  dual-use.

## Decisions made where the source material left room

- **`main.tex` and `HISTORY-HYPOTHESIS-ENGINE-SPEC.md` disagree on the
  fuzzy-match term's scale.** The paper's own equation (`main.tex` §Belief
  model) reads `e_i = min(0.99, 0.40 cos + 0.25 fuz + 0.10 motif)` with no
  normalization noted; the older spec's code snippet divides fuz by 100
  (`0.25*(fuz/100)`). `hte.belief.edge_strength` follows the paper's own
  equation and expects `views["fuzzy"]` already in `[0, 1]`; a caller holding a raw
  0-100 fuzzy-match score must divide by 100 before storing it.
- **Era has no fixed numeric width.** The resolution ladder names five
  rungs, year/decade/century/millennium/era, but only the first four have a
  width anywhere in the source material (1/10/100/1000 years).
  `hte.timeline.RESOLUTION_WIDTH_YEARS[Resolution.ERA]` is a documented
  placeholder (10,000 years); no spec fixes this number.
- **The OxCal-style phase model is not built.** `bkt-hte-period-model` asks
  for "the OxCal-style phase model over the existing timeline array," which
  in the source material is a Gibbs-sampled Bayesian chronology, out of
  scope for this core package (no generator, tournament, or calibration run
  is built here either). `hte.timeline.combine_date_observations` gives
  `Period.date_posterior` the same shape a real phase model would populate,
  by the simplest defensible rule (inverse-variance-weighted Gaussian
  pooling), documented in its own docstring as a stand-in.
- **A sequence's prior logit is this package's own extension.** See above.

## Running the tests

```bash
cd tools/hypothesis-engine
make test
```

`tests/conftest.py` puts this directory on `sys.path`, so no install step is
needed first. `tests/test_belief.py` reproduces the Çatalhöyük
farmers-versus-extraterrestrials worked example from `main.tex` §Belief model
(`tab:worked-example`) to 3 decimals.

`tests/test_llm.py` and `tests/test_roles.py` monkeypatch `subprocess.run`
(or `hte.roles.llm.complete` directly), so they need no network access and
no `claude` CLI. `tests/test_runner.py` and the `campaign run` case in
`tests/test_cli.py` are the exception: they run `hte.runner.run_campaign`
end to end over `hte.corpus.fixtures` in `replay_only=True` mode against
the committed cache at `tests/fixtures/llm-cache/`, generated once by a
real `claude -p` run and replayed forever after at no cost and no network
call. `FIXTURE_CONFIG` in `tests/test_runner.py` documents which config
values are load-bearing for that cache (`generate_n`, `combinatorial_max_items`,
the campaign name itself): changing any of them changes a prompt's text,
and so its cache key, and needs the cache regenerated to match.

### Hypothesis profiles and the Makefile

`tests/conftest.py` registers two hypothesis profiles. `fast` (40 examples
per property, no per-example deadline) is the default. `full` (300
examples) is opt-in via `HTE_TEST_PROFILE=full`. A handful of properties
pin their own `max_examples` at the call site regardless of profile
(documented at each one); those run at their pinned count either way.

| Target | Profile | Scope | Stops on first failure |
|---|---|---|---|
| `make test` | `fast` | everything not marked `slow` | yes |
| `make test-full` | `full` | everything | no |
| `make test-durations` | `fast` | everything, `--durations=0` | no |
| `make test-cov` | `full` | everything, branch coverage over `hte/` | no |

`make test`/`make test-full` run under `pytest-xdist` (`-n auto`, one
worker per CPU core) when it is installed, serially otherwise; it is not
installed in this environment as of 2026-09-10 (`pip install --user
pytest-xdist`, no sudo needed).

A test earns the `slow` mark in `tests/conftest.py`'s `_SLOW_NODEIDS` by
measured duration: anything that took longer than 2 seconds under the
`fast` profile in a `make test-durations` run, whether from a pinned
`max_examples=300`, a real fixture cost (a LaTeX/matplotlib subprocess, a
20-seed campaign fixture, an on-disk parquet write), or per-example work.
The list lives in one place (`tests/conftest.py`) rather than as
individual `@pytest.mark.slow` decorators scattered across test files;
refresh it by rerunning `make test-durations` and updating the set by
hand. As of 2026-09-10, 13 of 661 tests carry the mark.

Wall time on this machine, 2026-09-10:

| Run | Time | Result |
|---|---|---|
| Whole suite, before this change (implicit 300 examples throughout) | 128.2s | 655 passed, 2 failed |
| `make test-full` (full profile, everything) | 127.1s | 659 passed, 2 failed |
| `fast` profile, `not slow`, run to completion | 59.2s | 646 passed, 2 failed, 13 deselected |

`make test` itself carries `-x` and currently stops at 38.6s on the first
of those 2 failures; the completion time above runs the same `fast`/`not
slow` selection without `-x` for a fair before/after comparison. Both
failures predate this profile/Makefile work and sit outside it:
`tests/swarm/test_unknowns_props.py::test_surprise_is_empty_when_every_item_is_linked`
and its neighbor `test_surprise_flags_an_item_naming_no_materialized_address`
each do `from conftest import evidence_item`. Neither `tests/swarm/` nor
`tests/swarm2/` carries an `__init__.py`, so pytest's default import mode
gives both directories' `conftest.py` the same bare module name
`conftest`; whichever one is imported second during collection wins that
name in `sys.modules` for every later bare `from conftest import ...` in
the run, and `evidence_item` is defined only in `tests/swarm/conftest.py`.
Fixing it belongs to whoever owns `tests/swarm/test_unknowns_props.py`.

`make test-cov` writes the standard HTML report to `.coverage-html/`
(gitignored) and `tests/COVERAGE.md`: the 15 files with the lowest
coverage percentage, each with its uncovered line ranges, as the target
list for the next test swarm.

## Corpora

Every corpus below is registered in both `hte.cli._CORPUS_LOADERS` and
`hte.runner._CORPUS_LOADERS` (kept as two separate dicts, one per
module's own `--corpus`/`cfg["corpus"]` contract), so any of them runs
through `campaign run`, `calibrate`, and `hte-synth`-style scripted use
the same way.

| `--corpus` | Loader | Ground truth | Holdout mode picked |
|---|---|---|---|
| `quantum-history` | `hte.corpus.quantum_history.ingest` | 105 events, `discovery_year == year` | k-fold |
| `fixtures` | `hte.corpus.fixtures.build` | 6 events, `discovery_year == year` | k-fold |
| `education-atlas` | `hte.corpus.education_atlas.load` | 125 severity-flagged problem rows, `discovery_year == year` | k-fold |
| `production` | `hte.corpus.production.load` | 8 accepted claims, `discovery_year` = review-acceptance date | discovery-date |

`education-atlas` reads a live clone of the sibling `bucket-foundation/
education-atlas` repo (its `data/processed/sample/` ships Parquet, not
committed into this repo), resolved in order: `$EDUCATION_ATLAS_DIR`
(the sibling repo's own root) or `$EDUCATION_ATLAS_SAMPLE_DIR` (the
sample directory directly, an explicit `sample_dir` argument's own
finer-grained sibling), then `../education-atlas` relative to this
repo's own root, then `~/agfarms/education-atlas`. A checkout not found
at any of those raises `FileNotFoundError` from `education_atlas.load()`
naming both env vars; `tests/test_corpus_education_atlas.py` and `tests/
test_runner.py`'s own education-atlas end-to-end tests skip instead of
failing when none exists.

"Holdout mode picked" is `hte.calibrate.choose_holdout_mode`'s own read
of each corpus's own ground truth (`bkt-hte-calibration-redesign`): every
corpus above except `production` sets `discovery_year == year` for every
event, so `hte.calibrate.holdout_by_discovery_date` would split every
one of them onto one side of any cutoff and score nothing;
`hte.calibrate.run_calibration` picks `hte.calibrate.holdout_kfold`
instead, and the reason lands in that run's own `CALIBRATION.md`.
`production` carries a real discovery lag (a claim's own review-
acceptance date, distinct from its subject date), so discovery-date
holdout stays informative there and is what gets picked.

## Running a real campaign

```bash
cd tools/hypothesis-engine
python3 -m hte.cli campaign run --corpus quantum-history --seeds 3
python3 -m hte.cli calibrate --corpus quantum-history --fit
python3 -m hte.cli views runs/default/<timestamp>/
```

Any other registered corpus runs the same way, `--corpus education-atlas`
or `--corpus production` in place of `--corpus quantum-history` above
(`docs/K12-INTEGRATION.md`, `docs/RESEARCH-OS-INTEGRATION.md`).

or, once installed (`pip install -e .`), the `hte` console script directly.
Every LLM call `run_campaign` makes shells out to the `claude` CLI already
authenticated on this machine; nothing in this package ever reads or prints
an API key.

## Voice lint

```bash
agf-lint-voice-src check tools/hypothesis-engine
```
