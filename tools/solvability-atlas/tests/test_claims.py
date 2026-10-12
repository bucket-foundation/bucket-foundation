import copy
import csv
import json
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))

import atlas
import claims
import claims_build
import forecast
import record_schema
import records_all
import scoring

REPO = HERE.parent.parent
NEIGHBORS = REPO / "src" / "lib" / "research-os" / "solvability-neighbors-data.json"
PACKED = REPO / "src" / "lib" / "research-os" / "solvability-records-data.json"
BASELINE_SOLVED = 1694


def entry(pid, match="problem", **extra):
    base = {
        "id": pid, "batch": "t", "family": "001", "family_title": "T", "claimant": "A lab", "date": "2026-10-06", "source_url": "https://example.org/claim",
        "manuscripts": [], "statement": "The statement.", "match": match, "match_note": "",
        "formal": {"exists": False, "scope": "none", "statement": None, "url": None, "note": ""}, "confirmation": None, "withdrawn": None,
    }
    return {**base, **extra}


def toy_nodes():
    return [
        {"id": "p", "kind": "problem", "resolved": None},
        {"id": "q", "kind": "problem", "resolved": None},
        {"id": "s", "kind": "sourced", "status": "open", "resolved": None},
        {"id": "done", "kind": "sourced", "status": "solved", "resolved": 1990},
        {"id": "v", "kind": "variant", "status": "open", "variant_of": "p", "resolved": None},
        {"id": "w", "kind": "variant", "status": "solved", "variant_of": "q", "resolved": None},
        {"id": "t", "kind": "lean", "resolved": None},
    ]


def marked(ledger):
    return {n["id"]: (n["solved"], n["status"], n["resolved"]) for n in atlas.mark_solved(toy_nodes(), ledger)}


@pytest.fixture(scope="module")
def ledger():
    return json.load(open(claims.LEDGERS / "openai-math-2026-10.json"))


@pytest.fixture(scope="module")
def nodes():
    return atlas.full_nodes(atlas.load_problems(), atlas.load_bucketmath())


def test_a_claim_of_the_full_problem_marks_the_row_claimed_and_unsolved():
    out = marked([entry("p"), entry("s"), entry("v")])
    assert out["p"] == (False, "claimed", None)
    assert out["s"] == (False, "claimed", None)
    assert out["v"] == (False, "claimed", None)
    assert out["q"] == (False, "open", None)


def test_special_case_related_and_unestablished_entries_leave_the_status_alone():
    out = marked([entry("p", "special_case"), entry("q", "related"), entry("s", "unestablished")])
    assert out["p"][1] == out["q"][1] == out["s"][1] == "open"


def test_a_solved_row_and_a_lean_theorem_ignore_claims():
    out = marked([entry("done"), entry("t"), entry("w")])
    assert out["done"] == (True, "solved", 1990)
    assert out["t"] == (False, "open", None)
    assert out["w"] == (False, "partial", None)


def test_a_withdrawn_claim_returns_the_row_to_open():
    out = marked([entry("p", withdrawn={"date": "2026-10-07", "url": "https://example.org/history"})])
    assert out["p"] == (False, "open", None)


def test_a_recorded_confirmation_is_the_only_path_from_claimed_to_solved():
    confirmed = entry("p", confirmation={"by": "A. Referee", "kind": "refereed_venue", "url": "https://example.org/paper", "date": "2027-03-01"})
    out = marked([confirmed, entry("v")])
    assert out["p"] == (True, "solved", 2027)
    assert out["v"] == (False, "claimed", None)
    both = marked([confirmed, entry("v", confirmation={"by": "B. Expert", "kind": "named_expert", "url": "https://example.org/note", "date": "2027-04-01"})])
    assert both["v"] == (True, "solved", 2027)


def test_the_validator_names_each_fault():
    good = {"schema": claims.SCHEMA, "batch": "t", "source": {"url": "u", "commit": "c", "licence": "l", "retrieved": "r", "claimant": "c", "date": "d", "review": "r"}, "claims": [{k: v for k, v in entry("p").items() if k != "batch"}]}
    assert claims.errors(good) == []

    def broken(change):
        bad = copy.deepcopy(good)
        change(bad["claims"][0])
        return " ".join(claims.errors(bad))

    assert "match" in broken(lambda e: e.update(match="solved"))
    assert "source_url" in broken(lambda e: e.update(source_url="ftp://x"))
    assert "date" in broken(lambda e: e.update(date="October 6"))
    assert "missing confirmation" in broken(lambda e: e.pop("confirmation"))
    assert "names nobody" in broken(lambda e: e.update(confirmation={"by": " ", "kind": "named_expert", "url": "https://x", "date": "2027-01-01"}))
    assert "confirmation kind" in broken(lambda e: e.update(confirmation={"by": "X", "kind": "press", "url": "https://x", "date": "2027-01-01"}))
    assert "exists disagrees" in broken(lambda e: e["formal"].update(exists=True))
    assert "without statement" in broken(lambda e: e["formal"].update(exists=True, scope="full"))
    assert "without a note" in broken(lambda e: e["formal"].update(exists=True, scope="narrower", statement="s", url="https://x"))
    assert "duplicate" in " ".join(claims.errors({**good, "claims": good["claims"] * 2}))


def test_the_ledger_validates_and_every_entry_names_an_atlas_row_and_a_catalogue_family(ledger):
    assert claims.errors(ledger) == []
    ids = claims_build.atlas_ids()
    families = {r["family"] for r in csv.DictReader(open(claims.LEDGERS / "openai-math-2026-10.families.tsv", encoding="utf8"), delimiter="\t")}
    assert len(families) == ledger["counts"]["families"] == 372
    for e in ledger["claims"]:
        assert e["id"] in ids and e["family"] in families
        assert e["confirmation"] is None and e["withdrawn"] is None
        assert e["source_url"].startswith("https://github.com/openai/math/blob/" + ledger["source"]["commit"])
        assert e["date"] == "2026-10-06"
        assert (e["formal"]["scope"] == "none") == (e["formal"]["url"] is None)


def test_the_ledger_is_the_hand_map_joined_to_the_catalogue(ledger):
    rows = claims_build.hand_map()
    assert [(e["id"], e["family"], e["match"], e["formal"]["scope"]) for e in ledger["claims"]] == [(r["id"], r["family"], r["match"], r["formal_scope"]) for r in rows]
    if (claims_build.CACHE / "CONTENTS.md").exists():
        rebuilt, _ = claims_build.build(offline=True)
        assert rebuilt == ledger


def test_nothing_is_marked_solved_by_the_batch(ledger, nodes):
    by_id = {n["id"]: n for n in nodes}
    claimed = {pid for pid, rule in claims.governing(claims.entries()).items()}
    assert claimed and all(by_id[pid]["status"] == claims.CLAIMED and by_id[pid]["solved"] is False and by_id[pid]["resolved"] is None for pid in claimed)
    assert sum(1 for n in nodes if n["solved"] and n["kind"] != "lean") == BASELINE_SOLVED
    noted = {e["id"] for e in ledger["claims"]} - claimed
    assert noted and all(by_id[pid]["status"] in ("open", "partial") for pid in noted)


def test_the_committed_neighbour_data_carries_the_claimed_status_and_the_same_solved_set(nodes):
    data = json.load(open(NEIGHBORS))
    status = {n["id"]: (n["status"], n["solved"], n["resolved"]) for n in nodes}
    assert all((r["status"], r["solved"], r["resolved"]) == status[r["id"]] for r in data["nodes"])
    assert data["solved"] == [n["id"] for n in nodes if n["solved"]]
    assert data["solved_rule"] == atlas.SOLVED_RULE


def test_a_claimed_row_is_tested_as_open_by_the_forecast_and_never_settled_by_the_scorer():
    data = json.load(open(NEIGHBORS))
    claimed = [n for n in data["nodes"] if n["status"] == claims.CLAIMED]
    assert claimed
    for n in claimed:
        is_solved, _ = forecast.eligible(n, 2026)
        assert is_solved is False
    assert claims.CLAIMED not in scoring.SETTLED
    f = {"cutoff": 2021, "threshold": 0.5, "rows": [{"id": "a", "reach": 0.9, "zone": "inside"}, {"id": "b", "reach": 0.2, "zone": "outside"}]}
    status = {"a": {"status": claims.CLAIMED, "solved": False, "resolved": None}, "b": {"status": "open", "solved": False, "resolved": None}}
    scored = scoring.score_forecast(f, status, permutations=10)
    assert scored["all"]["resolvedInside"] == 0 and scored["auc"] is None


def test_packed_records_code_claimed_rows_as_open_and_keep_their_claims(ledger):
    data = records_all.unpack(json.load(open(PACKED)))
    assert record_schema.row_errors(data) == []
    by_id = {r["id"]: r for r in data["rows"]}
    governed = claims.governing(claims.entries())
    assert {r["id"] for r in data["rows"] if r["status"] == claims.CLAIMED} == set(governed)
    for pid in governed:
        r = by_id[pid]
        assert r["coding"] == "open" and r["zone"] != "solved" and r["resolved"] is None
    assert {r["id"] for r in data["rows"] if r.get("claims")} == {e["id"] for e in ledger["claims"]}
    bad = json.loads(json.dumps(data))
    row = next(r for r in bad["rows"] if r["status"] == claims.CLAIMED)
    row["claims"] = []
    assert any("status disagrees" in e for e in record_schema.row_errors(bad))
    bad = json.loads(json.dumps(data))
    row = next(r for r in bad["rows"] if r["status"] == claims.CLAIMED)
    row["coding"] = "settled"
    assert any("claimed row is coded" in e for e in record_schema.row_errors(bad))


def test_hand_records_carry_their_ledger_entries_and_validate():
    items = claims.entries()
    with_claims = 0
    for path in sorted((HERE / "records").glob("*.json")):
        rec = json.load(open(path))
        assert rec.get("claims", []) == claims.record_claims(rec["id"], items)
        assert record_schema.errors(rec) == []
        with_claims += "claims" in rec
    assert with_claims == 9
    rec = json.load(open(HERE / "records" / "uniquegames.json"))
    assert rec["resolved"] is None and rec["claims"][0]["match"] == "problem" and rec["claims"][0]["confirmation"] is None
    broken = copy.deepcopy(rec)
    broken["claims"][0]["match"] = "solved"
    assert any("match" in e for e in record_schema.errors(broken))


def test_production_cards_carry_compact_claims_and_keep_their_resolved_year():
    deck = json.load(open(claims.CARDS))
    ledger = claims.by_id(claims.entries())
    tagged = {c["id"]: c for c in deck["productions"] if "published_claims" in c}
    assert set(tagged) == {c["id"] for c in deck["productions"] if c["id"] in ledger and c["source_kind"] != "lean"}
    assert tagged["uniquegames"]["resolved"] is None
    assert tagged["uniquegames"]["published_claims"] == [claims.compact(e) for e in ledger["uniquegames"]]
    assert claims.attach({"id": "uniquegames", "source_kind": "lean"}, ledger) == {"id": "uniquegames", "source_kind": "lean"}


def test_the_site_payload_lists_every_ledger_row():
    payload = json.load(open(claims.SITE))
    assert payload == claims.site_payload()
    assert payload["rule"] == claims.STATUS_RULE
    assert sum(len(v) for v in payload["rows"].values()) == len(claims.entries())


def test_the_catalogue_parser_reads_families_papers_and_lean_notes():
    text = "<table>\n<tbody><tr>\n<td>\n\n**007. A title.** Proves $`x\\gt 1`$ for <i>p</i>. ([Lean](lean/docs/007.md))\n\n</td>\n</tr></tbody>\n<tbody><tr>\n<td>\n\n&emsp;[A paper](preprints/A-paper/paper.pdf)\n\nAbstract.\n\n</td>\n</tr></tbody>\n<tbody><tr>\n<td>\n\n**008. Another.** Disproves it.\n\n</td>\n</tr></tbody>"
    fams = claims_build.parse_contents(text)
    assert [(f["family"], f["title"], f["lean_doc"], len(f["papers"])) for f in fams] == [("007", "A title", "lean/docs/007.md", 1), ("008", "Another", None, 0)]
    assert fams[0]["description"] == "Proves x\\gt 1 for p."
    assert claims_build.scope_of("# T\n\n## Scope\n\nThe formalization proves it.\nNothing else.\n\n## Comparator links\n\n| a |\n") == "The formalization proves it. Nothing else."
