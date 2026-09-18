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

`MIN_VERIFIED_FOR_LABEL = 44`: a derived constant. Revision 3's original
`= 20` carried no documented account of why twenty; `learning/research-
os/PLAN-REVISION-4.md` section 2b traces a concrete anchor instead.
Dreber and colleagues (2015, PNAS, `_intake/research-os-k12-
literature/scientific-discovery-metascience/dreber-et-al-2015-
prediction-markets-reproducibility.md`) show market-elicited probabilities
predicted replication outcomes across 44 psychology studies, better than
individual survey forecasts; Camerer and colleagues (2018, `camerer-et-
al-2018-evaluating-replicability-nature-science.md`) corroborate the same
forecast-validation shape on Nature/Science social-science experiments at
a comparable scale. Forty-four is the point at which this design (a
calibrated probability, elicited before ground truth, predicting whether
a claim holds up) is the demonstrated one in the literature this project
has read. No formal power analysis has been built for this ledger's own
question. PLAN-REVISION-4 section 2b names that gap and flags Dreber's
own low base-rate finding (about 9 percent of tested hypotheses held)
as a caution: a higher floor still certifies no single ranking, only a
longer track record. Raise it again once real verified
volume, or a power analysis scoped to this ledger, makes a tighter bound
worth having; this module never lowers it on its own. This module is the
one place the number is defined; `hte.export`'s TIMELINE.md render cites
no verified-count number to duplicate, and `hte.casp_cadence` (cadence
review over the ledger, PR #130) restates no floor of its own. Any later
use there imports `MIN_VERIFIED_FOR_LABEL` from here, the same
single-source-of-truth rule `ranking_status` already holds for the label
itself.

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

from . import calibrate

DATA_DIR = Path(__file__).parent / "data"
DEFAULT_LEDGER_PATH = DATA_DIR / "ranking-holdout-ledger.jsonl"

# See this module's own top docstring for why 44 (Dreber et al. 2015's
# own N=44 replication-forecasting sample, PLAN-REVISION-4.md section 2b).
MIN_VERIFIED_FOR_LABEL = 44

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
    write-back over the same run directory), and skipping any later row
    in this same call whose `entry_id` an earlier row in it already
    claimed (first occurrence wins, matching `verify_entry`'s own
    first-match semantics), so two `ranked` rows sharing one `address`
    can never produce two on-disk lines with the identical `entry_id`.
    Returns the entries this call appended, `[]` when every one was
    already present."""
    existing = load_ledger(path)
    known_ids = {e.entry_id for e in existing}
    to_add = []
    for e in new_entries:
        if e.entry_id in known_ids:
            continue
        to_add.append(e)
        known_ids.add(e.entry_id)
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
class MurphyDecomposition:
    """Murphy (1973)'s three-term partition of the Brier score
    (`learning/research-os/PLAN-REVISION-4.md` section 2b, `_intake/
    research-os-k12-literature/scientific-discovery-metascience/murphy-
    1973-vector-partition-probability-score.md`): `brier == reliability -
    resolution + uncertainty`, splitting the one aggregate number
    `compute_hit_rate` already reports into how far the ledger's own
    forecast tracked observed frequency (`reliability`) versus how much
    it discriminated between outcome classes (`resolution`), against the
    outcome's own base-rate variance (`uncertainty`). PR #48's real bug
    hunt (three bugs in candidate addressing, deduplication, and slot-
    matching, found by reading code after a low calibration number came
    back) is the diagnosis this decomposition exists to shortcut: a
    future regression can be checked against which term moved instead.

    This ledger's own `outcome` field is a binary judgment of a ranking (did
    this ranked entry's top-of-tournament placement hold up) and carries no
    graded per-entry confidence of its own, so every
    verified entry scores against the same implicit forecast, `p = 1.0`
    (the entry's own rank claims the read is correct). Murphy's partition
    groups entries by distinct forecast value; with one group,
    `resolution` is `0.0` by construction, `reliability` reduces to
    `(1.0 - hit_rate) ** 2`, and `uncertainty` to `hit_rate * (1.0 -
    hit_rate)`, and the aggregate identity still holds exactly (`brier ==
    1.0 - hit_rate`, `HitRate.hit_rate`'s own complement); this module's
    own tests assert both facts rather than only trusting the algebra. A
    `resolution` pinned at zero is itself the diagnosis this decomposition
    is built to surface: today's ledger cannot discriminate between a
    confident and a marginal ranked read, only between held-up and not.
    A future ledger design that records a real per-entry confidence
    (`elo`-derived or otherwise) distinct from the binary outcome would be
    the fix that moves `resolution` off zero.

    `None` fields mirror `HitRate.hit_rate`: nothing verified, nothing to
    decompose."""
    brier: float | None
    reliability: float | None
    resolution: float | None
    uncertainty: float | None
    n_verified: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "brier": self.brier, "reliability": self.reliability,
            "resolution": self.resolution, "uncertainty": self.uncertainty,
            "n_verified": self.n_verified,
        }


def murphy_decomposition(entries: Sequence[LedgerEntry]) -> MurphyDecomposition:
    """Splits `compute_hit_rate`'s own aggregate over `entries` into
    Murphy (1973)'s reliability, resolution, and uncertainty terms; see
    `MurphyDecomposition`'s own docstring for the one-forecast-group
    reading this ledger's binary `outcome` field supports today. Reuses
    `hte.calibrate.brier_score` directly (the module's own quadratic
    scoring rule, `predictions=[1.0] * n_verified` against each entry's
    binary outcome) rather than recomputing the mean-squared-error sum by
    hand, so the two modules never drift on what "Brier score" means."""
    verified = [e for e in entries if e.verified and e.outcome in _VALID_OUTCOMES]
    n_verified = len(verified)
    if n_verified == 0:
        return MurphyDecomposition(brier=None, reliability=None, resolution=None, uncertainty=None, n_verified=0)

    outcomes = [1.0 if e.outcome == "correct" else 0.0 for e in verified]
    predictions = [1.0] * n_verified
    brier = calibrate.brier_score(predictions, outcomes)
    obar = sum(outcomes) / n_verified
    reliability = (1.0 - obar) ** 2
    resolution = 0.0
    uncertainty = obar * (1.0 - obar)
    return MurphyDecomposition(
        brier=brier, reliability=reliability, resolution=resolution,
        uncertainty=uncertainty, n_verified=n_verified,
    )


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
    "LedgerEntry", "HitRate", "MurphyDecomposition", "RankingStatus",
    "build_entries", "load_ledger", "append_entries", "verify_entry",
    "compute_hit_rate", "murphy_decomposition", "ranking_status",
]
