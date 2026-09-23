from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

from . import calibrate

DATA_DIR = Path(__file__).parent / "data"
DEFAULT_LEDGER_PATH = DATA_DIR / "ranking-holdout-ledger.jsonl"

MIN_VERIFIED_FOR_LABEL = 44

_VALID_OUTCOMES = frozenset({"correct", "incorrect"})

UNVALIDATED_STATUS = "unvalidated_tournament_ranking"
VALIDATED_STATUS = "validated_tournament_ranking"

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()

@dataclass(frozen=True)
class LedgerEntry:
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
    hit_rate: float | None

    def to_dict(self) -> dict[str, Any]:
        return {"n_verified": self.n_verified, "n_correct": self.n_correct, "hit_rate": self.hit_rate}

def compute_hit_rate(entries: Sequence[LedgerEntry]) -> HitRate:
    verified = [e for e in entries if e.verified and e.outcome in _VALID_OUTCOMES]
    n_verified = len(verified)
    n_correct = sum(1 for e in verified if e.outcome == "correct")
    hit_rate = (n_correct / n_verified) if n_verified else None
    return HitRate(n_verified=n_verified, n_correct=n_correct, hit_rate=hit_rate)

@dataclass(frozen=True)
class MurphyDecomposition:
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
