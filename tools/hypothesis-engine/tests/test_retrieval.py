import io
import json
import urllib.error

import pytest

from hte import retrieval


def test_list_fixtures_finds_the_shipped_pair():
    fixtures = retrieval.list_fixtures()
    assert "quantum-decoherence-review" in fixtures
    assert "younger-dryas-impact-hypothesis" in fixtures


def test_is_forbidden_matches_wildcard_pattern():
    patterns = ["*.prod.example.com"]
    assert retrieval.is_forbidden("https://api.prod.example.com/x", patterns)
    assert not retrieval.is_forbidden("https://staging.example.com/x", patterns)


def test_is_forbidden_defaults_to_empty_when_no_config_present(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(retrieval.Path, "home", classmethod(lambda cls: tmp_path / "no-such-home"))
    assert retrieval.load_forbidden_patterns() == []
    assert not retrieval.is_forbidden("https://anything.example.com")


def test_retrieve_fixture_mode_writes_immutable_envelope(tmp_path):
    out_dir = tmp_path / "runs" / "camp" / "20260101T000000Z"
    envelope, run = retrieval.retrieve(
        mode="fixture", campaign="camp", out_dir=out_dir, fixture_name="quantum-decoherence-review",
    )
    assert envelope["citation"][0]["source_id"] == "openalex:W2018765432"
    assert run.mode == "fixture"
    assert run.payment_required is False
    assert len(run.envelope_shas) == 1

    envelope_path = out_dir / "envelopes" / f"{run.envelope_shas[0]}.json"
    assert envelope_path.is_file()
    first_bytes = envelope_path.read_bytes()

    # A second call against the same fixture reuses the identical file.
    envelope2, run2 = retrieval.retrieve(
        mode="fixture", campaign="camp", out_dir=out_dir, fixture_name="quantum-decoherence-review",
    )
    assert run2.envelope_shas == run.envelope_shas
    assert envelope_path.read_bytes() == first_bytes


def test_retrieve_fixture_mode_defaults_fixture_name_to_query(tmp_path):
    out_dir = tmp_path / "runs" / "camp" / "ts"
    envelope, run = retrieval.retrieve(
        mode="fixture", campaign="camp", out_dir=out_dir, query="quantum-decoherence-review",
    )
    assert envelope["data"]["query"] == "decoherence second quantum revolution review"


def test_retrieve_fixture_missing_raises():
    with pytest.raises(retrieval.FixtureNotFoundError):
        retrieval._load_fixture("no-such-fixture")


def test_retrieve_live_mode_blocked_by_forbidden_url_before_any_request(tmp_path, monkeypatch):
    called = {"n": 0}

    def fake_urlopen(request, timeout=15.0):
        called["n"] += 1
        raise AssertionError("urlopen must not be called when the URL is forbidden")

    monkeypatch.setattr(retrieval.urllib.request, "urlopen", fake_urlopen)

    with pytest.raises(retrieval.ForbiddenURLError):
        retrieval.retrieve(
            mode="live", campaign="camp", out_dir=tmp_path / "run", query="q",
            gateway_url="https://blocked.prod.example.com", forbidden_patterns=["*.prod.example.com"],
        )
    assert called["n"] == 0


def test_retrieve_live_mode_records_402_challenge_and_stops(tmp_path, monkeypatch):
    class FakeHeaders:
        def items(self):
            return [("X-402-Price-USD", "0.01")]

    def fake_urlopen(request, timeout=15.0):
        raise urllib.error.HTTPError(
            request.full_url, 402, "Payment Required", FakeHeaders(), io.BytesIO(b'{"price_usd": 0.01}'),
        )

    monkeypatch.setattr(retrieval.urllib.request, "urlopen", fake_urlopen)

    out_dir = tmp_path / "runs" / "camp" / "ts"
    envelope, run = retrieval.retrieve(
        mode="live", campaign="camp", out_dir=out_dir, query="q", tier="query",
        gateway_url="https://gateway.example.com", forbidden_patterns=[],
    )
    assert envelope["data"] is None
    assert envelope["citation"] == []
    assert envelope["payment_required"]["status"] == 402
    assert envelope["payment_required"]["challenge"]["price_usd"] == 0.01
    assert run.payment_required is True
    assert run.gateway_url == "https://gateway.example.com"

    run_record = json.loads((out_dir / f"retrieval-{run.run_id}.json").read_text())
    assert run_record["payment_required"] is True


def test_retrieve_live_mode_url_error_raises_retrieval_error(tmp_path, monkeypatch):
    def fake_urlopen(request, timeout=15.0):
        raise urllib.error.URLError("no route to host")

    monkeypatch.setattr(retrieval.urllib.request, "urlopen", fake_urlopen)

    with pytest.raises(retrieval.RetrievalError):
        retrieval.retrieve(
            mode="live", campaign="camp", out_dir=tmp_path / "run", query="q",
            gateway_url="https://gateway.example.com", forbidden_patterns=[],
        )


def test_retrieve_rejects_unknown_mode(tmp_path):
    with pytest.raises(ValueError, match="mode must be"):
        retrieval.retrieve(mode="telepathy", campaign="camp", out_dir=tmp_path / "run")
