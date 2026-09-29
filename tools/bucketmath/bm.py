#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
LEAN = REPO / "lean"
MANIFEST = LEAN / "manifest.json"
ALLOWED_AXIOMS = {"propext", "Classical.choice", "Quot.sound"}
SOURCE_ROOTS = {
    "BucketMath": "lean",
    "Bucket": "papers/history-hypothesis-engine/lean",
}
GENERATED = {"ctorElim", "ctorElimType", "ofNat", "ofNat_ctorIdx", "toCtorIdx", "elim"}
TAG = re.compile(r"\[(bm|bm-open):([A-Za-z0-9_.']+)\]")
EMPIRICAL = re.compile(r"\[empirical:[^\]]+\]")
NUMBER = re.compile(r"(?<![\w.])-?\d+(?:[.,]\d+)?(?:e-?\d+)?\s*(?:%|x\b|×)?")
INLINE_CODE = re.compile(r"`[^`]*`")
QUANT_WORDS = re.compile(r"%|×|\b(?:ratio|variance|correlat\w*|modularity|recall|precision|accuracy|p-value|faster|slower|higher|lower|times|share|rate)\b", re.I)

class ManifestError(RuntimeError):
    pass

def generated(name: str) -> bool:
    parts = name.split(".")
    return any(p in GENERATED or p.startswith("inst") for p in parts)

def source_path(module: str) -> str:
    root, _, rest = module.partition(".")
    if root not in SOURCE_ROOTS:
        raise ManifestError(f"module {module} is outside the known roots")
    path = f"{SOURCE_ROOTS[root]}/{module.replace('.', '/')}.lean"
    if path.startswith("/") or ".." in Path(path).parts:
        raise ManifestError(f"source path {path} leaves the repo")
    return path

def status_of(row: dict) -> str:
    axioms = set(row.get("axioms", []))
    module = row["module"]
    if row["kind"] != "theorem":
        return "def"
    if "sorryAx" in axioms:
        return "open"
    if module.startswith("BucketMath."):
        return "proved"
    return "external"

def build_manifest(raw: list[dict]) -> list[dict]:
    out = []
    for row in raw:
        if generated(row["name"]):
            continue
        status = status_of(row)
        module = row["module"]
        if module.startswith("BucketMath.") and not module.startswith("BucketMath.Open") and status == "open":
            raise ManifestError(f"{row['name']} uses sorry outside BucketMath.Open")
        extra = set(row.get("axioms", [])) - ALLOWED_AXIOMS - {"sorryAx"}
        if module.startswith("BucketMath.") and extra:
            raise ManifestError(f"{row['name']} depends on unapproved axioms {sorted(extra)}")
        out.append({
            "name": row["name"],
            "kind": row["kind"],
            "status": status,
            "module": module,
            "source": source_path(module),
            "line": row.get("line", 0),
            "type": row["type"],
        })
    out.sort(key=lambda r: r["name"])
    return out

def run(cmd: list[str], cwd: Path = LEAN, timeout: int = 1800) -> str:
    proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
    if proc.returncode != 0:
        raise ManifestError(f"{' '.join(cmd)} failed:\n{proc.stdout[-4000:]}\n{proc.stderr[-4000:]}")
    return proc.stdout

def generate() -> list[dict]:
    run(["lake", "build"])
    out = run(["lake", "env", "lean", "scripts/Manifest.lean"])
    line = next((l for l in out.splitlines() if l.startswith("[")), None)
    if line is None:
        raise ManifestError("manifest script printed no JSON")
    return build_manifest(json.loads(line))

def check_packages(lake_manifest: dict) -> list[str]:
    problems = []
    for pkg in lake_manifest.get("packages", []):
        if pkg.get("type") != "path":
            problems.append(f"package {pkg.get('name')} is fetched ({pkg.get('type')}); builds must stay offline")
            continue
        target = (LEAN / pkg.get("dir", "")).resolve()
        if REPO.resolve() not in target.parents:
            problems.append(f"package {pkg.get('name')} points outside the repo")
    return problems

def load_manifest(path: Path | None = None) -> list[dict]:
    return json.loads((path or MANIFEST).read_text())

def lookup(query: str, manifest: list[dict], limit: int = 20) -> list[dict]:
    q = query.lower()
    exact = [r for r in manifest if r["name"].lower() == q or r["name"].lower().endswith("." + q)]
    if exact:
        return exact[:limit]
    words = q.split()
    scored = []
    for r in manifest:
        hay = f"{r['name']} {r['type']} {r['module']}".lower()
        hits = sum(w in hay for w in words)
        if hits:
            scored.append((hits, r["name"], r))
    scored.sort(key=lambda t: (-t[0], t[1]))
    return [r for _, _, r in scored[:limit]]

def sentences(text: str):
    for n, line in enumerate(text.splitlines(), start=1):
        if line.lstrip().startswith(("|---", "<!--")):
            continue
        if line.lstrip().startswith("```"):
            yield n, line
            continue
        for part in re.split(r"(?<=[.;!?])\s+", INLINE_CODE.sub("", line)):
            if part.strip():
                yield n, part

def lint_text(text: str, manifest: list[dict]) -> tuple[list[str], list[str]]:
    by_name = {r["name"]: r for r in manifest}
    errors, warnings = [], []
    in_code = False
    for n, line in enumerate(text.splitlines(), start=1):
        if line.lstrip().startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            continue
        for kind, name in TAG.findall(INLINE_CODE.sub("", line)):
            row = by_name.get(name)
            if row is None:
                errors.append(f"line {n}: [{kind}:{name}] names nothing in BucketMath")
            elif row["status"] == "open" and kind != "bm-open":
                errors.append(f"line {n}: {name} is an open claim; cite it as [bm-open:{name}]")
            elif row["status"] != "open" and kind == "bm-open":
                errors.append(f"line {n}: {name} is {row['status']}; cite it as [bm:{name}]")
    in_code = False
    for n, part in sentences(text):
        if part.lstrip().startswith("```"):
            in_code = not in_code
            continue
        if in_code or TAG.search(part) or EMPIRICAL.search(part):
            continue
        if NUMBER.search(part) and QUANT_WORDS.search(part):
            warnings.append(f"line {n}: quantitative claim without [bm:] or [empirical:]: {part.strip()[:100]}")
    return errors, warnings

def cmd_check(args) -> int:
    problems = check_packages(json.loads((LEAN / "lake-manifest.json").read_text()))
    try:
        fresh = generate()
    except ManifestError as exc:
        print(exc, file=sys.stderr)
        return 1
    if args.write:
        MANIFEST.write_text(json.dumps(fresh, indent=1, ensure_ascii=False) + "\n")
    elif not MANIFEST.exists() or load_manifest() != fresh:
        problems.append("lean/manifest.json is stale; run: python3 tools/bucketmath/bm.py check --write")
    counts: dict[str, int] = {}
    for r in fresh:
        counts[r["status"]] = counts.get(r["status"], 0) + 1
    print(json.dumps({"entries": len(fresh), "status": counts}))
    for p in problems:
        print(p, file=sys.stderr)
    return 1 if problems else 0

def cmd_lookup(args) -> int:
    for r in lookup(" ".join(args.query), load_manifest(), args.limit):
        print(f"{r['name']}  [{r['status']}]  {r['source']}:{r['line']}\n    {r['type']}")
    return 0

def cmd_lint(args) -> int:
    manifest = load_manifest()
    failed = False
    for f in args.files:
        errors, warnings = lint_text(Path(f).read_text(encoding="utf-8"), manifest)
        for e in errors:
            print(f"{f}: error: {e}")
        for w in warnings:
            print(f"{f}: warning: {w}")
        failed |= bool(errors) or (args.strict and bool(warnings))
    return 1 if failed else 0

def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="bm")
    sub = p.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("check")
    c.add_argument("--write", action="store_true")
    lk = sub.add_parser("lookup")
    lk.add_argument("query", nargs="+")
    lk.add_argument("--limit", type=int, default=20)
    ln = sub.add_parser("lint")
    ln.add_argument("files", nargs="+")
    ln.add_argument("--strict", action="store_true")
    args = p.parse_args(argv)
    return {"check": cmd_check, "lookup": cmd_lookup, "lint": cmd_lint}[args.cmd](args)

if __name__ == "__main__":
    sys.exit(main())
