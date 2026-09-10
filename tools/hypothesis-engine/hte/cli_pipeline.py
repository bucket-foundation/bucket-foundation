"""`hte-pipeline` console script: `run`, the whole choose-run-write-
review-publish loop over `hte.pipeline.run_pipeline`.

stdlib `argparse` only, matching this package's own no-dependencies
contract (`pyproject.toml`), the same pattern `hte/cli.py` follows for
the `hte` console script.
"""
from __future__ import annotations

import argparse
import json
import sys

from . import pipeline


def _cmd_run(args: argparse.Namespace) -> int:
    config = {
        "corpus": args.corpus,
        "out_dir": args.out,
        "dry_run": args.dry_run,
        "replay_only": args.replay_only,
        "seeds": args.seeds,
        "budget": args.budget,
        "writeback": args.writeback,
        "writeback_branch": args.branch,
        "writeback_floor_P": args.writeback_floor_p,
        "writeback_floor_u_max": args.writeback_floor_u_max,
        "skip_publish": args.skip_publish,
    }
    if args.campaign:
        config["campaign"] = args.campaign
    if args.from_run:
        config["from_run"] = args.from_run

    summary = pipeline.run_pipeline(config)
    print(f"pipeline written to {summary['pipeline_dir']}")
    print(f"outcome: {summary['outcome']}")
    for name, stage in summary["stages"].items():
        status = "skipped" if not stage["ran"] else ("ok" if stage["ok"] else "FAILED")
        print(f"  {name}: {status}")
    print(json.dumps({k: v for k, v in summary.items() if k != "stages"}, indent=2, default=str))
    return 0 if summary["outcome"] == "ok" else 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="hte-pipeline", description="History Hypothesis Engine, end to end")
    sub = parser.add_subparsers(dest="command", required=True)

    run_p = sub.add_parser("run", help="choose a period (or use a pinned corpus), run a campaign, write and referee a paper, and publish")
    run_p.add_argument("--corpus", default="quantum-history", help="a corpus hte.runner._CORPUS_LOADERS names, or a hte.periods.Period id to rank against")
    run_p.add_argument("--campaign", default=None, help="defaults to --corpus")
    run_p.add_argument("--out", default="runs")
    run_p.add_argument("--budget", type=float, default=10.0, help="hte.periods.choose_period's own retrieval budget")
    run_p.add_argument("--seeds", type=int, default=3)
    run_p.add_argument("--dry-run", action="store_true", help="hte.publish.publish's own dry_run: plan the commit and gdrive mirror, run neither")
    run_p.add_argument("--replay-only", action="store_true", help="every LLM call (hte.runner.run_campaign and hte.referee.referee) runs from committed cache only")
    run_p.add_argument("--from-run", default=None, help="an existing campaign run directory; skips period choice and run_campaign, reusing its own artifacts")
    run_p.add_argument("--writeback", action="store_true", help="hte.canon_writeback.write_back as an optional stage after referee and before publish")
    run_p.add_argument("--branch", default=None, help="the bucket-canon branch write_back targets, e.g. 07-mind; required with --writeback")
    run_p.add_argument("--writeback-floor-p", type=float, default=0.6, help="write_back's own floor_P")
    run_p.add_argument("--writeback-floor-u-max", type=float, default=0.5, help="write_back's own floor_u_max")
    run_p.add_argument("--skip-publish", action="store_true", help="skip the publish stage (commit + gdrive); use when a PR already carries that step")
    run_p.set_defaults(func=_cmd_run)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
