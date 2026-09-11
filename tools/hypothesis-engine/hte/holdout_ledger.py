"""The ranking holdout ledger: a persisted, append-only record of ranked
hypotheses with a later-verified outcome field, and the hit-rate report
`PLAN.md` section 10 asks for before a tournament ranking can be called
anything but unvalidated.

`hte.calibrate.run_holdout`/`holdout_kfold` already validate the scored
*claim* (`P(h)`) against a discovery-date or k-fold holdout: `bkt-hte-
holdout`. Section 10 asks for a second, distinct track record, for the
*ranking* (`Elo`, the tournament's own ordering of a population), since a
population can be individually well-calibrated on `P(h)` while its
relative order is never checked against anything. This module is that
second record. Every entry this module writes is unverified until a
later pass (a human reviewer, or an automated discovery-date check once
a hypothesis's own claim resolves) calls `verify_entry`; until `hte.
canon_writeback.write_back` has recorded and later verified at least
`MIN_VERIFIED_FOR_LABEL` entries, every ranking output this package
emits stays labeled `unvalidated_tournament_ranking`, `ranking_status`'s
own single source of truth for that label.

`MIN_VERIFIED_FOR_LABEL = 20`: a chosen constant, named here by hand.
Twenty is small enough to reach after a modest run of write-backs, and
large enough that
one flipped verification moves the reported hit rate by at most five
points (`1/20`), so the label does not turn on the strength of a single
entry. Raise it once real verified volume makes a tighter bound worth
having; this module never lowers it on its own.

The ledger file (`hte/data/ranking-holdout-ledger.jsonl`, one JSON object
per line, newest entry last) is committed to the repository and grows by
append only: `append_entries` never rewrites a line, and `verify_entry`
is the one operation that changes an existing line, filling in fields a
freshly recorded entry leaves `null` (`outcome`, `verified_at`,
`verified_by`) rather than removing or reordering anything. No entry is
ever deleted.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

DATA_DIR = Path(__file__).parent / "data"
DEFAULT_LEDGER_PATH = DATA_DIR / "ranking-holdout-ledger.jsonl"

# See this module's own top docstring for why 20.
MIN_VERIFIED_FOR_LABEL = 20

_VALID_OUTCOMES = frozenset({"correct", "incorrect"})

UNVALIDATED_STATUS = "unvalidated_tournament_ranking"
VALIDATED_STATUS = "validated_tournament_ranking"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass(frozen=True)
class LedgerEntry:
    """One ranked hypothesis, recorded at write-back time, with a later-
    verified outcome field. `entry_id` is `f"{run_id}:{address}"`, stable
    and unique per (run, hypothesis) pair, so re-running `write_back` over
    the same run never appends a duplicate row (`append_entries` and
    `load_ledger` together de-duplicate on it)."""
    entry_id: str
    run_id: str
    corpus: str | None
    hypothesis_short_id: str
    address: int
    statement: str
    elo: float | None
    rank: int
    recorded_at: str
    verified: bool = False
    outcome: str | None = None
    verified_at: str | None = None
    verified_by: str | None = None
    note: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "entry_id": self.entry_id, "run_id": self.run_id, "corpus": self.corpus,
            "hypothesis_short_id": self.hypothesis_short_id, "address": self.address,
            "statement": self.statement, "elo": self.elo, "rank": self.rank,
            "recorded_at": self.recorded_at, "verified": self.verified, "outcome": self.outcome,
            "verified_at": self.verified_at, "verified_by": self.verified_by, "note": self.note,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "LedgerEntry":
        return cls(
            entry_id=d["entry_id"], run_id=d["run_id"], corpus=d.get("corpus"),
            hypothesis_short_id=d["hypothesis_short_id"], address=d["address"],
            statement=d["statement"], elo=d.get("elo"), rank=d["rank"],
            recorded_at=d["recorded_at"], verified=bool(d.get("verified", False)),
            outcome=d.get("outcome"), verified_at=d.get("verified_at"), verified_by=d.get("verified_by"),
            note=d.get("note"),
        )


def build_entries(
    ranked: Sequence[dict[str, Any]], *, run_id: str, corpus: str | None,
) -> list[LedgerEntry]:
    """One `LedgerEntry` per row of `ranked`, a plain-dict view (`address`,
    `short_id`, `statement`, `elo`) of the candidates a write-back pass
    selected, already sorted the way the caller wants `rank` to read
    (`hte.canon_writeback.write_back` sorts by descending Elo before
    calling this, so `rank=1` is this run's own top-ranked survivor).
    Takes plain dicts rather than `hte.canon_writeback.Candidate`
    directly so this module carries no import-time dependency on that
    one, avoiding a cycle (`canon_writeback` imports this module)."""
    now = _now()
    entries = []
    for i, row in enumerate(ranked, start=1):
        entries.append(LedgerEntry(
            entry_id=f"{run_id}:{row['address']}",
            run_id=run_id, corpus=corpus,
            hypothesis_short_id=row["short_id"], address=row["address"],
            statement=row["statement"], elo=row.get("elo"), rank=i, recorded_at=now,
        ))
    return entries


def load_ledger(path: str | Path = DEFAULT_LEDGER_PATH) -> list[LedgerEntry]:
    """Every entry currently on disk, in file order (oldest first). An
    absent file reads as an empty ledger: a fresh checkout with no
    verified history yet is the expected starting state."""
    path = Path(path)
    if not path.is_file():
        return []
    entries = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        entries.append(LedgerEntry.from_dict(json.loads(line)))
    return entries


def _write_all(entries: Sequence[LedgerEntry], path: str | Path) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    text = "".join(json.dumps(e.to_dict(), sort_keys=True) + "\n" for e in entries)
    path.write_text(text, encoding="utf-8")


def append_entries(new_entries: Sequence[LedgerEntry], path: str | Path = DEFAULT_LEDGER_PATH) -> list[LedgerEntry]:
    """Appends `new_entries` to the ledger at `path`, skipping any whose
    `entry_id` a prior call already recorded (idempotent under a re-run
    write-back over the same run directory). Returns the entries this
    call appended, `[]` when every one was already present."""
    existing = load_ledger(path)
    known_ids = {e.entry_id for e in existing}
    to_add = [e for e in new_entries if e.entry_id not in known_ids]
    if to_add:
        _write_all(list(existing) + to_add, path)
    return to_add


def verify_entry(
    entry_id: str, outcome: str, *, verified_by: str, at: str | None = None,
    path: str | Path = DEFAULT_LEDGER_PATH,
) -> LedgerEntry:
    """Marks one recorded entry verified: `outcome` is `"correct"` (this
    entry's own top-of-ranking read held up) or `"incorrect"` (it did
    not), `verified_by` a named human or the automated discovery-date
    check that made the call. Raises `ValueError` for an unknown
    `entry_id`, an invalid `outcome`, or a blank `verified_by`; never
    silently no-ops. Re-verifying an already-verified entry overwrites
    its prior outcome (a correction), logged in `note` by the caller if
    one is needed; this function itself does not refuse a re-verify."""
    if outcome not in _VALID_OUTCOMES:
        raise ValueError(f"hte.holdout_ledger.verify_entry: outcome must be one of {sorted(_VALID_OUTCOMES)}, got {outcome!r}")
    if not verified_by or not verified_by.strip():
        raise ValueError("hte.holdout_ledger.verify_entry: verified_by is required, a named human or automated check")

    entries = load_ledger(path)
    for i, entry in enumerate(entries):
        if entry.entry_id == entry_id:
            updated = LedgerEntry(
                **{**entry.to_dict(), "verified": True, "outcome": outcome,
                   "verified_at": at or _now(), "verified_by": verified_by},
            )
            entries[i] = updated
            _write_all(entries, path)
            return updated
    raise ValueError(f"hte.holdout_ledger.verify_entry: no entry {entry_id!r} in ledger at {path}")


@dataclass(frozen=True)
class HitRate:
    n_verified: int
    n_correct: int
    hit_rate: float | None  # None when n_verified == 0

    def to_dict(self) -> dict[str, Any]:
        return {"n_verified": self.n_verified, "n_correct": self.n_correct, "hit_rate": self.hit_rate}


def compute_hit_rate(entries: Sequence[LedgerEntry]) -> HitRate:
    """`n_correct / n_verified` over every verified entry (an unverified
    entry, `outcome is None`, contributes to neither count); `hit_rate`
    is `None`, not `0.0`, when nothing has been verified yet, so a
    caller cannot mistake "no data" for "every verified ranking failed"."""
    verified = [e for e in entries if e.verified and e.outcome in _VALID_OUTCOMES]
    n_verified = len(verified)
    n_correct = sum(1 for e in verified if e.outcome == "correct")
    hit_rate = (n_correct / n_verified) if n_verified else None
    return HitRate(n_verified=n_verified, n_correct=n_correct, hit_rate=hit_rate)


@dataclass(frozen=True)
class RankingStatus:
    """`ranking_status`'s own return value: the `elo_status` string every
    write-back surface (`hte.canon_writeback`'s card, index, and
    envelope) is required to read from here instead of a hardcoded
    string, and a one-sentence `label` ready to drop into rendered
    prose."""
    elo_status: str
    label: str
    n_verified: int
    min_verified: int
    hit_rate: float | None

    def to_dict(self) -> dict[str, Any]:
        return {
            "elo_status": self.elo_status, "label": self.label,
            "n_verified": self.n_verified, "min_verified": self.min_verified, "hit_rate": self.hit_rate,
        }


def ranking_status(
    entries: Sequence[LedgerEntry] | None = None, *,
    path: str | Path = DEFAULT_LEDGER_PATH, min_verified: int = MIN_VERIFIED_FOR_LABEL,
) -> RankingStatus:
    """The one place `elo_status` and its accompanying disclaimer get
    decided: `entries` (loaded from `path` when not given) below
    `min_verified` verified rows keeps every ranking output labeled
    `unvalidated_tournament_ranking`, the same reading `PLAN.md` section
    10 already asks for and `hte.canon_writeback` carried as a fixed
    string before this module existed. At or above `min_verified`, the
    status becomes `validated_tournament_ranking` and the label reports
    the measured hit rate; this is a track record over past rankings,
    stopping short of certifying any single one; a claim's own `P(h)`
    stays the scored number either way, Elo stays ordering only."""
    if entries is None:
        entries = load_ledger(path)
    rate = compute_hit_rate(entries)

    if rate.n_verified < min_verified:
        label = (
            "Elo is this run's own within-run tournament ranking. **Unvalidated:** the "
            "discovery-date holdout track record for rankings (`PLAN.md` section 10, as "
            f"distinct from single-claim calibration) carries {rate.n_verified} of "
            f"{min_verified} verified entries needed before a hit rate is reported; "
            "`P(h)` is the scored claim, Elo is ordering only."
        )
        return RankingStatus(
            elo_status=UNVALIDATED_STATUS, label=label,
            n_verified=rate.n_verified, min_verified=min_verified, hit_rate=None,
        )

    label = (
        "Elo is this run's own within-run tournament ranking. **Validated:** the "
        f"discovery-date holdout track record for rankings (`PLAN.md` section 10) "
        f"carries {rate.n_verified} verified entries, hit rate {rate.hit_rate:.0%}. "
        "This is a track record over past rankings, stopping short of certifying "
        "this one; `P(h)` stays the scored claim, Elo stays ordering."
    )
    return RankingStatus(
        elo_status=VALIDATED_STATUS, label=label,
        n_verified=rate.n_verified, min_verified=min_verified, hit_rate=rate.hit_rate,
    )


__all__ = [
    "DEFAULT_LEDGER_PATH", "MIN_VERIFIED_FOR_LABEL", "UNVALIDATED_STATUS", "VALIDATED_STATUS",
    "LedgerEntry", "HitRate", "RankingStatus",
    "build_entries", "load_ledger", "append_entries", "verify_entry",
    "compute_hit_rate", "ranking_status",
]
