# Loop log

Dated entries from the hourly optimization loop. Newest entry first.

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
