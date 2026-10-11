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
    for line in warnings:
        print(f"warning: {line}")
    for line in errors:
        print(f"error: {line}", file=sys.stderr)
    print(f"{total} references in {len(paths)} files, {len(errors)} unresolved, {len(warnings)} to unconfirmed works")
    if errors or (args.strict and warnings):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
