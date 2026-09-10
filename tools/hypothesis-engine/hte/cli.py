"""`hte` console script: `campaign run`, `calibrate`, `views`, `purge`.

stdlib `argparse` only, matching this package's own no-dependencies
contract (`pyproject.toml`).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import calibrate, export, purge as purge_mod, runner
from .belief import Constants
from .corpus import education_atlas, fixtures as fixtures_corpus, production, research_os_outbox
from .corpus import quantum_history

_CORPUS_LOADERS = {
    "quantum-history": quantum_history.ingest,
    "fixtures": fixtures_corpus.build,
    "education-atlas": education_atlas.load,
    "production": production.load,
    # ros-12 item 2: `public.research_os_productions_outbox`, read (not
    # marked consumed) through the existing normalizer. `hte.runner.
    # run_campaign` has its own separate `_CORPUS_LOADERS` (`hte/runner.py`)
    # this dict does not feed; `scripts/campaign_research_os.py` registers
    # this same loader there at call time for a real campaign run, see that
    # script's own header comment.
    "research-os": research_os_outbox.load,
}


def _cmd_campaign_run(args: argparse.Namespace) -> int:
    # `--campaign` defaults to `None` (`build_parser`'s own default), read
    # here as "name this campaign after its own corpus": a `runs/default/`
    # folder gave no hint which corpus a stray run directory came from
    # once more than one corpus had ever been run, and every campaign
    # this package ships runs exactly one corpus for its whole life, so
    # the corpus name is already the campaign's own natural identity.
    # `--campaign` still overrides it for a caller running the same
    # corpus under two named campaigns side by side.
    config = {
        "campaign": args.campaign or args.corpus,
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
        ("resolution", args.resolution),
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
    print(
        f"brier_score={result['brier_score']} over {result['n_covered_events']} of "
        f"{result['n_holdout_events']} held-out events (coverage_of_truth="
        f"{result['coverage_of_truth']}) at cutoff {cutoff}"
    )
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


def _cmd_purge(args: argparse.Namespace) -> int:
    report = purge_mod.purge(
        args.production,
        learner_id=args.learner,
        runs_root=args.runs_root,
        cache_dir=args.cache_dir,
        public_root=args.public_root,
        dry_run=args.dry_run,
    )
    print(json.dumps(report, indent=2, default=str))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="hte", description="History Hypothesis Engine")
    sub = parser.add_subparsers(dest="command", required=True)

    campaign = sub.add_parser("campaign", help="run a full engine-loop campaign")
    campaign_sub = campaign.add_subparsers(dest="campaign_command", required=True)
    run_p = campaign_sub.add_parser("run", help="run one campaign end to end")
    run_p.add_argument("--corpus", default="quantum-history", choices=sorted(_CORPUS_LOADERS))
    run_p.add_argument("--out", default="runs")
    run_p.add_argument("--campaign", default=None, help="default: the corpus name (--corpus)")
    run_p.add_argument("--cache-dir", default=None)
    run_p.add_argument("--replay-only", action="store_true")
    run_p.add_argument("--seeds", type=int, default=3)
    run_p.add_argument("--verbose", action="store_true")
    run_p.add_argument("--generate-n", type=int, default=None, help="LLM-proposed placements per generate() call (default: runner.DEFAULT_CONFIG)")
    run_p.add_argument("--combinatorial-max-items", type=int, default=None, help="cap on the combinatorial sweep per seed (default: runner.DEFAULT_CONFIG)")
    run_p.add_argument("--max-hypotheses", type=int, default=None, help="cap on hypotheses carried into critique/scoring/tournament (default: runner.DEFAULT_CONFIG)")
    run_p.add_argument("--tournament-rounds", type=int, default=None, help="Swiss-style debate rounds (default: runner.DEFAULT_CONFIG)")
    run_p.add_argument(
        "--resolution", default=None,
        choices=["year", "decade", "century", "millennium", "era"],
        help="pin the TIME_BIN rung instead of auto-selecting one from the corpus's own ground-truth span",
    )
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

    purge_p = sub.add_parser("purge", help="remove or redact artifacts derived from a production id (docs/PRIVACY.md)")
    purge_p.add_argument("--production", required=True, help="production id to purge")
    purge_p.add_argument("--learner", default=None, help="label only, see docs/PRIVACY.md: this engine never stores a raw learner id")
    purge_p.add_argument("--runs-root", default=purge_mod.DEFAULT_RUNS_ROOT)
    purge_p.add_argument("--cache-dir", default=None, help="default: <runs-root>/_llm-cache")
    purge_p.add_argument("--public-root", default=purge_mod.DEFAULT_PUBLIC_ROOT)
    purge_p.add_argument("--dry-run", action="store_true")
    purge_p.set_defaults(func=_cmd_purge)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
