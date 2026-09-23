from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pytest

from hte import holdout_ledger
from hte.casp_cadence import (
    CADENCE,
    Round,
    RoundStatus,
    close_round,
    due_rounds,
    find_round,
    is_due,
    load_rounds,
    main,
    open_round,
    round_id_for,
    round_status,
    round_window,
)

FIXTURE_RANKED = Path(__file__).parent / "fixtures" / "casp-cadence" / "ranked.json"

def _ranked() -> list[dict]:
    return json.loads(FIXTURE_RANKED.read_text(encoding="utf-8"))

def test_cadence_is_quarterly():
    assert CADENCE == "quarterly"

@pytest.mark.parametrize("month,expected_quarter", [(1, 1), (3, 1), (4, 2), (6, 2), (7, 3), (9, 3), (10, 4), (12, 4)])
def test_round_id_for_picks_the_right_quarter(month, expected_quarter):
    at = datetime(2026, month, 15, tzinfo=timezone.utc)
    assert round_id_for(at) == f"2026-Q{expected_quarter}"

def test_round_window_q3_2026():
    start, end = round_window("2026-Q3")
    assert start == datetime(2026, 7, 1, tzinfo=timezone.utc)
    assert end == datetime(2026, 10, 1, tzinfo=timezone.utc)

def test_round_window_q4_rolls_into_next_year():
    start, end = round_window("2026-Q4")
    assert start == datetime(2026, 10, 1, tzinfo=timezone.utc)
    assert end == datetime(2027, 1, 1, tzinfo=timezone.utc)

def test_round_window_rejects_bad_quarter():
    with pytest.raises(ValueError):
        round_window("2026-Q5")

def test_is_due_false_within_the_window_true_after():
    round_id = "2026-Q3"
    assert is_due(round_id, at=datetime(2026, 8, 1, tzinfo=timezone.utc)) is False
    assert is_due(round_id, at=datetime(2026, 10, 1, tzinfo=timezone.utc)) is True
    assert is_due(round_id, at=datetime(2026, 12, 1, tzinfo=timezone.utc)) is True

def test_open_round_freezes_the_ranked_list_and_registers_ledger_entries(tmp_path):
    ranked = _ranked()
    rounds_path = tmp_path / "rounds.jsonl"
    ledger_path = tmp_path / "ledger.jsonl"
    at = datetime(2026, 9, 11, tzinfo=timezone.utc)

    round_ = open_round(ranked, run_id="run-1", corpus="fixtures", at=at, rounds_path=rounds_path, ledger_path=ledger_path)

    assert round_.round_id == "2026-Q3"
    assert round_.run_id == "run-1"
    assert round_.corpus == "fixtures"
    assert round_.frozen == ranked
    assert round_.scored_at is None
    assert round_.ledger_entry_ids == [f"run-1:{row['address']}" for row in ranked]

    ledger = holdout_ledger.load_ledger(ledger_path)
    assert len(ledger) == len(ranked)
    assert {e.entry_id for e in ledger} == set(round_.ledger_entry_ids)

def test_open_round_is_idempotent_on_round_id_and_run_id(tmp_path):
    ranked = _ranked()
    rounds_path = tmp_path / "rounds.jsonl"
    ledger_path = tmp_path / "ledger.jsonl"
    at = datetime(2026, 9, 11, tzinfo=timezone.utc)

    first = open_round(ranked, run_id="run-1", corpus="fixtures", at=at, rounds_path=rounds_path, ledger_path=ledger_path)
    second = open_round(ranked, run_id="run-1", corpus="fixtures", at=at, rounds_path=rounds_path, ledger_path=ledger_path)

    assert first == second
    assert len(load_rounds(rounds_path)) == 1
    assert len(holdout_ledger.load_ledger(ledger_path)) == len(ranked)

def test_open_round_distinct_run_ids_open_separate_rounds_same_quarter(tmp_path):
    ranked = _ranked()
    rounds_path = tmp_path / "rounds.jsonl"
    ledger_path = tmp_path / "ledger.jsonl"
    at = datetime(2026, 9, 11, tzinfo=timezone.utc)

    open_round(ranked, run_id="run-a", corpus="fixtures", at=at, rounds_path=rounds_path, ledger_path=ledger_path)
    open_round(ranked, run_id="run-b", corpus="fixtures", at=at, rounds_path=rounds_path, ledger_path=ledger_path)

    rounds = load_rounds(rounds_path)
    assert len(rounds) == 2
    assert {r.run_id for r in rounds} == {"run-a", "run-b"}
    assert len(holdout_ledger.load_ledger(ledger_path)) == 2 * len(ranked)

def test_find_round_returns_none_when_absent(tmp_path):
    rounds_path = tmp_path / "rounds.jsonl"
    assert find_round("2026-Q3", "no-such-run", path=rounds_path) is None

def test_round_status_unknown_round_raises(tmp_path):
    with pytest.raises(ValueError, match="no round"):
        round_status("2026-Q3", "no-such-run", rounds_path=tmp_path / "rounds.jsonl")

def test_round_status_tracks_verification_as_it_arrives(tmp_path):
    ranked = _ranked()
    rounds_path = tmp_path / "rounds.jsonl"
    ledger_path = tmp_path / "ledger.jsonl"
    at = datetime(2026, 9, 11, tzinfo=timezone.utc)
    round_ = open_round(ranked, run_id="run-1", corpus="fixtures", at=at, rounds_path=rounds_path, ledger_path=ledger_path)

    before = round_status(round_.round_id, "run-1", rounds_path=rounds_path, ledger_path=ledger_path, at=at)
    assert before.n_frozen == 3
    assert before.n_verified == 0
    assert before.hit_rate is None
    assert before.due is False

    holdout_ledger.verify_entry(round_.ledger_entry_ids[0], "correct", verified_by="tester", path=ledger_path)
    holdout_ledger.verify_entry(round_.ledger_entry_ids[1], "incorrect", verified_by="tester", path=ledger_path)

    after = round_status(round_.round_id, "run-1", rounds_path=rounds_path, ledger_path=ledger_path, at=at)
    assert after.n_verified == 2
    assert after.n_correct == 1
    assert after.hit_rate == pytest.approx(0.5)

def test_due_rounds_excludes_open_windows_and_scored_rounds(tmp_path):
    ranked = _ranked()
    rounds_path = tmp_path / "rounds.jsonl"
    ledger_path = tmp_path / "ledger.jsonl"
    open_at = datetime(2026, 9, 11, tzinfo=timezone.utc)
    round_ = open_round(ranked, run_id="run-1", corpus="fixtures", at=open_at, rounds_path=rounds_path, ledger_path=ledger_path)

    assert due_rounds(at=open_at, rounds_path=rounds_path) == []

    later = datetime(2026, 10, 2, tzinfo=timezone.utc)
    assert [r.key for r in due_rounds(at=later, rounds_path=rounds_path)] == [round_.key]

    for eid in round_.ledger_entry_ids:
        holdout_ledger.verify_entry(eid, "correct", verified_by="tester", path=ledger_path)
    close_round(round_.round_id, "run-1", rounds_path=rounds_path, ledger_path=ledger_path, at=later)

    assert due_rounds(at=later, rounds_path=rounds_path) == []
    assert len(due_rounds(at=later, rounds_path=rounds_path, include_scored=True)) == 1

def test_close_round_refuses_before_the_window_closes(tmp_path):
    ranked = _ranked()
    rounds_path = tmp_path / "rounds.jsonl"
    ledger_path = tmp_path / "ledger.jsonl"
    at = datetime(2026, 9, 11, tzinfo=timezone.utc)
    round_ = open_round(ranked, run_id="run-1", corpus="fixtures", at=at, rounds_path=rounds_path, ledger_path=ledger_path)
    for eid in round_.ledger_entry_ids:
        holdout_ledger.verify_entry(eid, "correct", verified_by="tester", path=ledger_path)

    with pytest.raises(ValueError, match="not due"):
        close_round(round_.round_id, "run-1", rounds_path=rounds_path, ledger_path=ledger_path, at=at)

def test_close_round_refuses_on_partial_outcomes(tmp_path):
    ranked = _ranked()
    rounds_path = tmp_path / "rounds.jsonl"
    ledger_path = tmp_path / "ledger.jsonl"
    open_at = datetime(2026, 9, 11, tzinfo=timezone.utc)
    round_ = open_round(ranked, run_id="run-1", corpus="fixtures", at=open_at, rounds_path=rounds_path, ledger_path=ledger_path)
    holdout_ledger.verify_entry(round_.ledger_entry_ids[0], "correct", verified_by="tester", path=ledger_path)

    later = datetime(2026, 10, 2, tzinfo=timezone.utc)
    with pytest.raises(ValueError, match="verified"):
        close_round(round_.round_id, "run-1", rounds_path=rounds_path, ledger_path=ledger_path, at=later)

def test_close_round_succeeds_once_every_prediction_is_verified(tmp_path):
    ranked = _ranked()
    rounds_path = tmp_path / "rounds.jsonl"
    ledger_path = tmp_path / "ledger.jsonl"
    open_at = datetime(2026, 9, 11, tzinfo=timezone.utc)
    round_ = open_round(ranked, run_id="run-1", corpus="fixtures", at=open_at, rounds_path=rounds_path, ledger_path=ledger_path)
    for eid in round_.ledger_entry_ids:
        holdout_ledger.verify_entry(eid, "correct", verified_by="tester", path=ledger_path)

    later = datetime(2026, 10, 2, tzinfo=timezone.utc)
    closed = close_round(round_.round_id, "run-1", rounds_path=rounds_path, ledger_path=ledger_path, at=later)
    assert closed.scored_at is not None

    reloaded = find_round(round_.round_id, "run-1", path=rounds_path)
    assert reloaded.scored_at == closed.scored_at

def test_round_roundtrip():
    round_ = Round(
        round_id="2026-Q3", run_id="run-1", corpus="fixtures", opened_at="2026-09-11T00:00:00+00:00",
        window_start="2026-07-01T00:00:00+00:00", window_end="2026-10-01T00:00:00+00:00",
        frozen=[{"address": 1, "short_id": "abc", "statement": "s", "elo": 1500.0}],
        ledger_entry_ids=["run-1:1"],
    )
    back = Round.from_dict(round_.to_dict())
    assert back == round_

def test_round_status_to_dict_shape():
    status = RoundStatus(round_id="2026-Q3", run_id="run-1", n_frozen=3, n_verified=1, n_correct=1, hit_rate=1.0, due=True, scored=False)
    assert status.to_dict() == {
        "round_id": "2026-Q3", "run_id": "run-1", "n_frozen": 3,
        "n_verified": 1, "n_correct": 1, "hit_rate": 1.0, "due": True, "scored": False,
    }

def test_cli_open_then_status_then_due(tmp_path, capsys):
    rounds_path = tmp_path / "rounds.jsonl"
    ledger_path = tmp_path / "ledger.jsonl"

    rc = main([
        "open", str(FIXTURE_RANKED), "--run-id", "cli-run-1", "--corpus", "fixtures",
        "--rounds-path", str(rounds_path), "--ledger-path", str(ledger_path),
    ])
    assert rc == 0
    opened = json.loads(capsys.readouterr().out)
    round_id = opened["round_id"]

    rc = main(["status", round_id, "--run-id", "cli-run-1", "--rounds-path", str(rounds_path), "--ledger-path", str(ledger_path)])
    assert rc == 0
    status = json.loads(capsys.readouterr().out)
    assert status["n_frozen"] == 3
    assert status["n_verified"] == 0

    rc = main(["due", "--rounds-path", str(rounds_path)])
    assert rc == 0
    due = json.loads(capsys.readouterr().out)
    assert due == []

def test_cli_status_unknown_round_returns_1(tmp_path, capsys):
    rounds_path = tmp_path / "rounds.jsonl"
    rc = main(["status", "2026-Q3", "--run-id", "no-such-run", "--rounds-path", str(rounds_path)])
    assert rc == 1
    assert "no round" in capsys.readouterr().err

def test_cli_close_before_due_returns_1(tmp_path, capsys):
    rounds_path = tmp_path / "rounds.jsonl"
    ledger_path = tmp_path / "ledger.jsonl"
    main([
        "open", str(FIXTURE_RANKED), "--run-id", "cli-run-2", "--corpus", "fixtures",
        "--rounds-path", str(rounds_path), "--ledger-path", str(ledger_path),
    ])
    opened_out = capsys.readouterr().out
    round_id = json.loads(opened_out)["round_id"]

    rc = main(["close", round_id, "--run-id", "cli-run-2", "--rounds-path", str(rounds_path), "--ledger-path", str(ledger_path)])
    assert rc == 1
    assert "not due" in capsys.readouterr().err
