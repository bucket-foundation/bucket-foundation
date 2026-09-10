# Loop log

Dated entries from the hourly optimization loop. Newest entry first.

## 2026-09-10, tick 1

- **Engine health**: `make test` needed `pytest`, `hypothesis`,
  `jsonschema`, `matplotlib` installed first (`pip install --user`, none
  present at tick start). After that, 733/735 fast-profile tests pass on
  `main`. The 2 failures (`tests/test_runner.py`'s two `education-atlas`
  cases) are not a code defect: both need the sibling `bucket-foundation/
  education-atlas` repo checked out next to this one, and this session's
  GitHub scope is `bucket-foundation/bucket-foundation` only, so it
  cannot be fetched. Blocked, not fixed; no PR opened.
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
