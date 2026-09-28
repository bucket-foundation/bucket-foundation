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

@pytest.mark.parametrize("query,name", [
    ("acyclic", "BucketMath.Graph.acyclic_of_rank"),
    ("prereq_rank_lt", "BucketMath.Graph.prereq_rank_lt"),
    ("expected_mono", "BucketMath.Discovery.expected_mono"),
    ("excess_zero_iff", "BucketMath.Markets.excess_zero_iff"),
    ("pythagoras_orthonormal", "BucketMath.Project.pythagoras_orthonormal"),
    ("minimum_weighted_effort", "BucketMath.Learning.minimum_weighted_effort"),
    ("remaining_necessary", "BucketMath.Learning.remaining_necessary"),
    ("diamond_minimum", "BucketMath.Learning.diamond_minimum"),
    ("required_rank_lt", "BucketMath.Graph.required_rank_lt"),
])
def test_lookup_finds_phase_two_rows(query, name):
    rows = bm.lookup(query, bm.load_manifest())
    assert name in {r["name"] for r in rows}

def test_phase_two_rows_are_proved():
    by_name = {r["name"]: r for r in bm.load_manifest()}
    for name in ["BucketMath.Graph.acyclic_of_rank", "BucketMath.Graph.reach_rank_lt", "BucketMath.Graph.prereq_rank_lt",
                 "BucketMath.Discovery.expected_append", "BucketMath.Discovery.expected_mono",
                 "BucketMath.Markets.efficient_spread_bounded", "BucketMath.Project.pythagoras_orthonormal"]:
        assert by_name[name]["status"] == "proved", name

def test_lint_accepts_discovery_and_graph_citations():
    text = "Adding directions never lowers yield [bm:BucketMath.Discovery.expected_mono]. Ranked prerequisites cannot cycle [bm:BucketMath.Graph.acyclic_of_rank]."
    errors, _ = bm.lint_text(text, bm.load_manifest())
    assert errors == []


LEARNING_CORE = ["restricted_closed", "restricted_remaining", "required_known", "after_closed", "remaining_necessary",
                 "earlier_path", "minimum_unit_distance", "effort_subset", "minimum_weighted_effort",
                 "remaining_antitone", "distance_antitone", "coverage_monotone", "squared_extent_monotone"]
LEARNING_DIAMOND = ["diamond_required", "diamond_enumerates", "diamond_ready", "diamond_minimum",
                    "diamond_chain_insufficient"]
PRE_MOVE_AXIOMS = {
    "restricted_closed": set(), "restricted_remaining": set(),
    "minimum_weighted_effort": {"propext", "Classical.choice", "Quot.sound"},
    "minimum_unit_distance": {"propext", "Classical.choice", "Quot.sound"},
    "distance_antitone": {"propext", "Classical.choice", "Quot.sound"},
    "coverage_monotone": {"propext", "Quot.sound"}, "squared_extent_monotone": {"propext", "Quot.sound"},
    "diamond_ready": {"propext"}, "diamond_minimum": {"propext", "Classical.choice", "Quot.sound"},
}


def test_learning_rows_proved():
    by_name = {r["name"]: r for r in bm.load_manifest()}
    for short in LEARNING_CORE + LEARNING_DIAMOND:
        assert by_name[f"BucketMath.Learning.{short}"]["status"] == "proved", short
    assert by_name["BucketMath.Graph.required_rank_lt"]["status"] == "proved"


def test_learning_axioms_match_pre_move_audit():
    audit = (bm.REPO / "learning/research-os/learning-system/lean/check-output.txt").read_text().splitlines()
    found = {}
    for line in audit:
        name = line.split("'")[1]
        axioms = line.split("depends on axioms: ")[1].strip("[]").split(", ") if "depends on axioms" in line else []
        found[name.removeprefix("BucketMath.Learning.")] = set(axioms)
    assert len(audit) == 10
    for short, axioms in PRE_MOVE_AXIOMS.items():
        assert found[short] == axioms, short


def test_lint_accepts_learning_citation():
    text = "Every missing prerequisite is on the path [bm:BucketMath.Learning.remaining_necessary]."
    errors, _ = bm.lint_text(text, bm.load_manifest())
    assert errors == []
