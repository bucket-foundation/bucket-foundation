"""`hte-synth` console script: `run` and `sweep` over `hte.synth`'s
random worlds.

stdlib `argparse` only, matching this package's own no-dependencies
contract (`pyproject.toml`).

Every campaign this module runs sets `HTE_LLM_MODE=fake`
(`hte.fakellm`'s own dispatch) and registers a per-seed, zero-argument
closure into `hte.runner._CORPUS_LOADERS` under a unique key, rather than
building a `Corpus` object `run_campaign` could take directly:
`run_campaign`'s own `cfg["corpus"]` contract is a NAME looked up in that
module-level dict (`hte.runner`'s own `_CORPUS_LOADERS`, keyed by corpus
name, each a zero-arg factory), with no path for handing it an
already-built `Corpus`. `hte.runner.py` is off limits to edit on this
branch (another agent owns it), so this module extends that dict at
RUNTIME instead of adding a new corpus-name branch to its source: a
legitimate, self-contained use of Python's own dynamic module state,
undone automatically the moment this process exits.

`hte.runner` itself is imported lazily, inside `_import_runner`, and
retried rather than imported at this module's own top level: if another
agent's edit to `hte/runner.py` leaves it transiently broken on import
(a syntax error mid-save, a half-written function), `hte-synth run`
retries the import after 60 seconds, up to five times, before reporting
failure, instead of crashing on the first attempt against what may be a
few seconds of in-progress work.
"""
from __future__ import annotations

import argparse
import contextlib
import inspect
import json
import os
import statistics
import sys
import time
from pathlib import Path
from types import ModuleType
from typing import Any

from . import synth

_IMPORT_RETRIES = 5
_IMPORT_RETRY_DELAY_S = 60.0


def _import_runner(*, retries: int = _IMPORT_RETRIES, delay_s: float = _IMPORT_RETRY_DELAY_S) -> ModuleType:
    """`hte.runner`, retried on any import-time failure (module docstring):
    up to `retries` retries, `delay_s` seconds apart, before re-raising the
    last failure."""
    last_exc: Exception | None = None
    for attempt in range(retries + 1):
        try:
            from hte import runner as runner_module
            return runner_module
        except Exception as exc:  # noqa: BLE001 - any import-time failure in a file another agent may be mid-editing
            last_exc = exc
            if attempt < retries:
                print(
                    f"hte-synth: hte.runner import failed (attempt {attempt + 1}/{retries + 1}): {exc!r}; "
                    f"retrying in {delay_s:.0f}s",
                    file=sys.stderr,
                )
                time.sleep(delay_s)
    raise RuntimeError(f"hte.runner failed to import after {retries + 1} attempts") from last_exc


def _parse_seed_range(spec: str) -> list[int]:
    """`"0-49"` -> `[0, 1, ..., 49]`; `"0,3,7"` -> `[0, 3, 7]`; either form
    may repeat comma-separated, `"0-4,10,12-14"` -> `[0,1,2,3,4,10,12,13,14]`.
    Order preserved, duplicates dropped."""
    seeds: list[int] = []
    seen: set[int] = set()
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            lo_s, hi_s = part.split("-", 1)
            lo, hi = int(lo_s), int(hi_s)
            step = 1 if hi >= lo else -1
            candidates = range(lo, hi + step, step)
        else:
            candidates = [int(part)]
        for s in candidates:
            if s not in seen:
                seen.add(s)
                seeds.append(s)
    return seeds


def _parse_values(spec: str) -> list[float]:
    return [float(v.strip()) for v in spec.split(",") if v.strip()]


def _parse_seeds_or_error(parser: argparse.ArgumentParser, spec: str) -> list[int]:
    """`_parse_seed_range(spec)`, with every way it can go wrong (an
    unparseable part, a spec with no parseable seeds at all, e.g. `""` or
    `","`) turned into `parser.error(...)` (`argparse`'s own usage
    message plus `SystemExit(2)`) rather than a raw `ValueError`
    propagating out of `main()`."""
    try:
        seeds = _parse_seed_range(spec)
    except ValueError as exc:
        parser.error(f"--seeds: {exc} (want a range like \"0-49\", a comma list like \"0,3,7\", or a single integer)")
    if not seeds:
        parser.error(f"--seeds: {spec!r} names no seeds (want a range like \"0-49\", a comma list like \"0,3,7\", or a single integer)")
    return seeds


def _make_world_param_names() -> list[str]:
    """`sweep --param`'s registered names: every `hte.synth.make_world`
    keyword-only parameter except `seed` itself (the seed loop's own
    positional). Read from `make_world`'s live signature, so the accepted
    set (`--help` text and `sweep`'s own validation) can never drift out
    of sync with the function it targets, unlike a hand-maintained copy
    of the name list."""
    return [
        name
        for name, param in inspect.signature(synth.make_world).parameters.items()
        if name != "seed" and param.kind in (inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Parameter.KEYWORD_ONLY)
    ]


def _campaign_config(seed: int, corpus_name: str, out_dir: Path) -> dict[str, Any]:
    """The `hte.runner.run_campaign` config every synthetic campaign
    shares: fake-mode-cheap and small-world-sized, so `max_hypotheses` is
    set generous enough (`~5000`, against an empirically-measured raw
    generation count of `~2300` for this preset's own evidence volume)
    that `hte.runner.run_campaign`'s own address-ascending truncation
    (`README.md`'s own documented defect for a small `max_hypotheses`
    against a claim-gap-sized frontier) never bites at this scale, rather
    than risk it silently dropping a true event's own address before
    `hte.synth.score_against_truth` ever sees the survivor population.
    """
    return {
        "campaign": str(seed),
        "corpus": corpus_name,
        "out_dir": str(out_dir),
        "cache_dir": str(out_dir / "_llm-cache"),
        "replay_only": False,
        "seeds": 1,
        "generate_n": 12,
        "generate_evidence_sample": 8,
        "combinatorial_max_items": 100,
        "max_hypotheses": 5000,
        "tournament_rounds": 2,
        "run_extraction": False,
        "run_calibration": True,
        "resolution": None,
    }


@contextlib.contextmanager
def _fake_llm_mode():
    """Sets `HTE_LLM_MODE=fake` for the duration of the `with` block,
    restoring whatever value (or absence) `os.environ` held before.
    `hte.roles`' own call sites never pass `mode="fake"` through to
    `hte.llm.complete` explicitly (`hte/roles.py` is off limits to edit
    on this branch), so the environment variable is the only lever this
    module has to make an existing `run_campaign` call run fake; leaving
    it permanently set after one call would silently flip every OTHER
    `hte.llm.complete` call in the same process (any other test in the
    same `pytest` run, not just this module's own) into fake mode too,
    confirmed empirically: an earlier draft of this function set the
    variable with no `finally` and broke fifteen unrelated tests in
    `tests/test_llm.py`, `tests/test_referee.py`, and `tests/test_runner.
    py` the moment `tests/campaigns/` (alphabetically first) ran before
    them in the same `pytest` process.
    """
    previous = os.environ.get("HTE_LLM_MODE")
    os.environ["HTE_LLM_MODE"] = "fake"
    try:
        yield
    finally:
        if previous is None:
            os.environ.pop("HTE_LLM_MODE", None)
        else:
            os.environ["HTE_LLM_MODE"] = previous


def run_one_seed(runner_module: ModuleType, seed: int, out_dir: Path, world_kwargs: dict[str, Any]) -> dict[str, Any]:
    """One seed's whole campaign: build the world, register it as a
    corpus loader, run `run_campaign`, score it against the planted
    truth. Returns one `SUMMARY.json["per_seed"]` row."""
    world = synth.make_world(seed, **world_kwargs)
    corpus_name = f"synthetic-{seed}-{id(world)}"
    runner_module._CORPUS_LOADERS[corpus_name] = (lambda w=world: w.corpus)
    try:
        t0 = time.time()
        with _fake_llm_mode():
            artifacts = runner_module.run_campaign(_campaign_config(seed, corpus_name, out_dir))
        elapsed_s = time.time() - t0
    finally:
        runner_module._CORPUS_LOADERS.pop(corpus_name, None)

    score = synth.score_against_truth(artifacts, world)
    return {
        "seed": seed,
        "run_dir": str(artifacts.run_dir),
        "elapsed_s": elapsed_s,
        "n_survivors": len(artifacts.hypotheses),
        "coverage_of_truth": score["coverage_of_truth"],
        "n_true_events": score["n_true_events"],
        "n_matched": score["n_matched"],
        "brier_true_only": score["brier_true_only"],
        "exotic_false_positive_rate": score["exotic_false_positive_rate"],
        "rank_among_neighbors_mean": score["rank_among_neighbors_mean"],
        "engine_calibration_brier": artifacts.calibration["brier_score"] if artifacts.calibration else None,
        "engine_calibration_coverage_of_truth": artifacts.calibration["coverage_of_truth"] if artifacts.calibration else None,
        "engine_coverage_missing_mass": artifacts.coverage.get("missing_mass"),
        "self_report_present": bool(artifacts.self_report),
        "precision_at_k": score["precision_at_k"],
    }


def _aggregate(rows: list[dict[str, Any]], key: str) -> dict[str, Any]:
    values = [r[key] for r in rows if r.get(key) is not None]
    if not values:
        return {"mean": None, "median": None, "min": None, "max": None, "n": 0}
    return {
        "mean": statistics.fmean(values), "median": statistics.median(values),
        "min": min(values), "max": max(values), "n": len(values),
    }


def _worst_seed(rows: list[dict[str, Any]]) -> dict[str, Any] | None:
    """The seed with the lowest `coverage_of_truth` (ties broken by the
    highest `brier_true_only`), the one row most worth a human looking at
    first."""
    scored = [r for r in rows if r.get("coverage_of_truth") is not None]
    if not scored:
        return None
    worst = min(scored, key=lambda r: (r["coverage_of_truth"], -(r["brier_true_only"] or 0.0)))
    return {
        "seed": worst["seed"], "coverage_of_truth": worst["coverage_of_truth"],
        "brier_true_only": worst["brier_true_only"], "exotic_false_positive_rate": worst["exotic_false_positive_rate"],
        "reason": "lowest coverage_of_truth in this run (ties broken by highest brier_true_only)",
    }


def _write_summary_md(path: Path, summary: dict[str, Any]) -> None:
    lines = ["# hte-synth run summary", ""]
    lines.append(f"Seeds: {summary['seeds'][0]}-{summary['seeds'][-1]} ({len(summary['seeds'])} total)" if summary["seeds"] else "Seeds: (none)")
    lines.append(f"World preset: `{json.dumps(summary['world_config'])}`")
    lines.append("")
    lines.append("## Per-seed")
    lines.append("")
    lines.append("| Seed | Survivors | Coverage of truth | Brier (true only) | Exotic FP rate | Elapsed (s) |")
    lines.append("|---|---|---|---|---|---|")
    for r in summary["per_seed"]:
        lines.append(
            f"| {r['seed']} | {r['n_survivors']} | {r['coverage_of_truth']} | {r['brier_true_only']} | "
            f"{r['exotic_false_positive_rate']} | {r['elapsed_s']:.2f} |"
        )
    lines += ["", "## Aggregate", ""]
    for key in ("coverage_of_truth", "brier_true_only", "exotic_false_positive_rate"):
        agg = summary["aggregate"][key]
        lines.append(f"- **{key}**: mean={agg['mean']}, median={agg['median']}, min={agg['min']}, max={agg['max']}")
    worst = summary["aggregate"]["worst_seed"]
    lines += ["", "## Worst seed", ""]
    if worst:
        lines.append(f"Seed {worst['seed']}: coverage_of_truth={worst['coverage_of_truth']}, "
                      f"brier_true_only={worst['brier_true_only']}, exotic_false_positive_rate={worst['exotic_false_positive_rate']}. "
                      f"{worst['reason']}")
    else:
        lines.append("(no scored seeds)")
    lines += ["", f"## Gate", "", f"min_coverage={summary['min_coverage']}, max_brier={summary['max_brier']} -> "
              f"**{'PASS' if summary['passed'] else 'FAIL'}**", ""]
    path.write_text("\n".join(lines) + "\n")


def _cmd_run(args: argparse.Namespace) -> int:
    runner_module = _import_runner()
    seeds = _parse_seeds_or_error(args.parser, args.seeds)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    rows: list[dict[str, Any]] = []
    for seed in seeds:
        row = run_one_seed(runner_module, seed, out_dir, dict(synth.SMALL_WORLD_KWARGS))
        rows.append(row)
        print(f"seed {seed}: survivors={row['n_survivors']} coverage_of_truth={row['coverage_of_truth']} "
              f"brier_true_only={row['brier_true_only']} exotic_fp={row['exotic_false_positive_rate']} "
              f"({row['elapsed_s']:.2f}s)")

    coverage_agg = _aggregate(rows, "coverage_of_truth")
    brier_agg = _aggregate(rows, "brier_true_only")
    fp_agg = _aggregate(rows, "exotic_false_positive_rate")
    passed = (
        (coverage_agg["mean"] is not None and coverage_agg["mean"] >= args.min_coverage)
        and (brier_agg["mean"] is not None and brier_agg["mean"] <= args.max_brier)
    )
    summary = {
        "seeds": seeds,
        "world_config": dict(synth.SMALL_WORLD_KWARGS),
        "per_seed": rows,
        "aggregate": {
            "coverage_of_truth": coverage_agg, "brier_true_only": brier_agg,
            "exotic_false_positive_rate": fp_agg, "worst_seed": _worst_seed(rows),
        },
        "min_coverage": args.min_coverage,
        "max_brier": args.max_brier,
        "passed": passed,
    }
    (out_dir / "SUMMARY.json").write_text(json.dumps(summary, indent=2, default=str))
    _write_summary_md(out_dir / "SUMMARY.md", summary)
    print(f"\nwrote {out_dir / 'SUMMARY.json'} and {out_dir / 'SUMMARY.md'}")
    print(f"aggregate: coverage_of_truth mean={coverage_agg['mean']}, brier_true_only mean={brier_agg['mean']}, "
          f"exotic_false_positive_rate mean={fp_agg['mean']}")
    print(f"gate: min_coverage={args.min_coverage} max_brier={args.max_brier} -> {'PASS' if passed else 'FAIL'}")
    return 0 if passed else 1


def _cmd_sweep(args: argparse.Namespace) -> int:
    runner_module = _import_runner()
    registered_params = _make_world_param_names()
    if args.param not in registered_params:
        args.parser.error(
            f"--param: {args.param!r} is not a hte.synth.make_world kwarg; "
            f"registered params: {', '.join(registered_params)}"
        )
    seeds = _parse_seeds_or_error(args.parser, args.seeds)
    try:
        values = _parse_values(args.values)
    except ValueError as exc:
        args.parser.error(f"--values: {exc} (want a comma-separated list of numbers like \"0,0.1,0.2\")")
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    table: list[dict[str, Any]] = []
    for value in values:
        rows: list[dict[str, Any]] = []
        for seed in seeds:
            world_kwargs = {**synth.SMALL_WORLD_KWARGS, args.param: value}
            rows.append(run_one_seed(runner_module, seed, out_dir / f"{args.param}={value}", world_kwargs))
        table.append({
            "param": args.param,
            "value": value,
            "coverage_of_truth": _aggregate(rows, "coverage_of_truth"),
            "brier_true_only": _aggregate(rows, "brier_true_only"),
            "exotic_false_positive_rate": _aggregate(rows, "exotic_false_positive_rate"),
            "n_seeds": len(rows),
        })

    (out_dir / "SWEEP.json").write_text(json.dumps({"param": args.param, "seeds": seeds, "table": table}, indent=2, default=str))
    print(f"\nSweep of {args.param!r} over {values} ({len(seeds)} seeds each):\n")
    header = f"{'value':>10} | {'coverage_mean':>13} | {'brier_mean':>10} | {'exotic_fp_mean':>14}"
    print(header)
    print("-" * len(header))
    for row in table:
        print(
            f"{row['value']:>10} | {row['coverage_of_truth']['mean']!s:>13} | "
            f"{row['brier_true_only']['mean']!s:>10} | {row['exotic_false_positive_rate']['mean']!s:>14}"
        )
    print(f"\nwrote {out_dir / 'SWEEP.json'}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="hte-synth", description="Random synthetic campaigns with planted truth.")
    sub = parser.add_subparsers(dest="command", required=True)

    p_run = sub.add_parser("run", help="run one campaign per seed and score it against planted truth")
    p_run.add_argument("--seeds", required=True, help='seed range, e.g. "0-49" or "0,3,7"')
    p_run.add_argument("--out", required=True, help="output directory (runs/synth/<seed>/... per seed, plus SUMMARY.json/.md)")
    p_run.add_argument("--min-coverage", type=float, default=0.8, help="exit non-zero if aggregate coverage_of_truth falls below this (default 0.8)")
    p_run.add_argument("--max-brier", type=float, default=0.25, help="exit non-zero if mean brier_true_only exceeds this (default 0.25)")
    p_run.set_defaults(func=_cmd_run, parser=p_run)

    p_sweep = sub.add_parser("sweep", help="sweep one hte.synth.make_world parameter across values")
    p_sweep.add_argument(
        "--param",
        required=True,
        help="a hte.synth.make_world kwarg name; registered params: " + ", ".join(_make_world_param_names()),
    )
    p_sweep.add_argument("--values", required=True, help='comma-separated values, e.g. "0,0.1,0.2,0.4"')
    p_sweep.add_argument("--seeds", required=True, help='seed range, e.g. "0-19"')
    p_sweep.add_argument("--out", default="runs/synth-sweep", help="output directory")
    p_sweep.set_defaults(func=_cmd_sweep, parser=p_sweep)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
