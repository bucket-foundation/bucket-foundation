from __future__ import annotations

import json

import pytest
from hypothesis import HealthCheck, assume, given, settings
from hypothesis import strategies as st

from hte.corpus import research_os_outbox
from hte.corpus.production import RESEARCH_OS_STATUS_MAP

from tests.swarm2.conftest import assert_corpus_invariants

_GOOD_STATUSES = tuple(RESEARCH_OS_STATUS_MAP)
_BAD_STATUSES = ("retracted", "peer-reviewed", "not-a-real-status")

_MONKEYPATCH_GIVEN = settings(deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])

_id_st = st.from_regex(r"ros-[a-z]{3,10}-[0-9]{1,4}", fullmatch=True)

def _row(row_id: str, status: str, *, learner_id: str | None = None) -> dict:
    row = {
        "id": row_id,
        "target_node_id": "why-the-sky-is-blue",
        "claim": f"claim text for {row_id}",
        "evidence": [{"node_id": "rayleigh-scattering-law", "quote": "scatters more strongly at short wavelengths"}],
        "sources": [{"label": "Rayleigh 1871", "doi": "10.1080/14786447108640507"}],
        "status": status,
        "created_at": "2026-09-01T00:00:00Z",
        "updated_at": "2026-09-02T00:00:00Z",
    }
    if learner_id is not None:
        row["learner_id"] = learner_id
    return row

class _FakeResponse:
    def __init__(self, payload) -> None:
        self._payload = payload

    def read(self) -> bytes:
        body = self._payload if isinstance(self._payload, (bytes, str)) else json.dumps(self._payload)
        return body.encode("utf-8") if isinstance(body, str) else body

    def __enter__(self) -> "_FakeResponse":
        return self

    def __exit__(self, *exc_info: object) -> bool:
        return False

@given(url=st.text(min_size=1, max_size=20), key=st.text(min_size=1, max_size=20))
@_MONKEYPATCH_GIVEN
def test_resolve_credentials_prefers_explicit_args_over_env(monkeypatch, url, key):
    monkeypatch.setenv("SUPABASE_URL", "https://env-should-not-win.example")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "env-key-should-not-win")
    resolved_url, resolved_key = research_os_outbox._resolve_credentials(url, key)
    assert resolved_url == url.rstrip("/")
    assert resolved_key == key

@given(secret_key=st.text(alphabet=st.characters(min_codepoint=97, max_codepoint=122), min_size=8, max_size=24))
@_MONKEYPATCH_GIVEN
def test_resolve_credentials_error_never_echoes_a_supplied_key(monkeypatch, secret_key):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    with pytest.raises(RuntimeError) as baseline_info:
        research_os_outbox._resolve_credentials(None, "")
    assume(secret_key not in str(baseline_info.value))

    with pytest.raises(RuntimeError) as exc_info:
        research_os_outbox._resolve_credentials(None, secret_key)
    assert secret_key not in str(exc_info.value)

def test_resolve_credentials_boilerplate_collision_is_not_a_real_leak(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    with pytest.raises(RuntimeError) as exc_info:
        research_os_outbox._resolve_credentials(None, "research")
    assert "research" in str(exc_info.value)

    with pytest.raises(RuntimeError) as exc_info2:
        research_os_outbox._resolve_credentials(None, "xyzzy-not-a-boilerplate-word")
    assert "xyzzy-not-a-boilerplate-word" not in str(exc_info2.value)

def test_resolve_credentials_raises_when_either_is_missing(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_KEY", raising=False)
    with pytest.raises(RuntimeError):
        research_os_outbox._resolve_credentials(None, "a-key")
    with pytest.raises(RuntimeError):
        research_os_outbox._resolve_credentials("https://example.supabase.co", None)

_row_spec_st = st.lists(
    st.tuples(_id_st, st.sampled_from(_GOOD_STATUSES + _BAD_STATUSES)),
    min_size=1, max_size=12, unique_by=lambda pair: pair[0],
)

@given(specs=_row_spec_st)
@settings(deadline=None)
def test_build_partitions_every_row_between_good_ids_and_skipped(specs):
    rows = [_row(row_id, status) for row_id, status in specs]
    corpus, good_ids, skipped = research_os_outbox._build(rows, research_os_outbox.DEFAULT_TABLE, "draft")

    expected_good = {row_id for row_id, status in specs if status in _GOOD_STATUSES}
    expected_bad = {row_id for row_id, status in specs if status in _BAD_STATUSES}

    assert set(good_ids) == expected_good
    assert {s["production_id"] for s in skipped} == expected_bad
    assert len(good_ids) + len(skipped) == len(rows), "every row is accounted for exactly once"
    assert len(set(good_ids) & {s["production_id"] for s in skipped}) == 0, "no row is both kept and skipped"
    for row_id in good_ids:
        assert row_id in corpus.sources

@given(specs=_row_spec_st)
@settings(deadline=None)
def test_build_result_satisfies_generic_corpus_invariants(specs):
    rows = [_row(row_id, status) for row_id, status in specs]
    corpus, _good_ids, _skipped = research_os_outbox._build(rows, research_os_outbox.DEFAULT_TABLE, "draft")
    assert_corpus_invariants(corpus)

def test_build_never_raises_on_an_entirely_malformed_batch():
    rows = [_row(f"ros-allbad-{i}", "not-a-real-status") for i in range(5)]
    corpus, good_ids, skipped = research_os_outbox._build(rows, research_os_outbox.DEFAULT_TABLE, "draft")
    assert good_ids == []
    assert len(skipped) == 5
    assert len(corpus.sources) == 0

@given(
    ids=st.lists(_id_st, min_size=2, max_size=6, unique=True),
    learner_ids=st.lists(st.none() | st.text(alphabet=st.characters(min_codepoint=97, max_codepoint=122), min_size=1, max_size=12), min_size=2, max_size=6),
)
@settings(deadline=None)
def test_build_stamps_each_good_row_with_only_its_own_identity(ids, learner_ids):
    n = min(len(ids), len(learner_ids))
    ids, learner_ids = ids[:n], learner_ids[:n]
    rows = [_row(row_id, "accepted", learner_id=learner_id) for row_id, learner_id in zip(ids, learner_ids)]
    corpus, good_ids, _skipped = research_os_outbox._build(rows, research_os_outbox.DEFAULT_TABLE, "draft")

    assert set(good_ids) == set(ids)
    by_id = dict(zip(ids, learner_ids))
    for row_id, learner_id in by_id.items():
        source = corpus.sources[row_id]
        assert source.production_id == row_id
        assert source.learner_id == learner_id
        for item in corpus.evidence:
            if item.id.startswith(f"{row_id}-c"):
                assert item.production_id == row_id, "an evidence item's stamped production_id must match its own prefix"
                assert item.learner_id == learner_id

_safe_id_st = st.from_regex(r"[a-zA-Z0-9\-]{1,16}", fullmatch=True)

@given(ids=st.lists(_safe_id_st, min_size=1, max_size=10))
@_MONKEYPATCH_GIVEN
def test_mark_consumed_patch_ids_filter_matches_input_exactly(monkeypatch, ids):
    captured: dict[str, object] = {}

    def fake_urlopen(request, timeout=30):
        captured["url"] = request.full_url
        captured["method"] = request.get_method()
        captured["body"] = json.loads(request.data.decode("utf-8"))
        return _FakeResponse(b"")

    monkeypatch.setattr(research_os_outbox.urllib.request, "urlopen", fake_urlopen)
    research_os_outbox.mark_consumed(ids, url="https://example.supabase.co", key="k")

    assert captured["method"] == "PATCH"
    assert f"id=in.({','.join(ids)})" in str(captured["url"])
    assert "consumed_at" in captured["body"]

def test_mark_consumed_empty_list_never_calls_urlopen(monkeypatch):
    monkeypatch.setattr(
        research_os_outbox.urllib.request, "urlopen",
        lambda request, timeout=30: (_ for _ in ()).throw(AssertionError("must not be called")),
    )
    research_os_outbox.mark_consumed([], url="https://example.supabase.co", key="k")

@given(specs=_row_spec_st)
@_MONKEYPATCH_GIVEN
def test_load_never_raises_over_a_random_mixed_batch(monkeypatch, specs):
    rows = [_row(row_id, status) for row_id, status in specs]
    monkeypatch.setattr(research_os_outbox.urllib.request, "urlopen", lambda request, timeout=30: _FakeResponse(rows))
    corpus = research_os_outbox.load(url="https://example.supabase.co", key="k")
    assert_corpus_invariants(corpus)

@given(table=st.from_regex(r"[a-z_]{3,20}", fullmatch=True))
@_MONKEYPATCH_GIVEN
def test_fetch_unconsumed_rows_wraps_urlerror_in_runtimeerror(monkeypatch, table):
    def fail_urlopen(request, timeout=30):
        raise research_os_outbox.urllib.error.URLError("connection refused")

    monkeypatch.setattr(research_os_outbox.urllib.request, "urlopen", fail_urlopen)
    with pytest.raises(RuntimeError) as exc_info:
        research_os_outbox.fetch_unconsumed_rows(url="https://example.supabase.co", key="k", table=table)
    assert table in str(exc_info.value)
    assert "connection refused" in str(exc_info.value)

@given(table=st.from_regex(r"[a-z_]{3,20}", fullmatch=True))
@_MONKEYPATCH_GIVEN
def test_mark_consumed_wraps_urlerror_in_runtimeerror(monkeypatch, table):
    def fail_urlopen(request, timeout=30):
        raise research_os_outbox.urllib.error.URLError("connection refused")

    monkeypatch.setattr(research_os_outbox.urllib.request, "urlopen", fail_urlopen)
    with pytest.raises(RuntimeError) as exc_info:
        research_os_outbox.mark_consumed(["id-1"], url="https://example.supabase.co", key="k", table=table)
    assert table in str(exc_info.value)
    assert "connection refused" in str(exc_info.value)

@given(
    row_id=_id_st,
    bad_row=st.fixed_dictionaries({}) | st.fixed_dictionaries({"id": st.just("")}) | st.fixed_dictionaries({"id": st.none()}),
)
@settings(deadline=None)
def test_stamp_corpus_provenance_skips_a_row_with_no_resolvable_id(row_id, bad_row):
    good = _row(row_id, "accepted")
    corpus, good_ids, _skipped = research_os_outbox._build([good], research_os_outbox.DEFAULT_TABLE, "draft")
    assert good_ids == [row_id]
    before_source = corpus.sources[row_id]
    before_production_id, before_learner_id = before_source.production_id, before_source.learner_id

    research_os_outbox._stamp_corpus_provenance(corpus, [bad_row])

    assert corpus.sources[row_id].production_id == before_production_id
    assert corpus.sources[row_id].learner_id == before_learner_id
