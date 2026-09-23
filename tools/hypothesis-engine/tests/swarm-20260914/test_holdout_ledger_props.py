from __future__ import annotations

import json

from hypothesis import given, settings
from hypothesis import strategies as st

from hte import holdout_ledger

_ROW = st.fixed_dictionaries({
    "address": st.integers(min_value=0, max_value=10_000),
    "short_id": st.text(min_size=1, max_size=8, alphabet=st.characters(min_codepoint=97, max_codepoint=122)),
    "statement": st.text(min_size=0, max_size=40),
    "elo": st.one_of(st.none(), st.floats(min_value=0, max_value=3000, allow_nan=False, allow_infinity=False)),
})

@given(rows=st.lists(_ROW, min_size=0, max_size=20))
@settings(max_examples=40)
def test_build_entries_ranks_are_a_contiguous_1_based_sequence(rows):
    entries = holdout_ledger.build_entries(rows, run_id="run-x", corpus="c")
    assert [e.rank for e in entries] == list(range(1, len(entries) + 1))

@given(rows=st.lists(_ROW, min_size=1, max_size=15, unique_by=lambda r: r["address"]))
@settings(max_examples=40)
def test_append_then_load_round_trips_every_field(tmp_path_factory, rows):
    path = tmp_path_factory.mktemp("ledger") / "l.jsonl"
    entries = holdout_ledger.build_entries(rows, run_id="run-x", corpus="c")
    holdout_ledger.append_entries(entries, path=path)
    loaded = holdout_ledger.load_ledger(path)
    assert [e.to_dict() for e in loaded] == [e.to_dict() for e in entries]

@given(rows=st.lists(_ROW, min_size=1, max_size=15, unique_by=lambda r: r["address"]))
@settings(max_examples=40)
def test_appending_the_same_batch_twice_never_duplicates(tmp_path_factory, rows):
    path = tmp_path_factory.mktemp("ledger") / "l.jsonl"
    entries = holdout_ledger.build_entries(rows, run_id="run-x", corpus="c")
    holdout_ledger.append_entries(entries, path=path)
    second = holdout_ledger.append_entries(entries, path=path)
    assert second == []
    loaded = holdout_ledger.load_ledger(path)
    assert len(loaded) == len(rows)
    assert len({e.entry_id for e in loaded}) == len(loaded)

def test_finding_2026_09_14_601_duplicate_address_within_one_batch_should_not_duplicate_the_ledger(tmp_path):
    rows = [
        {"address": 100, "short_id": "h0", "statement": "first", "elo": 1500.0},
        {"address": 100, "short_id": "h0-dup", "statement": "second", "elo": 1499.0},
    ]
    entries = holdout_ledger.build_entries(rows, run_id="run-1", corpus="c")
    assert [e.entry_id for e in entries] == ["run-1:100", "run-1:100"]

    added = holdout_ledger.append_entries(entries, path=tmp_path / "l.jsonl")

    assert len(added) == 1
    assert added[0].statement == "first"
    loaded = holdout_ledger.load_ledger(tmp_path / "l.jsonl")
    assert len(loaded) == 1
    assert loaded[0].statement == "first"

@given(rows=st.lists(_ROW, min_size=0, max_size=15))
@settings(max_examples=40)
def test_append_entries_result_ids_are_always_unique(tmp_path_factory, rows):
    path = tmp_path_factory.mktemp("ledger") / "l.jsonl"
    entries = holdout_ledger.build_entries(rows, run_id="run-x", corpus="c")
    holdout_ledger.append_entries(entries, path=path)
    loaded = holdout_ledger.load_ledger(path)
    ids = [e.entry_id for e in loaded]
    assert len(ids) == len(set(ids))

@given(
    n_correct=st.integers(min_value=0, max_value=10),
    n_incorrect=st.integers(min_value=0, max_value=10),
    n_unverified=st.integers(min_value=0, max_value=10),
)
@settings(max_examples=40)
def test_compute_hit_rate_matches_the_ratio_definition(n_correct, n_incorrect, n_unverified):
    entries = []
    i = 0
    for _ in range(n_correct):
        entries.append(holdout_ledger.LedgerEntry(
            entry_id=f"e{i}", run_id="r", corpus=None, hypothesis_short_id="h", address=i,
            statement="s", elo=None, rank=1, recorded_at="t", verified=True, outcome="correct",
        ))
        i += 1
    for _ in range(n_incorrect):
        entries.append(holdout_ledger.LedgerEntry(
            entry_id=f"e{i}", run_id="r", corpus=None, hypothesis_short_id="h", address=i,
            statement="s", elo=None, rank=1, recorded_at="t", verified=True, outcome="incorrect",
        ))
        i += 1
    for _ in range(n_unverified):
        entries.append(holdout_ledger.LedgerEntry(
            entry_id=f"e{i}", run_id="r", corpus=None, hypothesis_short_id="h", address=i,
            statement="s", elo=None, rank=1, recorded_at="t", verified=False, outcome=None,
        ))
        i += 1

    rate = holdout_ledger.compute_hit_rate(entries)
    n_verified = n_correct + n_incorrect
    assert rate.n_verified == n_verified
    assert rate.n_correct == n_correct
    if n_verified == 0:
        assert rate.hit_rate is None
    else:
        assert rate.hit_rate == n_correct / n_verified

@given(
    n_verified=st.integers(min_value=0, max_value=30),
    min_verified=st.integers(min_value=1, max_value=30),
)
@settings(max_examples=40)
def test_ranking_status_label_switches_exactly_at_min_verified(tmp_path_factory, n_verified, min_verified):
    path = tmp_path_factory.mktemp("ledger") / "l.jsonl"
    rows = [
        {"address": i, "short_id": f"h{i}", "statement": "s", "elo": 1500.0}
        for i in range(n_verified)
    ]
    holdout_ledger.append_entries(holdout_ledger.build_entries(rows, run_id="r", corpus="c"), path=path)
    for i in range(n_verified):
        holdout_ledger.verify_entry(f"r:{i}", "correct", verified_by="tester", path=path)

    status = holdout_ledger.ranking_status(path=path, min_verified=min_verified)
    assert status.n_verified == n_verified
    if n_verified < min_verified:
        assert status.elo_status == holdout_ledger.UNVALIDATED_STATUS
        assert status.hit_rate is None
        assert "Unvalidated" in status.label
    else:
        assert status.elo_status == holdout_ledger.VALIDATED_STATUS
        assert status.hit_rate == 1.0
        assert "Validated" in status.label

def test_ledger_file_is_one_json_object_per_line(tmp_path):
    path = tmp_path / "l.jsonl"
    rows = [{"address": i, "short_id": f"h{i}", "statement": "s", "elo": None} for i in range(3)]
    holdout_ledger.append_entries(holdout_ledger.build_entries(rows, run_id="r", corpus="c"), path=path)
    lines = path.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 3
    for line in lines:
        json.loads(line)
