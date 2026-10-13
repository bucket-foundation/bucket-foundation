import csv
import json
import re
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import BRANCHES, COLUMNS, OUTPUT, REPO, STATUSES, Row, clean_cell, existing_titles, good_phrase, keywords_from, normal_title, read, slug
from solved_discoveries import MAX_WORDS, MIN_WORDS, QUOTE_WORDS, SOLVED_DIR, form_for, problem_shaped, similar, similar_pairs

DATED_DIR = Path(__file__).resolve().parent / "dated"
DATED_COLUMNS = ["name", "branch", "posed", "resolved", "status", "posed_evidence", "source", "licence", "statement", "statement_source", "status_source", "keywords", "market"]
PROBLEM_MAP = REPO / "_intake" / "solver-gap-engine" / "problem_map.jsonl"
LICENCES = {
    "CC BY-SA 4.0",
    "AAAS copyright; headline under 15 words cited, statement paraphrased",
    "ACS copyright; title cited, statement paraphrased",
    "Library of Congress record, chapter titles cited, statement paraphrased",
    "US public domain",
}
SOURCE_LABELS = {
    "science-2005": "Science 125 questions, 2005",
    "science-2021": "Science and SJTU 125 questions, 2021",
    "darpa": "DARPA prize competitions, 2004 to 2025",
    "xprize": "XPRIZE and Longitude Prize competitions",
    "neuro-23": "23 Problems in Systems Neuroscience, 2006",
    "holy-grails": "Holy Grails in Chemistry, Accounts of Chemical Research, 2017",
}
POSED_FILLS = {
    "fc-millennium-riemannhypothesis-riemannhypothesis": ("1859", "Wikipedia, Riemann hypothesis: proposed by Riemann in 1859"),
    "fc-millennium-riemannhypothesis-generalized-riemann-hypothesis": ("1884", "Wikipedia, Generalized Riemann hypothesis: formulated by Piltz in 1884"),
    "fc-millennium-pvsnp-p-ne-np": ("1971", "Wikipedia, P versus NP problem: introduced by Cook in 1971"),
    "fc-millennium-poincare-poincare-conjecture-smooth-known-cases": ("1904", "Wikipedia, Poincare conjecture: formulated by Poincare in 1904"),
    "fc-millennium-poincare-poincare-conjecture-smooth-dimension-fou": ("1904", "Wikipedia, Poincare conjecture: formulated by Poincare in 1904"),
    "fc-millennium-poincare-poincare-conjecture-smooth-other-cases": ("1904", "Wikipedia, Poincare conjecture: formulated by Poincare in 1904"),
    "fc-millennium-bsd-weak-birch-swinnerton-dyer-conjecture": ("1965", "Wikipedia, Birch and Swinnerton-Dyer conjecture: Birch and Swinnerton-Dyer 1965"),
    "fc-millennium-bsd-weak-birch-swinnerton-dyer-conjecture-rat": ("1965", "Wikipedia, Birch and Swinnerton-Dyer conjecture: Birch and Swinnerton-Dyer 1965"),
    "fc-millennium-navierstokes-navier-stokes-existence-and-smoothne": ("2000", "Clay Mathematics Institute official problem statement, 2000"),
    "fc-millennium-navierstokes-navier-stokes-existence-and-smoothne-2": ("2000", "Clay Mathematics Institute official problem statement, 2000"),
    "fc-millennium-navierstokes-navier-stokes-breakdown-r3": ("2000", "Clay Mathematics Institute official problem statement, 2000"),
    "fc-millennium-navierstokes-navier-stokes-breakdown-periodic": ("2000", "Clay Mathematics Institute official problem statement, 2000"),
    "wp-landau-s-problems": ("1912", "Wikipedia, Landau's problems: listed by Landau at the 1912 International Congress of Mathematicians"),
}
ERDOS_POSED = re.compile(r"\b(asked|conjectured|posed|proposed|problem of|question of|conjecture of|raised)\b[^.\[]{0,60}?\[((?:Er|Erd)[A-Za-z]{0,4})(\d\d)\]", re.I)
NAMED_LIST_PREFIXES = ("hilbert-", "smale-")


def dated_files():
    return sorted(DATED_DIR.glob("*.tsv"))


def curated_rows():
    out = []
    for path in dated_files():
        with path.open(encoding="utf8") as handle:
            reader = csv.DictReader(handle, delimiter="\t")
            assert reader.fieldnames == DATED_COLUMNS, (path, reader.fieldnames)
            for line, record in enumerate(reader, start=2):
                record = {k: (v or "").strip() for k, v in record.items()}
                record["list"] = path.stem
                record["line"] = f"{path.name}:{line}"
                out.append(record)
    return out


def year_ok(text):
    return bool(re.fullmatch(r"\d{4}", text)) and 1600 <= int(text) <= 2026


def check(record):
    problems = []
    for column in ("name", "branch", "posed", "status", "posed_evidence", "source", "licence", "statement", "statement_source", "status_source"):
        if not record[column]:
            problems.append(f"missing {column}")
    if record["branch"] and record["branch"] not in BRANCHES:
        problems.append(f"branch {record['branch']!r}")
    if record["status"] and record["status"] not in STATUSES:
        problems.append(f"status {record['status']!r}")
    if record["posed"] and not year_ok(record["posed"]):
        problems.append(f"posed year {record['posed']!r}")
    if record["resolved"] and not year_ok(record["resolved"]):
        problems.append(f"resolved year {record['resolved']!r}")
    if record["status"] == "solved" and not record["resolved"]:
        problems.append("solved row has no resolved year")
    if record["status"] != "solved" and record["resolved"]:
        problems.append("resolved year on a row that is not solved")
    if record["posed"] and record["resolved"] and int(record["posed"]) > int(record["resolved"]):
        problems.append("posed after resolved")
    if not record["source"].startswith("https://"):
        problems.append("source is not https")
    if record["licence"] not in LICENCES:
        problems.append(f"licence {record['licence']!r} not in the allowed set")
    words = len(record["statement"].split())
    if not MIN_WORDS <= words <= MAX_WORDS:
        problems.append(f"statement has {words} words, band is {MIN_WORDS} to {MAX_WORDS}")
    if record["statement"] and not problem_shaped(record["statement"]):
        problems.append("statement is not a question or an imperative problem")
    if "\u2013" in record["statement"] or "\u2014" in record["statement"]:
        problems.append("dash in statement")
    if record["licence"].startswith(("AAAS", "ACS")) and len(record["name"].split()) >= 15:
        problems.append("copyrighted headline must stay under 15 words")
    for quote in re.findall(r'"([^"]+)"', record["status_source"] + " " + record["posed_evidence"]):
        if len(quote.split()) > QUOTE_WORDS:
            problems.append(f"quote longer than {QUOTE_WORDS} words")
    if len(record["name"]) > 140 or re.search(r"[,;:(\-]$", record["name"]):
        problems.append("name too long or ends at a bad boundary")
    if len([k for k in record["keywords"].split(";") if k.strip()]) > 8:
        problems.append("more than eight keywords")
    return problems


def rows():
    out = []
    for record in curated_rows():
        problems = check(record)
        assert not problems, (record["line"], problems)
        keywords = [k.strip() for k in record["keywords"].split(";") if k.strip()]
        out.append(
            Row(
                id=f"dl-{record['list']}-" + slug(record["name"], limit=50),
                name=record["name"],
                branch=record["branch"],
                form=form_for(record["statement"]),
                status=record["status"],
                source=record["source"],
                licence=record["licence"],
                keywords=keywords_from(record["statement"], keywords, name=record["name"]) or [k for k in keywords if good_phrase(k)][:8],
                posed=record["posed"],
                resolved=record["resolved"],
                market=record["market"],
                statement=record["statement"],
                statement_source=record["statement_source"],
                status_source=record["status_source"],
                posed_evidence=record["posed_evidence"],
            )
        )
    return out


def erdos_fills(path=PROBLEM_MAP):
    fills = {}
    if not path.exists():
        return fills
    with path.open(encoding="utf8") as handle:
        for line in handle:
            item = json.loads(line)
            if "ErdosProblems" not in item["id"] or ".variants" in item["id"] or ".parts" in item["id"]:
                continue
            match = ERDOS_POSED.search(item["text"])
            if not match:
                continue
            two = int(match.group(3))
            year = str(1900 + two if two > 26 else 2000 + two)
            key = f"[{match.group(2)}{match.group(3)}]"
            fills[clean_cell(item["text"])] = (year, f"formal-conjectures text: {match.group(1)} with reference {key}")
    return fills


def solved_evidence():
    out = {}
    for path in sorted(SOLVED_DIR.glob("*.tsv")):
        with path.open(encoding="utf8") as handle:
            for record in csv.DictReader(handle, delimiter="\t"):
                if record["resolved_kind"] == "posed" and record["posed_evidence"]:
                    out["sd-" + slug(record["name"])] = record["posed_evidence"].strip()
    return out


def fill_posed(records):
    by_statement = erdos_fills()
    evidence = solved_evidence()
    filled = Counter()
    for record in records:
        record.setdefault("posed_evidence", "")
        if record["id"].startswith("sd-") and not record["posed_evidence"]:
            base = record["id"].rsplit("-", 1)[0] if re.search(r"-\d+$", record["id"]) else record["id"]
            record["posed_evidence"] = evidence.get(record["id"]) or evidence.get(base, "")
        if record["id"] in POSED_FILLS and not record["posed"]:
            record["posed"], record["posed_evidence"] = POSED_FILLS[record["id"]]
            filled["millennium-landau"] += 1
        elif record["id"].startswith("fc-erdosproblems") and not record["posed"] and clean_cell(record["statement"]) in by_statement:
            record["posed"], record["posed_evidence"] = by_statement[clean_cell(record["statement"])]
            filled["erdos"] += 1
        elif record["id"].startswith(NAMED_LIST_PREFIXES) and record["posed"] and not record["posed_evidence"]:
            record["posed_evidence"] = "Wikipedia table: the list was published in " + record["posed"]
            filled["hilbert-smale-evidence"] += 1
    return filled


def duplicates(fresh, current):
    seen = {normal_title(r["name"]): r["id"] for r in current}
    seen.update(existing_titles())
    by_title = [(row.id, seen[normal_title(row.name)]) for row in fresh if normal_title(row.name) in seen]
    fresh_records = [row.record() for row in fresh]
    by_statement = similar_pairs(fresh_records, fresh_records + current)
    return by_title, by_statement


def apply(path=OUTPUT):
    current = read(path)
    filled = fill_posed(current)
    fresh = rows()
    by_title, by_statement = duplicates(fresh, current)
    by_id = {r["id"]: r for r in current}
    fresh_by_id = {row.id: row for row in fresh}
    dropped = {}
    for fresh_id, existing_id in by_title + [(a, b) for a, b in by_statement if not b.startswith("dl-")]:
        dropped[fresh_id] = existing_id
        existing = by_id.get(existing_id)
        if existing and not existing["posed"]:
            existing["posed"] = fresh_by_id[fresh_id].posed
            existing["posed_evidence"] = fresh_by_id[fresh_id].posed_evidence
            filled["dated-list-match"] += 1
    kept = [row for row in fresh if row.id not in dropped and row.id not in by_id]
    records = current + [row.record() for row in kept]
    with path.open("w", encoding="utf8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS, delimiter="\t", lineterminator="\n")
        writer.writeheader()
        for record in records:
            writer.writerow({column: record.get(column, "") for column in COLUMNS})
    return kept, dropped, filled, by_statement


def counts(records=None):
    records = read() if records is None else records
    table = {}
    for record in records:
        for name in SOURCE_LABELS:
            if record["id"].startswith(f"dl-{name}-"):
                table.setdefault(name, Counter())[record["status"]] += 1
    return table


def main(argv):
    if "--apply" in argv:
        kept, dropped, filled, pairs = apply()
        print(f"appended {len(kept)} rows, dropped {len(dropped)} duplicates, filled {dict(filled)}")
        for fresh_id, existing_id in dropped.items():
            print("duplicate:", fresh_id, "->", existing_id)
        for name, table in sorted(counts().items()):
            print(name, dict(table), "total", sum(table.values()))
        return 0
    curated = curated_rows()
    bad = [(r["line"], check(r)) for r in curated if check(r)]
    for line, problems in bad:
        print(line, problems)
    table = {}
    for record in curated:
        table.setdefault(record["list"], Counter())[record["status"]] += 1
    for name in sorted(table):
        print(name, dict(table[name]), "total", sum(table[name].values()))
    fresh = rows()
    current = read()
    by_title, by_statement = duplicates(fresh, current)
    for pair in by_title:
        print("title duplicate:", *pair)
    for pair in by_statement:
        print("statement duplicate:", *pair)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
