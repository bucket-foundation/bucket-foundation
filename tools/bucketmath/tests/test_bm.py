from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import bm  # noqa: E402

RAW = [
    {"name": "BucketMath.Vec.dot_comm", "kind": "theorem", "module": "BucketMath.Vec", "line": 28, "type": "∀ a b, dot a b = dot b a", "axioms": ["propext"]},
    {"name": "BucketMath.Vec.dot", "kind": "def", "module": "BucketMath.Vec", "line": 7, "type": "List Rat → List Rat → Rat", "axioms": []},
    {"name": "BucketMath.Open.pythagoras_orthonormal", "kind": "theorem", "module": "BucketMath.Open", "line": 14, "type": "…", "axioms": ["sorryAx", "propext"]},
    {"name": "Bucket.Address.encode_injective", "kind": "theorem", "module": "Bucket.Address", "line": 57, "type": "…", "axioms": ["sorryAx"]},
    {"name": "Bucket.Timeline.relate_total", "kind": "theorem", "module": "Bucket.Timeline", "line": 90, "type": "…", "axioms": ["propext"]},
    {"name": "BucketMath.Profile.instReprPair.repr", "kind": "def", "module": "BucketMath.Profile", "line": 3, "type": "…", "axioms": []},
    {"name": "BucketMath.Markets.Regime.ofNat", "kind": "def", "module": "BucketMath.Markets", "line": 3, "type": "…", "axioms": []},
]

def manifest():
    return bm.build_manifest(RAW)

def test_build_manifest_statuses_sources_and_filters():
    m = {r["name"]: r for r in manifest()}
    assert set(m) == {"BucketMath.Vec.dot_comm", "BucketMath.Vec.dot", "BucketMath.Open.pythagoras_orthonormal",
                      "Bucket.Address.encode_injective", "Bucket.Timeline.relate_total"}
    assert m["BucketMath.Vec.dot_comm"]["status"] == "proved"
    assert m["BucketMath.Vec.dot"]["status"] == "def"
    assert m["BucketMath.Open.pythagoras_orthonormal"]["status"] == "open"
    assert m["Bucket.Address.encode_injective"]["status"] == "open"
    assert m["Bucket.Timeline.relate_total"]["status"] == "external"
    assert m["BucketMath.Vec.dot"]["source"] == "lean/BucketMath/Vec.lean"
    assert m["Bucket.Timeline.relate_total"]["source"] == "papers/history-hypothesis-engine/lean/Bucket/Timeline.lean"
    assert [r["name"] for r in manifest()] == sorted(m)

def test_sorry_outside_open_and_extra_axioms_fail():
    bad = [dict(RAW[0], axioms=["sorryAx"])]
    with pytest.raises(bm.ManifestError, match="sorry outside"):
        bm.build_manifest(bad)
    odd = [dict(RAW[0], axioms=["propext", "Lean.ofReduceBool"])]
    with pytest.raises(bm.ManifestError, match="unapproved"):
        bm.build_manifest(odd)

def test_source_paths_stay_in_the_repo():
    with pytest.raises(bm.ManifestError):
        bm.source_path("Mathlib.Data.Real")
    for row in manifest():
        assert not row["source"].startswith("/") and ".." not in Path(row["source"]).parts

def test_committed_manifest_sources_exist_inside_the_repo():
    committed = bm.load_manifest()
    assert committed, "lean/manifest.json is empty"
    for row in committed:
        path = (bm.REPO / row["source"]).resolve()
        assert bm.REPO.resolve() in path.parents and path.exists(), row["source"]
    names = {r["name"] for r in committed}
    assert "BucketMath.Directions.pythagoras_unit" in names
    assert not [r for r in committed if r["module"].startswith("BucketMath.") and not r["module"].startswith("BucketMath.Open") and r["status"] == "open"]

def test_check_packages_rejects_fetched_and_outside_paths():
    ok = {"packages": [{"name": "h", "type": "path", "dir": "../papers/history-hypothesis-engine/lean"}]}
    assert bm.check_packages(ok) == []
    git = {"packages": [{"name": "mathlib", "type": "git", "url": "https://example.org/m"}]}
    assert "offline" in bm.check_packages(git)[0]
    out = {"packages": [{"name": "x", "type": "path", "dir": "../../elsewhere"}]}
    assert "outside" in bm.check_packages(out)[0]

def test_lookup_exact_suffix_and_words():
    m = manifest()
    assert bm.lookup("dot_comm", m)[0]["name"] == "BucketMath.Vec.dot_comm"
    assert bm.lookup("BucketMath.Vec.dot", m)[0]["name"] == "BucketMath.Vec.dot"
    assert {r["name"] for r in bm.lookup("relate total", m)} == {"Bucket.Timeline.relate_total"}
    assert bm.lookup("nothing-here", m) == []

def test_lint_resolution_errors_and_heuristic_warnings():
    text = "\n".join([
        "Symmetry holds [bm:BucketMath.Vec.dot_comm].",
        "Open claim [bm:BucketMath.Open.pythagoras_orthonormal].",
        "Open claim cited right [bm-open:BucketMath.Open.pythagoras_orthonormal].",
        "Wrong open tag [bm-open:BucketMath.Vec.dot_comm].",
        "Missing [bm:BucketMath.Nope.x].",
        "Recall is 0.998 on the graph.",
        "Recall is 0.998 on the graph [empirical: bench 2026-09-28].",
        "```",
        "[bm:Inside.Code] 50% faster",
        "```",
    ])
    errors, warnings = bm.lint_text(text, manifest())
    assert len(errors) == 3
    assert any("open claim" in e for e in errors) and any("is proved" in e for e in errors) and any("names nothing" in e for e in errors)
    assert len(warnings) == 1 and "line 6" in warnings[0]

def test_lint_cli_exit_codes(tmp_path: Path, monkeypatch, capsys):
    mf = tmp_path / "manifest.json"
    mf.write_text(json.dumps(manifest()))
    monkeypatch.setattr(bm, "MANIFEST", mf)
    good = tmp_path / "good.md"
    good.write_text("Holds [bm:BucketMath.Vec.dot_comm]. Share is 40% here.\n")
    assert bm.main(["lint", str(good)]) == 0
    assert bm.main(["lint", "--strict", str(good)]) == 1
    bad = tmp_path / "bad.md"
    bad.write_text("[bm:BucketMath.Missing]\n")
    assert bm.main(["lint", str(bad)]) == 1
    assert "error" in capsys.readouterr().out

def test_inline_code_is_not_linted():
    errors, warnings = bm.lint_text("Write `[bm:Not.A.Name]` to cite, and `ratio 50%` in code.\n", manifest())
    assert errors == [] and warnings == []
