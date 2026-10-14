import sys
from collections import Counter
from pathlib import Path

ATLAS = Path(__file__).parent.parent
sys.path.insert(0, str(ATLAS / "sources"))
sys.path.insert(0, str(ATLAS))

import common
import erdos_problems as ep

DUMP = """- number: "7"
  prize: "no"
  informal_status:
    state: "proved"
    last_update: "2025-08-31"
  formal_status:
    state: "Lean"
    last_update: "2026-09-03"
  status:
    state: "proved (Lean)"
    last_update: "2026-09-03"
  oeis: ["N/A"]
  tags: ["number theory"]

- number: "8"
  prize: "$500"
  informal_status:
    state: "open"
    last_update: "2026-01-02"
  status:
    state: "open"
    last_update: "2026-01-02"
  tags: ["graph theory"]

- number: "9"
  prize: "no"
  informal_status:
    state: "falsifiable"
    last_update: "2025-08-31"
  tags: ["geometry"]
"""

LEAN = """/-
Copyright 2025 The Formal Conjectures Authors. See [Zz99].
-/
module

/-!
# Erdős Problem 7

*References:*
* [ErGr80] Erdős, P. and Graham, R., Old and new problems (1980).
* [AlBe21] Alpha, A. and Beta, B., A proof (2021).
-/

/-- A helper, shown by Gamma [Ga05] long ago. -/
def helper : Nat := 0

/--
Is the helper zero? A question of Erdős and Szekeres [ErSz61].
The case of even input was proved by Delta [De90].
This was proved by Alpha and Beta [AlBe21].
-/
@[category research solved, AMS 5]
theorem erdos_7 : helper = 0 := by
  sorry

/-- A sharper form was proved by Epsilon [Ep24]. -/
@[category research solved, AMS 5]
theorem erdos_7.variants.sharp : helper = 0 := by
  sorry
"""


def record(**changes):
    base = {"number": "7", "state": "proved", "state_updated": "2025-08-31", "lean_file": "7.lean", "posed": "1961", "posed_key": "ErSz61", "posed_kind": "stated", "resolved": "2021", "resolved_keys": "AlBe21", "url": "https://www.erdosproblems.com/7"}
    return {**base, **changes}


def row(**changes):
    base = {"id": "fc-erdosproblems-7-erdos-7", "status": "solved", "posed": "", "resolved": "", "variant_of": "", "posed_evidence": "", "status_source": "formal-conjectures status field in problem_map.jsonl", "source": "https://github.com/google-deepmind/formal-conjectures/blob/main/FormalConjectures/ErdosProblems/7.lean"}
    return {**base, **changes}


def test_dump_reads_the_informal_state_per_problem():
    got = ep.dump_records(DUMP)
    assert got == {
        "7": {"state": "proved", "state_updated": "2025-08-31"},
        "8": {"state": "open", "state_updated": "2026-01-02"},
        "9": {"state": "falsifiable", "state_updated": "2025-08-31"},
    }


def test_key_years_follow_the_author():
    assert ep.key_year("Er", "61") == 1961
    assert ep.key_year("ErGr", "80") == 1980
    assert ep.key_year("BuEr", "75") == 1975
    assert ep.key_year("Er", "26") is None
    assert ep.key_year("Er", "05") is None
    assert ep.key_year("AlBe", "21") == 2021
    assert ep.key_year("KST", "84") == 1984
    assert not ep.by_erdos("EHP") and not ep.by_erdos("Erb") and ep.by_erdos("Erd")


def test_posed_year_is_the_earliest_erdos_reference_outside_the_licence_header():
    body = ep.lean_body(LEAN)
    assert "Zz99" not in body
    docstring = ep.main_docstring(body, "7")
    assert "Is the helper zero?" in docstring and "helper, shown" not in docstring and "sharper" not in docstring
    assert ep.posed_from(body, docstring) == ("1961", "ErSz61", "stated")
    later = body.replace("[ErSz61]", "[ErSz91]")
    assert ep.posed_from(later, ep.main_docstring(later, "7")) == ("1980", "ErGr80", "cited")
    assert ep.posed_from("Proved by Alpha [Al63].", "") == ("", "", "")


def test_resolved_year_needs_one_resolving_reference_in_the_main_docstring():
    docstring = ep.main_docstring(ep.lean_body(LEAN), "7")
    assert ep.resolved_from(docstring) == ("2021", ["AlBe21"])
    assert ep.resolved_from("This was proved by Alpha [Al91]. A new proof was proved by Beta [Be12].") == ("", ["Al91", "Be12"])
    assert ep.resolved_from("Alpha [Al63] proved a lower bound, and Beta [Be58] proved an upper bound.") == ("", [])
    assert ep.resolved_from("Proved for even input by Alpha [Al90].") == ("", [])
    assert ep.resolved_from("Disproved by a search run by Alpha in 2019.") == ("2019", ["2019"])
    assert ep.resolved_from("Graph with 2017 edges.") == ("", [])


def test_build_records_keeps_every_dump_problem():
    built = ep.build_records(DUMP, {"7": LEAN})
    assert [r["number"] for r in built] == ["7", "8", "9"]
    assert built[0] == record()
    assert built[1]["lean_file"] == "" and built[1]["posed"] == "" and built[1]["url"] == "https://www.erdosproblems.com/8"
    assert all(ep.check(r) == [] for r in built)
    assert ep.check(record(posed_key="")) and ep.check(record(lean_file="")) and ep.check(record(url="https://www.erdosproblems.com/8"))


def test_decide_names_every_skip():
    assert ep.decide(record(), row())[0] == "dated"
    assert ep.decide(record(state="open", resolved="", resolved_keys=""), row(status="open"))[0] == "dated"
    assert ep.decide(record(resolved="", resolved_keys=""), row())[0] == "posed"
    reasons = {
        ep.decide(record(lean_file=""), None)[1],
        ep.decide(record(), None)[1],
        ep.decide(record(state="falsifiable"), row(status="open"))[1],
        ep.decide(record(), row(status="open"))[1],
        ep.decide(record(state="open"), row())[1],
        ep.decide(record(posed="", posed_key="", posed_kind=""), row())[1],
        ep.decide(record(resolved="1950"), row())[1],
    }
    assert len(reasons) == 6
    assert all(ep.decide(*pair)[0] == "skip" for pair in [(record(resolved="1950"), row()), (record(), row(status="partial")), (record(resolved="1990"), row(posed="2000"))])


def test_committed_records_pass_their_checks():
    loaded = ep.records()
    assert len(loaded) == len({r["number"] for r in loaded}) >= 1200
    assert all(ep.check(r) == [] for r in loaded)
    for r in loaded:
        if r["posed"]:
            assert ep.ERDOS_FIRST_YEAR <= int(r["posed"]) <= ep.ERDOS_LAST_YEAR, r["number"]
            assert ep.by_erdos(r["posed_key"][:-2]), r["number"]


def test_plan_accounts_for_every_dump_problem():
    loaded = ep.records()
    fills, counts = ep.plan(common.read(), loaded)
    assert sum(counts.values()) == len(loaded)
    assert len(fills) == sum(n for (action, _), n in counts.items() if action != "skip")
    by_action = Counter()
    for (action, _), n in counts.items():
        by_action[action] += n
    assert by_action["dated"] >= 150 and by_action["skip"] >= 1


def test_bound_years_fill_only_empty_cells_and_never_resolve_before_posing():
    current = common.read()
    by_id = {r["id"]: r for r in current}
    years = ep.bound_years(current)
    assert sum("posed" in y for y in years.values()) >= 300
    assert sum("resolved" in y for y in years.values()) >= 50
    by_number = {r["number"]: r for r in ep.records()}
    for row_id, fill in years.items():
        row = by_id[row_id]
        record = by_number[row["source"].split("ErdosProblems/")[1].split(".lean")[0]]
        assert not row["variant_of"] and row_id.startswith("fc-erdosproblems-"), row_id
        assert row["licence"].split(";")[0] == ep.LEAN_LICENCE == ep.DUMP_LICENCE, row_id
        assert (row["status"] == "solved") == (record["state"] in ep.SOLVED_STATES), row_id
        if "posed" in fill:
            assert not row["posed"] and fill["posed"] == int(record["posed"]), row_id
        if "resolved" in fill:
            assert row["status"] == "solved" and not row["resolved"], row_id
            assert fill["resolved"] >= int(row["posed"] or fill["posed"]), row_id


def test_bound_years_follow_the_plan_on_a_toy_file():
    current = [row(), row(id="fc-erdosproblems-8-erdos-8", status="open", source=row()["source"].replace("/7.lean", "/8.lean")), row(id="fc-erdosproblems-7-erdos-7-sharp", variant_of="fc-erdosproblems-7-erdos-7")]
    loaded = [record(), record(number="8", state="open", lean_file="8.lean", resolved="2026", resolved_keys="2026", url="https://www.erdosproblems.com/8"), record(number="9", lean_file="", posed="", posed_key="", posed_kind="", resolved="", resolved_keys="", url="https://www.erdosproblems.com/9")]
    assert ep.bound_years(current, loaded) == {"fc-erdosproblems-7-erdos-7": {"posed": 1961, "resolved": 2021}, "fc-erdosproblems-8-erdos-8": {"posed": 1961}}
    kept = [row(posed="1950", resolved="1990")]
    assert ep.bound_years(kept, loaded) == {}


def test_bound_years_stay_out_of_the_sourced_file():
    assert not [r["id"] for r in common.read() if "Earliest Erd" in r["posed_evidence"]]


def test_table_overlay_marks_bound_years_and_leaves_stated_years_alone():
    import surface_table as st

    nodes = [
        {"id": "a", "posed": None, "resolved": None, "solved": True},
        {"id": "b", "posed": 1900, "resolved": None, "solved": True},
        {"id": "c", "posed": None, "resolved": None, "solved": False},
        {"id": "d", "posed": None, "resolved": None, "solved": False},
    ]
    years = {"a": {"posed": 1961, "resolved": 2021}, "b": {"posed": 1950, "resolved": 1980}, "c": {"posed": 1970, "resolved": 1999}}
    got = {n["id"]: (n["posed"], n["resolved"], n["posed_bound"]) for n in st.with_bound_years(nodes, years)}
    assert got == {"a": (1961, 2021, 1), "b": (1900, 1980, 0), "c": (1970, None, 1), "d": (None, None, 0)}
    assert nodes[0]["posed"] is None
    assert "posed_bound" in st.POST_OUTCOME and "posed_bound" in st.FIELDS


def test_committed_table_carries_the_bound_years():
    import surface_table as st

    table = st.load()
    years = ep.bound_years()
    bound = table[table["posed_bound"] == 1]
    assert set(bound["id"]) == {i for i, y in years.items() if "posed" in y}
    assert (bound["posed"].astype(int) == [years[i]["posed"] for i in bound["id"]]).all()
    dated = table[table["posed"].notna() & table["resolved"].notna()]
    assert (dated["resolved"] >= dated["posed"]).all()


def test_erdos_rows_form_one_list_in_the_survival_frame():
    import surface_survival as ss

    base = "https://github.com/google-deepmind/formal-conjectures/blob/main/FormalConjectures/"
    assert ss.problem_list(base + "ErdosProblems/7.lean") == ss.problem_list(base + "ErdosProblems/163.lean;https://en.wikipedia.org/wiki/List_of_unsolved_problems_in_mathematics") == "formal-conjectures/ErdosProblems"
    assert ss.problem_list(base + "Millennium/NavierStokes.lean") == "formal-conjectures/Millennium"
    assert ss.problem_list("https://en.wikipedia.org/wiki/Hilbert's_problems") == "https://en.wikipedia.org/wiki/Hilbert's_problems"
    assert ss.problem_list("tools/solvability-atlas/problems.tsv") == "tools/solvability-atlas/problems.tsv"
