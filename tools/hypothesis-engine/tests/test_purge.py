"""`hte.purge`: end to end over a fake-mode research-os outbox campaign
(`docs/PRIVACY.md`).

The campaign itself runs in fake mode (`HTE_LLM_MODE=fake`, no network, no
`claude` CLI), matching `tests/test_campaign_research_os.py`'s own
pattern; fake mode never touches `cache_dir` (a documented, tested
contract, see `hte.llm.complete`'s own fake-mode branch), so the LLM
cache/`index.jsonl` half of this test seeds a real `cache_dir` through the
non-fake `hte.llm.complete` path with a monkeypatched `subprocess.run`
instead, `tests/test_llm.py`'s own pattern. The bridge-export and
feed402-envelope files are synthetic fixtures standing in for `hte.
bridge_export`/`hte.canon_writeback` output (PR #36, unmerged as this
test lands): they exercise `hte.purge`'s own generic JSON-shape matcher
against the two shapes the PR #35 seam check named, `evidenceCitations[].
source_id` and a top-level `citation.source_id`.
"""
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
    """One real (non-fake) `hte.llm.complete` call, populating `cache_dir`
    with a real cache file and an `index.jsonl` line for `production_id`
    (`tests/test_llm.py`'s own monkeypatched-`subprocess.run` pattern):
    the piece a fake-mode campaign never produces on its own."""
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

    runs_root = run_dir.parents[1]  # tmp_path/runs
    assert runs_root == tmp_path / "runs"
    bridge_path = _write_bridge_export(runs_root)
    public_root = tmp_path / "public"
    envelope_aaa, envelope_bbb = _write_envelopes(public_root)

    # --- dry run: nothing on disk changes ---
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

    # --- real purge ---
    report = purge.purge(
        "prod-aaa", learner_id="learner-1", runs_root=runs_root, cache_dir=cache_dir, public_root=public_root, dry_run=False,
    )
    assert report["dry_run"] is False
    assert "report_path" in report
    assert Path(report["report_path"]).is_file()

    # run directory: redacted in place (prod-bbb's data still lives there)
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
        json.loads(self_report_text)  # still valid JSON
        json.loads(timeline_text)

    # LLM cache: prod-aaa's entry and index line gone, prod-bbb's intact
    remaining_lines = [json.loads(l) for l in cache_dir.joinpath("index.jsonl").read_text().splitlines() if l.strip()]
    assert len(remaining_lines) == 1
    assert remaining_lines[0]["production_ids"] == ["prod-bbb"]
    remaining_cache_files = sorted(p.name for p in cache_dir.glob("*.json"))
    assert len(remaining_cache_files) == 1
    assert remaining_cache_files[0] == f"{remaining_lines[0]['cache_key']}.json"

    # bridge export: prod-aaa's hypothesis dropped, prod-bbb's kept, file stays valid
    bridge_after = json.loads(bridge_path.read_text())
    ids = {h["id"] for h in bridge_after["hypotheses"]}
    assert ids == {"h-bbb"}

    # envelopes: prod-aaa's file deleted outright, prod-bbb's untouched
    assert not envelope_aaa.exists()
    assert envelope_bbb.is_file()
    assert json.loads(envelope_bbb.read_text())["citation"]["source_id"] == "https://example.edu/photosynthesis"

    # --- idempotency: a second purge reports nothing left ---
    second = purge.purge(
        "prod-aaa", learner_id="learner-1", runs_root=runs_root, cache_dir=cache_dir, public_root=public_root, dry_run=False,
    )
    assert second["runs"] == []
    assert second["cache"]["index_lines_removed"] == 0
    assert second["cache"]["entries_deleted"] == []
    assert second["bridge_exports"] == []
    assert second["envelopes"] == []
    assert second["not_found"]

    # prod-bbb's own artifacts are still exactly as they were
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
