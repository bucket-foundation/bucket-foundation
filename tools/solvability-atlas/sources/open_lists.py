import csv
import re
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import BRANCHES, OUTPUT, Row, dedupe, existing_titles, good_phrase, keywords_from, normal_title, read, slug
from solved_discoveries import MAX_WORDS, MIN_WORDS, QUOTE_WORDS, form_for, page_text, problem_shaped, similar

OPEN_DIR = Path(__file__).resolve().parent / "open"
OPEN_COLUMNS = ["name", "posed", "posed_evidence", "source", "licence", "statement", "status_source", "keywords", "market"]
LICENCES = {"CC BY-SA 4.0"}
SIMILARITY = 0.8


def open_files():
    return sorted(OPEN_DIR.glob("*.tsv"))


def curated_rows():
    out = []
    for path in open_files():
        assert path.stem in BRANCHES, path
        with path.open(encoding="utf8") as handle:
            reader = csv.DictReader(handle, delimiter="\t")
            assert reader.fieldnames == OPEN_COLUMNS, (path, reader.fieldnames)
            for line, record in enumerate(reader, start=2):
                record = {k: (v or "").strip() for k, v in record.items()}
                record["branch"] = path.stem
                record["line"] = f"{path.name}:{line}"
                out.append(record)
    return out


def status_quote(record):
    match = re.search(r'"([^"]+)"\s*$', record["status_source"])
    return match.group(1) if match else ""


def check(record):
    problems = []
    for column in ("name", "source", "licence", "statement", "status_source", "keywords"):
        if not record[column]:
            problems.append(f"missing {column}")
    if record["licence"] not in LICENCES:
        problems.append(f"licence {record['licence']!r}")
    if not record["source"].startswith("https://en.wikipedia.org/wiki/"):
        problems.append("source is not a Wikipedia article")
    words = len(record["statement"].split())
    if not MIN_WORDS <= words <= MAX_WORDS:
        problems.append(f"statement has {words} words")
    if not record["statement"].endswith("?") or not problem_shaped(record["statement"]):
        problems.append("statement is not a question")
    if "–" in record["statement"] or "—" in record["statement"]:
        problems.append("dash in statement")
    quote = status_quote(record)
    if not quote:
        problems.append("status_source has no closing quote")
    elif len(quote.split()) > QUOTE_WORDS:
        problems.append(f"quote longer than {QUOTE_WORDS} words")
    if bool(record["posed"]) != bool(record["posed_evidence"]):
        problems.append("posed and posed_evidence must come together")
    if record["posed"] and not (re.fullmatch(r"\d{4}", record["posed"]) and record["posed"] in record["posed_evidence"]):
        problems.append("posed year is not in posed_evidence")
    if len(record["posed_evidence"].split()) > QUOTE_WORDS:
        problems.append(f"posed_evidence longer than {QUOTE_WORDS} words")
    if not 3 <= len([k for k in record["keywords"].split(";") if k.strip()]) <= 6:
        problems.append("keywords must number 3 to 6")
    if len(record["name"]) > 140 or re.search(r"[,;:(\-]$", record["name"]):
        problems.append("name too long or ends at a bad boundary")
    return problems


def normal(text):
    return re.sub(r"\s+", " ", re.sub(r"\[\d+\]", "", text.replace("’", "'").replace("“", '"').replace("”", '"').replace("–", "-").replace("—", "-"))).lower()


def verify(records, cache, log=sys.stderr):
    failures = []
    pages = {}
    for record in records:
        text = pages.setdefault(record["source"], normal(page_text(record["source"], cache)))
        if not text:
            failures.append((record["line"], f"empty page {record['source']}"))
            continue
        if normal(status_quote(record)) not in text:
            failures.append((record["line"], "status quote absent from the page"))
        if record["posed_evidence"]:
            position = text.find(normal(record["posed_evidence"]))
            if position < 0 or record["posed"] not in text[max(0, position - 250) : position + len(record["posed_evidence"]) + 250]:
                failures.append((record["line"], "posed evidence absent from the page"))
    for line, message in failures:
        print(f"{line}: {message}", file=log)
    print(f"verified {len(records)} rows against {len(pages)} pages, {len(failures)} failures", file=log)
    return failures


def rows():
    out = []
    for record in curated_rows():
        problems = check(record)
        assert not problems, (record["line"], problems)
        keywords = [k.strip() for k in record["keywords"].split(";") if k.strip()]
        out.append(
            Row(
                id="op-" + slug(record["name"]),
                name=record["name"],
                branch=record["branch"],
                form=form_for(record["statement"]),
                status="open",
                source=record["source"],
                licence=record["licence"],
                keywords=keywords_from(record["statement"], keywords, name=record["name"]) or [k for k in keywords if good_phrase(k)][:8],
                posed=record["posed"],
                resolved="",
                market=record["market"],
                statement=record["statement"],
                statement_source=record["source"],
                status_source=record["status_source"],
                posed_evidence=record["posed_evidence"],
            )
        )
    return out


def append(path=OUTPUT):
    current = read(path)
    seen = {r["id"]: r for r in current}
    titles = existing_titles()
    titles.update({normal_title(r["name"]): r["id"] for r in current})
    fresh = []
    dropped = []
    for row in dedupe(rows(), titles):
        twin = next((r["id"] for r in current if r["statement"] and similar(row.statement, r["statement"], SIMILARITY)), "")
        if twin:
            dropped.append((row.id, twin))
            continue
        base = row.id
        n = 2
        while row.id in seen:
            row.id = f"{base}-{n}"
            n += 1
        seen[row.id] = row.record()
        fresh.append(row)
    with path.open("a", encoding="utf8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(current[0].keys()), delimiter="\t", lineterminator="\n")
        for row in fresh:
            writer.writerow(row.record())
    return fresh, dropped


def open_counts(path=OUTPUT):
    counts = Counter(r["branch"] for r in read(path) if r["status"] == "open" and r["form"] != "variant")
    return {branch: counts.get(branch, 0) for branch in ("mind", "chemistry", "information", "applied")}


def main(argv):
    if "--verify" in argv:
        cache = Path(argv[argv.index("--verify") + 1]) if len(argv) > argv.index("--verify") + 1 else Path.home() / ".cache" / "bucket-solvability-atlas" / "open"
        return 1 if verify(curated_rows(), cache) else 0
    if "--append" in argv:
        fresh, dropped = append()
        print(f"appended {len(fresh)} rows, dropped {len(dropped)} as duplicates: {dropped}")
        print("by branch:", dict(Counter(r.branch for r in fresh)))
        print("open per branch:", open_counts())
        return 0
    curated = curated_rows()
    bad = [(r["line"], check(r)) for r in curated if check(r)]
    for line, problems in bad:
        print(line, problems)
    print("curated rows:", len(curated), dict(Counter(r["branch"] for r in curated)))
    print("open per branch in output:", open_counts())
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
