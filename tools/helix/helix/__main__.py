from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import publish as pub
from . import runs
from .adapters import corpus, damodaran, profiles, table
from .interp import METHODS
from .schema import SeriesError, load

EXIT_INVALID = 2

def _source(args) -> dict:
    return {"title": args.source_title, "url": args.source_url, "retrieved": args.retrieved, "license": args.license}

def read_series(args):
    if args.adapter == "series":
        return load(Path(args.input))
    if args.adapter == "table":
        return table.load(Path(args.input))
    if args.adapter == "profiles":
        return profiles.load(Path(args.input), args.name, args.slug, _source(args), args.omega)
    if args.adapter == "damodaran":
        return damodaran.load(
            Path(args.input), args.primes.split(","), args.retrieved, args.measure, args.slug, args.omega
        )
    return corpus.load(
        Path(args.input), args.primes.split(","), args.name, args.slug, _source(args), args.period, args.omega
    )

def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="helix")
    sub = p.add_subparsers(dest="cmd", required=True)
    for name in ("run", "validate"):
        s = sub.add_parser(name)
        s.add_argument("input")
        s.add_argument("--adapter", choices=("series", "table", "profiles", "damodaran", "corpus"), default="series")
        s.add_argument("--name", default="")
        s.add_argument("--slug", default="")
        s.add_argument("--primes", default="")
        s.add_argument("--measure", choices=tuple(damodaran.MEASURES), default="market_cap")
        s.add_argument("--period", choices=tuple(corpus.PERIODS), default="year")
        s.add_argument("--omega", type=float)
        s.add_argument("--source-title", default="")
        s.add_argument("--source-url", default="")
        s.add_argument("--retrieved", default="")
        s.add_argument("--license", default="")
        if name == "run":
            s.add_argument("--method", choices=METHODS, default="linear")
            s.add_argument("--horizon", type=int, default=0)
            s.add_argument("--step", type=float)
            s.add_argument("--seed", type=int, default=0)
            s.add_argument("--samples", type=int, default=200)
            s.add_argument("--out", type=Path, default=runs.DEFAULT_ROOT)
            s.add_argument("--mirror", action="store_true")
            s.add_argument("--raw", type=Path)
    s = sub.add_parser("publish")
    s.add_argument("run_dir", type=Path)
    s.add_argument("--repo", type=Path, default=Path.cwd())
    return p

def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    if args.cmd == "publish":
        try:
            dest = pub.publish(args.run_dir, args.repo)
        except pub.PublishRefused as exc:
            print(f"publish refused: {exc}", file=sys.stderr)
            return pub.EXIT_REFUSED
        print(dest)
        return 0
    try:
        series = read_series(args)
        if args.cmd == "validate":
            print(json.dumps({"slug": series.slug, "slices": len(series.t), "primes": list(series.primes)}))
            return 0
        run_dir, code = runs.run(
            series, args.out, args.method, args.horizon, args.step, args.seed, args.samples, args.mirror, args.raw
        )
    except SeriesError as exc:
        print(f"{exc.code}: {exc}", file=sys.stderr)
        return EXIT_INVALID
    print(run_dir)
    return code

if __name__ == "__main__":
    sys.exit(main())
