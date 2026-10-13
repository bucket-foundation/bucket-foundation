import argparse
import csv
import hashlib
import json
import re
import sys
import urllib.request
from pathlib import Path

import claims

HERE = Path(__file__).parent
BATCH = "openai-math-2026-10"
REPOSITORY = "https://github.com/openai/math"
COMMIT = "fd4aeeb2ee4fc729c18d98444fed42fd0529eeeb"
RAW = f"https://raw.githubusercontent.com/openai/math/{COMMIT}/"
BLOB = f"{REPOSITORY}/blob/{COMMIT}/"
RELEASED = "2026-10-06"
RETRIEVED = "2026-10-12"
CLAIMANT = "OpenAI, unreleased internal model"
CACHE = HERE / "cache" / "openai-math"
MAP = HERE / "claims" / f"{BATCH}.map.tsv"
LEDGER = HERE / "claims" / f"{BATCH}.json"
FAMILIES = HERE / "claims" / f"{BATCH}.families.tsv"
ROWS = HERE / "claims" / f"{BATCH}.rows.md"
FETCH_CAP = 80
ABSENT = (
    ("Erdős problem 293", "On the third-party list of 23 Erdős problems; the atlas has no row for it."),
    ("Erdős problem 604", "On the third-party list of 23 Erdős problems; the atlas has no row for it."),
    ("Erdős problem 802", "On the third-party list of 23 Erdős problems; the atlas has no row for it."),
)
MARKUP = re.compile(r"<[^>]+>|\$`|`\$")
FAMILY = re.compile(r"\*\*(\d{3})\. (.+?)\*\*\s*(.*)", re.S)
PAPER = re.compile(r"&emsp;\[(.+?)\]\((preprints/[^)]+)\)\s*(.*)", re.S)
LEAN = re.compile(r"\s*\(\[Lean\]\((lean/docs/[^)]+)\)\)")
fetched = 0


def plain(text):
    return re.sub(r"\s+", " ", MARKUP.sub("", text)).replace("&gt;", ">").replace("&lt;", "<").replace("&amp;", "&").strip()


def read(name, offline=False):
    global fetched
    path = CACHE / name.replace("/", "_") if "docs/" not in name else CACHE / "docs" / Path(name).name
    if not path.exists():
        if offline:
            raise SystemExit(f"{name} is not cached; run without --offline")
        if fetched >= FETCH_CAP:
            raise SystemExit(f"fetch cap of {FETCH_CAP} reached")
        fetched += 1
        path.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(urllib.request.Request(RAW + name, headers={"User-Agent": "bucket-solvability-atlas/1.0"}), timeout=60) as response:
            path.write_bytes(response.read())
    return path.read_text(encoding="utf8")


def parse_contents(text):
    families = []
    for block in re.split(r"<tbody><tr>\s*<td>", text)[1:]:
        body = block.split("</td>")[0].strip()
        m = FAMILY.match(body)
        if m:
            lean = LEAN.findall(m.group(3))
            families.append({"family": m.group(1), "title": plain(m.group(2)).rstrip("."), "description": plain(LEAN.sub("", m.group(3))), "lean_doc": lean[0] if lean else None, "papers": []})
            continue
        p = PAPER.match(body)
        if p is None or not families:
            raise ValueError(f"unparsed catalogue block: {body[:80]}")
        families[-1]["papers"].append({"title": plain(p.group(1)), "path": p.group(2)})
    return families


def scope_of(doc):
    m = re.search(r"^## Scope\s*$(.*?)^## ", doc, re.S | re.M)
    if m is None:
        raise ValueError("scope note has no Scope section")
    return re.sub(r"\s+", " ", m.group(1)).strip()


def hand_map(path=MAP):
    return list(csv.DictReader(open(path, encoding="utf8"), delimiter="\t"))


def atlas_ids():
    ids = [r["id"] for r in csv.DictReader(open(HERE / "problems.tsv"), delimiter="\t")]
    return set(ids + [r["id"] for r in csv.DictReader(open(HERE / "problems-sourced.tsv"), delimiter="\t")])


def build(offline=False):
    contents = read("CONTENTS.md", offline)
    history = read("history.md", offline)
    families = {f["family"]: f for f in parse_contents(contents)}
    known = atlas_ids()
    entries = []
    for row in hand_map():
        if row["id"] not in known:
            raise ValueError(f"{row['id']} is not an atlas row")
        f = families[row["family"]]
        scope = row["formal_scope"]
        if (f["lean_doc"] is None) != (scope == "none"):
            raise ValueError(f"{row['id']}: formal scope {scope} disagrees with the catalogue for family {row['family']}")
        formal = {"exists": False, "scope": "none", "statement": None, "url": None, "note": ""}
        if f["lean_doc"]:
            formal = {"exists": True, "scope": scope, "statement": scope_of(read(f["lean_doc"], offline)), "url": BLOB + f["lean_doc"], "note": row["formal_note"]}
        entries.append({
            "id": row["id"], "family": row["family"], "family_title": f["title"], "claimant": CLAIMANT, "date": RELEASED,
            "source_url": f"{BLOB}CONTENTS.md", "manuscripts": [BLOB + p["path"] for p in f["papers"]], "statement": f["description"],
            "match": row["match"], "match_note": row["match_note"], "formal": formal, "confirmation": None, "withdrawn": None,
        })
    digest = {name: hashlib.sha256((CACHE / name).read_bytes()).hexdigest() for name in ("CONTENTS.md", "history.md")}
    ledger = {
        "schema": claims.SCHEMA,
        "batch": BATCH,
        "source": {"url": REPOSITORY, "commit": COMMIT, "licence": "Apache-2.0", "retrieved": RETRIEVED, "claimant": CLAIMANT, "date": RELEASED, "review": "The formalization catalogue marks its own review status as unchecked and its scope as partial progress. No named expert or refereed venue had confirmed a result of this batch by the retrieval date.", "sha256": digest, "history": f"{BLOB}history.md", "withdrawn_manuscripts": len(re.findall(r"^- ", history.split("**Withdrawals**")[1].split("**Fixes**")[0], re.M))},
        "counts": {"families": len(families), "manuscripts": sum(len(f["papers"]) for f in families.values()), "families_with_lean_note": sum(1 for f in families.values() if f["lean_doc"])},
        "rule": claims.STATUS_RULE,
        "claims": entries,
        "absent": [{"reference": a, "reason": b} for a, b in ABSENT],
    }
    return claims.validate(ledger), families


MATCH_TITLE = {"problem": "Rows Marked Claimed", "special_case": "Special Cases", "weaker_bound": "Weaker Bounds", "related": "Related Statements", "unestablished": "Match Unestablished"}
MATCH_LEDE = {
    "problem": "The family claims the row's problem in full. Status `claimed`, counted as open.",
    "special_case": "The family claims part of the row. Status unchanged; the entry is a note on the row.",
    "weaker_bound": "The family claims a bound short of the value or statement the row asks for. Status unchanged; the entry is a note on the row.",
    "related": "The family claims a neighbouring statement. Status unchanged.",
    "unestablished": "The catalogue text does not show that the family settles the row. Status unchanged.",
}
SCOPE_WORD = {"full": "full", "narrower": "narrower", "none": "none"}


def rows_markdown(ledger):
    source = ledger["source"]
    lines = ["<!-- voice-ignore-file: family titles are quoted from the claimant's catalogue -->", f"# Rows Of {ledger['batch']}", "", f"Built by `python3 claims_build.py` from `claims/{ledger['batch']}.map.tsv` and the catalogue of {source['url']} at commit `{source['commit'][:9]}`. Lean scope compares the machine-checked statement with the statement claimed for the row. No entry carries a confirmation.", ""]
    for match in claims.MATCHES:
        part = [e for e in ledger["claims"] if e["match"] == match]
        lines += [f"## {MATCH_TITLE[match]}", "", f"{len(part)} rows. {MATCH_LEDE[match]}", "", "| Row | Family | Lean scope | Why |", "|---|---|---|---|"]
        for e in part:
            why = e["match_note"] + (" " + e["formal"]["note"] if e["formal"]["note"] else "")
            lines.append(f"| `{e['id']}` | {e['family']} {e['family_title'].replace('|', '/')} | {SCOPE_WORD[e['formal']['scope']]} | {why.replace('|', '/')} |")
        lines.append("")
    lines += ["## Absent From The Atlas", ""] + [f"- {a['reference']}: {a['reason']}" for a in ledger["absent"]] + [""]
    return "\n".join(lines)


def main(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument("--offline", action="store_true")
    args = parser.parse_args(argv)
    ledger, families = build(args.offline)
    LEDGER.write_text(json.dumps(ledger, indent=1, ensure_ascii=False) + "\n", encoding="utf8")
    ROWS.write_text(rows_markdown(ledger), encoding="utf8")
    mapped = {e["family"] for e in ledger["claims"]}
    with open(FAMILIES, "w", newline="", encoding="utf8") as fh:
        w = csv.writer(fh, delimiter="\t", lineterminator="\n")
        w.writerow(["family", "title", "manuscripts", "lean_note", "atlas_rows"])
        for f in sorted(families.values(), key=lambda f: f["family"]):
            w.writerow([f["family"], f["title"], len(f["papers"]), f["lean_doc"] or "", sum(1 for e in ledger["claims"] if e["family"] == f["family"])])
    print(json.dumps({"entries": len(ledger["claims"]), "families": len(families), "families_mapped": len(mapped), "fetched": fetched, **ledger["counts"]}))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
