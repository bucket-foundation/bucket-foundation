# Canon Activity Feed

Two tools turn canon git commits into a public activity feed: `parse.py`
reads a commit range and emits one JSON event per line; `feed.py` merges
those events into the ledger and rewrites `feed.json` and `feed.xml`.

## The ledger and the window

The monthly files under `feed/YYYY-MM.json` are the ledger: every event
ever emitted, forever, one file per month, append-only. They are the
only durable record. Nothing is ever removed from them.

`feed.json` and `feed.xml` at the repo root are derived from the
ledger on every run. They hold a rolling window of the latest
`MAX_EVENTS` (200) events, newest first. Two fields make the window
explicit:

- `total_events` counts the whole ledger. It only grows.
- `window` says `{"size": 200, "returned": N}`, how big the window is
  and how many events the `events` array carries this run.

A reader that wants the full history reads `feed/*.json`.

## Why the ledger files are tracked in git

`feed.py` recomputes `feed.json` and `feed.xml` from the ledger on
every run rather than trusting their own prior state. That only works
if the ledger survives between runs. The CI job in
`.github/workflows/feed.yml` runs on a fresh checkout each time; it has
no memory beyond what git gives it. A gitignore rule over `feed/` would
mean each run starts a month's file from scratch with only that run's
batch, then can never commit it (`git add` skips ignored paths), so the
rest of that month's events are lost the moment the runner is torn
down. This happened: a past rule ignoring `feed/2026-*` silently
dropped the June through September 2026 ledger. Do not add a gitignore
rule over `feed/`.

## Retraction

A deleted canon file emits a `retract` event (see `parse.py`). Retract
is an event like any other: it lands on the ledger, it never removes
the original `add_paper`/`add_canon_entry`/etc. event it refers to. A
later re-add of the same material is a new event with its own id. The
history of a piece of canon is the sequence of events about it.

## Commands

```bash
# Merge new events (JSON Lines on stdin) into the ledger, then rewrite
# feed.json / feed.xml.
python3 tools/feed/parse.py --from <sha> --to <sha> | python3 tools/feed/feed.py update

# Replay every commit from <sha>..HEAD through parse.py, rebuilding the
# ledger and feed.json/feed.xml from scratch. Destructive: wipes the
# existing feed.json, feed.xml, and feed/*.json first.
python3 tools/feed/feed.py rebuild --from <sha>

# Check feed.json's shape and its total_events/window fields against
# the ledger.
python3 tools/feed/feed.py validate
```

## Tests

`tools/feed/tests/` (pytest, stdlib subprocess + a synthetic git repo
in `tests/helpers.py`, no network). Run from the repo root:

```bash
python3 -m pytest tools/feed/tests/ -q
```

`test_parse.py` covers event emission per commit type. `test_feed.py`
covers merge idempotency, monthly archives, and Atom output; its
`LedgerTests` class covers the counting rule (`total_events` tracks the
ledger and never drops as the window slides), the `window` field, and
retract-then-re-add.
