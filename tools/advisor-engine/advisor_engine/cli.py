from __future__ import annotations

import argparse
import json
import os
import resource
import sqlite3
import sys
import time
from pathlib import Path

from . import build as build_mod
from . import coverage, query, write_review
from .scan import assert_clean
from .paths import EngineError, current_build, engine_home, free_guard, open_engine, open_store, require_acknowledgement

QUERY_SCHEMA = "bucket.advisor-query/1"


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="advisor-engine", description="Founder-only advisor search over the private contact store.")
    p.add_argument("--stats", action="store_true", help="print seconds and peak memory to stderr")
    sub = p.add_subparsers(dest="command", required=True)
    sub.add_parser("build", help="build features from the store")
    sub.add_parser("status", help="print the pool tables of the current build")
    q = sub.add_parser("query", help="list advisors for a field, topics or a short description")
    q.add_argument("--field")
    q.add_argument("--topic", action="append", default=[])
    q.add_argument("--text", default="")
    q.add_argument("--country", action="append", default=[])
    q.add_argument("--exclude-country", action="append", default=[])
    q.add_argument("--degree", default="")
    q.add_argument("--language", default="")
    q.add_argument("--funding", default="")
    q.add_argument("--limit", type=int, default=25)
    q.add_argument("--query-file")
    q.add_argument("--review", action="store_true", help="save a review file inside the engine directory")
    q.add_argument("--quiet", action="store_true", help="print counts alone")
    return p


def query_from(args) -> query.Query:
    q = query.Query(args.field, list(args.topic), args.text, list(args.country), list(args.exclude_country), args.degree, args.language, args.funding, args.limit)
    if args.query_file:
        raw = json.loads(Path(args.query_file).read_text())
        if raw.get("schema") != QUERY_SCHEMA:
            raise EngineError(f"expected a {QUERY_SCHEMA} file")
        if raw.get("admired_works"):
            raise EngineError("admired works need an OpenAlex lookup, which this build leaves out")
        countries = raw.get("countries") or {}
        q.field = q.field or raw.get("field")
        q.text = q.text or str(raw.get("interests") or "")[:200000]
        q.include = q.include or list(countries.get("include") or [])
        q.exclude = q.exclude or list(countries.get("exclude") or [])
        q.degree = q.degree or str(raw.get("degree") or "")
        q.language = q.language or str(raw.get("language") or "")
        q.funding = q.funding or str(raw.get("funding") or "")
    if not (q.field or q.topics or q.text):
        raise EngineError("give a field, a topic or a short description")
    return q


def dispatch(args, out) -> None:
    home = engine_home(create=False)
    require_acknowledgement(home)
    free_guard(home)
    if args.command == "build":
        wide = os.environ.get("BKT_AUTHORS_WIDE")
        taxonomy = os.environ.get("BKT_TOPIC_TAXONOMY")
        cov = build_mod.build(open_store(), home, Path(wide) if wide else None, log=lambda m: print(m, file=out), taxonomy=Path(taxonomy) if taxonomy else None)
        build_mod.print_tables(cov, log=lambda m: print(m, file=out))
        return
    bdir = current_build(home)
    if args.command == "status":
        build_mod.print_tables(coverage.load(bdir, home), log=lambda m: print(m, file=out))
        return
    store, eng = open_store(), open_engine(bdir)
    result = query.run(query_from(args), store, eng, home, bdir)
    text = query.render(result)
    if args.review:
        path = write_review.save(home, result)
        text += f"\n\nReview file: {path}"
    if args.quiet:
        text = f"{query.HEADINGS[result.mode]}. {result.candidates} candidates, {len(result.rows)} rows."
    print(assert_clean(text), file=out)


def main(argv: list[str] | None = None, out=None) -> int:
    args = parser().parse_args(argv)
    out = out or sys.stdout
    started = time.time()
    code = 0
    try:
        dispatch(args, out)
    except EngineError as e:
        print(f"advisor-engine: {e}", file=sys.stderr)
        code = 2
    except sqlite3.Error as e:
        print(f"advisor-engine: a database could not be read, so nothing is shown: {type(e).__name__}", file=sys.stderr)
        code = 3
    if args.stats:
        peak = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024
        print(f"seconds {time.time() - started:.1f}, peak memory {peak:.0f} MB", file=sys.stderr)
    return code
