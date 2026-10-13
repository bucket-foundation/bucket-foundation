import csv
import re
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
LIB = HERE.parent.parent / "src" / "lib" / "research-os"

UNCITED = {
    "navier", "hodge", "poincare", "langlands", "ramsey", "unitdist", "graphiso", "matmul", "factoring", "jacobian",
    "freeenergy", "llmreason", "autoform", "optimalstop", "nash", "mechdesign", "blackscholes", "zkp",
}


def tsv(name):
    return list(csv.DictReader(open(HERE / name), delimiter="\t"))


def cited():
    return {r["id"]: r for r in tsv("formal_sources.tsv")}


def test_every_cited_id_is_an_atlas_problem_with_a_formal_status():
    lean = {r["id"]: r["lean"] for r in tsv("problems.tsv")}
    for pid, row in cited().items():
        assert lean.get(pid, "none") != "none", pid
        assert row["source"] and row["url"].startswith("https://"), pid


def test_uncited_formal_statuses_are_the_named_open_set():
    src = cited()
    uncited = {r["id"] for r in tsv("problems.tsv") if r["lean"] != "none" and r["id"] not in src}
    assert uncited == UNCITED


def test_records_carry_the_cited_source():
    src = cited()
    for r in tsv("problems.tsv"):
        rec = json.load(open(HERE / "records" / f"{r['id']}.json"))
        row = src.get(r["id"]) if r["lean"] != "none" else None
        assert rec["formal"] == {"status": r["lean"], "source": row and row["source"], "url": row and row["url"]}, r["id"]


def test_site_cards_carry_the_cited_source():
    src = cited()
    cards = {c["id"]: c for c in json.load(open(LIB / "solvability-atlas-data.json"))["productions"]}
    for r in tsv("problems.tsv"):
        row = src.get(r["id"]) if r["lean"] != "none" else None
        assert cards[r["id"]]["formal_source"] == (row and {"label": row["source"], "url": row["url"]}), r["id"]


def test_packed_records_carry_the_cited_source():
    src = cited()
    rows = {r["id"]: r for r in json.load(open(LIB / "solvability-records-data.json"))["rows"] if "h" in r}
    for r in tsv("problems.tsv"):
        row = src.get(r["id"]) if r["lean"] != "none" else None
        assert rows[r["id"]]["h"]["formal"]["source"] == (row and row["source"]), r["id"]
        assert rows[r["id"]]["h"]["formal"]["url"] == (row and row["url"]), r["id"]


def test_formal_conjectures_citations_name_a_file_at_a_pinned_commit():
    prefix = "https://github.com/google-deepmind/formal-conjectures"
    pinned = re.compile(re.escape(prefix) + r"/blob/[0-9a-f]{40}/FormalConjectures/(\w+/\w+\.lean)$")
    for pid, row in cited().items():
        if not row["url"].startswith(prefix):
            continue
        m = pinned.match(row["url"])
        assert m, pid
        assert row["source"].split(", ")[1] == m.group(1), pid
