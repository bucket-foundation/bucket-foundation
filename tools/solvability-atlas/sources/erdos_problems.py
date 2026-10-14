import csv
import io
import re
import sys
import tarfile
import urllib.request
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import USER_AGENT, read

ERDOS_DIR = Path(__file__).resolve().parent / "erdos"
RECORDS = ERDOS_DIR / "problems.tsv"
COLUMNS = ["number", "state", "state_updated", "lean_file", "posed", "posed_key", "posed_kind", "resolved", "resolved_keys", "url"]
SITE = "https://www.erdosproblems.com"
DUMP_REPO = "teorth/erdosproblems"
DUMP_COMMIT = "86c3dc3e47dbdfb933c57df46705f3fe78e65cc3"
DUMP_URL = f"https://raw.githubusercontent.com/{DUMP_REPO}/{DUMP_COMMIT}/data/problems.yaml"
DUMP_LICENCE = "Apache-2.0"
LEAN_REPO = "google-deepmind/formal-conjectures"
LEAN_COMMIT = "e47a327f7befa3df97115abf87aa8ed35c381f1f"
LEAN_URL = f"https://codeload.github.com/{LEAN_REPO}/tar.gz/{LEAN_COMMIT}"
LEAN_LICENCE = "Apache-2.0"
LEAN_FOLDER = "FormalConjectures/ErdosProblems/"
OPEN_STATES = {"open"}
SOLVED_STATES = {"proved", "disproved", "solved"}
ERDOS_FIRST_YEAR = 1932
ERDOS_LAST_YEAR = 1999
AS_OF = 2026
POSED_KINDS = {"stated", "cited"}

KEY = r"\[((?:[A-Z][a-z]*)+)(\d\d)[a-z]?\]"
ANY_KEY = re.compile(KEY)
POSING = re.compile(r"\b(asked|asks|conjectured|posed|proposed|problem of|question of|conjecture of|raised)\b[^.\[]{0,60}?" + KEY, re.I)
RESOLVING = re.compile(
    r"\b(solved|proved|proven|resolved|disproved|settled|answered|shown|confirmed|refuted)\b[^.\[]{0,40}?\bby\b[^.\[]{0,90}?(?:" + KEY + r"|\b(1[89]\d\d|20[0-2]\d)\b)",
    re.I,
)
PARTIAL = re.compile(r"\b(case|cases|when|for|partial|partially|generalisation|generalization|weaker|stronger)\b", re.I)
DUMP_ENTRY =re.compile(r'^- number: "(\d+)"\s*$')
DUMP_SECTION = re.compile(r"^  (\w+):\s*$")
DUMP_FIELD = re.compile(r'^    (state|last_update): "([^"]*)"\s*$')


def by_erdos(authors):
    return bool({"Er", "Erd"} & set(re.findall(r"[A-Z][a-z]*", authors)))


def key_year(authors, digits):
    year = int(digits)
    if by_erdos(authors):
        return 1900 + year if ERDOS_FIRST_YEAR <= 1900 + year <= ERDOS_LAST_YEAR else None
    return 2000 + year if 2000 + year <= AS_OF else 1900 + year


def dump_records(text):
    out = {}
    number = section = None
    for line in text.split("\n"):
        entry = DUMP_ENTRY.match(line)
        if entry:
            number = entry.group(1)
            out[number] = {"state": "", "state_updated": ""}
            section = None
            continue
        head = DUMP_SECTION.match(line)
        if head:
            section = head.group(1)
            continue
        if line.startswith("  ") and not line.startswith("    "):
            section = None
        value = DUMP_FIELD.match(line)
        if number and section == "informal_status" and value:
            out[number]["state" if value.group(1) == "state" else "state_updated"] = value.group(2)
    return out


def lean_body(text):
    return text.split("-/", 1)[1] if text.lstrip().startswith("/-") and "-/" in text else text


def main_docstring(body, number):
    match = re.search(r"/--((?:(?!/--).)*?)-/\s*(?:@\[[^\]]*\]\s*)*theorem\s+erdos_" + str(number) + r"(?![\w.])", body, flags=re.S)
    return match.group(1) if match else ""


def posed_from(body, docstring):
    cited = sorted({(key_year(a, d), a + d) for a, d in ANY_KEY.findall(body) if by_erdos(a) and key_year(a, d)})
    if not cited:
        return "", "", ""
    year, key = cited[0]
    stated = {key_year(m.group(2), m.group(3)) for m in POSING.finditer(docstring) if by_erdos(m.group(2))}
    return str(year), key, "stated" if year in stated else "cited"


def partial_case(docstring, start):
    sentence = docstring[max(docstring.rfind(".", 0, start), docstring.rfind("]", 0, start)) + 1 : start]
    return bool(PARTIAL.search(sentence))


def resolved_from(docstring):
    found = {}
    for match in RESOLVING.finditer(docstring):
        if partial_case(docstring, match.start()) or PARTIAL.search(match.group(0)):
            continue
        if match.group(4):
            found[match.group(4)] = int(match.group(4))
        else:
            found[match.group(2) + match.group(3)] = key_year(match.group(2), match.group(3))
    years = {y for y in found.values() if y}
    return (str(years.pop()) if len(years) == 1 else ""), sorted(found)


def lean_record(number, text):
    body = lean_body(text)
    docstring = main_docstring(body, number)
    posed, posed_key, posed_kind = posed_from(body, docstring)
    resolved, resolved_keys = resolved_from(docstring)
    return {"posed": posed, "posed_key": posed_key, "posed_kind": posed_kind, "resolved": resolved, "resolved_keys": ";".join(resolved_keys)}


def build_records(dump_text, lean_texts):
    out = []
    for number, status in sorted(dump_records(dump_text).items(), key=lambda kv: int(kv[0])):
        years = lean_record(number, lean_texts[number]) if number in lean_texts else {"posed": "", "posed_key": "", "posed_kind": "", "resolved": "", "resolved_keys": ""}
        out.append({"number": number, **status, "lean_file": f"{number}.lean" if number in lean_texts else "", **years, "url": f"{SITE}/{number}"})
    return out


def download(url):
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()


def fetch():
    dump_text = download(DUMP_URL).decode("utf8")
    lean_texts = {}
    with tarfile.open(fileobj=io.BytesIO(download(LEAN_URL)), mode="r:gz") as archive:
        for member in archive:
            path = member.name.split("/", 1)[-1]
            stem = path[len(LEAN_FOLDER) : -5]
            if member.isfile() and path.startswith(LEAN_FOLDER) and path.endswith(".lean") and stem.isdigit():
                lean_texts[stem] = archive.extractfile(member).read().decode("utf8")
    records = build_records(dump_text, lean_texts)
    ERDOS_DIR.mkdir(exist_ok=True)
    with RECORDS.open("w", encoding="utf8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS, delimiter="\t", lineterminator="\n")
        writer.writeheader()
        writer.writerows(records)
    return records


def records(path=RECORDS):
    with path.open(encoding="utf8") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        assert reader.fieldnames == COLUMNS, reader.fieldnames
        return list(reader)


def year_ok(text):
    return bool(re.fullmatch(r"\d{4}", text)) and 1500 <= int(text) <= AS_OF


def check(record):
    problems = []
    if not record["number"].isdigit() or record["url"] != f"{SITE}/{record['number']}":
        problems.append("number and url disagree")
    if not record["state"]:
        problems.append("no state")
    if record["posed"] and not (year_ok(record["posed"]) and record["posed_key"] and record["posed_kind"] in POSED_KINDS):
        problems.append("posed year without a key and a kind")
    if record["resolved"] and not (year_ok(record["resolved"]) and record["resolved_keys"]):
        problems.append("resolved year without a key")
    if (record["posed"] or record["resolved"]) and not record["lean_file"]:
        problems.append("year without a Lean file")
    return problems


def top_level_rows(current):
    out = {}
    for row in current:
        match = re.search(r"ErdosProblems/(\d+)\.lean", row["source"])
        if match and not row["variant_of"]:
            out.setdefault(match.group(1), row)
    return out


def decide(record, row):
    if not record["lean_file"]:
        return "skip", "no formal-conjectures file, so no statement under a stated licence"
    if row is None:
        return "skip", "file is newer than problem_map.jsonl, so the atlas has no row"
    if record["state"] in SOLVED_STATES:
        status = "solved"
    elif record["state"] in OPEN_STATES:
        status = "open"
    else:
        return "skip", "dump state is neither open nor solved"
    if (row["status"] == "solved") != (status == "solved"):
        return "skip", "atlas status and dump state disagree"
    posed = row["posed"] or record["posed"]
    if not posed:
        return "skip", "no dated Erdős reference, so no posed year"
    if status == "open":
        return "dated", "open, posed year"
    resolved = row["resolved"] or record["resolved"]
    if resolved and int(resolved) < int(posed):
        return "skip", "resolved year is before the posed year"
    if not resolved:
        return "posed", "solved, posed year only: no single resolving reference"
    return "dated", "solved, posed and resolved year"


def plan(current, loaded=None):
    rows = top_level_rows(current)
    fills, counts = [], Counter()
    for record in loaded or records():
        problems = check(record)
        assert not problems, (record["number"], problems)
        row = rows.get(record["number"])
        action, reason = decide(record, row)
        counts[(action, reason)] += 1
        if action != "skip":
            fills.append((record, row, action))
    return fills, counts


def bound_years(current=None, loaded=None):
    fills, _ = plan(current if current is not None else read(), loaded)
    out = {}
    for record, row, action in fills:
        years = {}
        if not row["posed"]:
            years["posed"] = int(record["posed"])
        if action == "dated" and row["status"] == "solved" and not row["resolved"]:
            years["resolved"] = int(record["resolved"])
        if years:
            out[row["id"]] = years
    return out


def main(argv):
    if "--fetch" in argv:
        print("records:", len(fetch()))
    _, counts = plan(read())
    for (action, reason), n in sorted(counts.items()):
        print(f"{action}\t{n}\t{reason}")
    print("skipped:", sum(n for (action, _), n in counts.items() if action == "skip"), "of", sum(counts.values()))
    years = bound_years()
    print("rows with a bound posed year:", sum("posed" in y for y in years.values()), "with a resolved year:", sum("resolved" in y for y in years.values()))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
