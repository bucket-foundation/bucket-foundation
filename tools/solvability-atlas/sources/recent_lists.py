import csv
import hashlib
import json
import re
import sys
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import BRANCHES, OUTPUT, STATUSES, Row, good_phrase, keywords_from, normal_title, read, slug
from common import USER_AGENT
from solved_discoveries import MAX_WORDS, MIN_WORDS, QUOTE_WORDS, form_for, problem_shaped

RECENT_DIR = Path(__file__).resolve().parent / "recent"
FILL_COLUMNS = ["id", "status", "posed", "resolved", "posed_evidence", "evidence_source", "status_source"]
NEW_COLUMNS = ["name", "branch", "status", "posed", "resolved", "posed_evidence", "source", "licence", "statement", "status_source", "keywords", "market"]
FIRST_YEAR = 2015
LAST_YEAR = 2026


def load(name, columns):
    path = RECENT_DIR / name
    out = []
    with path.open(encoding="utf8") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        assert reader.fieldnames == columns, (path, reader.fieldnames)
        for line, record in enumerate(reader, start=2):
            record = {k: (v or "").strip() for k, v in record.items()}
            record["line"] = f"{name}:{line}"
            out.append(record)
    return out


def fills():
    return load("fills.tsv", FILL_COLUMNS)


def new_records():
    return load("new.tsv", NEW_COLUMNS)


def quote_of(text):
    match = re.search(r'"([^"]+)"\s*$', text)
    return match.group(1) if match else ""


def check_years(record, resolved_required):
    problems = []
    if not (re.fullmatch(r"\d{4}", record["posed"]) and 1500 <= int(record["posed"]) <= LAST_YEAR):
        problems.append(f"posed year {record['posed']!r}")
    if record["resolved"]:
        if not (re.fullmatch(r"\d{4}", record["resolved"]) and FIRST_YEAR <= int(record["resolved"]) <= LAST_YEAR):
            problems.append(f"resolved year {record['resolved']!r}")
        elif record["posed"].isdigit() and int(record["posed"]) > int(record["resolved"]):
            problems.append("posed after resolved")
    if resolved_required and not record["resolved"]:
        problems.append("settled row has no resolved year")
    if record["posed"] and record["posed"] not in record["posed_evidence"] and not re.search(r"\d{4}", record["posed_evidence"]) is None:
        problems.append("posed year is not in posed_evidence")
    if len(record["posed_evidence"].split()) > QUOTE_WORDS:
        problems.append(f"posed_evidence longer than {QUOTE_WORDS} words")
    quote = quote_of(record["status_source"])
    if record["status_source"] and not quote:
        problems.append("status_source has no closing quote")
    if quote and len(quote.split()) > QUOTE_WORDS:
        problems.append(f"status quote longer than {QUOTE_WORDS} words")
    return problems


def check_fill(record):
    problems = []
    for column in ("id", "posed", "posed_evidence", "evidence_source"):
        if not record[column]:
            problems.append(f"missing {column}")
    if record["status"] and record["status"] not in STATUSES - {"open"}:
        problems.append(f"status {record['status']!r}")
    if record["status"] and not record["status_source"]:
        problems.append("status change without status_source")
    if record["status"] == "solved" and not record["resolved"]:
        problems.append("solved row has no resolved year")
    if record["status"] != "solved" and record["resolved"]:
        problems.append("resolved year on a row that is not solved")
    return problems + check_years(record, False)


def check_new(record):
    problems = []
    for column in ("name", "branch", "status", "posed", "posed_evidence", "source", "licence", "statement", "status_source", "keywords"):
        if not record[column]:
            problems.append(f"missing {column}")
    if record["branch"] not in BRANCHES:
        problems.append(f"branch {record['branch']!r}")
    if record["status"] not in STATUSES - {"open"}:
        problems.append(f"status {record['status']!r}")
    if record["licence"] != "CC BY-SA 4.0":
        problems.append(f"licence {record['licence']!r}")
    words = len(record["statement"].split())
    if not MIN_WORDS <= words <= MAX_WORDS:
        problems.append(f"statement has {words} words")
    if not record["statement"].endswith("?") or not problem_shaped(record["statement"]):
        problems.append("statement is not a question")
    if record["status"] == "solved" and not record["resolved"]:
        problems.append("solved row has no resolved year")
    if not 3 <= len([k for k in record["keywords"].split(";") if k.strip()]) <= 6:
        problems.append("keywords must number 3 to 6")
    return problems + check_years(record, record["status"] == "solved")


def normal(text):
    return re.sub(r"\s+", " ", re.sub(r"\[\d+\]", "", text.replace("’", "'").replace("“", '"').replace("”", '"').replace("–", "-").replace("—", "-"))).lower()


def near(text, quote, year):
    position = text.find(normal(quote))
    return position >= 0 and (not year or year in text[max(0, position - 250) : position + len(quote) + 250])


def rendered_text(url, cache):
    cache.mkdir(parents=True, exist_ok=True)
    path = cache / (hashlib.sha1(url.encode()).hexdigest() + ".txt")
    if path.exists():
        return path.read_text(encoding="utf8")
    title = urllib.parse.unquote(urllib.parse.urlparse(url).path.split("/wiki/", 1)[1]).replace("_", " ")
    query = urllib.parse.urlencode({"action": "query", "prop": "extracts", "explaintext": 1, "titles": title, "redirects": 1, "format": "json", "formatversion": 2})
    request = urllib.request.Request("https://en.wikipedia.org/w/api.php?" + query, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        page = json.loads(response.read())["query"]["pages"][0]
    text = "" if page.get("missing") else page.get("extract", "")
    path.write_text(text, encoding="utf8")
    return text


def verify(cache, log=sys.stderr):
    failures = []
    pages = {}
    jobs = [(r["line"], r["evidence_source"], r) for r in fills()] + [(r["line"], r["source"], r) for r in new_records()]
    for line, url, record in jobs:
        text = pages.setdefault(url, normal(rendered_text(url, cache)))
        if not near(text, record["posed_evidence"], record["posed"]):
            failures.append((line, "posed evidence absent or the year is not beside it"))
        quote = quote_of(record["status_source"])
        if quote and not near(text, quote, record["resolved"]):
            failures.append((line, "status quote absent or the resolved year is not beside it"))
    for line, message in failures:
        print(f"{line}: {message}", file=log)
    print(f"verified {len(jobs)} rows against {len(pages)} pages, {len(failures)} failures", file=log)
    return failures


def new_rows():
    out = []
    for record in new_records():
        problems = check_new(record)
        assert not problems, (record["line"], problems)
        keywords = [k.strip() for k in record["keywords"].split(";") if k.strip()]
        out.append(
            Row(
                id="rc-" + slug(record["name"]),
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
                statement_source=record["source"],
                status_source=record["status_source"],
                posed_evidence=record["posed_evidence"],
            )
        )
    return out


def apply(path=OUTPUT):
    current = read(path)
    by_id = {r["id"]: r for r in current}
    changed = Counter()
    for record in fills():
        problems = check_fill(record)
        assert not problems, (record["line"], problems)
        row = by_id[record["id"]]
        before = (row["status"], row["posed"], row["resolved"], row["posed_evidence"])
        row["posed"] = record["posed"]
        row["posed_evidence"] = record["posed_evidence"]
        if record["status"]:
            row["status"] = record["status"]
            row["resolved"] = record["resolved"]
            row["status_source"] = record["status_source"]
        elif "Posed: " not in row["status_source"]:
            row["status_source"] = (row["status_source"] + " Posed: " + record["evidence_source"]).strip()
        if before != (row["status"], row["posed"], row["resolved"], row["posed_evidence"]):
            changed[row["branch"]] += 1
    titles = {normal_title(r["name"]) for r in current}
    added = []
    for row in new_rows():
        if normal_title(row.name) in titles or row.id in by_id:
            continue
        current.append(row.record())
        added.append(row)
        changed[row.branch] += 1
    with path.open("w", encoding="utf8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(current[0].keys()), delimiter="\t", lineterminator="\n")
        writer.writeheader()
        writer.writerows(current)
    return changed, added


def main(argv):
    if "--verify" in argv:
        cache = Path(argv[argv.index("--verify") + 1]) if len(argv) > argv.index("--verify") + 1 else Path.home() / ".cache" / "bucket-solvability-atlas" / "recent"
        return 1 if verify(cache) else 0
    if "--apply" in argv:
        changed, added = apply()
        print("rows changed by branch:", dict(changed), "new rows:", len(added))
        return 0
    bad = [(r["line"], check_fill(r)) for r in fills() if check_fill(r)] + [(r["line"], check_new(r)) for r in new_records() if check_new(r)]
    for line, problems in bad:
        print(line, problems)
    print("fills:", len(fills()), "new:", len(new_records()))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
