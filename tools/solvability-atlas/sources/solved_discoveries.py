import csv
import difflib
import hashlib
import html
import json
import re
import sys
import urllib.parse
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import BRANCHES, OUTPUT, Row, dedupe, existing_titles, fetch, good_phrase, keywords_from, normal_title, read, slug, strip_markup, wikitext

SOLVED_DIR = Path(__file__).resolve().parent / "solved"
CURATED_COLUMNS = ["name", "posed", "resolved", "resolved_kind", "posed_evidence", "source", "licence", "statement", "status_source", "keywords", "market"]
KINDS = {"posed", "discovery"}
MIN_WORDS = 15
MAX_WORDS = 40
QUOTE_WORDS = 12
PRIZE_YEAR = re.compile(r"(?:nobelprize\.org/prizes/[a-z_-]+|kavliprize\.org/prizes/[a-z-]+|breakthroughprize\.org/Laureates)/(\d{4})")
TARGET_BRANCHES = ("physics", "chemistry", "biophysics", "cosmology", "mind", "information", "applied")
TARGET = 100
LICENCES = {
    "CC BY-SA 4.0",
    "Nobel Prize Outreach AB, citation quoted briefly",
    "Breakthrough Prize Foundation, citation quoted briefly",
    "Kavli Foundation, citation quoted briefly",
    "Royal Swedish Academy of Sciences, citation quoted briefly",
    "XPRIZE Foundation, prize text quoted briefly",
    "Nesta, prize text quoted briefly",
    "Apache-2.0",
}
QUESTION_START = re.compile(r"^(is|are|can|could|does|do|did|what|which|how|why|when|where|who|whether|must|will|would|should|was|were|has|have|had)\b", re.I)
IMPERATIVE_START = re.compile(r"^(find|determine|explain|prove|show|measure|identify|build|synthesi[sz]e|detect|establish|resolve|account|construct|decide|compute|isolate|map|sequence|derive|achieve|demonstrate|produce|observe|locate|discover|settle|confirm|characteri[sz]e|classify|design|cure|prevent|devise|describe|predict|reach|make|develop|create|solve)\b", re.I)


def curated_files():
    return sorted(SOLVED_DIR.glob("*.tsv"))


def curated_rows():
    out = []
    for path in curated_files():
        branch = path.stem
        assert branch in BRANCHES, path
        with path.open(encoding="utf8") as handle:
            reader = csv.DictReader(handle, delimiter="\t")
            assert reader.fieldnames == CURATED_COLUMNS, (path, reader.fieldnames)
            for line, record in enumerate(reader, start=2):
                record = {k: (v or "").strip() for k, v in record.items()}
                record["branch"] = branch
                record["line"] = f"{path.name}:{line}"
                out.append(record)
    return out


def problem_shaped(statement):
    text = statement.strip()
    return text.endswith("?") or bool(IMPERATIVE_START.match(text)) or bool(QUESTION_START.match(text))


def form_for(statement):
    text = statement.strip()
    if text.endswith("?") or QUESTION_START.match(text):
        return "question"
    return "problem"


def check(record):
    problems = []
    for column in ("name", "resolved", "source", "licence", "statement", "status_source"):
        if not record[column]:
            problems.append(f"missing {column}")
    if record["resolved"] and not (re.fullmatch(r"\d{4}", record["resolved"]) and 1600 <= int(record["resolved"]) <= 2026):
        problems.append(f"resolved year {record['resolved']!r}")
    if record["posed"] and not (re.fullmatch(r"\d{4}", record["posed"]) and 1600 <= int(record["posed"]) <= 2026):
        problems.append(f"posed year {record['posed']!r}")
    if record["posed"] and record["resolved"] and int(record["posed"]) > int(record["resolved"]):
        problems.append("posed after resolved")
    if not record["source"].startswith("https://"):
        problems.append("source is not https")
    if record["licence"] not in LICENCES:
        problems.append(f"licence {record['licence']!r} not in the allowed set")
    if record["statement"] and not problem_shaped(record["statement"]):
        problems.append("statement is not a question or an imperative problem")
    if record["resolved_kind"] not in KINDS:
        problems.append(f"resolved_kind {record['resolved_kind']!r} must be posed or discovery")
    if record["resolved_kind"] == "posed":
        if not record["posed_evidence"]:
            problems.append("posed row has no posed_evidence")
        words = len(record["statement"].split())
        if not MIN_WORDS <= words <= MAX_WORDS:
            problems.append(f"posed statement has {words} words, band is {MIN_WORDS} to {MAX_WORDS}")
    prize = prize_year(record["source"])
    if prize and record["resolved"] == prize:
        problems.append(f"resolved year equals the prize year {prize}; use the discovery year the page states")
    for quote in re.findall(r'"([^"]+)"', record["status_source"] + " " + record["posed_evidence"]):
        if len(quote.split()) > QUOTE_WORDS:
            problems.append(f"quote longer than {QUOTE_WORDS} words")
    if len(record["name"]) > 140 or re.search(r"[,;:(\-]$", record["name"]):
        problems.append("name too long or ends at a bad boundary")
    if len([k for k in record["keywords"].split(";") if k.strip()]) > 8:
        problems.append("more than eight keywords")
    return problems


def prize_year(url):
    match = PRIZE_YEAR.search(url)
    return match.group(1) if match else ""


def rows(kind="posed"):
    out = []
    for record in curated_rows():
        problems = check(record)
        assert not problems, (record["line"], problems)
        if record["resolved_kind"] != kind:
            continue
        keywords = [k.strip() for k in record["keywords"].split(";") if k.strip()]
        out.append(
            Row(
                id="sd-" + slug(record["name"]),
                name=record["name"],
                branch=record["branch"],
                form=form_for(record["statement"]),
                status="solved",
                source=record["source"],
                licence=record["licence"],
                keywords=keywords_from(record["statement"], keywords, name=record["name"]) or [k for k in keywords if good_phrase(k)][:8],
                posed=record["posed"],
                resolved=record["resolved"],
                market=record["market"],
                statement=record["statement"],
                statement_source=record["source"],
                status_source=record["status_source"],
            )
        )
    return out


def statement_key(text):
    return re.sub(r"[^a-z0-9 ]", "", text.lower())


def similar(a, b, threshold=0.85):
    matcher = difflib.SequenceMatcher(None, statement_key(a), statement_key(b))
    return matcher.real_quick_ratio() >= threshold and matcher.quick_ratio() >= threshold and matcher.ratio() >= threshold


def similar_pairs(candidates, against, threshold=0.85):
    candidate_ids = {c["id"] for c in candidates}
    pairs = []
    for row in candidates:
        for other in against:
            if other["id"] == row["id"] or (other["id"] in candidate_ids and other["id"] < row["id"]):
                continue
            if similar(row["statement"], other["statement"], threshold):
                pairs.append((row["id"], other["id"]))
    return pairs


def page_text(url, cache):
    cache.mkdir(parents=True, exist_ok=True)
    path = cache / (hashlib.sha1(url.encode()).hexdigest() + ".txt")
    if path.exists():
        return path.read_text(encoding="utf8")
    parsed = urllib.parse.urlparse(url)
    if parsed.netloc.endswith("wikipedia.org"):
        title = urllib.parse.unquote(parsed.path.split("/wiki/", 1)[1]).replace("_", " ")
        text = strip_markup(wikitext(title))
    else:
        body = fetch(url)
        body = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", body, flags=re.S | re.I)
        text = html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", body)))
    path.write_text(text, encoding="utf8")
    return text


def anchor_terms(record):
    terms = [k.strip() for k in record["keywords"].split(";") if len(k.strip()) >= 5]
    terms += [w for w in re.findall(r"[A-Za-z][A-Za-z-]{4,}", record["name"])]
    return terms


def verify(records, cache, log=sys.stderr):
    failures = []
    for record in records:
        try:
            text = page_text(record["source"], cache)
        except Exception as error:
            failures.append((record["line"], f"fetch failed: {error}"))
            continue
        low = text.lower()
        if record["resolved"] not in text:
            failures.append((record["line"], f"year {record['resolved']} absent from {record['source']}"))
        if not any(term.lower() in low for term in anchor_terms(record)):
            failures.append((record["line"], f"no anchor term of {record['name']!r} on {record['source']}"))
    for line, message in failures:
        print(f"{line}: {message}", file=log)
    print(f"verified {len(records)} rows against {len({r['source'] for r in records})} pages, {len(failures)} failures", file=log)
    return failures


def append(path=OUTPUT):
    current = read(path)
    seen = {normal_title(r["name"]): r["id"] for r in current}
    seen.update(existing_titles())
    ids = {r["id"] for r in current}
    fresh = dedupe(rows(), seen)
    for row in fresh:
        base = row.id
        n = 2
        while row.id in ids:
            row.id = f"{base}-{n}"
            n += 1
        ids.add(row.id)
    with path.open("a", encoding="utf8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(current[0].keys()), delimiter="\t", lineterminator="\n")
        for row in fresh:
            writer.writerow(row.record())
    return fresh


def solved_counts(path=OUTPUT):
    counts = Counter(r["branch"] for r in read(path) if r["status"] == "solved" and r["form"] != "variant")
    return {branch: counts.get(branch, 0) for branch in TARGET_BRANCHES}


def main(argv):
    if "--verify" in argv:
        cache = Path(argv[argv.index("--verify") + 1]) if len(argv) > argv.index("--verify") + 1 else Path.home() / ".cache" / "bucket-solvability-atlas" / "solved"
        failures = verify(curated_rows(), cache)
        return 1 if failures else 0
    if "--dupes" in argv:
        current = read()
        fresh = [r.record() for r in rows()]
        for a, b in similar_pairs(fresh, fresh + [r for r in current if not r["id"].startswith("sd-")]):
            print(a, "~", b)
        return 0
    if "--append" in argv:
        fresh = append()
        print(f"appended {len(fresh)} rows to {OUTPUT}")
        print("by branch:", dict(Counter(r.branch for r in fresh)))
        print("solved per branch:", json.dumps(solved_counts()))
        return 0
    curated = curated_rows()
    print("curated rows:", len(curated), dict(Counter(r["branch"] for r in curated)))
    print("by kind:", {k: dict(Counter(r["branch"] for r in curated if r["resolved_kind"] == k)) for k in sorted(KINDS)})
    print("by licence:", dict(Counter(r["licence"] for r in curated)))
    bad = [(r["line"], check(r)) for r in curated if check(r)]
    for line, problems in bad:
        print(line, problems)
    print("solved per branch in output:", json.dumps(solved_counts()))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
