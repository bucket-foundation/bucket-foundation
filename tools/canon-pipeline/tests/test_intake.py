"""Convergence + quality-gate contract for intake.py.

Offline + deterministic: canon.resolve is monkeypatched, so these pin the
PLUMBING behaviour (dedup, supersede->archive, fail-safe, gate) independent of
network and independent of the data pillar's resolver/rubric evolution.
"""
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import intake  # noqa: E402
import canon  # noqa: E402


def _rec(doi, title, score, cc=100, retracted=False, authors=True):
    r = {
        "id": "bkt-" + doi.replace("/", "")[:12],
        "title": title,
        "authors": [{"family": "Doe", "given": "J"}] if authors else [],
        "year": 1999,
        "venue": {"name": "Nature"},
        "doi": doi,
        "canonical_url": f"https://doi.org/{doi}",
        "citation_count": cc,
        "concepts": ["X"],
        "sources_consulted": ["openalex"],
        "fetched_at": "2026-05-19T00:00:00Z",
        "canon_score": score,
        "canon_score_reasons": ["+30 peer-reviewed type"],
        "canon_branch_hints": [],
    }
    if retracted:
        r["is_retracted"] = True
    return r


def _seed(folder, *lines):
    (folder / "queries.txt").write_text("\n".join(lines) + "\n")


def _read(folder):
    return yaml.safe_load((folder / "primary-papers.yaml").read_text())["records"]


def test_gate_rejects_non_doi_retracted_lowscore():
    assert intake.gate_record(_rec("10.1/a", "T", 85)) is None
    no_doi = _rec("10.1/a", "T", 85)
    no_doi["doi"] = None
    assert "DOI" in intake.gate_record(no_doi)
    assert "retracted" in intake.gate_record(_rec("10.1/a", "T", 85, retracted=True))
    assert "floor" in intake.gate_record(_rec("10.1/a", "T", 10))
    assert "author" in intake.gate_record(_rec("10.1/a", "T", 85, authors=False))


def test_convergent_no_dupes_and_idempotent(tmp_path, monkeypatch):
    f = tmp_path
    _seed(f, "q-mitchell", "q-lane")
    table = {
        "q-mitchell": _rec("10.1038/191144a0", "Chemiosmosis", 85),
        "q-lane": _rec("10.1038/nature09486", "Genome energetics", 80),
    }
    monkeypatch.setattr(canon, "resolve", lambda s: table.get(s))

    s1 = intake.converge(f, log=lambda *_: None)
    assert s1["added"] == 2 and s1["total_records"] == 2 and s1["changed"]

    # Re-run unchanged -> no dupes, no rewrite (byte-identical => converged).
    s2 = intake.converge(f, log=lambda *_: None)
    assert s2["total_records"] == 2 and s2["added"] == 0 and s2["changed"] is False
    assert len(_read(f)) == 2


def test_supersede_archives_lower_score(tmp_path, monkeypatch):
    f = tmp_path
    _seed(f, "q")
    monkeypatch.setattr(canon, "resolve", lambda s: _rec("10.1/x", "V1", 60))
    intake.converge(f, log=lambda *_: None)
    # Same DOI resolves to a HIGHER score next run -> supersede + archive.
    monkeypatch.setattr(canon, "resolve", lambda s: _rec("10.1/x", "V2", 85))
    s = intake.converge(f, log=lambda *_: None)
    assert s["superseded"] == 1 and s["updated"] == 1
    recs = _read(f)
    assert len(recs) == 1 and recs[0]["canon_score"] == 85
    arch = list(f.glob("_archive/*/primary-papers.yaml"))
    assert arch, "superseded record must be archived, never deleted"
    assert yaml.safe_load(arch[0].read_text())["records"][0]["canon_score"] == 60


def test_failed_resolve_is_failsafe(tmp_path, monkeypatch):
    """A query failing this run must NOT drop a record from a prior run."""
    f = tmp_path
    _seed(f, "q")
    monkeypatch.setattr(canon, "resolve", lambda s: _rec("10.1/keep", "Keep", 85))
    intake.converge(f, log=lambda *_: None)
    monkeypatch.setattr(canon, "resolve", lambda s: None)  # API down
    s = intake.converge(f, log=lambda *_: None)
    assert s["failed"] == 1
    assert len(_read(f)) == 1, "fail-safe: prior good record preserved"
