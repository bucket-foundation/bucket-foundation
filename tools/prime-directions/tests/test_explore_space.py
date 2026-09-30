from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import numpy as np

from prime_directions import explore_space, reference

ROOT = Path(__file__).resolve().parents[3]
BASIS = json.loads((ROOT / "src" / "data" / "explore" / "reference-basis.json").read_text())

BUNDLE = {
    "profiles": [
        {"openalex_id": "A1", "name": "Ada Sample", "institution": "Example University", "ror": "abc", "country": "US", "field": "Physics and Astronomy",
         "topics": ["quantum field theory", "photon statistics", "lattice models"], "links": {"openalex": "https://openalex.org/A1", "institution": "https://example.edu/ada", "mail": "ada@example.edu"},
         "orcid": "0000-0000-0000-0001", "scores": [0.1] * 64},
        {"openalex_id": "A2", "name": "Bo Sample", "institution": "Other Institute", "ror": "def", "country": "DE", "field": "Biochemistry",
         "topics": ["protein folding", "enzyme kinetics", "membrane transport"], "links": {"openalex": "https://openalex.org/A2"}, "orcid": None, "scores": [0.2] * 64},
        {"openalex_id": "A3", "name": "", "institution": "x", "field": "none", "topics": [], "links": {}},
    ],
}


def test_advisors_are_projected_on_the_reference_basis():
    data = explore_space.advisors_space(BASIS, BUNDLE)
    assert data["schema"] == explore_space.SCHEMA
    assert data["basis"] == "reference"
    assert len(data["components"]) == 12
    assert len(data["obs"]) == 2
    for o in data["obs"]:
        assert len(o["scores"]) == 12
        assert 0 <= o["coverage"] <= 1


def test_only_publishable_fields_leave_the_bundle():
    data = explore_space.advisors_space(BASIS, BUNDLE)
    text = json.dumps(data)
    assert not re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", text)
    assert "orcid" not in text.lower() and "0000-0000" not in text
    assert "ror" not in {k for o in data["obs"] for k in o} and "abc" not in text
    assert set(data["obs"][0]["meta"]) == {"institution", "field", "country"}
    assert data["obs"][0]["links"] == ["https://openalex.org/A1", "https://example.edu/ada"]
    assert all(o["id"].startswith("p") and "A1" not in o["id"] for o in data["obs"])


def test_the_projection_matches_project_texts():
    data = explore_space.advisors_space(BASIS, BUNDLE)
    rows = explore_space.advisor_rows(BUNDLE["profiles"])
    want = reference.project_texts(BASIS, [r["text"] for r in rows])
    assert np.allclose([o["scores"] for o in data["obs"]], want, atol=5e-4)


def test_coverage_ignores_stop_words_and_unknown_terms():
    assert reference.coverage_of(BASIS, "the and of") == 0.0
    assert reference.coverage_of(BASIS, "") == 0.0
    known = BASIS["vocab"][0]
    assert reference.coverage_of(BASIS, f"the {known} zzzzqq") == 0.5


def test_the_advisor_build_is_deterministic():
    assert explore_space.advisors_space(BASIS, BUNDLE) == explore_space.advisors_space(BASIS, BUNDLE)


def test_the_committed_canon_space_matches_a_rebuild():
    sys.path.insert(0, str(ROOT / "scripts" / "canon-explorer"))
    import embed

    committed = json.loads((ROOT / "src" / "data" / "explore" / "canon.space.json").read_text())
    rebuilt = explore_space.canon_space(BASIS, embed.load_items())
    assert committed == json.loads(json.dumps(rebuilt))
    assert len(committed["obs"]) == len(embed.load_items())
    assert all("coverage" in o for o in committed["obs"])


def _registry(tmp_path: Path) -> Path:
    for name in ("pub", "hidden", "secret"):
        d = tmp_path / name
        d.mkdir()
        for i in range(4):
            (d / f"doc{i}.md").write_text(f"# title {i}\n" + ("quantum photon electron wave energy field lattice " * 40) + f"contact me at person{i}@example.org")
    reg = {"corpora": {
        "pub": {"kind": "folder", "path": str(tmp_path / "pub"), "publish": True, "clean": {"min_chars": 10}},
        "hidden": {"kind": "folder", "path": str(tmp_path / "hidden"), "clean": {"min_chars": 10}},
        "secret": {"kind": "folder", "path": str(tmp_path / "secret"), "private": True, "publish": True, "clean": {"min_chars": 10}},
    }}
    path = tmp_path / "corpora.json"
    path.write_text(json.dumps(reg))
    return path


def test_run_space_exports_only_published_public_corpora(tmp_path: Path, capsys):
    from prime_directions import cli, corpora

    reg = _registry(tmp_path)
    out = tmp_path / "out"
    assert cli.main(["--registry", str(reg), "run", "--all", "--out", str(tmp_path / "x"), "--space", "--space-out", str(out), "--basis-file", str(ROOT / "src" / "data" / "explore" / "reference-basis.json")]) == 0
    files = sorted(p.name for p in out.iterdir())
    assert files == ["pub.space.json"]
    text = capsys.readouterr().out
    assert "[hidden] skipped: not marked publish" in text and "[secret] skipped: private" in text
    data = json.loads((out / "pub.space.json").read_text())
    assert data["schema"] == explore_space.SCHEMA and data["id"] == "pub"
    assert len(data["obs"]) == 4 and all(len(o["scores"]) == 12 for o in data["obs"])
    assert not re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", json.dumps(data))
    assert corpora.load_registry(reg)["pub"].publish


def test_corpus_space_caps_documents_deterministically():
    from prime_directions.corpora import Doc

    docs = [Doc(id=f"d{i:04d}", title=f"t{i}", text="quantum photon electron " * 10) for i in range(50)]
    rows = explore_space.corpus_rows(docs, cap=10)
    assert len(rows) == 10
    assert rows == explore_space.corpus_rows(list(reversed(docs)), cap=10)
    assert all(r["id"].startswith("p") and "d00" not in r["id"] for r in rows)


def test_shipped_registry_publishes_no_private_corpus():
    from prime_directions import corpora

    specs = corpora.load_registry()
    assert specs["kruse"].private and not specs["kruse"].publish
    assert not any(s.private and s.publish for s in specs.values())
