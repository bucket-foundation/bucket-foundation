import csv
import sys
from pathlib import Path

ATLAS = Path(__file__).parent.parent
sys.path.insert(0, str(ATLAS / "sources"))

import common
from named_lists import gloss, status_of
from wikipedia_lists import bullets, name_of

COLUMNS = ["id", "name", "branch", "level", "lean", "posed", "resolved", "market", "keywords", "status", "source", "licence"]


def rows():
    with (ATLAS / "problems-sourced.tsv").open(encoding="utf8") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        assert reader.fieldnames == COLUMNS
        return list(reader)


def test_tsv_parses_with_unique_ids():
    data = rows()
    assert len(data) >= 300
    ids = [r["id"] for r in data]
    assert len(ids) == len(set(ids))
    assert all(r["branch"] in common.BRANCHES for r in data)
    assert all(r["status"] in {"open", "solved"} for r in data)
    assert all(r["level"] in {"1", "2", "3", "4", "5"} for r in data)


def test_every_row_has_source_and_licence():
    for r in rows():
        assert r["source"].startswith("https://"), r["id"]
        assert r["licence"], r["id"]
        assert 3 <= len(r["keywords"].split(",")) <= 8, r["id"]


def test_rows_cover_four_fields_and_two_outside_mathematics():
    branches = {r["branch"] for r in rows()}
    assert len(branches) >= 4
    assert len(branches - {"mathematics"}) >= 2


def test_no_titles_duplicate_the_existing_atlas():
    existing = common.existing_titles()
    assert not [r["name"] for r in rows() if common.normal_title(r["name"]) in existing]


def test_wikipedia_bullets_track_solved_sections():
    text = "== Unsolved problems ==\n* [[Alpha conjecture]]: open?\n** [[Beta]]: nested\n== Problems solved since 2015 ==\n* [[Gamma]]: done in 2019\n== See also ==\n* [[Delta]]"
    got = list(bullets(text))
    assert [(name_of(b), s) for b, s in got] == [("Alpha conjecture", False), ("Beta", False), ("Gamma", True)]


def test_named_list_status_and_gloss():
    assert status_of("{{yes|Resolved}}", "1910") == "solved"
    assert status_of("{{partial|some progress}}", "–") == "open"
    assert status_of("{{partial|some progress}}", "1940, 1963?") == "solved"
    assert gloss("Hilbert's 3rd problem", "(a) Given any two [[polyhedra]] of equal volume, is it always possible.") == "Hilbert's 3rd problem: Given any two polyhedra of equal volume, is it always"
