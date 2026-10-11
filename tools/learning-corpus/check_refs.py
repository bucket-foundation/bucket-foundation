#!/usr/bin/env python3
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CORPUS = ROOT / "learning" / "corpus"
DEFAULT_DOCS = ["docs/LEARNING-FRAMEWORK.md", "docs/LEARNING-FRAMEWORK-SUMMARY.md"]
SOURCES = {
    "w": ("works.jsonl", "id"),
    "c": ("claims.jsonl", "id"),
    "m": ("methods.jsonl", "method"),
    "mech": ("mechanisms.jsonl", "id"),
}
CONFIRMED = {"doi-confirmed", "url-confirmed"}
BRACKET = re.compile(r"\[([^\[\]]+)\]")
PREFIX = re.compile(r"^(w|c|m|mech):(.+)$", re.S)
FENCE = re.compile(r"^(```|~~~)")
INLINE_CODE = re.compile(r"`[^`]*`")
EMPIRICAL = re.compile(r"\[empirical:\s*([^\[\],]+),[^\[\]]*\]")
NUMBER = re.compile(r"(?<![\w.:/-])-?(?:\d[\d,]*\.?\d*|\.\d+)")
LIST_MARKER = re.compile(r"^\s*(?:\d+\.|[-*])\s+")
TRAILING = re.compile(r"[\s,;.]*(?:and)?[\s,;.]*")
RECORD_TEXT = {
    "w": ("effect", "finding", "population"),
    "c": ("statement", "effect"),
    "mech": ("rule", "unsourced_parameters", "parameters_total"),
}


def load(corpus):
    index = {}
    for prefix, (name, key) in SOURCES.items():
        rows = {}
        with open(corpus / name, encoding="utf-8") as handle:
            for line in handle:
                if line.strip():
                    row = json.loads(line)
                    rows[row[key]] = row
        index[prefix] = rows
    return index


def refs_in(text):
    found = []
    fenced = False
    for number, line in enumerate(text.splitlines(), 1):
        if FENCE.match(line.strip()):
            fenced = not fenced
            continue
        if fenced:
            continue
        for body in BRACKET.findall(INLINE_CODE.sub("", line)):
            body = body.strip()
            if body.startswith("empirical:"):
                body = body[len("empirical:"):].split(",")[0].strip()
            match = PREFIX.match(body)
            if match:
                found.append((number, match.group(1), match.group(2).strip()))
    return found


def canonical(token):
    body = token.replace(",", "").lstrip("-").rstrip(".")
    if body.startswith("."):
        body = "0" + body
    whole, _, fraction = body.partition(".")
    whole = whole.lstrip("0") or "0"
    fraction = fraction.rstrip("0")
    return f"{whole}.{fraction}" if fraction else whole


def numbers_in(text):
    return {canonical(t) for t in NUMBER.findall(text) if any(ch.isdigit() for ch in t)}


def record_text(prefix, row):
    return json.dumps([row.get(k) for k in RECORD_TEXT[prefix]], ensure_ascii=False)


def tag_groups(line):
    groups, start, current = [], 0, None
    for match in EMPIRICAL.finditer(line):
        source = PREFIX.match(match.group(1).strip())
        between = line[current["end"]:match.start()] if current else None
        if current and TRAILING.fullmatch(between or ""):
            current["refs"].append(source)
            current["end"] = match.end()
            continue
        current = {"text": line[start:match.start()], "refs": [source], "end": match.end()}
        groups.append(current)
        start = match.end()
    return groups


def check_numbers(paths, index):
    errors = []
    for path in paths:
        fenced = False
        for number, raw in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), 1):
            if FENCE.match(raw.strip()):
                fenced = not fenced
                continue
            if fenced:
                continue
            for group in tag_groups(LIST_MARKER.sub("", INLINE_CODE.sub("", raw))):
                refs = [r for r in group["refs"] if r and r.group(2).strip() in index[r.group(1)]]
                if not refs or len(refs) != len(group["refs"]):
                    continue
                rows = [(r.group(1), index[r.group(1)][r.group(2).strip()]) for r in refs]
                names = ", ".join(f"{p}:{row.get('id', '')}" for p, row in rows)
                for prefix, row in rows:
                    if prefix == "w" and "truncated" in json.dumps(row.get("effect"), ensure_ascii=False).lower():
                        errors.append(f"{path}:{number}: [{prefix}:{row['id']}] holds an effect read from a truncated abstract")
                known = set()
                for prefix, row in rows:
                    known |= numbers_in(record_text(prefix, row))
                cited = numbers_in(BRACKET.sub("", group["text"]))
                for value in sorted(cited - known):
                    errors.append(f"{path}:{number}: {value} is absent from the record of {names}")
    return errors


def check(paths, index):
    errors, warnings, total = [], [], 0
    for path in paths:
        for number, prefix, ident in refs_in(Path(path).read_text(encoding="utf-8")):
            total += 1
            row = index[prefix].get(ident)
            where = f"{path}:{number}"
            if row is None:
                errors.append(f"{where}: [{prefix}:{ident}] names nothing in {SOURCES[prefix][0]}")
            elif prefix == "w" and row.get("withdrawn"):
                errors.append(f"{where}: [w:{ident}] is withdrawn")
            elif prefix == "w" and row.get("verification") not in CONFIRMED:
                warnings.append(f"{where}: [w:{ident}] is {row.get('verification')}")
    return errors, warnings, total


def show(ref, index):
    match = PREFIX.match(ref)
    if not match or match.group(2) not in index[match.group(1)]:
        print(f"{ref}: names nothing", file=sys.stderr)
        return 1
    row = index[match.group(1)][match.group(2)]
    keep = ("id", "method", "authors", "year", "title", "doi_or_url", "verification", "withdrawn",
            "finding", "effect", "typical_effect", "boundary_conditions", "contested", "status",
            "statement", "contradicted_by", "rule", "parameters_total", "unsourced_parameters",
            "doc_code_conflict", "measured_by", "formal")
    print(json.dumps({k: row[k] for k in keep if k in row}, ensure_ascii=False, indent=2))
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(prog="check_refs")
    parser.add_argument("paths", nargs="*")
    parser.add_argument("--corpus", default=str(CORPUS))
    parser.add_argument("--show")
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args(argv)
    index = load(Path(args.corpus))
    if args.show:
        return show(args.show, index)
    paths = args.paths or [str(ROOT / p) for p in DEFAULT_DOCS if (ROOT / p).exists()]
    errors, warnings, total = check(paths, index)
    mismatches = check_numbers(paths, index)
    errors += mismatches
    for line in warnings:
        print(f"warning: {line}")
    for line in errors:
        print(f"error: {line}", file=sys.stderr)
    print(f"{total} references in {len(paths)} files, {len(errors) - len(mismatches)} unresolved, {len(mismatches)} numbers that differ from their record, {len(warnings)} to unconfirmed works")
    if errors or (args.strict and warnings):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
