"""`hte` console script: `campaign run`, `calibrate`, `views`.

stdlib `argparse` only, matching this package's own no-dependencies
contract (`pyproject.toml`).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import calibrate, export, runner
from .belief import Constants
from .corpus import fixtures as fixtures_corpus
from .corpus import quantum_history

_CORPUS_LOADERS = {
    "quantum-history": quantum_history.ingest,
    "fixtures": fixtures_corpus.build,
}


def _cmd_campaign_run(args: argparse.Namespace) -> int:
    config = {
        "campaign": args.campaign,
        "corpus": args.corpus,
        "out_dir": args.out,
        "replay_only": args.replay_only,
        "seeds": args.seeds,
        "verbose": args.verbose,
    }
    if args.cache_dir:
        config["cache_dir"] = args.cache_dir
    for key, value in (
        ("generate_n", args.generate_n),
        ("combinatorial_max_items", args.combinatorial_max_items),
        ("max_hypotheses", args.max_hypotheses),
        ("tournament_rounds", args.tournament_rounds),
    ):
        if value is not None:
            config[key] = value
    artifacts = runner.run_campaign(config)
    print(f"run written to {artifacts.run_dir}")
    print(json.dumps(artifacts.manifest["counts"], indent=2, default=str))
    return 0


def _cmd_calibrate(args: argparse.Namespace) -> int:
    if args.corpus not in _CORPUS_LOADERS:
        print(f"unknown corpus {args.corpus!r}, expected one of {list(_CORPUS_LOADERS)}", file=sys.stderr)
        return 2
    corpus = _CORPUS_LOADERS[args.corpus]()
    if not corpus.ground_truth:
        print("corpus has no ground-truth events to hold out against", file=sys.stderr)
        return 1
    years = sorted(g.discovery_year for g in corpus.ground_truth)
    cutoff = args.cutoff_years or years[len(years) // 2]
    result = calibrate.run_holdout(corpus, Constants(), cutoff_years=cutoff)
    if args.fit:
        grid = {"W": [1.0, 2.0, 3.0], "lam": [0.25, 0.5, 0.75], "tier_scale": [0.75, 1.0, 1.25]}
        result["fit"] = calibrate.fit_constants(corpus, grid, cutoff_years=cutoff)
    out_dir = Path(args.out)
    calibrate.write_calibration(result, out_dir)
    print(f"calibration written to {out_dir / 'CALIBRATION.md'}")
    print(f"brier_score={result['brier_score']} over {result['n_sources']} split-worthy sources at cutoff {cutoff}")
    return 0


def _cmd_views(args: argparse.Namespace) -> int:
    run_dir = Path(args.run_dir)
    views_path = run_dir / "timeline.json"
    if not views_path.is_file():
        print(f"no timeline.json under {run_dir}", file=sys.stderr)
        return 1
    views = json.loads(views_path.read_text())
    export.write_views(views, run_dir)
    print((run_dir / "TIMELINE.md").read_text())
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="hte", description="History Hypothesis Engine")
    sub = parser.add_subparsers(dest="command", required=True)

    campaign = sub.add_parser("campaign", help="run a full engine-loop campaign")
    campaign_sub = campaign.add_subparsers(dest="campaign_command", required=True)
    run_p = campaign_sub.add_parser("run", help="run one campaign end to end")
    run_p.add_argument("--corpus", default="quantum-history", choices=sorted(_CORPUS_LOADERS))
    run_p.add_argument("--out", default="runs")
    run_p.add_argument("--campaign", default="default")
    run_p.add_argument("--cache-dir", default=None)
    run_p.add_argument("--replay-only", action="store_true")
    run_p.add_argument("--seeds", type=int, default=3)
    run_p.add_argument("--verbose", action="store_true")
    run_p.add_argument("--generate-n", type=int, default=None, help="LLM-proposed placements per generate() call (default: runner.DEFAULT_CONFIG)")
    run_p.add_argument("--combinatorial-max-items", type=int, default=None, help="cap on the combinatorial sweep per seed (default: runner.DEFAULT_CONFIG)")
    run_p.add_argument("--max-hypotheses", type=int, default=None, help="cap on hypotheses carried into critique/scoring/tournament (default: runner.DEFAULT_CONFIG)")
    run_p.add_argument("--tournament-rounds", type=int, default=None, help="Swiss-style debate rounds (default: runner.DEFAULT_CONFIG)")
    run_p.set_defaults(func=_cmd_campaign_run)

    calibrate_p = sub.add_parser("calibrate", help="run the discovery-date holdout")
    calibrate_p.add_argument("--corpus", default="quantum-history", choices=sorted(_CORPUS_LOADERS))
    calibrate_p.add_argument("--cutoff-years", type=int, default=None)
    calibrate_p.add_argument("--fit", action="store_true", help="also grid-search W/lam/tier_scale")
    calibrate_p.add_argument("--out", default="runs/_calibration")
    calibrate_p.set_defaults(func=_cmd_calibrate)

    views_p = sub.add_parser("views", help="re-render TIMELINE.md for a run directory")
    views_p.add_argument("run_dir")
    views_p.set_defaults(func=_cmd_views)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
