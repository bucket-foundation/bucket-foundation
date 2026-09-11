"""`hte.holdout_ledger`: the persisted ranking-holdout track record
(`bkt-hte-holdout-ledger`, `PLAN.md` section 10). Every test here points
at a `tmp_path` ledger file, never the real committed one at `hte/data/
ranking-holdout-ledger.jsonl`.
"""
from __future__ import annotations

import json

import pytest

from hte import holdout_ledger


def _rows(n: int) -> list[dict]:
    return [
        {"address": 100 + i, "short_id": f"h{i}", "statement": f"statement {i}", "elo": 1500.0 + i}
        for i in range(n)
    ]


def test_build_entries_ranks_in_input_order():
    entries = holdout_ledger.build_entries(_rows(3), run_id="run-1", corpus="quantum-history")
    assert [e.rank for e in entries] == [1, 2, 3]
    assert [e.entry_id for e in entries] == ["run-1:100", "run-1:101", "run-1:102"]
    assert all(e.verified is False and e.outcome is None for e in entries)


def test_load_ledger_missing_file_returns_empty(tmp_path):
    assert holdout_ledger.load_ledger(tmp_path / "missing.jsonl") == []


def test_append_entries_writes_and_round_trips(tmp_path):
    path = tmp_path / "ledger.jsonl"
    entries = holdout_ledger.build_entries(_rows(2), run_id="run-1", corpus="c")
    added = holdout_ledger.append_entries(entries, path=path)
    assert len(added) == 2
    loaded = holdout_ledger.load_ledger(path)
    assert [e.entry_id for e in loaded] == [e.entry_id for e in entries]
    # One JSON object per line, newest last, matching the module's own
    # append-only contract.
    lines = path.read_text().strip().splitlines()
    assert len(lines) == 2
    json.loads(lines[0])  # each line parses on its own


def test_append_entries_is_idempotent_on_entry_id(tmp_path):
    path = tmp_path / "ledger.jsonl"
    entries = holdout_ledger.build_entries(_rows(2), run_id="run-1", corpus="c")
    holdout_ledger.append_entries(entries, path=path)
    second = holdout_ledger.append_entries(entries, path=path)
    assert second == []  # every entry_id already present
    assert len(holdout_ledger.load_ledger(path)) == 2


def test_append_entries_adds_only_the_new_rows(tmp_path):
    path = tmp_path / "ledger.jsonl"
    first = holdout_ledger.build_entries(_rows(1), run_id="run-1", corpus="c")
    holdout_ledger.append_entries(first, path=path)
    second_batch = holdout_ledger.build_entries(_rows(2), run_id="run-1", corpus="c")
    added = holdout_ledger.append_entries(second_batch, path=path)
    assert len(added) == 1
    assert added[0].entry_id == "run-1:101"
    assert len(holdout_ledger.load_ledger(path)) == 2


def test_verify_entry_updates_fields_and_persists(tmp_path):
    path = tmp_path / "ledger.jsonl"
    holdout_ledger.append_entries(holdout_ledger.build_entries(_rows(1), run_id="run-1", corpus="c"), path=path)
    updated = holdout_ledger.verify_entry("run-1:100", "correct", verified_by="jane-reviewer", path=path)
    assert updated.verified is True
    assert updated.outcome == "correct"
    assert updated.verified_by == "jane-reviewer"
    assert updated.verified_at is not None

    reloaded = holdout_ledger.load_ledger(path)
    assert reloaded[0].verified is True
    assert reloaded[0].outcome == "correct"


def test_verify_entry_unknown_id_raises(tmp_path):
    path = tmp_path / "ledger.jsonl"
    holdout_ledger.append_entries(holdout_ledger.build_entries(_rows(1), run_id="run-1", corpus="c"), path=path)
    with pytest.raises(ValueError, match="no entry"):
        holdout_ledger.verify_entry("run-1:999", "correct", verified_by="jane", path=path)


def test_verify_entry_invalid_outcome_raises(tmp_path):
    path = tmp_path / "ledger.jsonl"
    holdout_ledger.append_entries(holdout_ledger.build_entries(_rows(1), run_id="run-1", corpus="c"), path=path)
    with pytest.raises(ValueError, match="outcome"):
        holdout_ledger.verify_entry("run-1:100", "maybe", verified_by="jane", path=path)


def test_verify_entry_requires_verified_by(tmp_path):
    path = tmp_path / "ledger.jsonl"
    holdout_ledger.append_entries(holdout_ledger.build_entries(_rows(1), run_id="run-1", corpus="c"), path=path)
    with pytest.raises(ValueError, match="verified_by"):
        holdout_ledger.verify_entry("run-1:100", "correct", verified_by="  ", path=path)


def test_compute_hit_rate_none_when_nothing_verified():
    entries = holdout_ledger.build_entries(_rows(3), run_id="run-1", corpus="c")
    rate = holdout_ledger.compute_hit_rate(entries)
    assert rate.n_verified == 0
    assert rate.hit_rate is None


def test_compute_hit_rate_math(tmp_path):
    path = tmp_path / "ledger.jsonl"
    holdout_ledger.append_entries(holdout_ledger.build_entries(_rows(4), run_id="run-1", corpus="c"), path=path)
    holdout_ledger.verify_entry("run-1:100", "correct", verified_by="jane", path=path)
    holdout_ledger.verify_entry("run-1:101", "correct", verified_by="jane", path=path)
    holdout_ledger.verify_entry("run-1:102", "incorrect", verified_by="jane", path=path)
    rate = holdout_ledger.compute_hit_rate(holdout_ledger.load_ledger(path))
    assert rate.n_verified == 3
    assert rate.n_correct == 2
    assert rate.hit_rate == pytest.approx(2 / 3)


def test_ranking_status_unvalidated_below_threshold(tmp_path):
    path = tmp_path / "ledger.jsonl"
    holdout_ledger.append_entries(holdout_ledger.build_entries(_rows(2), run_id="run-1", corpus="c"), path=path)
    holdout_ledger.verify_entry("run-1:100", "correct", verified_by="jane", path=path)

    status = holdout_ledger.ranking_status(path=path, min_verified=5)
    assert status.elo_status == holdout_ledger.UNVALIDATED_STATUS
    assert status.hit_rate is None
    assert status.n_verified == 1
    assert "Unvalidated" in status.label


def test_ranking_status_validated_at_threshold_reports_hit_rate(tmp_path):
    path = tmp_path / "ledger.jsonl"
    rows = _rows(3)
    holdout_ledger.append_entries(holdout_ledger.build_entries(rows, run_id="run-1", corpus="c"), path=path)
    holdout_ledger.verify_entry("run-1:100", "correct", verified_by="jane", path=path)
    holdout_ledger.verify_entry("run-1:101", "correct", verified_by="jane", path=path)
    holdout_ledger.verify_entry("run-1:102", "incorrect", verified_by="jane", path=path)

    status = holdout_ledger.ranking_status(path=path, min_verified=3)
    assert status.elo_status == holdout_ledger.VALIDATED_STATUS
    assert status.n_verified == 3
    assert status.hit_rate == pytest.approx(2 / 3)
    assert "Validated" in status.label
    assert "67%" in status.label


def test_ranking_status_reads_disk_when_entries_not_given(tmp_path):
    path = tmp_path / "ledger.jsonl"
    holdout_ledger.append_entries(holdout_ledger.build_entries(_rows(1), run_id="run-1", corpus="c"), path=path)
    holdout_ledger.verify_entry("run-1:100", "correct", verified_by="jane", path=path)
    status = holdout_ledger.ranking_status(path=path, min_verified=1)
    assert status.elo_status == holdout_ledger.VALIDATED_STATUS


def test_min_verified_for_label_is_positive_and_small_enough_to_reach():
    # Documented in the module's own top docstring: large enough that one
    # flipped verification cannot swing the label, small enough to reach
    # in a modest run of write-backs.
    assert 0 < holdout_ledger.MIN_VERIFIED_FOR_LABEL <= 50
