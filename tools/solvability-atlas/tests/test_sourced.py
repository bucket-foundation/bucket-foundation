import csv
import sys
from pathlib import Path

ATLAS = Path(__file__).parent.parent
sys.path.insert(0, str(ATLAS / "sources"))

import common
from named_lists import gloss, status_of
from wikipedia_lists import bullets, name_of
from common import keywords_from, posed_year, resolved_year, first_sentence
import re

COLUMNS = ["id", "name", "branch", "level", "lean", "posed", "resolved", "market", "keywords", "status", "source", "licence", "statement", "statement_source", "status_source"]
TRAILING = {"especially", "and", "or", "of", "the", "in", "for", "to", "with", "by", "an"}


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
        assert len(r["keywords"].split(",")) <= 8, r["id"]
        assert r["statement"], r["id"]
        assert r["statement_source"], r["id"]
        assert r["status_source"], r["id"]


def test_names_end_at_a_boundary():
    for r in rows():
        assert len(r["name"]) <= 140, r["id"]
        assert not re.search(r"[,;:(\-]$", r["name"]), r["id"]
        assert r["name"].split()[-1].lower() not in TRAILING, r["id"]


def test_keywords_hold_no_stopwords():
    for r in rows():
        for token in filter(None, r["keywords"].split(",")):
            words = token.split()
            assert not common.is_stopword(words[0]) and not common.is_stopword(words[-1]), (r["id"], token)


def test_years_are_four_digits_in_range():
    for r in rows():
        for year in (r["posed"], r["resolved"]):
            if year:
                assert re.fullmatch(r"\d{4}", year) and 1600 <= int(year) <= 2026, (r["id"], year)


def test_year_parsing_never_guesses():
    assert posed_year("Posed by Hilbert in 1900.") == "1900"
    assert posed_year("Existence of gravitational waves (1916–2016): detected.") == "1916"
    assert resolved_year("Existence of gravitational waves (1916–2016): detected.") == "2016"
    assert resolved_year("Burr–Erdős conjecture (Choongbum Lee, 2017).") == "2017"
    assert resolved_year("Vertices of a graph with 2017 edges.") == ""
    assert posed_year("See the 1990 survey.") == ""


def test_keywords_come_from_the_statement():
    text = "Can light signals travel faster than c between two closely spaced conducting plates exploiting the Casimir effect?"
    picked = keywords_from(text, ["Casimir effect", "Not in text"])
    assert picked[0] == "Casimir effect"
    assert "Not in text" not in picked
    assert all(not common.is_stopword(p.split()[-1]) for p in picked)
    assert first_sentence("Is there other life in the Solar System? Especially on Europa.") == "Is there other life in the Solar System?"


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
    assert [(name_of(b), s) for b, s, _ in got] == [("Alpha conjecture", False), ("Beta", False), ("Gamma", True)]
    assert got[2][2] == "Problems solved since 2015"


def test_named_list_status_and_gloss():
    assert status_of("{{yes|Resolved}}", "1910") == "solved"
    assert status_of("{{partial|some progress}}", "–") == "open"
    assert status_of("{{partial|some progress}}", "1940, 1963?") == "solved"
    assert gloss("Hilbert's 3rd problem", "(a) Given any two [[polyhedra]] of equal volume, is it always possible.") == "Hilbert's 3rd problem: Given any two polyhedra of equal volume, is it always possible"
