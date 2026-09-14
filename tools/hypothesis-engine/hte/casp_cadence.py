"""CASP-cadence calibration: a fixed, published evaluation schedule for
the ranking holdout ledger.

PLAN.md section 10 item 8: "Run calibration on a fixed published cadence,
CASP-style." CASP (the Critical Assessment of protein Structure
Prediction contests) runs a blind evaluation on a schedule fixed and
announced before any prediction is submitted: predictors commit to
targets not yet solved, and every prediction is scored only once the real
structure is later released. Nothing in this package's own `hte.
holdout_ledger` (`bkt-hte-holdout-ledger`) commits to a schedule of its
own: `write_back` can append ranking-holdout entries at any point a
campaign happens to run, so the "before any prediction is submitted"
property CASP's own blind period depends on is not enforced anywhere.

This module is that missing schedule, layered on top of `hte.
holdout_ledger` rather than a second ledger of its own: `open_round`
freezes a ranked candidate list into the CURRENT cadence window's own
round and registers each row into `hte.holdout_ledger` exactly the way
`hte.canon_writeback.write_back` already does (`holdout_ledger.
build_entries`/`append_entries`), so a round's predictions score through
that ledger's own `verify_entry`/`ranking_status` machinery rather than a
parallel one. `CADENCE = "quarterly"`: one round opens per calendar
quarter (`round_id_for`), fixed here rather than left as a per-call
argument, so "the round schedule" reads the same everywhere this module
is used, the CASP property this module exists to add.

Distinct from `hte.predict` (PR #87, merged, `predictions/ledger.jsonl`):
that module registers dated forward forecasts about specific future
claims, discoveries, and sequence relations off one completed run,
resolved against a corpus as evidence arrives. This module validates the
TOURNAMENT'S OWN RANKING (Elo ordering across a population, `PLAN.md`
section 10's own distinct-from-single-claim-calibration axis, `hte.
holdout_ledger`'s reason for existing) on a fixed public schedule. Both
read a completed run and defer scoring to later evidence; neither reads
or writes the other's own ledger file, and this module does not import
`hte.predict`: a round's outcome is a ranking-holdout fact, scored
through `hte.holdout_ledger.verify_entry`, a separate concern from
`hte.predict.resolve`'s own forecast resolution, so the two stay on
separate ledgers by design. `hte.holdout_ledger` remains the single
source of truth for ranking-holdout outcomes; `predictions/ledger.jsonl`
is `hte.predict`'s own, unrelated to a round's `ledger_entry_ids` above.
"""
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

from . import holdout_ledger

DATA_DIR = Path(__file__).parent / "data"
DEFAULT_ROUNDS_PATH = DATA_DIR / "casp-rounds.jsonl"

# The one cadence this module runs on, named here rather than left
# tunable per call (this module's own top docstring: a fixed, known
# schedule is the CASP property being added). Quarterly is the coarsest
# rung this package's own corpora move slowly enough to make meaningful:
# a monthly cadence would freeze the same handful of ranked hypotheses
# over and over on a corpus this small.
CADENCE = "quarterly"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# --------------------------------------------------------------------------
# The quarterly window
# --------------------------------------------------------------------------


def round_id_for(at: datetime) -> str:
    """The cadence round `at` falls in, `"<year>-Q<quarter>"` (`"2026-
    Q3"`). Quarters are 1-based, January-March is `Q1`."""
    quarter = (at.month - 1) // 3 + 1
    return f"{at.year}-Q{quarter}"


def round_window(round_id: str) -> tuple[datetime, datetime]:
    """`[window_start, window_end)` for `round_id`, both UTC-aware: the
    calendar quarter's first day at midnight, and the first day of the
    following quarter. A round becomes due (`is_due`) the moment `at`
    reaches `window_end`, CASP's own "the blind period has closed"
    boundary."""
    year_str, q_str = round_id.split("-Q")
    year, quarter = int(year_str), int(q_str)
    if quarter not in (1, 2, 3, 4):
        raise ValueError(f"hte.casp_cadence.round_window: {round_id!r} names an invalid quarter")
    start_month = (quarter - 1) * 3 + 1
    start = datetime(year, start_month, 1, tzinfo=timezone.utc)
    if quarter == 4:
        end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(year, start_month + 3, 1, tzinfo=timezone.utc)
    return start, end


def is_due(round_id: str, *, at: datetime | None = None) -> bool:
    """Whether `round_id`'s own quarter has closed as of `at` (default
    now): the point past which its frozen predictions may be scored,
    never before."""
    at = at if at is not None else datetime.now(timezone.utc)
    _, window_end = round_window(round_id)
    return at >= window_end


# --------------------------------------------------------------------------
# Round
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class Round:
    """One cadence round: a ranked candidate list frozen at `opened_at`,
    the ledger entries each row was registered under
    (`hte.holdout_ledger.LedgerEntry.entry_id`), and `scored_at`, `None`
    until `close_round` marks it closed."""
    round_id: str
    run_id: str
    corpus: str | None
    opened_at: str
    window_start: str
    window_end: str
    frozen: list[dict[str, Any]] = field(default_factory=list)
    ledger_entry_ids: list[str] = field(default_factory=list)
    scored_at: str | None = None

    @property
    def key(self) -> str:
        """The unique `(round_id, run_id)` pair this round is filed
        under, `open_round`'s own idempotency key: a round is a fact
        about one run's own ranked output entering one cadence window, so
        two different runs both landing in the same quarter open two
        separate rounds rather than colliding."""
        return f"{self.round_id}:{self.run_id}"

    def to_dict(self) -> dict[str, Any]:
        return {
            "round_id": self.round_id, "run_id": self.run_id, "corpus": self.corpus,
            "opened_at": self.opened_at, "window_start": self.window_start, "window_end": self.window_end,
            "frozen": list(self.frozen), "ledger_entry_ids": list(self.ledger_entry_ids),
            "scored_at": self.scored_at,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "Round":
        return cls(
            round_id=d["round_id"], run_id=d["run_id"], corpus=d.get("corpus"),
            opened_at=d["opened_at"], window_start=d["window_start"], window_end=d["window_end"],
            frozen=list(d.get("frozen", [])), ledger_entry_ids=list(d.get("ledger_entry_ids", [])),
            scored_at=d.get("scored_at"),
        )


def load_rounds(path: str | Path = DEFAULT_ROUNDS_PATH) -> list[Round]:
    """Every round on file at `path`, oldest first. An absent file reads
    as no rounds opened yet, the expected state on a fresh checkout."""
    path = Path(path)
    if not path.is_file():
        return []
    rounds = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        rounds.append(Round.from_dict(json.loads(line)))
    return rounds


def _write_all(rounds: Sequence[Round], path: str | Path) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    text = "".join(json.dumps(r.to_dict(), sort_keys=True) + "\n" for r in rounds)
    path.write_text(text, encoding="utf-8")


def find_round(round_id: str, run_id: str, *, path: str | Path = DEFAULT_ROUNDS_PATH) -> Round | None:
    """The round filed under `(round_id, run_id)`, or `None` if no such
    round has been opened yet."""
    key = f"{round_id}:{run_id}"
    for r in load_rounds(path):
        if r.key == key:
            return r
    return None


def open_round(
    ranked: Sequence[dict[str, Any]],
    *,
    run_id: str,
    corpus: str | None,
    at: datetime | None = None,
    rounds_path: str | Path = DEFAULT_ROUNDS_PATH,
    ledger_path: str | Path = holdout_ledger.DEFAULT_LEDGER_PATH,
) -> Round:
    """Freezes `ranked` (the `{address, short_id, statement, elo}` row
    shape `hte.holdout_ledger.build_entries` takes, already sorted the
    way the caller wants rank to read) into `at`'s own cadence round
    (`round_id_for`, default now), and registers every row into `hte.
    holdout_ledger` as a normal ranking-holdout entry, so it scores
    through that ledger's own `verify_entry`/`ranking_status` machinery.

    Idempotent on `(round_id, run_id)`: a second call for a round already
    on file returns the existing round unchanged, freezing nothing new
    and registering no further ledger entries (`hte.holdout_ledger.
    append_entries`'s own `entry_id` dedup already guards the ledger
    side; this function's own dedup covers the round file). A caller
    wanting to add more predictions within the same quarter uses a
    distinct `run_id` per run, the same key shape the ledger itself
    already reads by.
    """
    at = at if at is not None else datetime.now(timezone.utc)
    round_id = round_id_for(at)
    existing = find_round(round_id, run_id, path=rounds_path)
    if existing is not None:
        return existing

    window_start, window_end = round_window(round_id)
    entries = holdout_ledger.build_entries(ranked, run_id=run_id, corpus=corpus)
    holdout_ledger.append_entries(entries, path=ledger_path)
    # Every entry this round claims as its own frozen prediction, not
    # only the ones `append_entries` decided were new this call: a round
    # re-opened after an unrelated write-back already claimed the same
    # (run_id, address) key still names that entry as its own.
    entry_ids = [e.entry_id for e in entries]

    round_ = Round(
        round_id=round_id, run_id=run_id, corpus=corpus, opened_at=_now(),
        window_start=window_start.isoformat(), window_end=window_end.isoformat(),
        frozen=list(ranked), ledger_entry_ids=entry_ids,
    )
    _write_all(list(load_rounds(rounds_path)) + [round_], rounds_path)
    return round_


def due_rounds(
    *, at: datetime | None = None, rounds_path: str | Path = DEFAULT_ROUNDS_PATH, include_scored: bool = False,
) -> list[Round]:
    """Every round whose own quarter has closed as of `at` (default
    now), oldest first; `include_scored=False` (the default) excludes a
    round `close_round` already marked scored, so this reads as "still
    needs attention" by default."""
    at = at if at is not None else datetime.now(timezone.utc)
    return [
        r for r in load_rounds(rounds_path)
        if is_due(r.round_id, at=at) and (include_scored or r.scored_at is None)
    ]


# --------------------------------------------------------------------------
# Status and closing
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class RoundStatus:
    """One round's own scoring status, read live off `hte.holdout_ledger`
    rather than cached on the round itself: `n_verified` grows as
    outcomes arrive via that ledger's own `verify_entry`, independent of
    whether this round has been closed yet."""
    round_id: str
    run_id: str
    n_frozen: int
    n_verified: int
    n_correct: int
    hit_rate: float | None
    due: bool
    scored: bool

    def to_dict(self) -> dict[str, Any]:
        return {
            "round_id": self.round_id, "run_id": self.run_id, "n_frozen": self.n_frozen,
            "n_verified": self.n_verified, "n_correct": self.n_correct, "hit_rate": self.hit_rate,
            "due": self.due, "scored": self.scored,
        }


def round_status(
    round_id: str, run_id: str, *,
    rounds_path: str | Path = DEFAULT_ROUNDS_PATH,
    ledger_path: str | Path = holdout_ledger.DEFAULT_LEDGER_PATH,
    at: datetime | None = None,
) -> RoundStatus:
    """The live scoring status of the round filed under `(round_id,
    run_id)`. Raises `ValueError` when no such round exists, never
    silently reading an empty status for a round that was never opened."""
    round_ = find_round(round_id, run_id, path=rounds_path)
    if round_ is None:
        raise ValueError(f"hte.casp_cadence.round_status: no round {round_id!r}/{run_id!r} on file at {rounds_path}")
    by_id = {e.entry_id: e for e in holdout_ledger.load_ledger(ledger_path)}
    round_entries = [by_id[eid] for eid in round_.ledger_entry_ids if eid in by_id]
    rate = holdout_ledger.compute_hit_rate(round_entries)
    return RoundStatus(
        round_id=round_id, run_id=run_id, n_frozen=len(round_.frozen),
        n_verified=rate.n_verified, n_correct=rate.n_correct, hit_rate=rate.hit_rate,
        due=is_due(round_id, at=at), scored=round_.scored_at is not None,
    )


def close_round(
    round_id: str, run_id: str, *,
    rounds_path: str | Path = DEFAULT_ROUNDS_PATH,
    ledger_path: str | Path = holdout_ledger.DEFAULT_LEDGER_PATH,
    at: datetime | None = None,
) -> Round:
    """Marks the round filed under `(round_id, run_id)` scored: requires
    its own quarter to have closed (`is_due`) and every one of its frozen
    predictions to carry a verified outcome in `hte.holdout_ledger`
    already; raises `ValueError` naming which condition failed otherwise,
    never closing a round on partial outcomes."""
    round_ = find_round(round_id, run_id, path=rounds_path)
    if round_ is None:
        raise ValueError(f"hte.casp_cadence.close_round: no round {round_id!r}/{run_id!r} on file at {rounds_path}")
    status = round_status(round_id, run_id, rounds_path=rounds_path, ledger_path=ledger_path, at=at)
    if not status.due:
        raise ValueError(
            f"hte.casp_cadence.close_round: round {round_id!r} is not due yet "
            f"(window_end={round_.window_end}); refusing to close early"
        )
    if status.n_verified < status.n_frozen:
        raise ValueError(
            f"hte.casp_cadence.close_round: {status.n_verified} of {status.n_frozen} frozen "
            f"predictions verified in the holdout ledger; refusing to close on partial outcomes"
        )
    closed = replace(round_, scored_at=_now())
    rounds = [closed if r.key == round_.key else r for r in load_rounds(rounds_path)]
    _write_all(rounds, rounds_path)
    return closed


# --------------------------------------------------------------------------
# `hte-casp-cadence` console script
# --------------------------------------------------------------------------
#
# A standalone script (`pyproject.toml`'s own `[project.scripts]`,
# matching `hte-synth`/`hte-serve`'s existing precedent), kept outside
# `hte/cli.py`'s own subcommand set: this branch leaves that file
# untouched, free for a concurrent PR's own edits there.


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="hte-casp-cadence", description="CASP-cadence ranking calibration (PLAN.md section 10 item 8)")
    sub = parser.add_subparsers(dest="command", required=True)

    open_p = sub.add_parser("open", help="freeze a ranked candidate list into the current cadence round")
    open_p.add_argument("ranked_json", help="path to a JSON file: a list of {address, short_id, statement, elo} rows, already sorted by rank")
    open_p.add_argument("--run-id", required=True)
    open_p.add_argument("--corpus", default=None)
    open_p.add_argument("--rounds-path", default=str(DEFAULT_ROUNDS_PATH))
    open_p.add_argument("--ledger-path", default=str(holdout_ledger.DEFAULT_LEDGER_PATH))
    open_p.set_defaults(func=_cmd_open)

    status_p = sub.add_parser("status", help="print one round's own live scoring status")
    status_p.add_argument("round_id")
    status_p.add_argument("--run-id", required=True)
    status_p.add_argument("--rounds-path", default=str(DEFAULT_ROUNDS_PATH))
    status_p.add_argument("--ledger-path", default=str(holdout_ledger.DEFAULT_LEDGER_PATH))
    status_p.set_defaults(func=_cmd_status)

    due_p = sub.add_parser("due", help="list every round whose quarter has closed and is not yet scored")
    due_p.add_argument("--rounds-path", default=str(DEFAULT_ROUNDS_PATH))
    due_p.set_defaults(func=_cmd_due)

    close_p = sub.add_parser("close", help="mark a round scored once every frozen prediction is verified")
    close_p.add_argument("round_id")
    close_p.add_argument("--run-id", required=True)
    close_p.add_argument("--rounds-path", default=str(DEFAULT_ROUNDS_PATH))
    close_p.add_argument("--ledger-path", default=str(holdout_ledger.DEFAULT_LEDGER_PATH))
    close_p.set_defaults(func=_cmd_close)

    return parser


def _cmd_open(args: argparse.Namespace) -> int:
    ranked = json.loads(Path(args.ranked_json).read_text(encoding="utf-8"))
    round_ = open_round(
        ranked, run_id=args.run_id, corpus=args.corpus,
        rounds_path=args.rounds_path, ledger_path=args.ledger_path,
    )
    print(json.dumps(round_.to_dict(), indent=2))
    return 0


def _cmd_status(args: argparse.Namespace) -> int:
    try:
        status = round_status(args.round_id, args.run_id, rounds_path=args.rounds_path, ledger_path=args.ledger_path)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    print(json.dumps(status.to_dict(), indent=2))
    return 0


def _cmd_due(args: argparse.Namespace) -> int:
    rounds = due_rounds(rounds_path=args.rounds_path)
    print(json.dumps([r.to_dict() for r in rounds], indent=2))
    return 0


def _cmd_close(args: argparse.Namespace) -> int:
    try:
        closed = close_round(args.round_id, args.run_id, rounds_path=args.rounds_path, ledger_path=args.ledger_path)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    print(json.dumps(closed.to_dict(), indent=2))
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


__all__ = [
    "CADENCE",
    "Round",
    "RoundStatus",
    "round_id_for",
    "round_window",
    "is_due",
    "load_rounds",
    "find_round",
    "open_round",
    "due_rounds",
    "round_status",
    "close_round",
    "main",
]


if __name__ == "__main__":
    raise SystemExit(main())
