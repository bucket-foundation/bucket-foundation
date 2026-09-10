"""`hte.corpus.research_os_outbox` (ros-12 item 2, "the outbox has no
reader yet"): `fetch_unconsumed_rows`/`mark_consumed`/`load`/
`load_and_consume` against a monkeypatched `urllib.request.urlopen`, the
same no-network pattern `tests/test_corpus_production.py`'s own
`load_supabase` tests use. One fixture row, shaped the way `public.
research_os_productions_outbox` stores it (task item 3's own
`ProductionOutboxRow`, `src/lib/research-os/engine-bridge.ts`): the raw
`graph.productions` columns, no `learner_id`, no `transfer_proof`.
"""
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


# --------------------------------------------------------------------------
# fetch_unconsumed_rows
# --------------------------------------------------------------------------


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


# --------------------------------------------------------------------------
# mark_consumed
# --------------------------------------------------------------------------


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


# --------------------------------------------------------------------------
# load / load_and_consume, through the existing normalizer
# --------------------------------------------------------------------------


def test_load_normalizes_a_fixture_row_through_production_from_dict(monkeypatch):
    monkeypatch.setattr(
        research_os_outbox.urllib.request, "urlopen",
        lambda request, timeout=30: _FakeResponse([_outbox_row()]),
    )
    corpus = research_os_outbox.load(url="https://example.supabase.co", key="k")

    assert len(corpus.sources) == 2, "one Source per production plus one per cited source"
    assert len(corpus.evidence) >= 1
    # accepted status maps straight through RESEARCH_OS_STATUS_MAP, so an
    # accepted row does contribute a claim (though never a ground-truth
    # event, normalize_research_os_record's own claims[].interval is always
    # None for a Research OS row).
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
