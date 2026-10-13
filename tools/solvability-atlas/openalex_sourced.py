import argparse
import csv
import json
import re
import sys
import urllib.parse
from pathlib import Path

import records

HERE = Path(__file__).parent
OUT = HERE / "openalex-sourced.json"
SCHEMA = "bucket.solvability-atlas.openalex-sourced/v1"
YEARS = 30
TOP = 3
MAX_WORDS = 10
GENERIC_NAME = re.compile(r"^(Erdős problem|Green open problem|OEIS|Hilbert's \d+\w* problem|Smale's \d+\w* problem)\b|^[A-Z][a-z]+( [A-Z][a-z]+)*, [a-zA-Z0-9 ]+$")
LATEX = re.compile(r"\$+[^$]*\$+")
MARKDOWN_LINK = re.compile(r"\[([^\]]*)\]\([^)]*\)")
CITATION = re.compile(r"\[[A-Za-z]+\d{2,4}[a-z]?\]|\[[A-Za-z]{1,6}\d*\]")
NON_WORD = re.compile(r"[^A-Za-z0-9À-ɏ' -]+")
CLAUSE_END = re.compile(r"[?!:;]|\.(?=\s|$)")
URL = re.compile(r"https?://\S+")


def clean_text(text):
    text = URL.sub(" ", MARKDOWN_LINK.sub(" ", text))
    text = LATEX.sub(" ", text)
    text = CITATION.sub(" ", text)
    return text.replace("**", " ").replace("\u2013", " ").replace("\u2014", " ")


def clean_words(text):
    return [w for w in NON_WORD.sub(" ", clean_text(text)).split() if len(w.strip("'-")) > 1]


def clauses(statement):
    return [c for c in CLAUSE_END.split(clean_text(statement)) if len(clean_words(c)) >= 3]


def query_for(row):
    name, statement = row["name"], row["statement"]
    words = []
    if GENERIC_NAME.match(name) or len(clean_words(name)) < 2:
        parts = clauses(statement)
        words = clean_words(parts[0]) if parts else []
    if len(words) < 2:
        words = clean_words(name)
    if len(words) < 2:
        words = clean_words(statement)
    return " ".join(words[:MAX_WORDS])


def works_url(q, year_from, year_to):
    params = {"filter": f"title_and_abstract.search:{q}", "sort": "cited_by_count:desc", "per-page": TOP, "select": "id,title,publication_year,cited_by_count"}
    years = {"filter": f"title_and_abstract.search:{q},publication_year:{year_from}-{year_to}", "group_by": "publication_year"}
    return f"{records.OPENALEX}/works?{urllib.parse.urlencode(params)}", f"{records.OPENALEX}/works?{urllib.parse.urlencode(years)}"


def enrich(row, year_to, offline=False):
    q = query_for(row)
    year_from = year_to - YEARS + 1
    u_works, u_years = works_url(q, year_from, year_to)
    e_works = records.fetch(u_works, offline)
    e_years = records.fetch(u_years, offline)
    if e_works["status"] != 200 or e_years["status"] != 200:
        return {"query": q, "works_total": None, "by_year": {}, "top": [], "retrieved": e_works["retrieved"], "status": [e_works["status"], e_years["status"]]}
    works = json.loads(e_works["body"])
    years = json.loads(e_years["body"])
    by_year = {str(y): 0 for y in range(year_from, year_to + 1)}
    for g in years.get("group_by", []):
        if g["key"] in by_year:
            by_year[g["key"]] = int(g["count"])
    top = [{"id": w["id"].rsplit("/", 1)[-1], "title": w.get("title") or "", "year": w.get("publication_year"), "cited_by_count": w.get("cited_by_count", 0)} for w in works.get("results", [])[:TOP]]
    return {"query": q, "works_total": int(works["meta"]["count"]), "by_year": by_year, "top": top, "retrieved": e_works["retrieved"]}


def load_rows():
    return list(csv.DictReader(open(HERE / "problems-sourced.tsv"), delimiter="\t"))


def interleave_by_branch(rows):
    queues = {}
    for r in rows:
        queues.setdefault(r["branch"], []).append(r)
    out = []
    while any(queues.values()):
        for b in sorted(queues):
            if queues[b]:
                out.append(queues[b].pop(0))
    return out


def load_out():
    if OUT.exists():
        return json.load(open(OUT))
    return {"schema": SCHEMA, "source": "https://api.openalex.org/works, title_and_abstract.search on the problem name or the first clause of its statement", "licence": "CC0-1.0", "years": YEARS, "top": TOP, "rows": {}}


def save(data):
    data["count"] = len(data["rows"])
    json.dump(data, open(OUT, "w"), separators=(",", ":"), ensure_ascii=False, sort_keys=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--offline", action="store_true")
    ap.add_argument("--year", type=int, default=int(records.today()[:4]))
    ap.add_argument("--every", type=int, default=100)
    args = ap.parse_args()
    data = load_out()
    rows = interleave_by_branch([r for r in load_rows() if r["id"] not in data["rows"]])
    if args.limit is not None:
        rows = rows[: args.limit]
    done = 0
    try:
        for r in rows:
            data["rows"][r["id"]] = enrich(r, args.year, args.offline)
            done += 1
            if done % args.every == 0:
                save(data)
                print(f"{len(data['rows'])} rows stored", file=sys.stderr)
    except records.BudgetExhausted as e:
        print(str(e), file=sys.stderr)
    finally:
        save(data)
    print(json.dumps({"stored": len(data["rows"]), "added": done, "remaining": len(rows) - done}))


if __name__ == "__main__":
    main()
