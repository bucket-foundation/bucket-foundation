# CASP-cadence calibration

`hte.casp_cadence`, PLAN.md section 10 item 8: "Run calibration on a fixed
published cadence, CASP-style." CASP (the Critical Assessment of protein
Structure Prediction contests) runs a blind evaluation on a schedule fixed
and announced before any prediction is submitted: predictors commit to
targets not yet solved, and a prediction is scored only once the real
structure is released later. `hte.holdout_ledger` on its own commits to no
such schedule: `write_back` appends ranking-holdout entries whenever a
campaign happens to run, so the "before any prediction is submitted"
property CASP's own blind period depends on goes unenforced.

`hte.casp_cadence` adds that schedule as a layer on top of
`hte.holdout_ledger`, keeping that ledger the only one. `open_round` freezes a ranked
candidate list into the current cadence window's round and registers each
row into `hte.holdout_ledger` the way `hte.canon_writeback.write_back`
already does (`holdout_ledger.build_entries`/`append_entries`), so a
round's predictions score through that ledger's own
`verify_entry`/`ranking_status` machinery. `CADENCE = "quarterly"`: one
round opens per calendar quarter (`round_id_for`), fixed rather than a
per-call argument, so "the round schedule" reads the same everywhere.

## Contract

- `round_id_for(at)`: the `"<year>-Q<quarter>"` cadence round `at` falls
  in.
- `round_window(round_id)`: `[window_start, window_end)`, both UTC-aware,
  the calendar quarter's own first day at midnight through the first day
  of the following quarter.
- `is_due(round_id, at=...)`: whether the round's own quarter has closed,
  the point past which its frozen predictions may be scored.
- `open_round(ranked, run_id, corpus, ...)`: freezes `ranked` into the
  current cadence round and registers every row into `hte.holdout_ledger`.
  Idempotent on `(round_id, run_id)`: a second call for a round already on
  file returns the existing round unchanged.
- `round_status(round_id, run_id, ...)`: the live scoring status, read off
  `hte.holdout_ledger` rather than cached on the round, so `n_verified`
  grows as outcomes arrive through that ledger's own `verify_entry`.
- `close_round(round_id, run_id, ...)`: marks a round scored, requiring
  both its own quarter to have closed and every frozen prediction to
  carry a verified outcome in `hte.holdout_ledger`; raises `ValueError`
  naming which condition failed when either is unmet.
- `due_rounds(...)`: every round whose quarter has closed and is not yet
  scored, the worklist a periodic job reads.

Rounds are stored at `hte/data/casp-rounds.jsonl`, one JSON object per
line, oldest first. `hte.holdout_ledger` (default
`predictions/ledger.jsonl` is `hte.predict`'s own file, unrelated) stays
the single source of truth for ranking-holdout outcomes; a round's
`ledger_entry_ids` are pointers into that ledger, never a duplicate copy
of its verdicts.

## Relation to `hte.predict`

`hte.predict` (PR #87) registers dated forward forecasts about specific future
claims, discoveries, and sequence relations off one completed run,
resolved against a corpus as evidence arrives (`predictions/ledger.jsonl`).
`hte.casp_cadence` validates the tournament's own ranking (Elo ordering
across a population) on a fixed public schedule. Both read a completed run
and defer scoring to later evidence; neither reads or writes the other's
own ledger file. `hte.casp_cadence` does not import `hte.predict`: a
round's outcome is a ranking-holdout fact scored through
`hte.holdout_ledger.verify_entry`, a separate concern from
`hte.predict.resolve`'s own forecast resolution.

## `hte-casp-cadence` console script

A standalone script (`pyproject.toml`'s `[project.scripts]`, matching
`hte-synth`/`hte-serve`), kept outside `hte/cli.py`'s subcommand set.

```bash
hte-casp-cadence open ranked.json --run-id my-run --corpus sacred-history
hte-casp-cadence status 2026-Q3 --run-id my-run
hte-casp-cadence due
hte-casp-cadence close 2026-Q3 --run-id my-run
```

`ranked.json` is a JSON file: a list of `{address, short_id, statement,
elo}` rows, already sorted the way the caller wants rank to read, the same
shape `hte.holdout_ledger.build_entries` takes.

## Tests

`tests/test_casp_cadence.py`, 28 tests: quarter arithmetic (`round_id_for`,
`round_window`, `is_due` across a window boundary and a Q4-into-next-year
rollover), `open_round`'s freeze-and-register behavior and its
`(round_id, run_id)` idempotency, `round_status`'s live read against
`hte.holdout_ledger`, `close_round`'s due-and-fully-verified gate and its
two distinct `ValueError` paths, `due_rounds`'s default exclusion of
already-scored rounds, and the `hte-casp-cadence` CLI's four subcommands.
Fixture: `tests/fixtures/casp-cadence/ranked.json`.
