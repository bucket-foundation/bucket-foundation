from __future__ import annotations

import json
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from hte import llm, purge, runner  # noqa: E402
from hte.corpus import research_os_outbox  # noqa: E402

import campaign_research_os as cro  # noqa: E402

FAST_CONFIG = {
    "seeds": 1,
    "generate_n": 1,
    "combinatorial_max_items": 5,
    "max_hypotheses": 10,
    "tournament_rounds": 1,
    "max_time_bins": 3,
}

@pytest.fixture(autouse=True)
def _fake_llm_mode(monkeypatch):
    monkeypatch.setenv("HTE_LLM_MODE", "fake")

@pytest.fixture(autouse=True)
def _restore_corpus_loaders():
    before = dict(runner._CORPUS_LOADERS)
    yield
    runner._CORPUS_LOADERS.clear()
    runner._CORPUS_LOADERS.update(before)

def _two_learner_rows() -> list[dict]:
    return [
        {
            "id": "prod-aaa", "learner_id": "learner-1", "target_node_id": "why-the-sky-is-blue",
            "claim": "Blue scatters more than red.",
            "evidence": ["Rayleigh scattering bends blue light more than red."],
            "sources": ["10.1080/14786447108640507"],
            "status": "accepted", "created_at": "2026-09-01T00:00:00Z", "updated_at": "2026-09-02T00:00:00Z",
        },
        {
            "id": "prod-bbb", "learner_id": "learner-2", "target_node_id": "photosynthesis",
            "claim": "Plants make sugar from light.",
            "evidence": ["Chlorophyll absorbs red and blue light for energy."],
            "sources": ["https://example.edu/photosynthesis"],
            "status": "accepted", "created_at": "2026-09-01T00:00:00Z", "updated_at": "2026-09-02T00:00:00Z",
        },
    ]

def _run_campaign(tmp_path, rows, **overrides):
    corpus, good_ids, skipped = research_os_outbox._build(rows, research_os_outbox.DEFAULT_TABLE, "draft")
    cfg = {**FAST_CONFIG, "out_dir": str(tmp_path / "runs"), "cache_dir": str(tmp_path / "runs-cache"), **overrides}
    payload = cro.run(corpus, config_overrides=cfg, skipped_rows=skipped)
    return payload, corpus

def _envelope_for(structured_output):
    return json.dumps({"is_error": False, "structured_output": structured_output})

def _fake_subprocess_run(responses):
    calls = []

    def run(argv, capture_output, text, timeout):
        calls.append(argv)
        returncode, stdout = responses.pop(0)
        return SimpleNamespace(returncode=returncode, stdout=stdout, stderr="")

    run.calls = calls
    return run

def _seed_cache(cache_dir: Path, monkeypatch, *, prompt: str, production_id: str, learner_id: str) -> None:
    schema = {"type": "object", "properties": {"keep": {"type": "boolean"}}, "required": ["keep"]}
    fake = _fake_subprocess_run([(0, _envelope_for({"keep": True}))])
    monkeypatch.setattr(llm, "subprocess", SimpleNamespace(run=fake))
    llm.complete(
        prompt, role="critic", schema=schema, model="sonnet", cache_dir=cache_dir, mode="real",
        provenance={"source_ids": [f"src-{production_id}"], "production_ids": [production_id], "learner_ids": [learner_id]},
    )

def _write_bridge_export(runs_root: Path) -> Path:
    path = runs_root / "research-os.bridge.json"
    path.write_text(json.dumps({
        "hypotheses": [
            {
                "id": "h-aaa",
                "evidenceCitations": [{"source_id": "10.1080/14786447108640507", "quote": "Rayleigh scattering bends blue light more than red."}],
            },
            {
                "id": "h-bbb",
                "evidenceCitations": [{"source_id": "https://example.edu/photosynthesis", "quote": "Chlorophyll absorbs red and blue light for energy."}],
            },
        ],
    }, indent=2))
    return path

def _write_envelopes(public_root: Path) -> tuple[Path, Path]:
    public_root.mkdir(parents=True, exist_ok=True)
    aaa = public_root / "run-aaa.json"
    aaa.write_text(json.dumps({"citation": {"source_id": "10.1080/14786447108640507"}, "data": {"statement": "s"}}, indent=2))
    bbb = public_root / "run-bbb.json"
    bbb.write_text(json.dumps({"citation": {"source_id": "https://example.edu/photosynthesis"}, "data": {"statement": "s"}}, indent=2))
    return aaa, bbb

def test_purge_end_to_end_removes_one_production_keeps_the_other(tmp_path, monkeypatch):
    rows = _two_learner_rows()
    payload, corpus = _run_campaign(tmp_path, rows)
    run_dir = Path(payload["runId"])
    manifest_before = json.loads((run_dir / "MANIFEST.json").read_text())
    assert manifest_before["provenance"]["production_ids"] == ["prod-aaa", "prod-bbb"]

    cache_dir = tmp_path / "cache"
    _seed_cache(cache_dir, monkeypatch, prompt="critique prod-aaa's hypothesis", production_id="prod-aaa", learner_id="learner-1")
    _seed_cache(cache_dir, monkeypatch, prompt="critique prod-bbb's hypothesis", production_id="prod-bbb", learner_id="learner-2")
    index_lines_before = cache_dir.joinpath("index.jsonl").read_text().splitlines()
    assert len(index_lines_before) == 2

    runs_root = run_dir.parents[1]
    assert runs_root == tmp_path / "runs"
    bridge_path = _write_bridge_export(runs_root)
    public_root = tmp_path / "public"
    envelope_aaa, envelope_bbb = _write_envelopes(public_root)

    before_snapshot = {
        p: p.read_text() for p in [run_dir / "MANIFEST.json", bridge_path, envelope_aaa, envelope_bbb]
        if p.is_file()
    }
    dry_report = purge.purge(
        "prod-aaa", learner_id="learner-1", runs_root=runs_root, cache_dir=cache_dir, public_root=public_root, dry_run=True,
    )
    assert dry_report["dry_run"] is True
    assert dry_report["runs"], "dry run should still report the run it would redact"
    assert dry_report["cache"]["index_lines_removed"] == 1
    assert dry_report["bridge_exports"]
    assert dry_report["envelopes"]
    for path, text in before_snapshot.items():
        assert path.read_text() == text, f"{path} changed during a dry run"
    assert cache_dir.joinpath("index.jsonl").read_text().splitlines() == index_lines_before
    assert run_dir.is_dir()

    report = purge.purge(
        "prod-aaa", learner_id="learner-1", runs_root=runs_root, cache_dir=cache_dir, public_root=public_root, dry_run=False,
    )
    assert report["dry_run"] is False
    assert "report_path" in report
    assert Path(report["report_path"]).is_file()

    assert run_dir.is_dir()
    manifest_after = json.loads((run_dir / "MANIFEST.json").read_text())
    assert manifest_after["provenance"]["production_ids"] == ["prod-bbb"]
    assert manifest_after["provenance"]["learner_ids"] == ["learner-2"]
    assert "prod-aaa" not in manifest_after["provenance"]["by_production"]
    assert "prod-bbb" in manifest_after["provenance"]["by_production"]
    manifest_text = json.dumps(manifest_after)
    assert "learner-1" not in manifest_text
    assert "Rayleigh scattering bends blue light more than red." not in manifest_text
    assert "learner-2" in manifest_text
    assert "Chlorophyll absorbs red and blue light for energy." in manifest_text

    self_report_text = (run_dir / "self-report.json").read_text()
    timeline_text = (run_dir / "timeline.json").read_text()
    run_log_text = (run_dir / "run.log").read_text()
    for text in (self_report_text, timeline_text, run_log_text):
        assert "Rayleigh scattering bends blue light more than red." not in text
        json.loads(self_report_text)
        json.loads(timeline_text)

    remaining_lines = [
        json.loads(line) for line in cache_dir.joinpath("index.jsonl").read_text().splitlines() if line.strip()
    ]
    assert len(remaining_lines) == 1
    assert remaining_lines[0]["production_ids"] == ["prod-bbb"]
    remaining_cache_files = sorted(p.name for p in cache_dir.glob("*.json"))
    assert len(remaining_cache_files) == 1
    assert remaining_cache_files[0] == f"{remaining_lines[0]['cache_key']}.json"

    bridge_after = json.loads(bridge_path.read_text())
    ids = {h["id"] for h in bridge_after["hypotheses"]}
    assert ids == {"h-bbb"}

    assert not envelope_aaa.exists()
    assert envelope_bbb.is_file()
    assert json.loads(envelope_bbb.read_text())["citation"]["source_id"] == "https://example.edu/photosynthesis"

    second = purge.purge(
        "prod-aaa", learner_id="learner-1", runs_root=runs_root, cache_dir=cache_dir, public_root=public_root, dry_run=False,
    )
    assert second["runs"] == []
    assert second["cache"]["index_lines_removed"] == 0
    assert second["cache"]["entries_deleted"] == []
    assert second["bridge_exports"] == []
    assert second["envelopes"] == []
    assert second["not_found"]

    assert json.loads((run_dir / "MANIFEST.json").read_text())["provenance"]["production_ids"] == ["prod-bbb"]
    assert envelope_bbb.is_file()
    assert json.loads(bridge_path.read_text())["hypotheses"][0]["id"] == "h-bbb"

def test_purge_deletes_a_single_production_run_directory(tmp_path):
    rows = [_two_learner_rows()[0]]
    payload, _corpus = _run_campaign(tmp_path, rows)
    run_dir = Path(payload["runId"])
    assert run_dir.is_dir()

    report = purge.purge("prod-aaa", runs_root=run_dir.parents[1], dry_run=False)
    assert report["runs"] == [{"run_dir": str(run_dir), "action": "deleted", "dry_run": False}]
    assert not run_dir.exists()

def test_purge_dry_run_on_a_single_production_run_does_not_delete_it(tmp_path):
    rows = [_two_learner_rows()[0]]
    payload, _corpus = _run_campaign(tmp_path, rows)
    run_dir = Path(payload["runId"])

    report = purge.purge("prod-aaa", runs_root=run_dir.parents[1], dry_run=True)
    assert report["runs"][0]["action"] == "deleted"
    assert report["runs"][0]["dry_run"] is True
    assert run_dir.exists()

def test_purge_reports_not_found_for_an_unknown_production_id(tmp_path):
    report = purge.purge("no-such-production", runs_root=tmp_path / "runs", dry_run=True)
    assert report["runs"] == []
    assert report["not_found"]

def test_purge_learner_mismatch_is_flagged_not_fatal(tmp_path):
    rows = [_two_learner_rows()[0]]
    payload, _corpus = _run_campaign(tmp_path, rows)
    report = purge.purge("prod-aaa", learner_id="not-the-real-learner", runs_root=Path(payload["runId"]).parents[1], dry_run=True)
    assert report["learner_id_mismatch"] is True
    assert report["runs"], "a learner mismatch never blocks the purge itself"

def test_purge_flags_an_unreadable_manifest_rather_than_treating_it_as_nothing_to_purge(tmp_path):
    runs_root = tmp_path / "runs"
    run_dir = runs_root / "quantum-history" / "20260101T000000Z"
    run_dir.mkdir(parents=True)
    manifest_path = run_dir / "MANIFEST.json"
    manifest_path.write_text("{not valid json")

    report = purge.purge("prod-aaa", runs_root=runs_root, dry_run=True)

    assert report["runs"] == []
    assert report["complete"] is False
    assert report["not_found"] == [], "an unreadable manifest must never be certified as confirmed-clean"
    assert any(
        entry["path"] == str(manifest_path) and entry["error"] == "JSONDecodeError"
        for entry in report["unreadable"]
    )
    assert report["warning"]

def test_purge_refuses_a_redaction_that_would_corrupt_json_and_flags_it(tmp_path):
    runs_root = tmp_path / "runs"
    run_dir = runs_root / "campaign" / "20260101T000000Z"
    run_dir.mkdir(parents=True)
    quote = "Rayleigh scattering bends blue light more than red."
    manifest = {
        "provenance": {
            "production_ids": ["prod-aaa", "prod-bbb"],
            "learner_ids": ["learner-1", "learner-2"],
            "source_ids": ["src-aaa", "src-bbb"],
            "by_production": {
                "prod-aaa": {"quotes": [quote], "labels": [], "source_ids": ["src-aaa"], "learner_id": "learner-1"},
                "prod-bbb": {"quotes": ["unrelated quote"], "labels": [], "source_ids": ["src-bbb"], "learner_id": "learner-2"},
            },
        },
    }
    (run_dir / "MANIFEST.json").write_text(json.dumps(manifest, indent=2))
    corrupted_timeline = '{"timeline": "%s"' % quote
    (run_dir / "timeline.json").write_text(corrupted_timeline)
    (run_dir / "self-report.json").write_text("{}")
    (run_dir / "run.log").write_text(f"critic saw: {quote}\n")

    report = purge.purge("prod-aaa", runs_root=runs_root, dry_run=False)

    assert report["complete"] is False
    assert any(
        entry["run_dir"] == str(run_dir) and entry["file"] == "timeline.json"
        for entry in report["redaction_refused"]
    )
    assert (run_dir / "timeline.json").read_text() == corrupted_timeline, "a refused redaction must leave the file exactly as it was"
    assert quote not in (run_dir / "run.log").read_text()
    assert report["warning"]

def test_purge_redacts_survivors_json_the_same_quote_it_redacts_from_timeline_json(tmp_path):
    runs_root = tmp_path / "runs"
    run_dir = runs_root / "campaign" / "20260101T000000Z"
    run_dir.mkdir(parents=True)
    quote = "Rayleigh scattering bends blue light more than red."
    manifest = {
        "provenance": {
            "production_ids": ["prod-aaa", "prod-bbb"],
            "learner_ids": ["learner-1", "learner-2"],
            "source_ids": ["src-aaa", "src-bbb"],
            "by_production": {
                "prod-aaa": {"quotes": [quote], "labels": [], "source_ids": ["src-aaa"], "learner_id": "learner-1"},
                "prod-bbb": {"quotes": ["unrelated quote"], "labels": [], "source_ids": ["src-bbb"], "learner_id": "learner-2"},
            },
        },
    }
    (run_dir / "MANIFEST.json").write_text(json.dumps(manifest, indent=2))
    (run_dir / "timeline.json").write_text(json.dumps({"bins": [{"quote": quote}]}))
    (run_dir / "survivors.json").write_text(json.dumps({
        "artifact_version": "1.0.0", "campaign": "campaign", "corpus": "fixtures",
        "survivors": [{
            "hypothesis_id": "h1", "address": 1, "slots": {"ACTOR": "actor-0"},
            "opinion": {"b": 0.5, "d": 0.1, "u": 0.4, "a": 0.3, "P": 0.62}, "elo": 1500.0,
            "preservation": {"could_have_survived": True, "rationale": quote},
            "robustness": {"projections": {}, "stable": True},
        }],
    }))

    report = purge.purge("prod-aaa", runs_root=runs_root, dry_run=False)

    assert report["complete"] is True
    for name in ("timeline.json", "survivors.json"):
        text = (run_dir / name).read_text()
        assert quote not in text
        assert "[redacted:prod-aaa]" in text
        json.loads(text)
