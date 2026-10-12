from __future__ import annotations

import io
import json
import os
import re
import sqlite3
import stat
from collections import Counter
from pathlib import Path

import pytest

from advisor_engine import cli, coverage, paths, query, reveal, scan, write_review
from advisor_engine.identity import SuppressionUnreadable, suppressed_clusters
from advisor_engine.paths import EngineError, current_build, engine_key, open_engine

from .conftest import TOPICS

TOOL = Path(__file__).resolve().parents[1]
RANK_WORDS = re.compile(r"\brank|percentile|\bscore|was tested|tested on", re.I)
NUMBERED = re.compile(r"^\s*\d+[.)]\s", re.M)


def run(*argv: str) -> tuple[int, str]:
    out = io.StringIO()
    code = cli.main(list(argv), out=out)
    return code, out.getvalue()


def engine(world) -> sqlite3.Connection:
    return open_engine(current_build(world.home))


def result(world, **kw) -> query.Result:
    store, eng = world.ro(), engine(world)
    return query.run(query.Query(**kw), store, eng, world.home, current_build(world.home))


def handles(r: query.Result) -> set[int]:
    return {int(row["handle"][1:]) for row in r.rows}


def dnc(world, **cols) -> None:
    con = world.store()
    names = ", ".join(cols)
    con.execute(f"insert into do_not_contact ({names}, requested_at) values ({', '.join('?' * len(cols))}, '2026-10-12')", list(cols.values()))
    con.commit()
    con.close()


def wide_open(world) -> query.Result:
    return result(world, field="Field One", topics=["T1", "T2", "T3"], include=["XA"], limit=300)


def test_pool_rule_matches_the_plan_sql(world):
    con = world.ro()
    con.executescript("""
        create temp table pool as
        with a as (select advisor_id id from advisor_link group by 1)
        select a.id aid,
          case when p.openalex_id is not null then 'own' else coalesce(m.confidence,'none') end tier,
          case when p.openalex_id is not null then p.id when q.openalex_id is not null then q.id end rid
        from a join person p on p.id=a.id
        left join person_match m on m.person_id=a.id
        left join person q on q.id=m.match_id;
    """)
    records, people = con.execute("select count(*), count(distinct rid) from pool where tier in ('own','high') and rid is not null").fetchone()
    totals = coverage.load(current_build(world.home), world.home)["totals"]
    assert totals["pool_records"] == records - 1
    assert totals["pool_people"] == people - 1
    assert totals["barred_source"] == 1
    assert totals["name_only"] == 1


def test_medium_and_low_matches_stay_out_of_features(world):
    eng = engine(world)
    rids = {r[0] for r in eng.execute("select rid from advisor")}
    assert world.ids["high_target"] in rids
    assert world.ids["medium_target"] not in rids
    assert world.ids["low_target"] not in rids
    assert eng.execute("select count(*) from advisor where tier not in ('own', 'high')").fetchone()[0] == 0
    assert eng.execute("select count(*) from aid where tier not in ('own', 'high')").fetchone()[0] == 0
    assert eng.execute("select count(*) from aid where aid in (?, ?)", (world.ids["medium"], world.ids["low"])).fetchone()[0] == 0


def test_medium_and_low_matches_stay_out_of_output(world):
    r = wide_open(world)
    shown = handles(r)
    assert world.ids["high_target"] in shown
    for tag in ("medium", "medium_target", "low", "low_target", "nameonly", "barred"):
        assert world.ids[tag] not in shown
    names = {row["name"] for row in r.rows}
    assert world.names[world.ids["medium_target"]] not in names


def test_recency_and_emeritus_gates(world):
    shown = handles(wide_open(world))
    for tag in ("old", "noyear", "emeritus"):
        assert world.ids[tag] not in shown
    totals = coverage.load(current_build(world.home), world.home)["totals"]
    assert totals["failed_recency"] == 1
    assert totals["no_year"] == 1


def test_build_reads_the_store_read_only(world):
    before = world.store_path.read_bytes()
    run("build")
    assert world.store_path.read_bytes() == before
    with pytest.raises(sqlite3.OperationalError):
        paths.open_store().execute("insert into do_not_contact (requested_at) values ('x')")


@pytest.mark.parametrize("seed, hidden", [
    ("high", "high_target"),
    ("high_target", "high_target"),
    ("medium", "medium_target"),
    ("twin_other", "twin"),
])
def test_do_not_contact_person_hides_the_whole_cluster(world, seed, hidden):
    target = "high_target" if hidden == "medium_target" else hidden
    if hidden == "medium_target":
        con = world.store()
        con.execute("update person_match set match_id = ? where person_id = ?", (world.ids["high_target"], world.ids["medium"]))
        con.commit()
        con.close()
        run("build")
    assert world.ids[target] in handles(wide_open(world))
    dnc(world, person_id=world.ids[seed])
    assert world.ids[target] not in handles(wide_open(world))


def test_do_not_contact_by_shared_orcid_merged_alias_email_and_name(world):
    before = handles(wide_open(world))
    tags = ("twin", "merged", "mailed", "xid", "named")
    assert all(world.ids[t] in before for t in tags)
    dnc(world, orcid="https://orcid.org/0000-0000-0000-0011")
    dnc(world, openalex_id="A999999999999")
    dnc(world, email_norm="mailed.person@example.org")
    dnc(world, email_norm="xid.person@example.org")
    dnc(world, name="Wilhelmina  ODDFELLOW Kite")
    assert world.store().execute("select count(*) from contact where value_norm = 'mailed.person@example.org'").fetchone()[0] == 0
    after = handles(wide_open(world))
    assert all(world.ids[t] not in after for t in tags)
    assert len(before) - len(after) == len(tags)


def test_removal_list_hides_across_the_cluster(world):
    (world.home / "removal-list.txt").write_text(f"person:{world.ids['high']}\nname:Wilhelmina Oddfellow-Kite\n")
    after = handles(wide_open(world))
    assert world.ids["high_target"] not in after
    assert world.ids["named"] not in after


def test_suppression_is_read_fresh_without_a_rebuild(world):
    key = engine_key(world.home)
    assert suppressed_clusters(world.ro(), engine(world), world.home, key) == set()
    dnc(world, person_id=world.ids["twin_other"])
    assert len(suppressed_clusters(world.ro(), engine(world), world.home, key)) == 1


def test_unreadable_do_not_list_fails_closed(world, capsys):
    con = world.store()
    con.execute("drop table do_not_contact")
    con.commit()
    con.close()
    with pytest.raises(SuppressionUnreadable):
        wide_open(world)
    code, out = run("query", "--field", "Field One")
    assert code == 2
    assert out == ""
    code, out = run("reveal", f"a{world.ids['reveal_high']}", "--show-address")
    assert code == 2
    assert out == ""


def test_unreadable_removal_list_fails_closed(world):
    (world.home / "removal-list.txt").write_text("someone we should hide\n")
    code, out = run("query", "--field", "Field One")
    assert (code, out) == (2, "")


def test_untested_order_has_no_rank_percentile_or_testing_claim(world):
    code, out = run("query", "--field", "Field One", "--country", "XA", "--text", "tidal lattice dynamics and cavity resonance imaging")
    assert code == 0
    assert out.startswith("Untested order\n")
    assert "The order has not been tested." in out
    assert not RANK_WORDS.search(out)
    assert not NUMBERED.search(out)
    assert "Shares the topic Tidal Lattice Dynamics." in out
    assert "Whether this person takes students this year." in out
    r = result(world, field="Field One", include=["XA"], text="tidal lattice dynamics")
    assert r.mode == "untested"
    assert all(row["percentile"] is None and row["score"] == 0.0 and row["order_status"] == "untested" for row in r.rows)


def test_untested_order_sorts_by_topical_overlap(world):
    r = result(world, field="Field One", include=["XA"], topics=["Membrane Folding Kinetics"], limit=300)
    flags = [bool(row["shared_terms"]) for row in r.rows]
    assert any(flags) and not all(flags)
    assert flags == sorted(flags, reverse=True)


def test_taxonomy_adds_the_subfield_level_and_description_words(world, monkeypatch):
    subs = {"T1": "Sub Alpha", "T2": "Sub Alpha", "T3": "Sub Beta", "T4": "Sub Beta", "T5": "Sub Gamma", "T6": "Sub Gamma", "T7": "Sub Delta", "T8": "Sub Delta"}
    words = {"T1": "estuary oscillation moon cycles", "T4": "lipid bilayer bending"}
    rows = [{"id": t, "name": n, "field": f, "domain": "Domain X", "text": f"{n}. An invented description. {words.get(t, 'placeholder words')}. {subs[t]}. {f}. Domain X"} for t, (n, f) in TOPICS.items()]
    path = world.root / "taxonomy.json"
    path.write_text(json.dumps(rows))
    monkeypatch.setenv("BKT_TOPIC_TAXONOMY", str(path))
    assert run("build")[0] == 0
    r = result(world, field="Field One", include=["XA"], text="estuary oscillation", limit=300)
    assert r.lines[0] == "Query topics: Tidal Lattice Dynamics."
    kinds = ["topic" if row["shared_terms"] else "subfield" if "Works in the subfield Sub Alpha." in row["reasons"] else "field" for row in r.rows]
    assert set(kinds) == {"topic", "subfield", "field"}
    assert kinds == sorted(kinds, key=["topic", "subfield", "field"].index)
    assert all(row["reasons"] == ["Works in Field One."] for row, k in zip(r.rows, kinds) if k == "field")
    assert not RANK_WORDS.search(query.render(r))


def test_withheld_under_the_floor_shows_count_and_reason_in_name_order(world):
    code, out = run("query", "--field", "Field One", "--country", "XC")
    assert code == 0
    assert out.startswith("Order withheld\n")
    assert "Bucket holds 12 candidates for this search, too few to order." in out
    assert "This list misses most advisors in XC. Treat it as a few leads and search by other means." in out
    assert not RANK_WORDS.search(out)
    assert not NUMBERED.search(out)
    r = result(world, field="Field One", include=["XC"], topics=["T1"])
    assert r.mode == "withheld" and r.candidates == 12 and len(r.rows) == 12
    names = [paths.norm_name(row["name"]) for row in r.rows]
    assert names == sorted(names)


def test_floor_is_fifty_candidates():
    cov = {"tests": {}}
    assert coverage.mode_for(cov, 49, ["XA"], "Field One") == "withheld"
    assert coverage.mode_for(cov, 50, ["XA"], "Field One") == "untested"


def test_share_left_out_warning_and_denominator(world):
    r = result(world, field="Field One", include=["XB"], topics=["T1"])
    assert r.mode == "untested"
    assert "60 of them are in XB. 90 more people in XB are held with an unreviewed identity match and are left out, which is 60.0%" in r.summary
    assert "Most advisors Bucket can identify in XB are missing from this list." in r.warnings
    assert "This list misses most advisors in XB. Treat it as a few leads and search by other means." in r.warnings
    cov = coverage.load(current_build(world.home), world.home)
    assert f"Bucket holds {cov['totals']['advisors']:,} recorded advisors. {cov['totals']['name_only']:,} are known by name alone" in r.summary
    assert cov["pair"]["XB|Field One"] == {"pool": 60, "medium": 90}


def test_large_stratum_has_no_warning(world):
    r = wide_open(world)
    assert r.mode == "untested"
    assert r.warnings == []
    assert "For Field One in XA it draws on" in r.summary


def cell(pool: int, medium: int) -> dict:
    return {
        "build_id": "b", "totals": {"advisors": 1000, "name_only": 400, "pool": 500},
        "country": {"XA": {"pool": pool, "medium": medium}}, "field": {"Field One": {"pool": 400, "medium": 0}},
        "pair": {"XA|Field One": {"pool": pool, "medium": medium}}, "tests": {},
    }


@pytest.mark.parametrize("pool, medium, most, few", [
    (200, 200, False, False),
    (200, 201, True, False),
    (100, 0, False, False),
    (99, 0, False, True),
    (99, 100, True, True),
])
def test_warning_thresholds(pool, medium, most, few):
    st = coverage.statement(cell(pool, medium), 60, ["XA"], "Field One", Counter(), Counter())
    assert any(w.startswith("Most advisors") for w in st.warnings) is most
    assert any(w.startswith("This list misses most advisors in XA") for w in st.warnings) is few


def test_small_field_warns_and_no_country_gives_the_mix(world):
    cov = cell(200, 0)
    cov["field"]["Field One"]["pool"] = 99
    st = coverage.statement(cov, 60, [], "Field One", Counter({"XA": 3, "XB": 1}), Counter({"XA": 1}))
    assert "This list misses most advisors in Field One. Treat it as a few leads and search by other means." in st.warnings
    assert "Country mix of the candidates: XA 75%, XB 25%. Country mix of the first rows: XA 100%." in st.summary


def test_rank_and_percentile_appear_only_after_a_passed_test(world):
    (world.home / coverage.TESTS_FILE).write_text(json.dumps({"XA|Field One": {"passed": False, "pairs": 400}}))
    assert wide_open(world).mode == "untested"
    (world.home / coverage.TESTS_FILE).write_text(json.dumps({"XA|Field One": {"passed": True, "pairs": 150}}))
    assert wide_open(world).mode == "untested"
    (world.home / coverage.TESTS_FILE).write_text(json.dumps({"XA|Field One": {"passed": True, "pairs": 250}}))
    r = wide_open(world)
    assert r.mode == "tested"
    assert r.rows[0]["percentile"] == 100.0 and r.rows[0]["score"] > 0
    code, out = run("query", "--field", "Field One", "--country", "XA", "--topic", "T1")
    assert out.startswith("Tested ranking\n") and "1. " in out and "Percentile" in out
    assert "was tested on 250 recorded pairs" in out
    other = result(world, field="Field One", include=["XB"], topics=["T1"])
    assert other.mode == "untested"
    assert "The order has not been tested for Field One in XB. It was tested in XA, Field One." in other.summary
    assert result(world, field="Field One", topics=["T1"]).mode == "untested"


def test_query_never_prints_an_address(world):
    code, out = run("query", "--field", "Field One", "--country", "XA", "--limit", "300")
    assert code == 0
    assert "@" not in out
    assert "example.org" not in out
    parser = cli.parser()
    with pytest.raises(SystemExit):
        parser.parse_args(["query", "--field", "Field One", "--show-address"])


def test_address_scan_aborts_the_output(world):
    con = world.store()
    con.execute("update person set institution = 'write to someone [at] example [dot] org' where id = ?", (world.ids["named"],))
    con.commit()
    con.close()
    code, out = run("query", "--field", "Field One", "--country", "XA", "--limit", "300", "--review")
    assert (code, out) == (2, "")
    assert not (world.home / "out").exists()
    assert scan.has_address("a.b at example dot org") and not scan.has_address("works at the institute")


def test_reveal_needs_the_flag_and_one_advisor(world, capsys):
    handle = f"a{world.ids['reveal_high']}"
    code, out = run("reveal", handle)
    assert (code, out) == (2, "")
    with pytest.raises(SystemExit):
        cli.parser().parse_args(["reveal", handle, f"a{world.ids['mailed']}", "--show-address"])
    code, out = run("reveal", f"{handle},a{world.ids['mailed']}", "--show-address")
    assert (code, out) == (2, "")


def test_reveal_prints_one_high_address_with_source_and_logs_it(world):
    rid = world.ids["reveal_high"]
    code, out = run("reveal", f"a{rid}", "--show-address")
    assert code == 0
    assert "Address: newer.address@example.org" in out
    assert "Source: synthetic, https://directory.example.org/people" in out
    assert "older.address" not in out and "guess.address" not in out
    assert out.count("@") == 1
    log = world.home / reveal.LOG
    assert stat.S_IMODE(log.stat().st_mode) == 0o600
    text = log.read_text()
    entry = json.loads(text.splitlines()[-1])
    assert set(entry) == {"at", "who", "outcome"} and entry["outcome"] == "revealed"
    assert "@" not in text and str(rid) not in entry["who"] and world.names[rid] not in text
    assert entry["who"] == paths.keyed(engine_key(world.home), "reveal", str(rid))


def test_reveal_through_a_high_match_reads_the_advisor_record(world):
    code, out = run("reveal", f"a{world.ids['high_target']}", "--show-address")
    assert code == 0 and "Address: high.aid@example.org" in out and "Identity match: high." in out


@pytest.mark.parametrize("tag, outcome", [
    ("reveal_medium", "refused_no_high_contact"),
    ("reveal_unsourced", "refused_no_high_contact"),
    ("medium_target", "refused_identity"),
    ("low_target", "refused_identity"),
    ("medium", "refused_identity"),
])
def test_reveal_refuses_below_high(world, tag, outcome):
    code, out = run("reveal", f"a{world.ids[tag]}", "--show-address")
    assert (code, out) == (2, "")
    assert json.loads((world.home / reveal.LOG).read_text().splitlines()[-1])["outcome"] == outcome


def test_reveal_refuses_a_suppressed_person_and_a_spent_cap(world):
    rid = world.ids["reveal_high"]
    for _ in range(reveal.DAILY_CAP):
        assert run("reveal", f"a{rid}", "--show-address")[0] == 0
    assert run("reveal", f"a{rid}", "--show-address") == (2, "")
    (world.home / reveal.LOG).unlink()
    (world.home / "removal-list.txt").write_text(f"person:{rid}\n")
    assert run("reveal", f"a{rid}", "--show-address") == (2, "")
    assert json.loads((world.home / reveal.LOG).read_text().splitlines()[-1])["outcome"] == "refused_suppressed"


def test_contact_confidence_classes():
    assert reveal.contact_confidence("orcid_public_record", "https://x.example") == "high"
    assert reveal.contact_confidence("pubmed_affiliation_name_institution", "https://x.example") == "medium"
    assert reveal.contact_confidence("founder_tracker_no_public_source", "https://x.example") == "unsourced"
    assert reveal.contact_confidence("pattern_guess_unverified", "https://x.example") == "unsourced"
    assert reveal.contact_confidence("orcid_public_record", "") == "unsourced"


def test_review_file_shape_and_location(world):
    r = wide_open(world)
    path = write_review.save(world.home, r)
    assert path.parent == world.home / "out" and stat.S_IMODE(path.stat().st_mode) == 0o600
    body = json.loads(path.read_text())
    assert body["schema"] == "bucket.advisor-review/1"
    assert "The order has not been tested." in body["context"]["summary"]
    row = body["rows"][0]
    assert row["percentile"] is None and row["score"] == 0.0 and row["order_status"] == "untested"
    for k in ("reasons", "lineage", "unknowns", "coverage"):
        assert isinstance(row[k], list) and row[k] and len(row[k]) <= 32
    assert not any(re.search(r"email|tracker|image|^id$|statement|note|h_index|works_count", k) for k in row)
    assert row["profile_url"].startswith("https://openalex.org/A")


def tree(root: Path) -> set[str]:
    return {str(p.relative_to(root)) for p in root.rglob("*") if "__pycache__" not in p.parts and ".pytest_cache" not in p.parts}


def test_no_command_writes_into_the_repo_tree(world, tmp_path, monkeypatch):
    before = tree(TOOL)
    monkeypatch.chdir(TOOL)
    assert run("build")[0] == 0
    assert run("query", "--field", "Field One", "--country", "XA", "--review")[0] == 0
    assert run("reveal", f"a{world.ids['reveal_high']}", "--show-address")[0] == 0
    assert run("status")[0] == 0
    assert tree(TOOL) == before
    assert len(list((world.home / "builds").iterdir())) == 2
    assert stat.S_IMODE(world.home.stat().st_mode) == 0o700


def test_output_paths_are_confined_to_the_engine_directory(world, tmp_path, monkeypatch):
    r = wide_open(world)
    with pytest.raises(EngineError):
        write_review.save(world.home, r, TOOL / "review.json")
    with pytest.raises(EngineError):
        write_review.save(world.home, r, tmp_path / "elsewhere.json")
    with pytest.raises(EngineError):
        write_review.save(world.home, r, world.home / ".." / "escape.json")
    assert not (TOOL / "review.json").exists()
    (world.home / "nested" / ".git").mkdir(parents=True)
    with pytest.raises(EngineError):
        write_review.save(world.home, r, world.home / "nested" / "review.json")
    assert not (world.home / "nested" / "review.json").exists()
    repo = tmp_path / "repo"
    (repo / ".git").mkdir(parents=True)
    monkeypatch.setenv("ADVISOR_ENGINE_HOME", str(repo / "data"))
    assert run("build") == (2, "")
    assert not (repo / "data").exists()
    monkeypatch.setenv("ADVISOR_ENGINE_HOME", str(TOOL / "data"))
    assert run("build") == (2, "")
    assert not (TOOL / "data").exists()


def test_only_the_paths_module_and_the_build_write_files():
    writers = re.compile(r"\.write_text\(|\.write_bytes\(|os\.open\(|open\([^)]*['\"][wa]b?['\"]|sqlite3\.connect\(")
    hits = {p.name for p in (TOOL / "advisor_engine").glob("*.py") if writers.search(p.read_text())}
    assert hits == {"paths.py", "build.py"}
    assert "mode=ro" in (TOOL / "advisor_engine" / "paths.py").read_text()


def test_engine_database_holds_no_name_or_address(world):
    eng = engine(world)
    dump = "\n".join(str(r) for t in ("advisor", "aid", "member", "alias", "identity_edge", "meta") for r in eng.execute(f"select * from {t}"))
    assert "@" not in dump
    for pid in (world.ids["named"], world.ids["mailed"], world.ids["high_target"]):
        assert world.names[pid] not in dump
    assert "0000-0000-0000-0011" not in dump
    cov = (current_build(world.home) / "coverage.json").read_text()
    assert "@" not in cov and world.names[world.ids["named"]] not in cov


def test_free_space_floor_and_missing_inputs(world, monkeypatch):
    monkeypatch.setenv("ADVISOR_ENGINE_MIN_FREE_GB", "100000000")
    assert run("query", "--field", "Field One") == (2, "")
    monkeypatch.setenv("ADVISOR_ENGINE_MIN_FREE_GB", "0")
    assert run("query") == (2, "")
    assert run("query", "--field", "No Such Field") == (2, "")
    builds = sorted(p.name for p in (world.home / "builds").iterdir())
    monkeypatch.delenv("BKT_AUTHORS_WIDE")
    assert run("build")[0] == 2
    monkeypatch.setenv("BKT_AUTHORS_WIDE", str(world.root / "empty"))
    (world.root / "empty").mkdir()
    assert run("build")[0] == 2
    assert sorted(p.name for p in (world.home / "builds").iterdir()) == builds
    monkeypatch.delenv("BKT_CONTACT_STORE")
    assert run("query", "--field", "Field One") == (2, "")
