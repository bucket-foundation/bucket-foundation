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

COLUMNS = ["id", "name", "branch", "level", "form", "variant_of", "lean", "posed", "resolved", "market", "keywords", "status", "source", "licence", "statement", "statement_source", "status_source", "posed_evidence"]
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


def test_solved_discovery_rows_carry_year_source_and_status():
    import solved_discoveries

    data = [r for r in rows() if r["id"].startswith("sd-")]
    assert len(data) >= 80
    for r in data:
        assert r["status"] == "solved" and r["form"] in {"question", "problem"}, r["id"]
        assert re.fullmatch(r"\d{4}", r["resolved"]), r["id"]
        assert r["source"].startswith("https://") and r["licence"] in solved_discoveries.LICENCES, r["id"]
        assert r["statement"] and r["status_source"], r["id"]
        assert solved_discoveries.problem_shaped(r["statement"]), r["id"]
        assert "\u2013" not in r["statement"] and "\u2014" not in r["statement"], r["id"]
    curated = solved_discoveries.curated_rows()
    assert not [(c["line"], solved_discoveries.check(c)) for c in curated if solved_discoveries.check(c)]
    assert {c["resolved_kind"] for c in curated} == {"posed", "discovery"}
    posed = {"sd-" + common.slug(c["name"]) for c in curated if c["resolved_kind"] == "posed"}
    assert all(r["id"].rsplit("-", 1)[0] in posed or r["id"] in posed for r in data)
    assert all(c["posed_evidence"] for c in curated if c["resolved_kind"] == "posed")
    assert all(not c["posed_evidence"] for c in curated if c["resolved_kind"] == "discovery")


def test_solved_statements_sit_in_the_open_rows_length_band():
    import statistics
    import solved_discoveries

    data = rows()
    for branch in solved_discoveries.TARGET_BRANCHES:
        open_lengths = [len(r["statement"].split()) for r in data if r["branch"] == branch and r["status"] == "open"]
        solved_lengths = [len(r["statement"].split()) for r in data if r["branch"] == branch and r["id"].startswith("sd-")]
        assert solved_lengths, branch
        assert all(solved_discoveries.MIN_WORDS <= n <= solved_discoveries.MAX_WORDS for n in solved_lengths), branch
        low, high = statistics.quantiles(open_lengths, n=4)[0], statistics.quantiles(open_lengths, n=4)[2]
        median = statistics.median(solved_lengths)
        assert min(low, solved_discoveries.MIN_WORDS) <= median <= max(high, solved_discoveries.MAX_WORDS), (branch, median, low, high)


def test_resolved_year_is_never_the_prize_year():
    import solved_discoveries

    for c in solved_discoveries.curated_rows():
        prize = solved_discoveries.prize_year(c["source"])
        if prize:
            assert int(c["resolved"]) < int(prize), (c["line"], c["resolved"], prize)
    assert solved_discoveries.prize_year("https://www.nobelprize.org/prizes/medicine/1963/summary/") == "1963"
    assert solved_discoveries.prize_year("https://www.kavliprize.org/prizes/neuroscience/2014") == "2014"
    assert solved_discoveries.prize_year("https://en.wikipedia.org/wiki/Nobel_Prize") == ""


def test_prize_quotes_hold_at_most_twelve_words():
    import solved_discoveries

    for c in solved_discoveries.curated_rows():
        for cell in (c["status_source"], c["posed_evidence"]):
            for quote in re.findall(r'"([^"]+)"', cell):
                assert len(quote.split()) <= solved_discoveries.QUOTE_WORDS, (c["line"], quote)


def test_no_solved_statement_duplicates_another_row():
    import solved_discoveries

    data = rows()
    solved = [r for r in data if r["id"].startswith("sd-")]
    others = [r for r in data if not r["id"].startswith("sd-")]
    assert solved_discoveries.similar_pairs(solved, solved + others) == []
    assert solved_discoveries.similar("Does the neutrino have mass?", "Does the neutrino have a mass?")
    assert not solved_discoveries.similar("Does the neutrino have mass?", "Is the proton stable?")


POSED_FLOOR = {"physics": 15, "chemistry": 10, "biophysics": 13, "cosmology": 16, "mind": 1, "information": 1, "applied": 18}


def test_each_science_branch_states_its_solved_count():
    import solved_discoveries

    counts = solved_discoveries.solved_counts(ATLAS / "problems-sourced.tsv")
    short = {branch: solved_discoveries.TARGET - n for branch, n in counts.items() if n < solved_discoveries.TARGET}
    for branch, floor in POSED_FLOOR.items():
        assert counts[branch] >= floor, (branch, counts[branch], f"shortfall below {solved_discoveries.TARGET}: {short}")


DATED_COUNTS = {
    "science-2005": {"open": 48, "partial": 65, "solved": 4},
    "science-2021": {"open": 80, "partial": 42},
    "darpa": {"solved": 13, "open": 3},
    "xprize": {"solved": 17, "open": 3, "partial": 1},
    "neuro-23": {"partial": 8, "open": 15},
    "holy-grails": {"open": 20, "partial": 6},
}


def test_dated_list_rows_carry_posed_year_statement_band_and_sources():
    import dated_lists

    data = [r for r in rows() if r["id"].startswith("dl-")]
    assert len(data) == sum(sum(c.values()) for c in DATED_COUNTS.values())
    for r in data:
        assert re.fullmatch(r"\d{4}", r["posed"]), r["id"]
        assert dated_lists.MIN_WORDS <= len(r["statement"].split()) <= dated_lists.MAX_WORDS, r["id"]
        assert r["status_source"] and r["licence"] in dated_lists.LICENCES and r["posed_evidence"], r["id"]
        assert (r["status"] == "solved") == bool(r["resolved"]), r["id"]
        assert r["form"] in {"question", "problem"}, r["id"]
    curated = dated_lists.curated_rows()
    assert not [(c["line"], dated_lists.check(c)) for c in curated if dated_lists.check(c)]


def test_dated_list_counts_per_source():
    import dated_lists

    assert {name: dict(table) for name, table in dated_lists.counts(rows()).items()} == DATED_COUNTS


def test_posed_evidence_column_is_present_and_filled_where_posed_came_from_a_list():
    data = rows()
    assert all("posed_evidence" in r for r in data)
    import dated_lists

    for r in data:
        if r["id"].startswith(("dl-", "sd-", "hilbert-", "smale-")) or r["id"] in dated_lists.POSED_FILLS:
            assert r["posed_evidence"], r["id"]
    by_id = {r["id"]: r for r in data}
    assert by_id["wp-landau-s-problems"]["posed"] == "1912"
    assert by_id["fc-millennium-riemannhypothesis-riemannhypothesis"]["posed"] == "1859"
    assert by_id["wp-why-do-we-dream"]["posed"] == "2005"
    erdos = [r for r in data if r["id"].startswith("fc-erdosproblems") and r["posed_evidence"].startswith("formal-conjectures text")]
    assert len(erdos) == 20
    assert all(r["posed"] for r in erdos)


def test_no_dated_statement_duplicates_another_row():
    import solved_discoveries

    data = rows()
    dated = [r for r in data if r["id"].startswith("dl-")]
    others = [r for r in data if not r["id"].startswith("dl-")]
    assert solved_discoveries.similar_pairs(dated, dated + others) == []


def test_copyrighted_headlines_stay_short():
    for r in rows():
        if r["licence"].startswith(("AAAS", "ACS")):
            assert len(r["name"].split()) < 15, r["id"]
            assert r["statement"] != r["name"], r["id"]
