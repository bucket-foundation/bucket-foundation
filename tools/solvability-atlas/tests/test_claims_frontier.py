import csv
import io
import json
import os
import sys
from pathlib import Path

import numpy as np
import pytest

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))

import claims
import claims_frontier as cf

REPO = HERE.parent.parent
NEIGHBORS = REPO / cf.NEIGHBORS_PATH


def row(i, cls, branch="mathematics", kind="sourced", group=None, reach=0.8):
    return {"id": f"r{i}", "branch": branch, "kind": kind, "status": "open", "zone": "beyond" if cls == cf.OUTSIDE else "reachable", "reach": reach, "class": cls, "group": group or f"r{i}"}


def entry(pid, family="001", scope="none", match="problem"):
    formal = {"exists": scope != "none", "scope": scope, "statement": "s" if scope != "none" else None, "url": "https://x" if scope != "none" else None, "note": "n" if scope == "narrower" else ""}
    return {"id": pid, "batch": "t", "family": family, "family_title": "T", "claimant": "L", "date": "2026-10-06", "source_url": "https://x", "manuscripts": [], "statement": "S", "match": match, "match_note": "", "formal": formal, "confirmation": None, "withdrawn": None}


@pytest.fixture(scope="module")
def frozen():
    return cf.load_frozen()


@pytest.fixture(scope="module")
def committed():
    return json.load(open(cf.OUT))


def test_classes_follow_the_prediction_rule():
    assert cf.class_of("solved", 0.9, 0.85) == ""
    assert cf.class_of("unsampled", 0.9, 0.85) == "unsampled"
    assert cf.class_of("beyond", 0.9, 0.85) == "needs a new idea"
    assert cf.class_of("reachable", 0.85, 0.85) == "close to known results"
    assert cf.class_of("reachable", 0.849, 0.85) == "borderline"


def test_wilson_interval_covers_zero_counts():
    lo, hi = cf.wilson(0, 13)
    assert lo == 0 and 0.2 < hi < 0.25
    assert cf.wilson(0, 0) is None
    lo, hi = cf.wilson(5, 10)
    assert round(lo + hi, 6) == 1


def test_a_toy_table_counts_rates_and_differences():
    rows = [row(i, cf.CLASSES[0]) for i in range(10)] + [row(i, cf.CLASSES[1]) for i in range(10, 30)] + [row(i, cf.OUTSIDE, reach=0.5) for i in range(30, 50)]
    hits = {"r0", "r1", "r10", "r30"}
    groups = np.array([r["group"] for r in rows])
    t = cf.table(rows, hits, groups, n=200, permutations=200)
    assert (t["rows"], t["claimed"]) == (50, 4)
    assert t["classes"][cf.CLASSES[0]]["rate"] == 0.2
    assert t["classes"][cf.CLASSES[1]]["rate"] == 0.05
    assert t["inside"]["rate"] == 0.1 and t["outside"]["rate"] == 0.05
    assert round(t["inside_minus_outside"]["value"], 6) == 0.05
    assert round(t["ratio"], 6) == 2
    lo, hi = t["inside_minus_outside"]["ci95"]
    assert lo < 0.05 < hi
    assert 0.5 < t["reach_auc"]["value"] < 1
    assert 0 < t["permutation_p"] <= 1


def test_only_unconfirmed_claims_of_the_full_problem_count_and_formal_scope_filters():
    entries = [entry("r0", scope="full"), entry("r1", scope="narrower"), entry("r2", match="special_case", scope="full"), entry("r3")]
    entries.append({**entry("r4", scope="full"), "withdrawn": {"date": "2026-10-07", "url": "https://x"}})
    entries.append({**entry("r5", scope="full"), "confirmation": {"by": "A", "kind": "named_expert", "url": "https://x", "date": "2027-01-01"}})
    o = cf.outcomes(entries)
    assert o["claimed"] == {"r0", "r1", "r3"}
    assert o["claimed_formal_full"] == {"r0"}


def test_rows_claimed_by_one_family_resample_together():
    rows = [row(0, cf.CLASSES[0]), row(1, cf.CLASSES[1]), row(2, cf.OUTSIDE), row(3, cf.OUTSIDE, group="r2")]
    groups = cf.merge_claim_families(rows, {"r0": "t:001", "r1": "t:001"})
    assert groups[0] == groups[1] and groups[2] == groups[3] and groups[0] != groups[2]


def test_subsets_keep_top_level_rows_of_the_covered_branches():
    rows = [row(0, cf.CLASSES[0]), row(1, cf.CLASSES[1], branch="physics"), row(2, cf.OUTSIDE, kind="variant"), row(3, "unsampled"), {**row(4, cf.OUTSIDE), "id": "fc-erdosproblems-1-x"}]
    s = cf.subsets(rows)
    assert [r["id"] for r in s["covered_branches"]] == ["r0", "fc-erdosproblems-1-x"]
    assert [r["id"] for r in s["all_sampled_branches"]] == ["r0", "r1", "fc-erdosproblems-1-x"]
    assert [r["id"] for r in s["erdos"]] == ["fc-erdosproblems-1-x"]
    assert [r["id"] for r in s["covered_with_variants"]] == ["r0", "r2", "fc-erdosproblems-1-x"]


def test_the_frozen_baseline_is_the_classification_of_the_commit_before_the_batch(frozen, tmp_path):
    if not cf.baseline_available():
        pytest.skip("the baseline commit is not in this clone")
    meta = cf.freeze(tmp_path / "again.tsv")
    assert (tmp_path / "again.tsv").read_text(encoding="utf8") == cf.FROZEN.read_text(encoding="utf8")
    assert meta["threshold"] == 0.762
    predictions = list(csv.DictReader(io.StringIO(cf.git_show(cf.PREDICTIONS_PATH).decode("utf8"))))
    by_id = {r["id"]: r for r in frozen}
    assert len(predictions) == sum(1 for r in frozen if r["class"] and r["kind"] != "variant")
    assert all(by_id[p["id"]]["class"] == p["class"] and by_id[p["id"]]["reach"] == float(p["reach"]) for p in predictions)


def test_the_claimed_status_moves_no_reach_zone_or_class(frozen):
    now = cf.classify(json.load(open(NEIGHBORS)))
    assert now["threshold"] == 0.762
    assert [(r["id"], r["zone"], r["reach"], r["class"], r["group"]) for r in now["rows"]] == [(r["id"], r["zone"], r["reach"], r["class"], r["group"]) for r in frozen]
    changed = {r["id"] for r, b in zip(now["rows"], frozen) if r["status"] != b["status"]}
    assert changed == set(claims.governing(claims.entries()))
    assert all(r["status"] != "claimed" for r in frozen)


def test_the_committed_result_repeats(frozen, committed):
    full = os.environ.get("ATLAS_FULL_REPEAT") == "1"
    again = cf.run() if full else cf.run(n=40, permutations=200)
    assert again["claimed_rows"] == committed["claimed_rows"]
    for label, by_outcome in committed["tables"].items():
        for name, t in by_outcome.items():
            a = again["tables"][label][name]
            assert (a["rows"], a["claimed"], a["groups"], a["claimed_groups"]) == (t["rows"], t["claimed"], t["groups"], t["claimed_groups"])
            for c in cf.CLASSES:
                assert a["classes"][c]["rate"] == t["classes"][c]["rate"]
            assert a["inside_minus_outside"]["value"] == t["inside_minus_outside"]["value"]
            assert a["reach_auc"]["value"] == t["reach_auc"]["value"]
            if full:
                assert a == t
    assert cf.TABLES.read_text() == cf.markdown(committed)


def test_the_headline_reading_holds_in_the_committed_result(committed):
    t = committed["tables"]["covered_branches"]["claimed"]
    lo, hi = t["inside_minus_outside"]["ci95"]
    assert lo < 0 < hi
    lo, hi = t["reach_auc"]["ci95"]
    assert lo < 0.5 < hi
    strict = committed["tables"]["covered_branches"]["claimed_formal_full"]
    rates = [strict["classes"][c]["rate"] for c in cf.CLASSES]
    assert rates[0] == min(rates)
    assert committed["claimed_rows"]["claimed"]["already_solved_in_baseline"] == []


def test_the_written_tables_are_the_computed_tables(committed):
    doc = (HERE / "CLAIMS-2026-10.md").read_text(encoding="utf8")
    for label, name in (("covered_branches", "claimed"), ("covered_branches", "claimed_formal_full"), ("erdos", "claimed")):
        for line in cf.markdown_table(committed["tables"][label][name]).splitlines():
            assert line in doc, line
    paper = (REPO / "papers" / "solvability-frontier" / "main.tex").read_text(encoding="utf8")
    full, strict = committed["tables"]["covered_branches"]["claimed"], committed["tables"]["covered_branches"]["claimed_formal_full"]
    for c in cf.CLASSES:
        a, b = full["classes"][c], strict["classes"][c]
        row = f"{c} & {a['rows']} & {a['claimed']} & {100 * a['rate']:.1f}\\%, {100 * a['ci95'][0]:.1f} to {100 * a['ci95'][1]:.1f} & {b['claimed']} & {100 * b['rate']:.1f}\\%, {100 * b['ci95'][0]:.1f} to {100 * b['ci95'][1]:.1f} \\\\"
        assert row in paper, row
    assert "\\subsection{October 2026 claims}" in paper and "Added 2026-10-12" in paper
