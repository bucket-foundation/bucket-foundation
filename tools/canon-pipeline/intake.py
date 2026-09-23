#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import os
import sys
from pathlib import Path
from typing import Optional

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import canon  # type: ignore
    from canon import _yaml_dump  # type: ignore
else:
    from . import canon  # type: ignore
    from .canon import _yaml_dump  # type: ignore

try:
    import yaml  # type: ignore
except ImportError:  # pragma: no cover - PyYAML is in requirements
    yaml = None

DEFAULT_MIN_SCORE = int(os.environ.get("CANON_MIN_SCORE", "30"))

def _record_key(rec: dict) -> str:
    doi = (rec.get("doi") or "").strip().lower()
    if doi:
        return f"doi:{doi}"
    url = (rec.get("canonical_url") or "").strip().lower()
    if url:
        return f"url:{url}"
    return "title:" + (rec.get("title") or "").strip().lower()

def gate_record(rec: dict, min_score: int = DEFAULT_MIN_SCORE) -> Optional[str]:
    if not rec.get("title"):
        return "no title (unattributable)"
    if not rec.get("doi"):
        return "no DOI (not a citeable primary source)"
    if not rec.get("authors"):
        return "no authors (unattributable)"
    if rec.get("is_retracted"):
        return "retracted"
    score = rec.get("canon_score")
    if score is None or int(score) < min_score:
        return f"canon_score {score} < floor {min_score} (not primary-tier)"
    return None

def _load_existing(yaml_path: Path) -> list[dict]:
    if not yaml_path.exists() or yaml is None:
        return []
    try:
        doc = yaml.safe_load(yaml_path.read_text()) or {}
    except Exception:
        return []
    recs = doc.get("records") if isinstance(doc, dict) else None
    return [r for r in (recs or []) if isinstance(r, dict)]

def _sort_key(rec: dict):
    return (-(rec.get("canon_score") or 0), (rec.get("title") or "").lower())

def converge(
    folder: Path,
    min_score: int = DEFAULT_MIN_SCORE,
    log=print,
) -> dict:
    queries = folder / "queries.txt"
    if not queries.exists():
        return {"error": f"{queries} not found"}

    seeds = [
        ln.strip()
        for ln in queries.read_text().splitlines()
        if ln.strip() and not ln.startswith("#")
    ]

    existing = _load_existing(folder / "primary-papers.yaml")
    merged: dict[str, dict] = {_record_key(r): r for r in existing}
    superseded: list[dict] = []

    stats = {
        "seeds": len(seeds),
        "added": 0,
        "updated": 0,
        "kept": 0,
        "rejected": 0,
        "superseded": 0,
        "failed": 0,
    }

    for seed in seeds:
        rec = canon.resolve(seed)
        if not rec:
            stats["failed"] += 1
            log(f"  FAIL resolve: {seed}")
            continue
        reason = gate_record(rec, min_score)
        if reason:
            stats["rejected"] += 1
            log(f"  REJECT [{reason}]: {seed} -> {(rec.get('title') or '')[:60]}")
            continue
        key = _record_key(rec)
        prev = merged.get(key)
        if prev is None:
            merged[key] = rec
            stats["added"] += 1
            log(f"  ADD  {rec.get('canon_score')}  {(rec.get('title') or '')[:60]}")
        else:
            prev_s = prev.get("canon_score") or 0
            new_s = rec.get("canon_score") or 0
            if new_s > prev_s:
                superseded.append(prev)
                merged[key] = rec
                stats["updated"] += 1
                stats["superseded"] += 1
                log(f"  UPD  {prev_s}->{new_s}  {(rec.get('title') or '')[:55]}")
            else:
                if rec.get("citation_count", 0) > prev.get("citation_count", 0):
                    prev["citation_count"] = rec["citation_count"]
                    prev["fetched_at"] = rec.get("fetched_at")
                stats["kept"] += 1

    out_records = sorted(merged.values(), key=_sort_key)

    if superseded:
        month = dt.datetime.utcnow().strftime("%Y-%m")
        arch_dir = folder / "_archive" / month
        arch_dir.mkdir(parents=True, exist_ok=True)
        arch_path = arch_dir / "primary-papers.yaml"
        prior = _load_existing(arch_path)
        prior_keys = {_record_key(r) for r in prior}
        for s in superseded:
            if _record_key(s) not in prior_keys:
                prior.append(s)
        arch_path.write_text(_yaml_dump({"records": prior}))
        log(f"  archived {len(superseded)} superseded -> {arch_path}")

    yaml_path = folder / "primary-papers.yaml"
    new_text = _yaml_dump({"records": out_records})
    changed = (not yaml_path.exists()) or yaml_path.read_text() != new_text
    if changed:
        yaml_path.write_text(new_text)
    stats["total_records"] = len(out_records)
    stats["changed"] = changed
    return stats

def main(argv=None) -> int:
    p = argparse.ArgumentParser(
        prog="intake.py",
        description="Convergent, quality-gated canon-intake over a canon folder.",
    )
    p.add_argument("folder", help="bucket-canon/<branch>/<concept>/ (must have queries.txt)")
    p.add_argument(
        "--min-score",
        type=int,
        default=DEFAULT_MIN_SCORE,
        help=f"canon_score floor for the quality gate (default {DEFAULT_MIN_SCORE})",
    )
    args = p.parse_args(argv)
    folder = Path(args.folder)
    stats = converge(folder, args.min_score)
    if "error" in stats:
        print(f"ERROR: {stats['error']}", file=sys.stderr)
        return 2
    print(
        f"converged {folder}: total={stats['total_records']} "
        f"added={stats['added']} updated={stats['updated']} kept={stats['kept']} "
        f"rejected={stats['rejected']} superseded={stats['superseded']} "
        f"failed={stats['failed']} changed={stats['changed']}"
    )
    return 0

if __name__ == "__main__":
    sys.exit(main())
