# Loop log

Dated entries from the hourly optimization loop. Newest entry first.

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
