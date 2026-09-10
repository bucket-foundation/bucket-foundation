"""Property tests for `hte.corpus.production`: `load`'s own `status_min`
filtering excludes retracted claims from ground truth regardless of
`status_min`, is monotone (raising `status_min` never adds items),
`load_supabase` never reads anything but `SUPABASE_URL`/
`SUPABASE_SERVICE_KEY` and never leaks either into a returned corpus or a
raised error, plus the generic corpus invariants this round's own task
brief names for every adapter.
"""
from __future__ import annotations

import json
import os
import string
from unittest.mock import MagicMock, call

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from hte.corpus import production

from tests.swarm2.conftest import assert_corpus_invariants

# `_STATUS_ORDER`/`_RETRACTED`, quoted verbatim from `hte.corpus.
# production`'s own module docstring rather than imported (those names
# are module-private): the four-rung maturity ladder plus the one
# terminal, off-ladder status.
_STATUS_ORDER = ("draft", "peer-reviewed", "teacher-reviewed", "accepted")
_RETRACTED = "retracted"
_ALL_STATUSES = _STATUS_ORDER + (_RETRACTED,)

_STANCES = ("supports", "extends", "refutes")


def _production_dict(pid: str, status: str, *, interval_start: int = 2020) -> dict:
    history = []
    if status == "accepted":
        history = [
            {"status": "peer-reviewed", "date": "2019-06-01"},
            {"status": "accepted", "date": "2019-09-01"},
        ]
    elif status == "retracted":
        history = [
            {"status": "peer-reviewed", "date": "2019-06-01"},
            {"status": "accepted", "date": "2019-09-01"},
            {"status": "retracted", "date": "2020-01-01"},
        ]
    return {
        "id": pid,
        "created_at": "2019-01-01T00:00:00Z",
        "author_role": "student",
        "grade_band": "6-8",
        "school_or_district_id": "district-a",
        "research_question": "RQ19: does X help Y",
        "claims": [{
            "text": f"claim from {pid}",
            "stance": "supports",
            "slots": {"actor": None, "action": None, "object": None, "place": None, "mechanism": None},
            "interval": {"start": interval_start, "end": interval_start, "uncertainty": {"kind": "point", "params": {}}},
            "evidence": [{
                "source_id": f"ext-src-{pid}",
                "locator": "p1",
                "quote": f"evidence quote for {pid}",
                "kind": "textual",
                "tier": "T3",
                "citations": [],
            }],
        }],
        "review": {"status": status, "history": history},
        "provenance": "test-fixture",
    }


status_lists_st = st.lists(st.sampled_from(_ALL_STATUSES), min_size=1, max_size=8)


def _write_productions(tmp_path, statuses: list[str]) -> list[str]:
    pids = []
    for i, status in enumerate(statuses):
        pid = f"prod-{i}"
        pids.append(pid)
        (tmp_path / f"{pid}.json").write_text(json.dumps(_production_dict(pid, status, interval_start=2000 + i)))
    return pids


# --------------------------------------------------------------------------
# Retracted claims never contribute ground truth, for every status_min.
# --------------------------------------------------------------------------


@given(statuses=status_lists_st)
@settings(max_examples=300)
def test_load_excludes_retracted_claims_from_ground_truth_for_every_status_min(tmp_path_factory, statuses):
    corpus_dir = tmp_path_factory.mktemp("prod-retract")
    pids = _write_productions(corpus_dir, statuses)
    retracted_pids = {pid for pid, status in zip(pids, statuses) if status == "retracted"}

    for status_min in _STATUS_ORDER:
        corpus = production.load(corpus_dir, status_min=status_min)
        for gt in corpus.ground_truth:
            owning_pid = gt.id.split("-c")[0]
            assert owning_pid not in retracted_pids, (
                f"ground truth {gt.id!r} traces back to retracted production {owning_pid!r} "
                f"under status_min={status_min!r}"
            )


# --------------------------------------------------------------------------
# Monotone: raising status_min never adds items (evidence ids form a
# non-increasing chain up the ladder).
# --------------------------------------------------------------------------


@given(statuses=status_lists_st)
@settings(max_examples=300)
def test_load_is_monotone_in_status_min(tmp_path_factory, statuses):
    corpus_dir = tmp_path_factory.mktemp("prod-monotone")
    _write_productions(corpus_dir, statuses)

    id_sets = []
    for status_min in _STATUS_ORDER:
        corpus = production.load(corpus_dir, status_min=status_min)
        id_sets.append({item.id for item in corpus.evidence})

    for lower, higher in zip(id_sets, id_sets[1:]):
        assert higher <= lower, "raising status_min added an evidence item not present at the lower status_min"


@given(statuses=status_lists_st)
@settings(max_examples=300)
def test_load_retracted_evidence_present_at_every_status_min(tmp_path_factory, statuses):
    """A retracted production's own evidence passes `status_min`
    unconditionally (`_passes_status_min`'s own contract): its ids are
    present in the corpus at EVERY `status_min`, the fixed floor the
    monotone chain above never drops below."""
    corpus_dir = tmp_path_factory.mktemp("prod-retract-floor")
    pids = _write_productions(corpus_dir, statuses)
    retracted_pids = {pid for pid, status in zip(pids, statuses) if status == "retracted"}
    if not retracted_pids:
        return

    for status_min in _STATUS_ORDER:
        corpus = production.load(corpus_dir, status_min=status_min)
        ids = {item.id for item in corpus.evidence}
        for pid in retracted_pids:
            assert any(item_id.startswith(f"{pid}-c") for item_id in ids), (
                f"retracted production {pid!r}'s own evidence is missing at status_min={status_min!r}"
            )


# --------------------------------------------------------------------------
# Generic corpus invariants, over a corpus built with real, resolvable
# vocabulary slot values (not the all-None shape the two properties above
# use, so the "slots resolve to a vocab id or None" invariant gets
# exercised by real matches too).
# --------------------------------------------------------------------------

_VOCAB = production.load_vocab()


def _slotted_production_dict(pid: str, status: str, *, interval_start: int) -> dict:
    d = _production_dict(pid, status, interval_start=interval_start)
    d["claims"][0]["slots"] = {
        "actor": "student-researcher", "action": "raised", "object": "tier-assignment",
        "place": "district-a-schools", "mechanism": "reviewer-training",
    }
    return d


@given(statuses=status_lists_st, status_min=st.sampled_from(_STATUS_ORDER))
@settings(max_examples=300)
def test_load_generic_corpus_invariants(tmp_path_factory, statuses, status_min):
    corpus_dir = tmp_path_factory.mktemp("prod-invariants")
    for i, status in enumerate(statuses):
        pid = f"prod-{i}"
        (corpus_dir / f"{pid}.json").write_text(json.dumps(_slotted_production_dict(pid, status, interval_start=2000 + i)))

    corpus = production.load(corpus_dir, status_min=status_min)
    assert_corpus_invariants(corpus)


# --------------------------------------------------------------------------
# load_supabase: reads only the two documented env vars, never leaks
# either into a returned corpus or a raised error.
# --------------------------------------------------------------------------


class _FakeResponse:
    def __init__(self, payload: bytes):
        self._payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def read(self) -> bytes:
        return self._payload


def _make_mock_environ(backing: dict[str, str]) -> MagicMock:
    mock_environ = MagicMock()
    mock_environ.get.side_effect = lambda key, default=None: backing.get(key, default)
    return mock_environ


def test_load_supabase_missing_both_env_vars_reads_only_the_two_documented_keys(monkeypatch):
    mock_environ = _make_mock_environ({})
    monkeypatch.setattr(os, "environ", mock_environ)

    with pytest.raises(RuntimeError):
        production.load_supabase()

    # Naming the two env var NAMES in the error message is fine (and
    # expected, per load_supabase's own docstring); only a VALUE must
    # never appear, and with nothing set there is no value to leak.
    assert mock_environ.get.call_args_list == [call("SUPABASE_URL"), call("SUPABASE_SERVICE_KEY")]


def test_load_supabase_explicit_args_never_touch_environ(monkeypatch):
    mock_environ = _make_mock_environ({})
    monkeypatch.setattr(os, "environ", mock_environ)
    monkeypatch.setattr(
        production.urllib.request, "urlopen",
        lambda request, timeout=30: _FakeResponse(json.dumps([]).encode("utf-8")),
    )

    corpus = production.load_supabase(url="https://example.invalid", key="explicit-key-value")
    assert corpus.evidence == []
    assert mock_environ.get.call_count == 0


secret_st = st.text(alphabet=string.ascii_letters + string.digits, min_size=12, max_size=40)


@given(secret=secret_st)
@settings(max_examples=300)
def test_load_supabase_env_secret_never_leaks_into_returned_corpus(secret):
    mock_environ = _make_mock_environ({"SUPABASE_URL": "https://example.invalid", "SUPABASE_SERVICE_KEY": secret})
    rows = [_slotted_production_dict("prod-0", "accepted", interval_start=2020)]

    with pytest.MonkeyPatch().context() as mp:
        mp.setattr(os, "environ", mock_environ)
        mp.setattr(
            production.urllib.request, "urlopen",
            lambda request, timeout=30: _FakeResponse(json.dumps(rows).encode("utf-8")),
        )
        corpus = production.load_supabase()

    assert mock_environ.get.call_args_list == [call("SUPABASE_URL"), call("SUPABASE_SERVICE_KEY")]
    serialized = json.dumps(corpus.to_dict())
    assert secret not in serialized


@given(secret=secret_st)
@settings(max_examples=300)
def test_load_supabase_env_secret_never_leaks_into_a_raised_error(secret):
    import urllib.error

    mock_environ = _make_mock_environ({"SUPABASE_URL": "https://example.invalid", "SUPABASE_SERVICE_KEY": secret})

    def _raise_url_error(request, timeout=30):
        raise urllib.error.URLError("connection refused")

    with pytest.MonkeyPatch().context() as mp:
        mp.setattr(os, "environ", mock_environ)
        mp.setattr(production.urllib.request, "urlopen", _raise_url_error)
        with pytest.raises(RuntimeError) as exc_info:
            production.load_supabase()

    assert secret not in str(exc_info.value)
    assert mock_environ.get.call_args_list == [call("SUPABASE_URL"), call("SUPABASE_SERVICE_KEY")]
