"""Property tests for `hte.corpus.research_os_outbox`, the least-covered
module (`tests/COVERAGE.md`) with no dedicated swarm file of its own as of
this pass: `tests/test_corpus_research_os_outbox.py` already covers its
happy paths and PR #37's per-row isolation with example-based tests; this
file generalizes across a random mix of well-formed and malformed rows
instead of the fixed one-or-two-row cases that file hand-picks.

`_resolve_credentials` (shared by `fetch_unconsumed_rows`/`mark_consumed`)
never leaks a supplied credential into a raised message; `_build`'s row
accounting is exhaustive and non-overlapping (`good_ids` and `skipped`
partition every row's own id with no row counted twice, no row dropped
silently); `_stamp_corpus_provenance` tags every good row's own `Source`
and prefix-matched `EvidenceItem`s with that row's `id`/`learner_id`, never
another row's; and `mark_consumed`'s PATCH carries the exact id set it was
given, in order, with no request at all for an empty list."""
from __future__ import annotations

import json

import pytest
from hypothesis import HealthCheck, assume, given, settings
from hypothesis import strategies as st

from hte.corpus import research_os_outbox
from hte.corpus.production import RESEARCH_OS_STATUS_MAP

from tests.swarm2.conftest import assert_corpus_invariants

# `""` is deliberately excluded from either list: `normalize_research_os_
# record`'s own `raw.get("status") or "draft"` treats a falsy status as
# "draft", a documented default rather than a malformed value.
_GOOD_STATUSES = tuple(RESEARCH_OS_STATUS_MAP)  # "draft", "submitted", "accepted", "returned"
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


# ---------------------------------------------------------------------------
# _resolve_credentials: precedence and no leak into raised messages
# ---------------------------------------------------------------------------


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
    # FINDING-2026-09-14-701: `_resolve_credentials`'s missing-credential
    # message is a fixed string naming this module, `hte.corpus.
    # research_os_outbox`, with no interpolation of `key` anywhere in its
    # source. A Hypothesis-generated `secret_key` that happens to match a
    # substring of that fixed text (`"research"`, `"environment"`, ...)
    # fails this assertion without the module ever having echoed anything;
    # the boilerplate collision is unrelated to the real property under
    # test, so it is excluded here rather than asserted away.
    with pytest.raises(RuntimeError) as baseline_info:
        research_os_outbox._resolve_credentials(None, "")
    assume(secret_key not in str(baseline_info.value))

    with pytest.raises(RuntimeError) as exc_info:
        research_os_outbox._resolve_credentials(None, secret_key)
    assert secret_key not in str(exc_info.value)


def test_resolve_credentials_boilerplate_collision_is_not_a_real_leak(monkeypatch):
    """FINDING-2026-09-14-701's own reproduction: `secret_key="research"`
    made the property above fail, because the module's own name (`hte.
    corpus.research_os_outbox`) shares that substring with the fixed
    missing-credential message. Confirmed here directly, outside
    Hypothesis, so the collision stays documented as a fixed-message
    artifact rather than the credential being echoed: the same message
    fires whatever `key` is, and a key that shares no substring with it
    never appears in the raised text."""
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    with pytest.raises(RuntimeError) as exc_info:
        research_os_outbox._resolve_credentials(None, "research")
    assert "research" in str(exc_info.value)  # present via the module's own name

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


# ---------------------------------------------------------------------------
# _build: exhaustive, non-overlapping row accounting
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# _stamp_corpus_provenance: a row's own id/learner_id never bleeds onto
# another row's Source/EvidenceItem
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# mark_consumed: PATCH carries exactly the given id set, in order; empty
# input makes no request
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# load(): never raises over a random mix of good/bad rows, no network
# ---------------------------------------------------------------------------


@given(specs=_row_spec_st)
@_MONKEYPATCH_GIVEN
def test_load_never_raises_over_a_random_mixed_batch(monkeypatch, specs):
    rows = [_row(row_id, status) for row_id, status in specs]
    monkeypatch.setattr(research_os_outbox.urllib.request, "urlopen", lambda request, timeout=30: _FakeResponse(rows))
    corpus = research_os_outbox.load(url="https://example.supabase.co", key="k")
    assert_corpus_invariants(corpus)


# ---------------------------------------------------------------------------
# fetch_unconsumed_rows / mark_consumed: a failed request surfaces as
# RuntimeError naming the table, never the bare urllib exception
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# _stamp_corpus_provenance: a row with no resolvable id is skipped, not
# crashed on. `_build`'s own call path never reaches this branch (a row
# with no id already fails `Production.from_dict` and is isolated into
# `skipped` before `good_rows`/`_stamp_corpus_provenance` ever sees it,
# `tests/test_corpus_research_os_outbox.py::
# test_build_skips_a_row_with_no_id_without_raising`), so this calls the
# module function directly with a row shape `_build` itself never passes
# it, to exercise the defensive `if not production_id: continue` branch
# on its own terms.
# ---------------------------------------------------------------------------


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

    # the malformed row stamped nothing new onto the corpus, and the
    # earlier good row's own stamp is untouched
    assert corpus.sources[row_id].production_id == before_production_id
    assert corpus.sources[row_id].learner_id == before_learner_id
