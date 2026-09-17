"""`hte` console script: `campaign run`/`results`, `calibrate`, `views`,
`holdout-ledger report`/`verify`, `question-map`, `purge`,
`predict register`/`resolve`/`report`.

stdlib `argparse` only, matching this package's own no-dependencies
contract (`pyproject.toml`).
"""
from __future__ import annotations

import argparse
import dataclasses
import json
import sys
from pathlib import Path
from typing import Any, Mapping

from . import artifacts, calibrate, diagnostics, export, holdout_ledger, predict, purge as purge_mod, question_map, runner
from .belief import Constants
from .corpus import education_atlas, fixtures as fixtures_corpus, literature, production, research_os_outbox, sacred_history
from .corpus import vindication_fixture
from .corpus import quantum_history, sacred_history_texts, younger_dryas

_CORPUS_LOADERS = {
    "quantum-history": quantum_history.ingest,
    "fixtures": fixtures_corpus.build,
    "vindication-fixture": vindication_fixture.build,
    "education-atlas": education_atlas.load,
    "production": production.load,
    # ros-12 item 2: `public.research_os_productions_outbox`, read (not
    # marked consumed) through the existing normalizer. `hte.runner.
    # run_campaign` has its own separate `_CORPUS_LOADERS` (`hte/runner.py`)
    # this dict does not feed; `scripts/campaign_research_os.py` registers
    # this same loader there at call time for a real campaign run, see that
    # script's own header comment.
    "research-os": research_os_outbox.load,
    # `literature.load_default`: both literature fixture batches combined
    # (`bkt-hte-literature-batch-two`), no network, deterministic; see
    # that function's own docstring for why it does not read the real
    # 82-card `LOCAL_INTAKE_DIR` tree yet.
    "literature": literature.load_default,
    "sacred-history": sacred_history.ingest,
    # Passage-level extraction over the primary texts this repo mirrors
    # for 6 of `sacred-history`'s 13 traditions (`hte.corpus.
    # sacred_history_texts`'s own module docstring, `docs/SACRED-HISTORY-
    # TEXTS.md`); `sacred_history.ingest(with_texts=True)` is the merged
    # reading, this entry is the bare texts-only corpus on its own.
    "sacred-history-texts": sacred_history_texts.load,
    "sacred-history-texts-slice-1": sacred_history_texts.load_slice_one,
    # 47 open-metadata, DOI-verified cards on the Younger Dryas boundary
    # (12.9-11.7 ka BP) impact-hypothesis debate; see `hte.runner.
    # _CORPUS_LOADERS`'s own identical entry and `hte.corpus.
    # younger_dryas`'s own module docstring.
    "younger-dryas": younger_dryas.load,
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
        "prior_ledger": args.prior_ledger,
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
        ("constants", args.constants),
    ):
        if value is not None:
            config[key] = value
    run_artifacts = runner.run_campaign(config)
    print(f"run written to {run_artifacts.run_dir}")
    print(json.dumps(run_artifacts.manifest["counts"], indent=2, default=str))
    return 0


def _actor_of(entry: dict[str, Any]) -> str | None:
    """`entry["slots"]["ACTOR"]` for a placement survivor, `None` for a
    sequence survivor: `hte.runner._survivor_slots` nests a sequence's
    two placements under `slots["first"/"second"]` instead of a
    top-level `ACTOR`, out of scope for this flat per-actor summary."""
    actor = (entry.get("slots") or {}).get("ACTOR")
    return actor if isinstance(actor, str) else None


def _per_actor_summary(
    survivors: list[dict[str, Any]], share_by_id: Mapping[str, float] | None = None,
) -> dict[str, dict[str, Any]]:
    """One row per ACTOR slot value named by a placement survivor in
    `survivors`: highest projected credence, lowest uncertainty mass,
    highest evidence-only lift (`b - d`), best-Elo survivor's rating and
    four profile projections, survivor count, and `best_share`, the
    largest explanandum-partition share (`hte.partition.partition_odds`'s
    `share`, via `share_by_id`) any survivor naming that actor holds."""
    rows: dict[str, dict[str, Any]] = {}
    best_elo_entry: dict[str, dict[str, Any]] = {}
    for entry in survivors:
        actor = _actor_of(entry)
        if actor is None:
            continue
        row = rows.setdefault(
            actor,
            {"max_P": None, "min_u": None, "max_lift": None, "best_elo": None, "best_share": None,
             "n_survivors": 0, "n_unscored": 0},
        )
        row["n_survivors"] += 1
        opinion = entry.get("opinion") or {}
        if not opinion.get("scored", opinion.get("u", 1.0) < 1.0):
            row["n_unscored"] += 1
        p_value, u_value, lift_value = opinion.get("P"), opinion.get("u"), opinion.get("lift")
        if p_value is not None and (row["max_P"] is None or p_value > row["max_P"]):
            row["max_P"] = p_value
        if u_value is not None and (row["min_u"] is None or u_value < row["min_u"]):
            row["min_u"] = u_value
        if lift_value is not None and (row["max_lift"] is None or lift_value > row["max_lift"]):
            row["max_lift"] = lift_value
        share = (share_by_id or {}).get(entry.get("hypothesis_id"))
        if share is not None and (row["best_share"] is None or share > row["best_share"]):
            row["best_share"] = share
        elo = entry.get("elo")
        if elo is not None and (row["best_elo"] is None or elo > row["best_elo"]):
            row["best_elo"] = elo
            best_elo_entry[actor] = entry
    for actor, row in rows.items():
        best = best_elo_entry.get(actor)
        row["profile_projections"] = ((best.get("robustness") or {}).get("projections") or {}) if best else {}
    return rows


def _share_by_hypothesis_id(views: dict[str, Any]) -> dict[str, float]:
    """`hypothesis_id -> partition share`, off `timeline.json`'s
    `event_views`/`pair_views`. Empty for a run with no `timeline.json`."""
    entries = [e for ev in views.get("event_views", []) for e in ev.get("ranked_placements", [])]
    entries += [e for p in views.get("pair_views", []) for e in p.get("competing_sequences", [])]
    return {
        e["hypothesis_id"]: e["partition"]["share"]
        for e in entries if e.get("partition") and e["partition"].get("share") is not None
    }


def _cmd_campaign_results(args: argparse.Namespace) -> int:
    """One flat, no-absolute-path JSON summary of a completed
    `campaign run`: `MANIFEST.json`'s own counts, a per-actor rollup
    over `survivors.json`, the ten survivors ranked by lift then Elo in
    full (`hte.export._rank_key`'s own ordering), a
    curated slice of `calibration.json` (when the run had ground truth
    to hold out against), and `self-report.json` verbatim. Every file
    this command reads is optional except `MANIFEST.json` itself
    (`artifacts.load_manifest`'s own contract): a run missing
    `survivors.json`, `timeline.json`, `calibration.json`, or
    `self-report.json` still gets a result, that section read as empty."""
    run_dir = Path(args.run_dir)
    manifest = artifacts.load_manifest(run_dir)

    survivors_path = run_dir / "survivors.json"
    survivors_data = json.loads(survivors_path.read_text()) if survivors_path.is_file() else {}
    survivors = survivors_data.get("survivors", [])

    views_path = run_dir / "timeline.json"
    views = json.loads(views_path.read_text()) if views_path.is_file() else {}
    share_by_id = _share_by_hypothesis_id(views)

    self_report_path = run_dir / "self-report.json"
    self_report = json.loads(self_report_path.read_text()) if self_report_path.is_file() else {}

    calibration_path = run_dir / "calibration.json"
    calibration: dict[str, Any] | None = None
    if calibration_path.is_file():
        raw = json.loads(calibration_path.read_text())
        calibration = {
            "brier": raw.get("brier_score"),
            "coverage_of_truth": raw.get("coverage_of_truth"),
            "mode": raw.get("mode"),
            "cutoff_years": raw.get("cutoff_years"),
            "n_holdout_events": raw.get("n_holdout_events"),
            "n_covered_events": raw.get("n_covered_events"),
        }
        # `hte.diagnostics.write_diagnostics`'s own `diagnostics.json`,
        # written by `hte calibrate --diagnose`: read only when a
        # caller placed one in the same run directory, per this
        # command's own "if present" contract for uncovered reasons.
        diagnostics_path = run_dir / "diagnostics.json"
        if diagnostics_path.is_file():
            reasons = json.loads(diagnostics_path.read_text()).get("reasons")
            if reasons:
                calibration["uncovered_reasons"] = reasons

    top = sorted(
        survivors,
        key=lambda e: (
            -(e.get("max_lift") if e.get("max_lift") is not None else float("-inf")),
            -(e.get("elo") if e.get("elo") is not None else float("-inf")),
        ),
    )[:10]

    result = {
        "run_id": run_dir.name,
        "campaign": manifest.campaign,
        "corpus": manifest.corpus,
        "counts": dataclasses.asdict(manifest.counts),
        "stance": (json.loads((run_dir / "MANIFEST.json").read_text()).get("counts") or {}).get("stance"),
        "per_actor": _per_actor_summary(survivors, share_by_id),
        "top": top,
        "calibration": calibration,
        "self_report": self_report,
        "source_run": {"run_id": run_dir.name, "git_sha": manifest.git_sha},
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result, indent=2, default=str))
    print(f"campaign results written to {out_path}")
    return 0


def _cmd_calibrate(args: argparse.Namespace) -> int:
    if args.corpus not in _CORPUS_LOADERS:
        print(f"unknown corpus {args.corpus!r}, expected one of {list(_CORPUS_LOADERS)}", file=sys.stderr)
        return 2
    corpus = _CORPUS_LOADERS[args.corpus]()
    if not corpus.ground_truth:
        print("corpus has no ground-truth events to hold out against", file=sys.stderr)
        return 1

    # An explicit `--cutoff-years` pins discovery-date holdout at that
    # cutoff, this command's own original, unconditional behavior,
    # unchanged (`hte.calibrate.fit_constants`'s own identical
    # explicit-cutoff-bypasses-auto-mode contract). With no cutoff given,
    # `run_calibration`'s own auto-picked mode (`choose_holdout_mode`)
    # decides instead: k-fold for a corpus with no real discovery lag
    # (quantum-history, education-atlas, fixtures, every `hte.synth`
    # world), discovery-date for one that has it (`production`). Bare
    # `run_holdout` used to run unconditionally here regardless of which
    # mode a corpus's own ground truth calls for, reading as
    # `coverage_of_truth: 0.0`-or-near-it on every corpus that never
    # exercised discovery-date holdout in the first place (`bkt-hte-
    # generation-coverage`).
    if args.cutoff_years is not None:
        result = calibrate.run_holdout(corpus, Constants(), cutoff_years=args.cutoff_years, corpus_name=args.corpus, freeze_vocab=args.freeze_vocab)
        result.setdefault("mode", "discovery_date")  # `--diagnose`'s own required field; bare run_holdout carries no "mode" key
    else:
        result = calibrate.run_calibration(corpus, Constants(), k=args.k, seed=args.kfold_seed, corpus_name=args.corpus, freeze_vocab=args.freeze_vocab)
    if args.fit:
        grid = {"W": [1.0, 2.0, 3.0], "lam": [0.25, 0.5, 0.75], "tier_scale": [0.75, 1.0, 1.25]}
        result["fit"] = calibrate.fit_constants(corpus, grid, cutoff_years=args.cutoff_years, k=args.k, seed=args.kfold_seed)
    out_dir = Path(args.out)
    calibrate.write_calibration(result, out_dir)
    print(f"calibration written to {out_dir / 'CALIBRATION.md'}")
    print(
        f"brier_score={result['brier_score']} over {result['n_covered_events']} of "
        f"{result['n_holdout_events']} held-out events (coverage_of_truth="
        f"{result['coverage_of_truth']}), mode={result.get('mode', 'discovery_date')}"
    )
    if args.diagnose:
        report = diagnostics.coverage_report(corpus, result)
        diagnostics.write_diagnostics(report, out_dir)
        print(f"diagnostics written to {out_dir / 'DIAGNOSTICS.md'}")
        print(f"reasons for the uncovered remainder: {report['reasons']}")
    if args.vindication:
        vindication = calibrate.run_vindication(corpus, Constants())
        (out_dir / "vindication.json").write_text(json.dumps(vindication, indent=2))
        print(
            f"vindication written to {out_dir / 'vindication.json'} "
            f"(vindication_rate={vindication['vindication_rate']}, false_alarm_rate={vindication['false_alarm_rate']})"
        )
    if args.shuffle:
        shuffle_result = diagnostics.shuffle_report(corpus, Constants(), seed=args.kfold_seed)
        diagnostics_path = out_dir / "diagnostics.json"
        merged = json.loads(diagnostics_path.read_text()) if diagnostics_path.is_file() else {}
        merged["link_shuffle"] = shuffle_result
        diagnostics_path.write_text(json.dumps(merged, indent=2))
        print(
            f"link-shuffle diagnostic written to {diagnostics_path} "
            f"(mean_correlation={shuffle_result['mean_correlation']:.3f}, "
            f"prior_only_fraction={shuffle_result['prior_only_fraction']:.3f})"
        )
    return 0


def _cmd_holdout_ledger_report(args: argparse.Namespace) -> int:
    """The hit-rate script `PLAN.md` section 10 asks for: the current
    ranking-holdout status (`hte.holdout_ledger.ranking_status`) over the
    ledger at `args.path`, printed as one JSON object to stdout."""
    status = holdout_ledger.ranking_status(path=args.path, min_verified=args.min_verified)
    print(json.dumps(status.to_dict(), indent=2))
    return 0


def _cmd_holdout_ledger_verify(args: argparse.Namespace) -> int:
    try:
        entry = holdout_ledger.verify_entry(
            args.entry_id, args.outcome, verified_by=args.verified_by, path=args.path,
        )
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    print(json.dumps(entry.to_dict(), indent=2))
    return 0


def _cmd_question_map(args: argparse.Namespace) -> int:
    # `_CORPUS_LOADERS` here (not `runner`'s own copy) is the more complete
    # registry: it carries `research-os` too, registered only at call time
    # in `runner`'s own dict per that dict's own comment above.
    corpus_names = set(_CORPUS_LOADERS)
    if args.write:
        return question_map.cmd_write(corpus_names=corpus_names)
    return question_map.cmd_check(corpus_names=corpus_names)


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
    if not report.get("complete", True):
        print(report.get("warning", "purge is incomplete: see report[\"unreadable\"]/[\"redaction_refused\"]"), file=sys.stderr)
        return 1
    return 0


def _cmd_predict_register(args: argparse.Namespace) -> int:
    kinds = tuple(k.strip() for k in args.kinds.split(",") if k.strip())
    predictions = predict.register(args.run_dir, horizon=args.horizon_days, kinds=kinds, floor_u=args.floor_u, u_max=args.u_max, out=args.out)
    by_kind: dict[str, int] = {}
    for p in predictions:
        by_kind[p.kind] = by_kind.get(p.kind, 0) + 1
    print(f"{len(predictions)} prediction(s) registered to {Path(args.out) / 'ledger.jsonl'}: {by_kind}")
    return 0


def _cmd_predict_resolve(args: argparse.Namespace) -> int:
    if args.corpus not in _CORPUS_LOADERS:
        print(f"unknown corpus {args.corpus!r}, expected one of {list(_CORPUS_LOADERS)}", file=sys.stderr)
        return 2
    corpus = _CORPUS_LOADERS[args.corpus]()
    report = predict.resolve(args.ledger, evidence_corpus=corpus, as_of=args.as_of)
    print(json.dumps(
        {k: v for k, v in report.to_dict().items() if k != "outcomes"},
        indent=2, default=str,
    ))
    return 0


def _cmd_predict_report(args: argparse.Namespace) -> int:
    if args.corpus not in _CORPUS_LOADERS:
        print(f"unknown corpus {args.corpus!r}, expected one of {list(_CORPUS_LOADERS)}", file=sys.stderr)
        return 2
    corpus = _CORPUS_LOADERS[args.corpus]()
    predict.resolve(args.ledger, evidence_corpus=corpus, as_of=args.as_of)
    resolutions_path = Path(args.ledger).parent / "RESOLUTIONS.md"
    print(resolutions_path.read_text())
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
    run_p.add_argument("--prior-ledger", default=None, help="cross-campaign Beta-prior ledger to read before generation and append after scoring (hte.prior_ledger)")
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
    run_p.add_argument(
        "--constants", default=None, choices=["fitted", "default"],
        help="'fitted' (default): hte.belief.load_constants's own pooled-fit result "
             "(docs/CALIBRATION-FIT-2026-09-10.md), falling back to bare defaults with "
             "no fitted file on disk; 'default': opt out, use Constants() unconditionally",
    )
    run_p.set_defaults(func=_cmd_campaign_run)

    results_p = campaign_sub.add_parser(
        "results",
        help="one flat, no-absolute-path JSON summary of a completed run: counts, "
             "per-actor rollup, top-ten survivors by Elo, calibration, self-report",
    )
    results_p.add_argument("run_dir")
    results_p.add_argument("--out", required=True)
    results_p.set_defaults(func=_cmd_campaign_results)

    calibrate_p = sub.add_parser("calibrate", help="run the discovery-date or k-fold holdout (mode auto-picked; see choose_holdout_mode)")
    calibrate_p.add_argument("--corpus", default="quantum-history", choices=sorted(_CORPUS_LOADERS))
    calibrate_p.add_argument("--cutoff-years", type=int, default=None, help="pin discovery-date holdout at this cutoff, bypassing auto-mode selection")
    calibrate_p.add_argument("--k", type=int, default=calibrate.DEFAULT_KFOLD_K, help="k-fold count when auto-mode picks k-fold (default: %(default)s)")
    calibrate_p.add_argument("--kfold-seed", type=int, default=0, help="k-fold stratification seed when auto-mode picks k-fold (default: %(default)s)")
    calibrate_p.add_argument("--fit", action="store_true", help="also grid-search W/lam/tier_scale")
    calibrate_p.add_argument("--diagnose", action="store_true", help="also write DIAGNOSTICS.md: a per-reason breakdown of every uncovered event (hte.diagnostics.coverage_report)")
    calibrate_p.add_argument("--shuffle", action="store_true", help="also run the link-permutation shuffle diagnostic (hte.diagnostics.link_shuffle_test) and merge it into diagnostics.json")
    calibrate_p.add_argument("--freeze-vocab", action="store_true", help="discovery-date holdout drops concepts whose introduced_year is at or after the cutoff (Vocabulary.frozen_at)")
    calibrate_p.add_argument("--vindication", action="store_true", help="also run the vindicated-alternatives holdout and control check (hte.calibrate.run_vindication) into vindication.json")
    calibrate_p.add_argument("--out", default="runs/_calibration")
    calibrate_p.set_defaults(func=_cmd_calibrate)

    views_p = sub.add_parser("views", help="re-render TIMELINE.md for a run directory")
    views_p.add_argument("run_dir")
    views_p.set_defaults(func=_cmd_views)

    ledger = sub.add_parser("holdout-ledger", help="the ranking-holdout track record (PLAN.md section 10)")
    ledger_sub = ledger.add_subparsers(dest="holdout_ledger_command", required=True)

    report_p = ledger_sub.add_parser("report", help="print the current ranking hit rate and elo_status")
    report_p.add_argument("--path", default=holdout_ledger.DEFAULT_LEDGER_PATH)
    report_p.add_argument("--min-verified", type=int, default=holdout_ledger.MIN_VERIFIED_FOR_LABEL)
    report_p.set_defaults(func=_cmd_holdout_ledger_report)

    verify_p = ledger_sub.add_parser("verify", help="record a later-verified outcome for one entry")
    verify_p.add_argument("entry_id")
    verify_p.add_argument("outcome", choices=["correct", "incorrect"])
    verify_p.add_argument("--verified-by", required=True, help="a named human or automated check")
    verify_p.add_argument("--path", default=holdout_ledger.DEFAULT_LEDGER_PATH)
    verify_p.set_defaults(func=_cmd_holdout_ledger_verify)

    question_map_p = sub.add_parser(
        "question-map",
        help="sync docs/RESEARCH-OS-INTEGRATION.md's question map against learning/research-os/RESEARCH-QUESTIONS.md",
    )
    question_map_group = question_map_p.add_mutually_exclusive_group()
    question_map_group.add_argument(
        "--check", action="store_true",
        help="exit non-zero if the plan and hte/data/question-map.json have drifted (default)",
    )
    question_map_group.add_argument(
        "--write", action="store_true",
        help="rewrite docs/RESEARCH-OS-INTEGRATION.md's generated question-map section",
    )
    question_map_p.set_defaults(func=_cmd_question_map)

    purge_p = sub.add_parser("purge", help="remove or redact artifacts derived from a production id (docs/PRIVACY.md)")
    purge_p.add_argument("--production", required=True, help="production id to purge")
    purge_p.add_argument("--learner", default=None, help="label only, see docs/PRIVACY.md: this engine never stores a raw learner id")
    purge_p.add_argument("--runs-root", default=purge_mod.DEFAULT_RUNS_ROOT)
    purge_p.add_argument("--cache-dir", default=None, help="default: <runs-root>/_llm-cache")
    purge_p.add_argument("--public-root", default=purge_mod.DEFAULT_PUBLIC_ROOT)
    purge_p.add_argument("--dry-run", action="store_true")
    purge_p.set_defaults(func=_cmd_purge)

    predict_p = sub.add_parser("predict", help="the prediction register: dated forward forecasts off a completed run, and their resolution")
    predict_sub = predict_p.add_subparsers(dest="predict_command", required=True)

    predict_register_p = predict_sub.add_parser("register", help="turn a completed run into dated forward predictions")
    predict_register_p.add_argument("run_dir")
    predict_register_p.add_argument("--horizon-days", type=int, default=predict.DEFAULT_HORIZON_DAYS)
    predict_register_p.add_argument("--kinds", default="claim,discovery,sequence", help="comma-separated subset of claim,discovery,sequence")
    predict_register_p.add_argument("--floor-u", type=float, default=predict.DEFAULT_FLOOR_U, help="sequence gate: sequence u never drops below 1.0 today, kept for a future evidence-linked sequence pass")
    predict_register_p.add_argument("--u-max", type=float, default=predict.DEFAULT_U_MAX, help="claim gate: only hypotheses examined at least this far (u <= u-max) and confident (|P-a| >= 0.15) register")
    predict_register_p.add_argument("--out", default=predict.DEFAULT_OUT_DIR)
    predict_register_p.set_defaults(func=_cmd_predict_register)

    predict_resolve_p = predict_sub.add_parser("resolve", help="score every due prediction in a ledger against a corpus and write RESOLUTIONS.md")
    predict_resolve_p.add_argument("--ledger", default=f"{predict.DEFAULT_OUT_DIR}/ledger.jsonl")
    predict_resolve_p.add_argument("--corpus", default="quantum-history", choices=sorted(_CORPUS_LOADERS))
    predict_resolve_p.add_argument("--as-of", required=True, help="ISO date/time to resolve as of")
    predict_resolve_p.set_defaults(func=_cmd_predict_resolve)

    predict_report_p = predict_sub.add_parser("report", help="resolve, then print RESOLUTIONS.md")
    predict_report_p.add_argument("--ledger", default=f"{predict.DEFAULT_OUT_DIR}/ledger.jsonl")
    predict_report_p.add_argument("--corpus", default="quantum-history", choices=sorted(_CORPUS_LOADERS))
    predict_report_p.add_argument("--as-of", required=True, help="ISO date/time to resolve as of")
    predict_report_p.set_defaults(func=_cmd_predict_report)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
