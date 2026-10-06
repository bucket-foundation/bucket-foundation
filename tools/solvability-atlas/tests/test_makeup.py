import json
import urllib.parse
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))
import makeup
import openalex_sourced

REPORT = makeup.REPORT
needs_report = pytest.mark.skipif(not (REPORT / "frontier.json").exists() or not makeup.NEIGHBORS.exists(), reason="frontier report data not built")


def fixture_rows():
    return makeup.mark_solved(makeup.load_atlas_rows() + makeup.load_sourced_rows())


def test_row_total_is_atlas_plus_sourced():
    rows = fixture_rows()
    assert len(rows) == 71 + 5009


def test_variant_of_open_parent_is_partial():
    rows = makeup.mark_solved([
        {"id": "a", "status": "open", "variant_of": ""},
        {"id": "a-1", "status": "solved", "variant_of": "a"},
        {"id": "b", "status": "solved", "variant_of": ""},
        {"id": "b-1", "status": "solved", "variant_of": "b"},
    ])
    assert [r["status_marked"] for r in rows] == ["open", "partial", "solved", "solved"]


@needs_report
def test_every_label_sums_to_the_row_total():
    rows = fixture_rows()
    data = makeup.build(rows, json.load(open(REPORT / "frontier.json")), json.load(open(REPORT / "predictions.json")), json.load(open(makeup.NEIGHBORS)), None)
    assert data["rows"] == len(rows)
    for key, lab in data["labels"].items():
        assert lab["present"] + lab["absent"] == data["rows"], key
        assert sum(lab["counts"].values()) == lab["present"], key
        if not key.endswith("_decade"):
            assert lab["absent"] == 0, key
    assert sum(sum(v.values()) for v in data["status_by_branch"].values()) == data["rows"]
    assert sum(s["rows"] for s in data["sources"].values()) == data["rows"]
    assert data["labels"]["status"]["counts"]["solved"] == data["labels"]["zone"]["counts"]["solved"]


@needs_report
def test_openalex_bands_sum_to_queried_rows():
    rows = fixture_rows()
    oa = {"rows": {rows[i]["id"]: {"works_total": t, "retrieved": "2026-10-06"} for i, t in enumerate([0, 5, 50, 500, 5000, 50000, None])}}
    data = makeup.build(rows, json.load(open(REPORT / "frontier.json")), json.load(open(REPORT / "predictions.json")), json.load(open(makeup.NEIGHBORS)), oa)
    assert data["openalex"]["queried"] == 7
    assert data["openalex"]["with_works"] == 5
    assert sum(sum(v.values()) for v in data["openalex"]["works_by_branch"].values()) == 7


def test_query_uses_name_or_first_clause():
    assert openalex_sourced.query_for({"name": "Hartmanis–Stearns conjecture", "statement": "x"}) == "Hartmanis Stearns conjecture"
    q = openalex_sourced.query_for({"name": "Erdős problem 403", "statement": "Does the equation $$2^m=a_1!$$ with $a_1<a_2$ have only finitely many solutions? Asked by Burr [Er65]."})
    assert q == "Does the equation with have only finitely many solutions"
    assert "," not in q and ":" not in q


def test_openalex_urls_carry_no_mailto():
    works, years = openalex_sourced.works_url("sunflower conjecture", 1997, 2026)
    assert "mailto" not in works and "mailto" not in years
    assert "publication_year:1997-2026" in urllib.parse.unquote(years)
