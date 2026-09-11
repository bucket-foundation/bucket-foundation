# Loop log

Dated entries from the hourly optimization loop. Newest entry first.

## 2026-09-11, PR #80 review and merge: counter-evidence and duplicate stemma on the outbox seam

- **Scope**: `hte/corpus/production.py` (`_research_os_counter_evidence`,
  `ClaimEvidence.stance` per-entry override, `Production.duplicate_of`,
  a stemma edge from a duplicate's own `Source` to the matched
  production's), `hte/corpus/literature.py` (`discover_card_roots`, real
  on-disk corpus root auto-discovery in place of the network-fetch-only
  path), `docs/PRODUCTION-SCHEMA-ALIGNMENT.md`.
- **Outbox contract check**: this PR reads the guard's own
  `counter_evidence`/`duplicate_flag` columns verbatim (no independent
  duplicate-detection or counter-evidence-requirement recompute of its
  own); it has no write path back to `graph.productions` at all, so it
  cannot overwrite a guard flag. Neither field reaches the outbox row on
  the app side yet (`ProductionOutboxRow` in `engine-bridge.ts` still
  nine fields, confirmed by grep) so this is the read-side half of the
  seam, tested against a simulated row per the PR's own test plan.
  `lateral_reading_flag` (`PRODUCTION-GUARD.md` Rule 5) is untouched by
  this PR too, and by every merged PR to date: it is documented as
  informational/review-queue-only (`PRODUCTION-GUARD.md`, "every other
  flag ... is informational, visible but never blocking"), not an
  evidentiary signal the engine has a slot for; no gap to log there.
  `learning/research-os/ENGINE-BRIDGE.md`'s own table/data-flow
  description is unchanged by this PR and needed no update: the raw-row
  passthrough contract it documents is exactly what this PR extends.
- **Learner text**: counter-evidence text lands in `EvidenceItem.span.
  quote`, the same normalized-envelope slot ordinary evidence text
  already occupies; no new field carries raw learner text further than
  that existing path.
- **Leak scan**: clean, no keys, IPs, `/home/gian` paths, Claude session
  URLs, or personal emails in the PR's diff.
- **Voice lint**: `agf-lint-voice-src check` and `agf-lint-voice check`
  both 0 violations. No fix needed.
- **Gates**: merged `origin/main` (clean, no conflicts, brought in #78).
  `ruff check` clean. `make test`: 1352 passed, 18 deselected, 0 failed.
- **Blocked**: nothing. Merged.

## 2026-09-11, PR #78 review and merge: retraction propagation and fragility

- **Scope**: `hte/propagate.py` (derivation graph, per-hop damped
  recompute, `CascadeReport`, `apply_retraction`, `fragility`/
  `rank_fragility`), `hte/evidence.py` (`retracted_by`), `hte/runner.py`
  (wires propagation into the campaign loop, writes `cascade.json`),
  `hte/export.py` (`TIMELINE.md` fragility section), `hte/artifacts.py`
  (`CascadeArtifact`, `fragility_top10`), `hte/canon_writeback.py`
  (`canon_tier: contested` for a card whose support routed through a
  retracted node, plus a `retract` feed event), `docs/PROPAGATION.md`.
- **Deletion check**: `apply_retraction` adds a `refutes` item and stamps
  `retracted_by`; no node, edge, or existing evidence item is removed.
  Confirmed in `propagate.py`'s own docstring and in code.
- **Canon gate**: `write_back` still never writes `canon_tier: "canon"`;
  a cascaded candidate gets `"contested"` in place of `"candidate"`,
  strictly more cautious, `signoff` still required. Fail-closed intact.
- **Research OS bridge gap**: `fragility_top10` lands in `cascade.json`/
  `self-report.json`/`MANIFEST.json` (engine-side artifacts) but this PR
  does not touch `src/lib/research-os/engine-bridge.ts` or `db.ts`
  (the PR #14 adapter, `EngineHypothesisInput`/`buildEngineNode`); no
  fragility score reaches a `graph.nodes` row yet. Confirmed in scope:
  PR body states it does not touch the corpus/bridge layer. Not a
  blocker for this PR, flagged here as a follow-up (wire
  `fragility_top10` through `campaign_research_os.py` and
  `EngineHypothesisInput` in a later PR).
- **Leak scan**: clean, no keys, IPs, `/home/gian` paths, Claude session
  URLs, or personal emails in the PR's diff.
- **Voice lint**: `agf-lint-voice-src check` and `agf-lint-voice check`
  both 0 violations.
- **Fix applied**: `ruff check` flagged one PR-introduced violation,
  an unused `opinions_before` local in
  `tests/test_propagate.py::test_cascade_report_lists_a_b_c_with_correct_hops_and_shares`.
  Removed the dead assignment (the test never read it). `ruff check`
  clean after.
- **Gates**: merged `origin/main` (clean, no conflicts). `make test`:
  1331 passed, 18 deselected, 0 failed.
- **Blocked**: nothing. Merged.

## 2026-09-11, PR #70 post-merge review and voice-lint fix

- **Scope**: PR #70 (`feat/hte-ground-truth-enrichment`, richer
  production fixtures prod-013..034, five new literature cards under
  `educational-methods`, a widened `_IMPROVED_KEYWORDS`/`_WORSENED_KEYWORDS`
  literature ground-truth rule) had already been merged by an earlier
  session (`410e702d8`) by the time this pass started. Ran the review
  gates against the merged content instead of gating the merge itself.
- **Envelope check**: every new `production-fixtures/prod-0{13..34}.json`
  matches `docs/PRODUCTION-SCHEMA.md`'s envelope (`id`, `created_at`,
  `author_role`, `grade_band`, `school_or_district_id`,
  `research_question`, `claims[].{text,stance,slots,interval,evidence}`,
  `review`, `provenance`); spot-checked prod-013, prod-021, prod-034.
  No `lateral`-reading PR merged into `main`, so the sources-independence
  flag this schema doesn't carry yet does not apply.
- **DOI spot-check**: 4 of the 5 new literature cards checked against
  OpenAlex (Alonzo & Steedle 2009, Corcoran/Mosher/Rogat 2009, Deci/
  Koestner/Ryan 1999, Deci/Ryan 2000); title, authors, and journal match
  the card front matter on all four.
- **Leak scan**: clean, no keys, IPs, `/home/gian` paths, Claude session
  URLs, or personal emails in the PR's file set.
- **Voice lint**: `agf-lint-voice check` on the touched files found 2
  violations, both Low: `_IMPROVED_KEYWORDS`'s `"successfully produced"`
  entry (banned adverb, no fixture text depends on the literal string)
  and two antithesis-shaped exception messages in `test_api.py`
  (`"a campaign bug, not a refusal"`, `"a bug in response assembly, not
  a campaign failure"`, neither message content is asserted on, only
  the exception's own class name). Fixed on a follow-up branch
  (`fix/pr70-review-voice-and-log`) rather than reopening #70: renamed
  the keyword to `"went on to produce"` and reworded both messages to
  drop the antithesis. `agf-lint-voice check` and `ruff check` clean
  after.
- **Gates**: `make test` on `origin/main` with #70 merged: 1284 passed,
  18 deselected, 0 failed. Targeted rerun of `test_api.py` +
  `test_corpus_literature.py` after the voice fix: 99 passed.
- **Blocked**: nothing.

## 2026-09-11, PR #77 review, tick 6's own log entry

- **Scope**: review of #77 (`docs/hte-loop-log-2026-09-11-tick5`), a
  docs-only PR adding the tick-6 entry directly below. Leak scan clean
  (no keys, IPs, home paths, session URLs, or personal emails).
- **Claims spot-checked against merged code**, 4 of them: PR #72's
  merge commit (`49a030149...`) and PR #75's merge commit
  (`3426786c0...`) both match `gh pr view`'s own record exactly; PR
  #74's migration (`20260910080000_research_os_guidance.sql`) adds
  exactly the two columns the entry names, `graph.nodes.worked_example`
  and `graph.classes.research_os_guidance_enabled`, nothing else;
  `tests/swarm-20260911/test_bridge_export_props.py` collects exactly
  15 tests (`pytest --collect-only`), matching the entry's count. No
  contradiction found.
- **Research OS docs**: the entry mentions PR #74 touches
  `src/lib/research-os/` but this PR itself edits no Research OS doc,
  so no `DELETIONS.md` entry applies.
- **Voice lint**: `LOOP-LOG.md` is listed in `.voiceignore`; not
  scanned, per that file's own scope note.
- **Blocked**: nothing.

## 2026-09-11, tick 6, bridge_export swarm and five PR reviews

- **Environment**: no `pytest`/`hypothesis`/`jsonschema`/`matplotlib`/
  `pandas`/`pyarrow` present; installed with `pip3 install --user`.
- **Engine health**: `make test` on `main`, 1225 passed, 18 deselected,
  0 failed. No defect.
- **Random campaigns**: `hte-synth run --seeds 0-29` 30/30, gate PASS,
  repeat run identical to full float precision, no nondeterminism.
  `realsweep --corpus education-atlas --seeds 0-9` ran 5-6x slower than
  the documented baseline on this sandbox's 4-core box; cut off after
  7/10 seeds. Those 7: no crashes, no `run.log` errors, `coverage_of_
  truth` 0.59-1.0 (above the stale committed baseline, consistent with
  PR #48's fixes already on `main`). Sweep incomplete this tick
  (seeds 8-9 and `production`/`literature` never started); no defect in
  what ran.
- **Test swarm**: `hte/bridge_export.py` had no dedicated test file.
  New `tests/swarm-20260911/test_bridge_export_props.py`, 15 tests
  (`write_bridge_export`'s file write, `_source_tier`'s empty/multi-tier
  branches, `model` with/without a `models` key, `evidenceCitations`
  mapping, contract-pinned fields). No defect. PR #75.
- **PRs opened**: #75 (own).
- **PRs reviewed/merged**: #72 (`fix/hte-`, clean, 1230 passed) merged
  `49a030149`; #75 (own, clean, 1259 passed) merged `3426786c0`; #70
  (`feat/hte-`, clean, 1250 passed, one nice-to-have) not merged, wrong
  prefix; #69 (`docs/`) clean, merged by its author first; #68
  (`chore/`) clean, out of scope (repo root); #74 (`feat/ros-`, touches
  `src/lib/research-os/` + a migration) clean, only `graph.nodes`/
  `graph.classes` columns added, no alignment-PR trigger, out of scope.
  **#74 turned `dirty` (conflict with `main`) between review and
  re-check**, needs a rebase before anyone merges it.
- **Blocked**: nothing else. No secret or High/Critical finding.

## 2026-09-11, PR #62 and PR #67 review

- **Scope**: review pass over #62 (`fix/hte-writeback-review-2`, pipeline
  stage cascade rules, writeback CLI tests, full-population candidate
  reconstruction) then #67 (`docs/hte-loop-log-2026-09-11-tick3`), in
  that order, from another session. Leak scan clean on both (no keys,
  IPs, emails, home paths, or session URLs in either diff).
- **#62, fixed on the branch**: merged `origin/main` (brings in PR #60's
  understanding-artifact refusal) and found no test at the
  `run_pipeline`/CLI layer exercising both write-back refusals together
  (only at `write_back` directly); added
  `test_writeback_stage_reports_write_backs_own_signoff_refusal_as_a_failed_stage`
  and `..._understanding_refusal_as_a_failed_stage` in `test_pipeline.py`.
  Separately, two of this PR's own new real-write (`dry_run=False`)
  tests wrote to the committed `hte/data/ranking-holdout-ledger.jsonl`
  on every run (no `ledger_path` override), and one skipped
  `HTE_LLM_MODE=fake`, passing only when an earlier test in the run
  order left that env var set. Plumbed `writeback_ledger_path` through
  `pipeline.run_pipeline`'s config, pointed every real-write test at a
  `tmp_path` ledger, and set `HTE_LLM_MODE=fake` explicitly on the two
  that needed it.
- **#62, gates**: `make test`: 1239 passed, 18 deselected, 0 failed.
  `ruff check .` clean on every file this PR touches (43 pre-existing
  errors elsewhere in the tree, unchanged from main). Squash-merged
  (`939bac711`).
- **#67, governance**: docs-only change, no Research OS surface touched.
  Spot-checked four claims in the new log entry against repo state:
  squash-merge commit `4bd4e07dd` matches PR #66's own merge commit;
  PRs #59, #58, #56, #55, #54, #51 all confirmed `MERGED`; the claimed
  `tests/swarm-20260911/test_api_validation_props.py` exists with
  exactly the claimed 21 tests, covering the three named functions. No
  contradiction with merged code.
- **#67, gates**: merged `origin/main` twice (before and after #62
  landed in this same pass); both clean, no conflicts. No code file
  touched, so `make test`/`ruff` don't apply. Squash-merged
  (`5e2dfa521`).
- **Blocked**: nothing.

## 2026-09-11, tick 3, api.py swarm and six PR reviews

- **Environment gap**: this container carried none of `pytest`,
  `hypothesis`, `jsonschema`, `matplotlib`, `pandas`/`pyarrow`, or
  `coverage`; installed all with `pip3 install --user`, no sudo. Once
  installed, `make test` (fast) on `main`: 1084 passed, 18 deselected, 0
  failed. No engine defect.
- **Random campaigns**: synth `--seeds 0-29` fake mode, 30/30, coverage
  1.0, gate PASS; repeated seeds 0-2, identical to full float precision,
  no nondeterminism. `realsweep` over education-atlas/production/
  literature `--seeds 0-9` each, 0/30 crashed; education-atlas's
  0.15-0.5 spread matches the pre-fix baseline PR #48 (merged this tick)
  already documents, not a new defect.
- **Test swarm**: `hte/api.py`'s `_validate_production_record`
  (86.7%, no dedicated swarm file; `tests/test_api.py` covers its
  enum-value branches only). New `tests/swarm-20260911/
  test_api_validation_props.py`, 21 tests over every shape-validation
  branch plus `_llm_mode_override`/`_calibration_summary`; isolated
  `hte/api.py` coverage 86% to 99%. Full suite 1105 passed. Skipped
  regenerating `tests/COVERAGE.md`: `make test-cov`'s full profile hit
  two `slow` tests failing on missing `agf-lint-voice`/`pdflatex`
  binaries (the second newly confirmed), which would have written a
  snapshot skewed by environment gaps rather than real numbers.
- **PRs opened**: #66 (the swarm work above), reviewed clean and
  squash-merged (`4bd4e07dd`).
- **PRs reviewed**: #59, #58, #56, #55, #54 (new since tick 2), #51
  (re-review after a new commit). All six merged by the concurrent
  local-session loop shortly after, none matching this loop's own merge
  authority regardless. Findings: #59 clean, two Medium notes; #58 one
  High (union-interval rule yields multi-millennium spans on 51 of 52
  correlations, so the reported coverage gain reads as an interval-width
  artifact); #56 clean; #55 two Medium (a real silent-failure gap in
  `parse.py`'s rename handling, a stale doc line), two Low; #54 RLS
  confirmed deny-all/service-role-only, schema-alignment trigger did not
  fire, one Medium (missing field length cap); #51 the tick-2 conflict
  is fixed but `main` moved again, fresh Medium re-rebase finding.
- **Blocked**: nothing.

## 2026-09-10, PR #60 review

- **Scope**: review pass over PR #60 (`feat/ros-11-engine-review-items`,
  the "2026-09-10, ros-11 review items" entry below) before merge.
  Leak scan clean (no keys, IPs, emails, home paths, or session URLs in
  the diff). `make test`: 1116 passed, 18 deselected, 0 failed (1115 from
  the PR plus one added here). `ruff check .` and `agf-lint-voice-src
  check` clean on every file this pass touched.
- **Fixed on the branch**: `tests/test_canon_writeback.py` gained
  `test_write_back_refuses_without_signoff_or_understanding`, exercising
  both `write_back` no-partial-state gates (signoff, understanding)
  together in one test, the coverage gap the PR's own signoff test and
  understanding-artifact tests left between them (each gate had its own
  test; nothing showed the two refuse independently in the same call
  chain, or that a blank signoff never reaches the understanding step at
  all).
- **Filed, not fixed (exceeds a 30-minute review-fix budget)**: `hte.
  evidence.EvidenceSpan.__post_init__` checks only internal consistency,
  `char_start >= 0` and `char_end >= char_start`, never against `doc_id`'s
  own stored document length; `hte.corpus.Source` carries no document
  text or length field to check against, so a span pointing past its own
  document's end passes today. `PLAN.md` section 10's full-document-
  evidence-auditability ask (item 4, the one `hte.canon_writeback.
  _evidence_line`/`_evidence_detail` expose `doc_id`/`char_start`/
  `char_end` for) reads as validated only in the sense that the fields
  are present and internally consistent, not that they are checked
  against real document bounds. TODO left at `hte/evidence.py`'s own
  `__post_init__`; follow-up bead filed in `BEADS-PENDING.jsonl`
  (`bkt-hte-evidence-span-doc-length`), needs a document-length store
  keyed by `doc_id` before real validation is possible.
- **Verified, no change needed**: the ranking label (`hte.holdout_
  ledger.ranking_status`) is driven by ledger state with `MIN_VERIFIED_
  FOR_LABEL = 20` documented in that module's own top docstring and
  tests for both the unvalidated and validated states; `hte/export.py`'s
  hardcoded "Elo is unvalidated" string is a documented floor (`BEADS-
  PENDING.jsonl`'s own follow-up entry), never overstates validation
  either way; the holdout ledger stores hypothesis statements and engine-
  internal ids only, no learner text; the novelty check runs before any
  file write and records a score plus the closest match, not gating,
  so it never blocks (silently or otherwise); `learning/research-os/
  ENGINE-BRIDGE.md` documents the `graph.nodes`/outbox bridge
  (`EngineHypothesisInput`, a different data flow, `campaign_research_
  os.py`'s export), carries no `understanding`/`elo_status`/envelope
  field from `hte.canon_writeback`'s own contract, so this PR's write-
  back change touches nothing that file covers, confirmed by grep, not
  left unchanged on the PR's own say-so alone.

## 2026-09-10, ros-11 review items

- **Scope**: `bkt-hte-ros-11-review-items` (bead `ros-11`), `learning/
  research-os/PLAN.md` section 10 against `BEADS-PENDING.jsonl`'s own
  status line, "signoff enforced by PR #43, ranking label done by PR
  #54, cross-family independence has no current claim; six other
  section 10 items remain open." Of those six, four landed this branch:
  a persisted, append-only ranking-holdout ledger and hit-rate report
  (`hte.holdout_ledger`, `MIN_VERIFIED_FOR_LABEL = 20`, documented in
  that module's own top docstring) backing the section-10 item 3
  ranking label PR #54 wired the export surface for; full-document
  evidence auditability (item 4), `hte.canon_writeback._evidence_line`/
  `_evidence_detail` now carry `doc_id`/`char_start`/`char_end`
  alongside the quote and locator, additive in the feed402 envelope
  (`supports_detail`/`refutes_detail`, next to the existing id lists); a
  lexical novelty check against `bucket-canon/` before write-back
  (`hte.novelty`, not itself a section 10 line but a direct answer to Si,
  Yang, and Hashimoto 2024's low-output-diversity finding); and the
  understanding axis (item 6), `hte.roles.understanding`, a
  plain-language explanation per candidate marked `generated_by: model`
  everywhere it is stored, `hte.canon_writeback.write_back` refusing the
  whole write when any candidate's own explanation comes back blank
  (Messeri and Crockett 2024, Krenn and others 2022). Left open, per the
  task's own four-item stop: item 5 (stress-test fusion on conflicting
  evidence, Yager 1987), item 7 (the thirteen Allen interval relations
  check on the address scheme, Allen 1983), item 8 (CASP-style
  calibration cadence).
- **Engine health**: `make test` green on `main` before any change,
  1084 passed, 18 deselected. No defect.
- **New tests**: `tests/test_holdout_ledger.py`, `tests/test_novelty.py`,
  plus new cases in `tests/test_canon_writeback.py`, `tests/test_roles.py`,
  `tests/test_fakellm.py`, `tests/test_cli.py` (`hte holdout-ledger
  report`/`verify`). `make test` after: 1115 passed, 18 deselected, 0
  failed.
- **Gates**: `ruff check .` clean on every file this pass touches (32
  pre-existing errors elsewhere in the tree, unchanged); `agf-lint-
  voice-src check` clean on every file this pass authored or edited.
  No `src/`/`public/` file touched, so no `npm`/`tsc`/`next lint` gate
  applies.
- **Write-back contract**: `build_envelope`'s `data` dict gained
  `understanding`, `novelty`, `elo_status_detail`, `evidence.
  supports_detail`/`refutes_detail`, additive next to every existing
  field; `render_card`/`render_index`/`build_envelope` all now require
  `understanding`/`novelty` arguments (`write_back`'s own callers,
  `hte.pipeline`, updated; a direct caller of the lower-level renderers
  needs updating too). `learning/research-os/ENGINE-BRIDGE.md` reviewed
  and left unchanged: it documents the `graph.nodes`/outbox bridge
  between the Next.js app and the engine, not `hte.canon_writeback`'s
  own card/envelope contract, and this pass touches none of what it
  covers.
- **Blocked**: nothing.

## 2026-09-10, PR58 review, and queue wrap-up (PR42/48/49/51/58)

- **PR #58 reviewed and merged** (`feat/hte-sacred-history-data`,
  "sacred-history dating, transmission edges, slot alignment for
  build-history"), squash commit `138c227df`, worktree
  `.ros-worktrees/r58` per the review protocol.
- **Leak scan**: full diff against `origin/main` clean, no keys, IPs,
  non-public hostnames, personal emails beyond `gianyrox@gmail.com`,
  PII, absolute `/home/gian` paths, or Claude session URLs.
- **Governance**: no canon write path, no sign-off surface, no
  ranking/Elo output touched, not applicable to this PR.
- **Correctness**: every non-timeline-dated tradition (`greek`,
  `mesopotamian`) falls back to a documented, cited external anchor
  (George 2003, West 1985) rather than a fabricated date; every
  correlation interval is derived (overlap or union of the two sides'
  own tradition spans) and carries `uncertainty: uniform`, never a
  fabricated `POINT`. Stemma edges read a future `direction` field when
  present and fall back to a mutual undirected pair, matching every
  correlation this bundle currently ships. The new T3/T4 tier split and
  the three new ground-truth-matching correlations close this file's
  own zero-coverage finding (`docs/BUILD-HISTORY.md`, "Data fixes").
- **Merge**: `origin/main` clean, no conflicts (this PR's own files,
  `sacred_history.py`/its test/its data file/`BUILD-HISTORY.md`, had no
  overlap with anything else on `main`).
- **Gates**: `make test` 1172 passed, 18 deselected. `ruff check` clean.
  `agf-lint-voice check` / `agf-lint-voice-src check`, 0 violations.

**Queue wrap-up**, the five-PR review-and-merge pass this tick covered:
- **#42** (`feat(hte): provenance index and purge`): reviewed and
  merged, see "2026-09-10, PR42 review" below.
- **#48** (`feat(hte): coverage diagnostics and generation coverage
  fixes`): merged by a concurrent session (squash `582f96b0b`) before
  this session's own push landed; this session's review found and fixed
  one real issue (8 unused module-level imports plus 4 shadow-
  redefinitions `hte/cli_synth.py` picked up, ruff F401/F811) that did
  NOT make it into the merged squash, since the other session won the
  race. Flagged here rather than silently dropped: `hte/cli_synth.py`
  on `main` as of `582f96b0b` still carries the unused
  `calibrate`/`diagnostics`/`Constants`/`Corpus`/`education_atlas`/
  `literature`/`production`/`quantum_history` module-level imports,
  each `_build_*_subcorpus` function already re-importing its own
  module locally. Low severity (ruff-only, no behavior change), left
  for a future tick or a drive-by fix.
- **#49** (`fix(hte): pipeline stage cascade rules, writeback CLI
  tests`): this session found the same High-severity gap a concurrent
  session's own review found independently (this branch forked before
  PR #43 added the fail-closed named sign-off to `canon_writeback.
  write_back`/`pipeline.py`, so every writeback call/test/CLI path this
  PR added carried no `signoff`), and had a fix in progress (merge
  conflict resolved keeping both the cascade restructuring and the
  signoff gate, three tests updated to pass a signoff, a new CLI-level
  `--signoff` early-validation check plus its own refusal test, mirror
  of the existing `--branch` check) when the other session's own fix
  landed first as PR #62 and closed #49 as superseded. No merge
  happened from this session's side; #62 is not in this tick's own
  review scope.
- **#51** (`docs(hte): record FINDING-2026-09-10-501`): already merged
  before this session started (`mergedAt: 2026-09-11T01:32:48Z`, a
  different tick of this same loop per `docs/PRODUCTION-SCHEMA-
  ALIGNMENT.md`'s own history); skipped, nothing to review.
- **#58**: reviewed and merged this tick, above.

Final engine test count this tick's own last gate run (`make test` on
`review/pr58` post-merge, `origin/main` through PR #58 inclusive):
**1172 passed, 18 deselected.**

## 2026-09-10, PR42 review

- **PR #42 reviewed and merged** (`feat/hte-purge`, "provenance index and
  purge for learner-derived artifacts"), worktree `.ros-worktrees/r42`
  per the review protocol.
- **Leak scan**: full diff against `origin/main` clean, no keys, `.env`
  values, IPs, non-public hostnames, personal emails beyond
  `gianyrox@gmail.com`, PII, absolute `/home/gian` paths, or Claude
  session URLs in file content.
- **Governance**: `hte/purge.py`'s feed402-envelope pass only reaches
  `public/research/hypotheses/*.json` (the same `envelope_dir`
  `hte.canon_writeback.write_back`, merged on `main` since this branch
  diverged, writes to); it never touches `bucket-canon/`, so a signed-off
  canon card and its ingestion-index entry stand after a purge. Closed
  the reachability gap the docstring names: added `hte purge --production
  <id>` as the required manual call on `learning/research-os/compliance/
  DATA-INVENTORY.md`'s `research_os_productions_outbox` row (not yet
  wired into `POST /api/research-os/privacy`).
- **Merge conflict**: `origin/main` had moved on `hte/corpus/production.py`
  since this branch's base (PR #29's vocab-induced OBJECT slot and
  `created_at`-year interval on `normalize_research_os_record`, landed
  after this branch cut). Resolved keeping both: PR #29's slot/interval
  reads plus PR #42's per-production evidence source-id scoping
  (`author_role`/`production_id` on `_research_os_evidence`), and updated
  `test_corpus_production.py`'s sky-blue fixture assertion to expect the
  now-real `GroundTruthEvent` instead of the pre-#29 null-slot behavior.
- **Gates**: `make test`, 1118 passed, 18 deselected. `ruff check` clean
  on every file this PR touches (fixed one E741 ambiguous-name in the
  new `tests/test_purge.py`; the other 32 ruff hits on the branch are
  pre-existing debt in files this PR does not touch). `agf-lint-voice
  check` / `agf-lint-voice-src check`, 0 violations.

## 2026-09-11, tick 2

- **PRs reviewed**: #51 (`docs/hte-findings-round-six-cli-llm-leak`, a
  different tick of this same loop): content accurate, but `mergeable_state`
  is now `dirty` against the LOOP-LOG entry #53 below already claimed;
  branch prefix also excludes it from this loop's merge authority either
  way, "fix or note before merge". #52 (`feat/ros-roster-sync`, OneRoster
  CSV roster sync, opened by a different session): verified the 6
  privacy/security claims (PII handling, RLS on `reviewer_candidates`,
  server-side `verifyReviewer` gate, no auto-grant approval path,
  idempotent apply-twice) against the code rather than the PR body; 5 of
  6 held, 1 Medium finding (no CSV upload size/row cap on `POST /api/
  research-os/roster`), "fix or note before merge". Neither is a
  `fix/hte-`/`test/hte-` PR of this loop's own, so neither merged.
- **Carried forward**: #54, #55, #56 opened by other sessions after this
  tick's review pass finished; not reviewed this tick, next tick's own
  step 4 picks them up.
- **Blocked**: nothing else.

## 2026-09-11, tick, serve.py swarm and PR50

- **Engine health**: `make test` green on `main` first, 1057 passed. No
  defect.
- **Random campaigns**: synth `--seeds 0-29` 30/30, gate PASS, no
  nondeterminism on repeat. `realsweep` over education-atlas/production/
  literature, `--seeds 0-9`: 0/30 crashed, every metric matched the
  committed `runs/realsweep/*/SUMMARY.md` baseline exactly. No defect.
- **Test swarm**: `hte/serve.py` (78.3%, no prior swarm file). New
  `tests/swarm-20260910/test_serve_props.py`, 8 tests (the 502 branch,
  `build_parser`, `main`'s lifecycle, stubbed, no real socket). No
  defect. Full suite: 1065 passed.
- **Environment note**: `tests/test_referee.py`'s one `slow`-marked test
  fails on `FileNotFoundError: agf-lint-voice`, absent in this remote
  container. Environment gap; `make test`'s fast gate never hits it.
- **PRs opened**: 1, #50, reviewed and squash-merged (`d09fcd20`).
- **PRs reviewed**: #41 (own), reviewed and squash-merged (`4236e29f`).
  #42 (`feat/hte-purge`): 1 High (silent no-op on a JSON-corrupting
  redaction), 1 Medium, "fix or note before merge". #48
  (`feat/hte-generation-coverage`): 2 High (a documented `literature.
  load_local` loader and a `realsweep --diagnose` flag, neither exists
  in the diff), 3 Medium, "fix or note before merge". #49
  (`fix/hte-writeback-review`, opened by the local-session loop): 1 High,
  the diff silently drops the `writeback_signoff` check and stops
  passing `signoff=` to `canon_writeback.write_back` at the
  `hte/pipeline.py` call site (the PR #43 governance gate itself is
  untouched and intact), "fix or note before merge". None of #42/#48/#49
  is a `fix/hte-`/`test/hte-` PR of this loop's own, so none merged
  regardless.
- **Blocked**: nothing.

## 2026-09-11, tick, mcp_tool swarm and live-call incident

- **Engine health**: `make test` on `main` reached 52% with zero
  failures before contention from concurrent PR-review worktrees forced
  a kill; independently confirmed green by later reviews (1076, 1074,
  995 passed on three other branches this same tick).
- **Critical incident**: this tick's own `make test` spawned two real
  `claude -p` subprocesses (`meta_review`/`self_report` over `fixtures`),
  killed on sight. Root cause: `test_cli.py`'s three PR #29 tests, no
  `HTE_LLM_MODE=fake` guard. Opened `fix/hte-cli-tests-leak-live-llm-calls`
  (#46); founder closed it as a duplicate of #40 (already merged,
  `61089924f`, same fix plus a suite-wide `_no_real_subprocess` autouse
  guard). Filed as `FINDING-2026-09-10-501` in a docs-only follow-up (#51,
  this PR).
- **Random campaigns**: `hte-synth run --seeds 0-29` fake mode, 30/30,
  gate PASS, repeat run identical. `realsweep --corpus
  education-atlas/production/literature --seeds 0-9`: 0 crashes, every
  metric matches the committed reference `SUMMARY.md` exactly.
- **Test swarm**: `hte/mcp_tool.py` (indirectly covered only). New
  `tests/swarm-20260910/test_mcp_tool_props.py` pins every enum/default
  `TOOL_DEFINITION` transcribes by hand against its real source, and
  found `FINDING-2026-09-10-401` (an unchecked citation `type`, fixed in
  `hte/api.py`). PR #41, merged.
- **PRs reviewed**: #36, #39 (already merged elsewhere by tick's end),
  #48, #45, #42, each a two-table Secrets/QA review; #45 and #48 each
  turned up a real finding (an undisclosed `src/lib/canon-primary.ts`
  behavior change; two headline features documented but never shipped).
- **Blocked**: nothing.

## 2026-09-10, PR39 review

- **PR #39 reviewed and merged** (`feat/hte-literature-batch-two-and-plan-rev1`,
  "literature batch two, Research OS plan revision 1 remap, zenodo
  dry-run"), squash commit `f7dd86a6`.
- **Governance**: `learning/research-os/PLAN-REVISION-1.md` is untouched
  by this diff; the remap lives in this engine's own `docs/RESEARCH-OS-
  INTEGRATION.md`, which reads `PLAN-REVISION-1.md` and reclassifies
  engine-side question rows against it, citing blocking decision 1 as
  still open rather than resolving it. `RESEARCH-OS-INTEGRATION.md`
  sits under this engine's own `docs/`, tracked here; the `learning/
  research-os/` and `_intake/research-os-k12/` surface tree
  `DELETIONS.md`/`CHANGE-LEDGER.md` cover is a separate tree this PR
  never touches, so no deletions-log entry applied. Literature: the 6 batch-two fixture cards are byte-identical
  to the already-verified real cards in `_intake/research-os-k12-
  literature/`; 5 DOIs spot-checked live against Crossref/arXiv
  (Kitano 2021, Fryer 2011, Macnamara 2024, Pan 2017, Kosmyna 2025),
  title/authors/year/venue all matched.
- **Secrets**: full diff clean, no keys, IPs, internal hostnames,
  personal emails beyond `gianyrox@gmail.com`, or absolute `/home/gian`
  paths in file contents.
- **Incident during review**: a `git stash pop` in the review worktree
  popped a stash from the repo-wide stash list (stashes are not
  worktree-scoped) and produced merge conflicts plus untracked-file
  bleed from an unrelated `main`-branch WIP stash. Recovered with
  `git reset --hard` and `git clean -fd`, scoped to the review worktree
  only; the original stash was never dropped. A reminder of this file's
  own "Working tree rules" section: `git stash` in any worktree touches
  the whole repo's stash list, not just that worktree's own changes.
- **Gates**: `env -u HTE_LLM_MODE make test`, 1057 passed, 18 deselected
  after merging `origin/main` (13 commits behind, one real conflict in
  `hte/cli.py`/`hte/runner.py`'s `_CORPUS_LOADERS` dict against PR
  #36's `sacred-history` entry, resolved keeping both registrations).
  `ruff check` clean on every touched file (also cleared two
  pre-existing unused imports in `hte/corpus/literature.py`,
  `dataclasses.field` and `typing.Any`). `agf-lint-voice check` /
  `agf-lint-voice-src check`, 0 violations. `zenodo-mint.py --dry-run`:
  7/7 new tests pass, no token read and no network call under
  `--dry-run`.

## 2026-09-10, PR36 review

- **PR #36 reviewed** (`feat/hte-build-history`, "sacred-history
  build-history campaign, canon write-back, Research OS bridge
  export"). Auto-merged (commit `06a97894`) before the governance fix
  found in review could land on its own branch, so the fix shipped as
  a superseding PR, #43 (`fix/hte-canon-signoff-gate`, squash-merged as
  `a719c072`), directly on `main`.
- **Governance (bead ros-11, `learning/research-os/PLAN.md` section 10,
  `GOVERNANCE.md`)**: `hte.canon_writeback.write_back` wrote
  candidate-tier cards into `bucket-canon/`, gated only on
  `floor_P`/`floor_u_max`, no recorded human approver, unattended
  through `hte.pipeline`'s own writeback stage. Fixed: `write_back`,
  `render_card`, `build_envelope` now require a named `signoff`; a
  missing or blank value is a hard `ValueError` before
  `reconstruct_candidates` runs or any file writes, `dry_run` or not.
  Recorded in card provenance, envelope `signed_off_by` and per-item
  provenance, and the `CANON-INGESTION-INDEX.md` addendum. Also
  labeled Elo `unvalidated_tournament_ranking` in the same three
  surfaces (card, index, envelope), per the same PLAN.md section's
  ranking-label requirement. No generator/judge independence claim
  appears in PR #36's diff, so nothing to drop there.
- **Secrets**: full diff of both PRs clean, no keys, IPs, internal
  hostnames, personal emails beyond `gianyrox@gmail.com`, or absolute
  `/home/gian` paths in file contents.
- **Gates**: `env -u HTE_LLM_MODE make test`, 1046 passed (PR #36's own
  branch: 989 before the `main` merge that pulled in 8 unrelated
  commits). `ruff check` clean on every touched file (also cleared two
  pre-existing unused imports in `hte/cli_pipeline.py` and
  `hte/pipeline.py`). `agf-lint-voice check` / `agf-lint-voice-src
  check`, 0 violations.

## 2026-09-10, PR review

- **PR #29 reviewed and merged** (`feat/hte-calibration-vocab-rebased`,
  "corpus-induced vocabulary, calibration fit report, real-corpus
  sweeps"). Engine-only diff (`tools/hypothesis-engine/`), no Research OS
  app surfaces touched.
- **Secrets**: keys, tokens, IPs, non-public hostnames, personal emails,
  PII, absolute `/home/gian` paths, Claude session URLs: none found in
  the diff.
- **QA**: `hte.vocab_induce.induce` reads only `Corpus.evidence`, built
  by `hte.corpus.production._build_corpus` from `Production` objects
  `normalize_research_os_record` already normalized; no path reads
  `graph.productions` or learner data directly. `hte.api.hypothesize`'s
  signature and `hte.corpus.production.load_supabase` are unchanged, so
  PR #30's callers still compile once main merges. `learner_id`/
  `transfer_proof` stay excluded from every code path this PR touches;
  `docs/CALIBRATION-FIT-2026-09-10.md` and the three `runs/realsweep/*/
  SUMMARY.md` files carry only params and aggregate metrics, no raw
  learner text. Fixed one Low defect on the branch before merge: an
  unused `Constants` import in `tests/test_runner.py`
  (`ruff` F401), introduced by this PR's own diff; the sole other
  `ruff` hit in this PR's files (`hte/cli_synth.py`'s pre-existing F541)
  predates this PR and was left alone.
- **Gates**: merged `origin/main` (pulling in PR #28) into the review
  branch first, clean, no conflicts. `make test`: 988 passed, 18
  deselected, 0 failed. `ruff check .`: 36 pre-existing errors outside
  this PR's own files, 0 in files this PR touches after the fix above.
- **Voice**: `agf-lint-voice check` and `agf-lint-voice-src check` on
  every file this PR touches: 0 violations.
- **On tick 3's Critical finding below** (two new tests omit
  `HTE_LLM_MODE=fake`, hanging `make test` when the var is unset): does
  not reproduce. The four new `hte.calibrate.fit_constants_pooled` tests
  are already in `tests/conftest.py`'s own `_SLOW_NODEIDS` (this PR's own
  addition), so `make test`'s `-m "not slow"` deselects them; ran them
  directly with `HTE_LLM_MODE` unset (`test_fit_constants_pooled_*`,
  `tests/test_cli_synth.py`'s full file, `test_api.py::test_unknown_
  slot_id_is_induced_rather_than_rejected`), 27 passed in under 30s each
  batch, no hang. `hte.calibrate` imports no `hte.llm` path at all;
  `run_one_realsweep_seed` wraps its own `run_campaign` call in
  `_fake_llm_mode()` regardless of the ambient environment
  (`tests/test_cli_synth.py`'s own module docstring); the renamed
  `test_unknown_slot_id_is_induced_rather_than_rejected` goes through
  `_call`, which sets `HTE_LLM_MODE=fake` itself. `make test` on the
  merged tree: 988 passed, 18 deselected, 0 failed, no hang.
- Squash-merged via `gh pr merge 29 --squash --delete-branch`.

## 2026-09-10, tick 3

- **Engine health**: `make test` green on `main` before any change this
  tick, 931 passed (fast profile, `EDUCATION_ATLAS_DIR` set to the sibling
  checkout). No defect.
- **Random campaigns**: `hte-synth run --seeds 0-29` (fake mode), 30/30
  seeds, coverage_of_truth mean 1.0, brier_true_only mean 0.0082, gate
  PASS. A repeat run matched every metric exactly; no nondeterminism.
  Still no `realsweep` subcommand on `main` (PR #29 below adds one,
  unmerged).
- **Test swarm**: `hte/corpus/__init__.py` (92.6%, `tests/COVERAGE.md`'s
  next least-covered file, untouched by `swarm`/`swarm2`/`swarm3`/
  `swarm-20260910`: `GroundTruthEvent`, `RetrievalEnvelope`, `Corpus`,
  including `Corpus.save`/`load`'s own file round trip). 10 new tests in
  `tests/swarm-20260910/test_corpus_init_props.py`. All pass; no defect.
  Full suite: 941 passed.
- **PRs opened**: 1, #32 (`test/hte-corpus-init-coverage-20260910`).
- **PRs reviewed**: #32 (own; reviewed and squash-merged, all criteria
  met). #28, #29, #30 each already carried a review at their current head
  sha from an earlier tick this hour (posted 19:29-20:11 UTC); this tick
  verified the existing reviews rather than duplicating them: #28
  (`ba6c8451`) 2 Medium QA findings on the accept-path's missing
  class/roster ownership check and an unbounded input field, verdict "fix
  or note before merge"; #29 (`97d7bbb4`) 1 Critical (two new tests omit
  `HTE_LLM_MODE=fake`, hanging `make test` whenever `HTE_LLM_MODE` is
  unset), verdict "changes requested"; #30 (`da7ae955`) 2 Low, verdict
  "approve". None are `fix/hte-`/`test/hte-` branches this loop opened, so
  none merged.
- **Blocked**: nothing.

## 2026-09-10, tick 2

- **Engine health**: installed `pandas`/`pyarrow`, resolving tick 1's
  `education-atlas` block. `make test` green with `HTE_LLM_MODE` unset:
  867 passed, 13 skipped. `HTE_LLM_MODE=fake` set for the test run itself
  (not just real engine runs) breaks 2 unrelated tests via `hte.llm`'s
  own documented fake-mode short-circuit, a test-isolation quirk;
  `make test` runs with it unset from here on. No PR needed.
- **Random campaigns**: `hte-synth run --seeds 0-29`, 30/30 pass, gate
  PASS, no crash; repeat run matched every metric exactly, no
  nondeterminism. Still no `--corpus`/`realsweep`.
- **Test swarm**: `hte/corpus/fixtures.py` (91.3%, next-least-covered,
  uncovered by tick 1). 11 new tests in `tests/swarm-20260910/
  test_corpus_fixtures_props.py` (generic invariants, span/doc round
  trip, ground-truth correspondence, the 1960 discovery-date split,
  `choose_holdout_mode`). All pass; no defect. Full suite: 878 passed.
- **PRs opened**: 1, #23 (`test/hte-fixtures-corpus-coverage-20260910`).
  Reviewed and squash-merged by this loop, all merge criteria met.
- **PRs reviewed**: #20 (not this loop's own; two-table review, zero
  secrets, one non-blocking Low QA note on `EDUCATION_ATLAS_DIR`'s
  import-time resolution; `make test` verified green, 912 passed, in a
  temp worktree; merged afterward by the repo owner). #13 already
  reviewed at its current head sha by an earlier tick. #11 is a draft.
- **Blocked**: nothing.

## 2026-09-10, tick 1

- **Engine health**: `make test` needed `pytest`, `hypothesis`,
  `jsonschema`, `matplotlib` installed first (`pip install --user`, none
  present at tick start). After that, 733/735 fast-profile tests pass on
  `main`. The 2 failures (`tests/test_runner.py`'s two `education-atlas`
  cases) are not a code defect: both need the sibling `bucket-foundation/
  education-atlas` repo checked out next to this one, and this session's
  GitHub scope is `bucket-foundation/bucket-foundation` only, so it
  cannot be fetched. Blocked on that missing repo; no fix attempted, no PR opened.
- **Random campaigns**: `hte-synth run --seeds 0-29` (fake mode), 30/30
  seeds, `coverage_of_truth` mean 1.0 (floor 0.8), `brier_true_only` mean
  0.0082 (max 0.25), gate PASS, no crash. A repeat run matched every
  seed's metrics exactly; no nondeterminism found. `hte-synth` has no
  `--corpus` flag or `realsweep` subcommand (checked via `--help`), so
  the `education-atlas`/`production`/`literature` sweeps did not apply.
- **Test swarm**: `hte/runner.py`, `tests/COVERAGE.md`'s least-covered
  file (87.7%) not already covered by `tests/swarm/`, `swarm2/`, or
  `swarm3/`. Added `tests/swarm-20260910/test_runner_props.py`, 18 tests
  over its pure helpers and narrow fallback branches, no LLM subprocess
  call needed. All 18 passed first run; no defect found, no finding
  filed. Full suite plus the new file: 733 passed.
- **PRs opened**: 1, `test/hte-runner-coverage-20260910`.
- **Blocked**: `education-atlas` tests, sibling repo out of GitHub scope.
