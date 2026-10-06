import csv
import sys
from pathlib import Path

ATLAS = Path(__file__).parent.parent
sys.path.insert(0, str(ATLAS / "sources"))

import common
from named_lists import OVERRIDES, gloss, status_of, table_rows
from wikipedia_lists import bullets, name_of
from common import keywords_from, posed_year, resolved_year, first_sentence
import re

COLUMNS = ["id", "name", "branch", "level", "form", "variant_of", "lean", "posed", "resolved", "market", "keywords", "status", "source", "licence", "statement", "statement_source", "status_source"]
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
    assert all(r["status"] in common.STATUSES for r in data)
    assert all(r["form"] in common.FORMS for r in data)
    assert all(r["level"] == "" for r in data)
    ids = set(ids) | set(common.existing_titles().values())
    assert all(r["variant_of"] in ids for r in data if r["variant_of"])
    assert all((r["form"] == "variant") == bool(r["variant_of"]) for r in data)


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
        assert r["keywords"] == "" or all(r["keywords"].split(",")), r["id"]
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


def test_form_rule():
    assert common.form_of("Goldbach conjecture", "") == "conjecture"
    assert common.form_of("Is there other life in the Solar System?", "") == "question"
    assert common.form_of("Navier-Stokes existence and smoothness", "Prove or give a counter-example.") == "problem"
    assert common.form_of("Green open problem 22, lower nine", "", variant=True) == "variant"


def test_erdos_merge_lists_both_sources():
    merged = [r for r in rows() if ";" in r["source"]]
    assert len(merged) == 10
    for r in merged:
        assert r["licence"] == "Apache-2.0;CC BY-SA 4.0"
        assert "wikipedia.org" in r["source"] and "formal-conjectures" in r["source"]
    assert not [r for r in rows() if r["id"].startswith("wp-") and r["name"].startswith(("Erdős–Faber", "Erdős discrepancy", "Burr–Erdős"))]


def test_generic_single_words_are_dropped():
    text = "Admissibility of a translation rule in sequential testing of maximum-degree vertices, see the Collatz orbit."
    picked = keywords_from(text, ["translation", "admissibility", "sequential testing", "maximum-degree vertices", "Collatz orbit", "Collatz"], name="Collatz problem")
    assert "translation" not in picked and "admissibility" not in picked
    assert "sequential testing" in picked and "Collatz orbit" in picked and "Collatz" in picked
    assert all(" " in p or p.lower() in "collatz problem" or p[:1].isupper() for p in picked)


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
    existing = set(common.existing_titles())
    assert not [r["name"] for r in rows() if common.normal_title(r["name"]) in existing]


def test_wikipedia_bullets_track_solved_sections():
    text = "== Unsolved problems ==\n* [[Alpha conjecture]]: open?\n** [[Beta]]: nested\n== Problems solved since 2015 ==\n* [[Gamma]]: done in 2019\n== See also ==\n* [[Delta]]"
    got = list(bullets(text))
    assert [(name_of(b), s) for b, s, _ in got] == [("Alpha conjecture", False), ("Beta", False), ("Gamma", True)]
    assert got[2][2] == "Problems solved since 2015"


FIXTURE_TABLE = """{| class="wikitable"
|-
! Problem !! Brief explanation !! Status !! Year solved
|-
| 2nd
| Prove that the axioms of [[arithmetic]] are consistent.
| {{partial|Gödel's theorem shows this cannot be done inside arithmetic.}}
| 1931
|-
| 3rd
| Given any two [[polyhedra]] of equal volume, can one be cut into the other?
| {{yes|Resolved. Result: No (Dehn).}}
| 1900
|-
| 5th
| Are continuous groups automatically differential groups?
| {{partial|Resolved by Andrew Gleason or Hidehiko Yamabe, depending on how the statement is interpreted.}}
| 1953
|-
| 15th
| Rigorous foundation of [[Schubert calculus]].
| {{partial|Partially resolved.}}
| 1987
|-
| 21st
| Existence of Fuchsian equations with a given monodromy group.
| {{no|Unresolved.}}
| –
|}"""


def test_named_list_status_fixture():
    statuses = {}
    for cells in table_rows(FIXTURE_TABLE):
        statuses[common.strip_markup(cells[0])] = status_of(cells[2], cells[3])
    assert statuses == {"2nd": "partial", "3rd": "solved", "5th": "partial", "15th": "partial", "21st": "open"}
    assert status_of("{{yes|Resolved}}", "–") == "open"
    assert OVERRIDES == {"smale-8": "open", "hilbert-14": "partial", "hilbert-18": "partial", "smale-14": "partial", "smale-17": "partial"}
    data = {r["id"]: r for r in rows()}
    assert [data[i]["status"] for i in ("hilbert-2", "hilbert-5", "hilbert-14", "hilbert-15", "hilbert-18", "smale-8", "smale-14", "smale-17")] == ["partial"] * 5 + ["open", "partial", "partial"]


def test_named_list_status_and_gloss():
    assert status_of("{{yes|Resolved}}", "1910") == "solved"
    assert status_of("{{partial|some progress}}", "–") == "partial"
    assert status_of("{{partial|some progress}}", "1940, 1963?") == "partial"
    assert gloss("Hilbert's 3rd problem", "(a) Given any two [[polyhedra]] of equal volume, is it always possible.") == "Hilbert's 3rd problem: Given any two polyhedra of equal volume, is it always possible"
