import csv
import json
import sys
from collections import Counter
from pathlib import Path

import numpy as np
import pytest

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE / "sources"))

import record_schema
import records_all

REPO = HERE.parent.parent
DATA = REPO / "src" / "lib" / "research-os" / "solvability-records-data.json"
REPORT = REPO / "src" / "lib" / "research-os" / "solvability-frontier-report-data.json"


@pytest.fixture(scope="module")
def packed():
    return json.load(open(DATA))


@pytest.fixture(scope="module")
def data(packed):
    return records_all.unpack(packed)


def tsv_ids():
    ids = [r["id"] for r in csv.DictReader(open(HERE / "problems.tsv"), delimiter="\t")]
    return ids + [r["id"] for r in csv.DictReader(open(HERE / "problems-sourced.tsv"), delimiter="\t")]


def test_every_row_gets_a_record(data):
    assert [r["id"] for r in data["rows"]] == tsv_ids()


def test_schema_validates(data):
    assert record_schema.row_errors(data) == []


def test_schema_rejects_a_bad_zone(data):
    bad = json.loads(json.dumps(data))
    bad["rows"][0]["zone"] = "nowhere"
    assert any("zone" in e for e in record_schema.row_errors(bad))


def test_file_stays_under_three_mebibytes():
    assert DATA.stat().st_size < 3 * 1024 * 1024


def test_hand_fields_of_the_atlas_problems_are_kept(data):
    atlas = [r for r in data["rows"] if (HERE / "records" / f"{r['id']}.json").exists()]
    assert len(atlas) == len(list((HERE / "records").glob("*.json")))
    for r in atlas:
        rec = json.load(open(HERE / "records" / f"{r['id']}.json"))
        hand = r["hand"]
        assert hand["aliases"] == rec["aliases"]
        assert hand["history"] == rec["history"]
        assert hand["related"] == rec["related"]
        assert hand["formal"] == rec["formal"]
        assert [w["title"] for w in hand["key_works"]] == [w["title"] for w in rec["key_works"][: records_all.HAND_WORKS]]
        assert r["statement"].startswith(rec["statement"]["text"][:100][:50]) or r["statement"] == rec["statement"]["text"] or rec["statement"]["text"] == ""


def test_only_the_atlas_problems_carry_hand_fields(data):
    assert sum("hand" in r for r in data["rows"]) == len(list((HERE / "records").glob("*.json")))


def test_frontier_numbers_match_the_report(data):
    report = json.load(open(REPORT))["frontier"]
    assert data["threshold"] == report["threshold"]
    zones = Counter(r["zone"] for r in data["rows"])
    for zone, count in report["counts"].items():
        assert zones.get(zone, 0) == count


def test_neighbours_are_sorted_and_exclude_the_row(data):
    for i, r in enumerate(data["rows"]):
        for key in ("near_solved", "near_open"):
            sims = [s for _, s in r[key]]
            assert sims == sorted(sims, reverse=True)
            assert all(j != i for j, _ in r[key])
            assert len(r[key]) <= records_all.NEAREST
        assert r["near_solved"], r["id"]


def test_components_are_three_loadings_and_three_axes(data):
    assert len(data["axes"]) == 3
    assert all(len(a["positive"]) == records_all.DIRECTION_TOKENS for a in data["axes"])
    assert all(len(r["pc"]) == 3 for r in data["rows"])


def test_pack_round_trips(packed, data):
    again = records_all.pack(data)
    strip = lambda rows: [{k: v for k, v in r.items() if k != "cut"} for r in rows]
    assert strip(again["rows"]) == strip(packed["rows"])
    assert again["tables"] == packed["tables"]


def test_zones_and_radii_on_a_toy_set():
    nodes = [{"id": f"s{i}", "branch": "a"} for i in range(10)] + [{"id": "near", "branch": "a"}, {"id": "far", "branch": "a"}, {"id": "lone", "branch": "b"}]
    solved = np.array([True] * 10 + [False] * 3)
    reach = np.array([0.5, 0.5, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.85, 0.3, 0.2])
    tau, zr = records_all.zones_and_radii(nodes, reach, solved)
    assert tau == 0.5
    assert [z for z, _ in zr][9:] == ["solved", "reachable", "beyond", "unsampled"]
    assert all(0 <= radius <= records_all.CORE_RADIUS for z, radius in zr if z == "solved")
    assert records_all.CORE_RADIUS < zr[10][1] < records_all.FRONTIER_RADIUS
    assert records_all.FRONTIER_RADIUS <= zr[11][1] <= records_all.OUTER_RADIUS


def test_nearest_picks_the_top_k_in_the_mask():
    sim = np.array([0.1, 0.9, 0.5, 0.7, -2.0])
    assert records_all.nearest(sim, np.array([True, False, True, True, True]), 2) == [(3, 0.7), (2, 0.5)]
    assert records_all.nearest(sim, np.zeros(5, dtype=bool), 2) == []
