from __future__ import annotations

import json

import pytest

from hte.corpus import research_os_outbox

def _outbox_row(**overrides):
    row = {
        "id": "22222222-2222-4222-8222-222222222222",
        "target_node_id": "why-the-sky-is-blue",
        "claim": "Blue scatters more than red.",
        "evidence": [{"node_id": "rayleigh-scattering-law", "quote": "steeply on the wavelength of the light", "locator": "graph.nodes.summary"}],
        "sources": [{"label": "Rayleigh 1871", "doi": "10.1080/14786447108640507"}],
        "status": "accepted",
        "created_at": "2026-09-01T00:00:00Z",
        "updated_at": "2026-09-02T00:00:00Z",
        "_target_node": {"slug": "why-the-sky-is-blue", "title": "Why the sky is blue", "tier": 4, "branch": "02-physics"},
        "emitted_at": "2026-09-02T00:05:00Z",
        "consumed_at": None,
    }
    row.update(overrides)
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

def test_fetch_unconsumed_rows_raises_without_env(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_KEY", raising=False)
    with pytest.raises(RuntimeError, match="SUPABASE_URL"):
        research_os_outbox.fetch_unconsumed_rows()

def test_fetch_unconsumed_rows_filters_on_consumed_at_is_null(monkeypatch):
    captured: dict[str, object] = {}
    row = _outbox_row()

    def fake_urlopen(request, timeout=30):
        captured["url"] = request.full_url
        return _FakeResponse([row])

    monkeypatch.setattr(research_os_outbox.urllib.request, "urlopen", fake_urlopen)
    rows = research_os_outbox.fetch_unconsumed_rows(url="https://example.supabase.co", key="service-key-should-not-leak")

    assert rows == [row]
    assert "research_os_productions_outbox" in str(captured["url"])
    assert "consumed_at=is.null" in str(captured["url"])
    assert "service-key-should-not-leak" not in str(captured["url"])

def test_mark_consumed_empty_ids_makes_no_request(monkeypatch):
    def fail_urlopen(request, timeout=30):
        raise AssertionError("mark_consumed must not make a request for an empty id list")

    monkeypatch.setattr(research_os_outbox.urllib.request, "urlopen", fail_urlopen)
    research_os_outbox.mark_consumed([], url="https://example.supabase.co", key="k")

def test_mark_consumed_patches_the_filtered_id_set(monkeypatch):
    captured: dict[str, object] = {}

    def fake_urlopen(request, timeout=30):
        captured["url"] = request.full_url
        captured["method"] = request.get_method()
        captured["body"] = json.loads(request.data.decode("utf-8"))
        return _FakeResponse(b"")

    monkeypatch.setattr(research_os_outbox.urllib.request, "urlopen", fake_urlopen)
    research_os_outbox.mark_consumed(["id-1", "id-2"], url="https://example.supabase.co", key="k")

    assert captured["method"] == "PATCH"
    assert "id=in.(id-1,id-2)" in str(captured["url"])
    assert "consumed_at" in captured["body"]

def test_mark_consumed_is_idempotent_a_second_call_still_succeeds(monkeypatch):
    monkeypatch.setattr(research_os_outbox.urllib.request, "urlopen", lambda request, timeout=30: _FakeResponse(b""))
    research_os_outbox.mark_consumed(["id-1"], url="https://example.supabase.co", key="k")
    research_os_outbox.mark_consumed(["id-1"], url="https://example.supabase.co", key="k")

def test_load_normalizes_a_fixture_row_through_production_from_dict(monkeypatch):
    monkeypatch.setattr(
        research_os_outbox.urllib.request, "urlopen",
        lambda request, timeout=30: _FakeResponse([_outbox_row()]),
    )
    corpus = research_os_outbox.load(url="https://example.supabase.co", key="k")

    assert len(corpus.sources) == 2, "one Source per production plus one per cited source"
    assert len(corpus.evidence) >= 1
    assert corpus.provenance[0].retrieval_run_id == "production-adapter-research-os-outbox-ingest"

def test_load_and_consume_marks_every_row_it_read(monkeypatch):
    requests: list[tuple[str, str | None]] = []

    def fake_urlopen(request, timeout=30):
        method = request.get_method()
        requests.append((request.full_url, method))
        if method == "GET":
            return _FakeResponse([_outbox_row()])
        return _FakeResponse(b"")

    monkeypatch.setattr(research_os_outbox.urllib.request, "urlopen", fake_urlopen)
    corpus = research_os_outbox.load_and_consume(url="https://example.supabase.co", key="k")

    assert len(corpus.sources) == 2, "one Source per production plus one per cited source"
    methods = [m for _, m in requests]
    assert "GET" in methods
    assert "PATCH" in methods
    patch_url = next(u for u, m in requests if m == "PATCH")
    assert "id=in.(22222222-2222-4222-8222-222222222222)" in patch_url

def test_load_and_consume_marks_nothing_when_no_rows_are_unconsumed(monkeypatch):
    calls: list[str] = []

    def fake_urlopen(request, timeout=30):
        calls.append(request.get_method())
        return _FakeResponse([])

    monkeypatch.setattr(research_os_outbox.urllib.request, "urlopen", fake_urlopen)
    corpus = research_os_outbox.load_and_consume(url="https://example.supabase.co", key="k")

    assert len(corpus.sources) == 0
    assert calls == ["GET"], "no PATCH should fire when there is nothing to consume"

def test_build_isolates_a_bad_row_and_still_builds_the_good_ones():
    good = _outbox_row(id="ros-good-1")
    bad = _outbox_row(id="ros-bad-1", status="not-a-real-status")
    corpus, good_ids, skipped = research_os_outbox._build([good, bad], research_os_outbox.DEFAULT_TABLE, "draft")

    assert good_ids == ["ros-good-1"]
    assert len(skipped) == 1
    assert skipped[0]["production_id"] == "ros-bad-1"
    assert "not-a-real-status" in skipped[0]["reason"]
    assert "ros-good-1" in corpus.sources

def test_build_skips_a_row_with_no_id_without_raising():
    bad = _outbox_row()
    del bad["id"]
    corpus, good_ids, skipped = research_os_outbox._build([bad], research_os_outbox.DEFAULT_TABLE, "draft")
    assert good_ids == []
    assert len(skipped) == 1
    assert skipped[0]["production_id"] == "(unknown)"

def test_fetch_and_build_returns_only_good_ids_for_mark_consumed(monkeypatch):
    good = _outbox_row(id="ros-good-2")
    bad = _outbox_row(id="ros-bad-2", status="not-a-real-status")
    monkeypatch.setattr(
        research_os_outbox.urllib.request, "urlopen",
        lambda request, timeout=30: _FakeResponse([good, bad]),
    )
    good_ids, corpus, skipped = research_os_outbox.fetch_and_build(url="https://example.supabase.co", key="k")
    assert good_ids == ["ros-good-2"]
    assert [s["production_id"] for s in skipped] == ["ros-bad-2"]
    assert "ros-good-2" in corpus.sources

def test_load_and_consume_never_marks_a_skipped_row(monkeypatch):
    good = _outbox_row(id="ros-good-3")
    bad = _outbox_row(id="ros-bad-3", status="not-a-real-status")
    requests: list[tuple[str, str | None]] = []

    def fake_urlopen(request, timeout=30):
        method = request.get_method()
        requests.append((request.full_url, method))
        if method == "GET":
            return _FakeResponse([good, bad])
        return _FakeResponse(b"")

    monkeypatch.setattr(research_os_outbox.urllib.request, "urlopen", fake_urlopen)
    research_os_outbox.load_and_consume(url="https://example.supabase.co", key="k")

    patch_url = next(u for u, m in requests if m == "PATCH")
    assert "ros-good-3" in patch_url
    assert "ros-bad-3" not in patch_url

def test_build_stamps_production_id_and_learner_id_on_sources_and_evidence():
    row = _outbox_row(id="ros-prov-1", learner_id="learner-prov-1")
    corpus, _good_ids, _skipped = research_os_outbox._build([row], research_os_outbox.DEFAULT_TABLE, "draft")

    source = corpus.sources["ros-prov-1"]
    assert source.production_id == "ros-prov-1"
    assert source.learner_id == "learner-prov-1"
    for item in corpus.evidence:
        if item.id.startswith("ros-prov-1-c"):
            assert item.production_id == "ros-prov-1"
            assert item.learner_id == "learner-prov-1"

def test_build_stamps_no_learner_id_when_the_row_carries_none():
    row = _outbox_row(id="ros-prov-2")
    row.pop("learner_id", None)
    corpus, _good_ids, _skipped = research_os_outbox._build([row], research_os_outbox.DEFAULT_TABLE, "draft")
    source = corpus.sources["ros-prov-2"]
    assert source.production_id == "ros-prov-2"
    assert source.learner_id is None

def test_build_carries_counter_evidence_through_to_a_refuting_evidence_item():
    from hte.evidence import Stance

    row = _outbox_row(id="ros-counter-1", counter_evidence=[{"text": "A competing paper reports the opposite direction."}])
    corpus, good_ids, skipped = research_os_outbox._build([row], research_os_outbox.DEFAULT_TABLE, "draft")

    assert good_ids == ["ros-counter-1"]
    assert skipped == []
    items = [e for e in corpus.evidence if e.id.startswith("ros-counter-1-c")]
    assert any(e.stance == Stance.NEGATIVE for e in items)
    assert any(e.stance == Stance.POSITIVE for e in items), "the row's own evidence still supports"

def test_build_carries_duplicate_flag_through_to_a_stemma_edge():
    original = _outbox_row(id="ros-dup-original")
    dup = _outbox_row(id="ros-dup-copy", duplicate_flag={"matchId": "ros-dup-original", "matchOrigin": "own_prior", "score": 0.9})
    corpus, good_ids, skipped = research_os_outbox._build([original, dup], research_os_outbox.DEFAULT_TABLE, "draft")

    assert set(good_ids) == {"ros-dup-original", "ros-dup-copy"}
    assert skipped == []
    assert corpus.sources["ros-dup-copy"].stemma_parents == ["ros-dup-original"]
