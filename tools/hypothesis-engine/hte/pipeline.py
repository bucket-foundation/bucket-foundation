"""`run_pipeline`: the whole choose-run-write-review-publish loop, one call.

Composes every module this package's own end-to-end pass needs, with no
human in the loop between them: `hte.periods.choose_period` (unless the
config pins a corpus directly), `hte.runner.run_campaign`, `hte.paper.
emit_paper`, `hte.referee.referee`, and `hte.publish.publish`. Each stage
writes its own `STAGE.json` under the pipeline's own output directory (a
timestamped run of the pipeline itself, distinct from a campaign's own
run directory); the pipeline writes one `PIPELINE.json` summarizing every
stage's timing and outcome.

`--from-run <dir>` (the `replay` path) skips period choice and the
campaign entirely and starts straight from an existing campaign run
directory's own artifacts, for re-emitting a paper, re-refereeing it, or
re-running publish's own dry-run plan without paying for another
campaign.
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from . import paper as paper_mod
from . import periods as periods_mod
from . import publish as publish_mod
from . import referee as referee_mod

DEFAULT_CONFIG: dict[str, Any] = {
    "campaign": None,          # defaults to the config-pinned or chosen corpus name
    "corpus": "quantum-history",
    "out_dir": "runs",
    "pipeline_out_dir": None,  # defaults to <out_dir>/_pipeline/<timestamp>
    "from_run": None,          # an existing campaign run directory; skips period choice + run_campaign
    "budget": 10.0,
    "dry_run": True,
    "replay_only": False,
    "seeds": 3,
    "runner_overrides": {},    # additional hte.runner.DEFAULT_CONFIG overrides, applied only for a fresh run
}


@dataclass
class StageResult:
    """One pipeline stage's own outcome: whether it ran (a `from_run`
    pipeline skips `choose_period` and `run_campaign` outright), whether
    it succeeded, how long it took, and its own return value."""
    name: str
    ran: bool
    ok: bool
    seconds: float
    output: Any = None
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name, "ran": self.ran, "ok": self.ok, "seconds": round(self.seconds, 3),
            "output": self.output, "error": self.error,
        }


def _write_stage_json(stage_dir: Path, result: StageResult) -> None:
    stage_dir.mkdir(parents=True, exist_ok=True)
    (stage_dir / "STAGE.json").write_text(json.dumps(result.to_dict(), indent=2, default=str))


def _time_stage(name: str, stage_dir: Path, fn: Callable[[], Any]) -> StageResult:
    start = time.monotonic()
    try:
        output = fn()
        result = StageResult(name=name, ran=True, ok=True, seconds=time.monotonic() - start, output=output)
    except Exception as exc:  # noqa: BLE001 - a stage's own failure is recorded here and returned
        result = StageResult(name=name, ran=True, ok=False, seconds=time.monotonic() - start, error=f"{type(exc).__name__}: {exc}")
    _write_stage_json(stage_dir, result)
    return result


def _skipped_stage(name: str, stage_dir: Path, reason: str) -> StageResult:
    result = StageResult(name=name, ran=False, ok=True, seconds=0.0, output={"skipped": reason})
    _write_stage_json(stage_dir, result)
    return result


def run_pipeline(config: dict[str, Any] | None = None) -> dict[str, Any]:
    """Runs the whole pipeline once and returns `{"pipeline_dir",
    "stages", "run_dir", "paper_dir", "outcome"}`. `config` overrides
    `DEFAULT_CONFIG`; every key `DEFAULT_CONFIG` names may be overridden,
    no others are read.

    Stage order: `choose_period` (skipped when `from_run` is set, or when
    `corpus` names a period `hte.periods.load_periods` does not carry, in
    which case the given `corpus` is used directly and unranked) ->
    `run_campaign` (skipped when `from_run` is set) -> `emit_paper` ->
    `referee` -> `publish`. A stage that raises does not stop the ones
    after it that do not depend on its own output; `emit_paper` needs a
    run directory to read, so it is the one stage a `run_campaign`
    failure (or a missing `from_run`) blocks, and every stage
    after that reports itself skipped for the same reason rather than
    running against nothing.
    """
    cfg = {**DEFAULT_CONFIG, **(config or {})}
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    pipeline_dir = Path(cfg["pipeline_out_dir"] or (Path(cfg["out_dir"]) / "_pipeline" / timestamp))
    pipeline_dir.mkdir(parents=True, exist_ok=True)

    stages: dict[str, StageResult] = {}
    run_dir: Path | None = Path(cfg["from_run"]) if cfg["from_run"] else None
    campaign_name = cfg["campaign"] or cfg["corpus"]

    if cfg["from_run"]:
        stages["choose_period"] = _skipped_stage(
            "choose_period", pipeline_dir / "choose_period",
            f"from_run={cfg['from_run']!r} given; period choice skipped",
        )
        stages["run_campaign"] = _skipped_stage(
            "run_campaign", pipeline_dir / "run_campaign",
            f"from_run={cfg['from_run']!r} given; reusing that run directory's own artifacts",
        )
    else:
        periods = periods_mod.load_periods()
        pinned = next((p for p in periods if p.corpus == cfg["corpus"]), None)
        if pinned is not None:
            stages["choose_period"] = _time_stage(
                "choose_period", pipeline_dir / "choose_period",
                lambda: periods_mod.choose_period(periods, budget=cfg["budget"]),
            )
        else:
            stages["choose_period"] = _skipped_stage(
                "choose_period", pipeline_dir / "choose_period",
                f"corpus={cfg['corpus']!r} names no ranked period; using it directly",
            )

        def _run_campaign() -> dict[str, Any]:
            from . import runner  # imported lazily: runner.py is under active parallel edit elsewhere in this package
            runner_cfg = {
                "campaign": campaign_name, "corpus": cfg["corpus"], "out_dir": cfg["out_dir"],
                "replay_only": cfg["replay_only"], "seeds": cfg["seeds"], **cfg["runner_overrides"],
            }
            artifacts = runner.run_campaign(runner_cfg)
            nonlocal run_dir
            run_dir = artifacts.run_dir
            return {"run_dir": str(artifacts.run_dir), "manifest": artifacts.manifest["counts"]}

        stages["run_campaign"] = _time_stage("run_campaign", pipeline_dir / "run_campaign", _run_campaign)

    paper_dir = pipeline_dir / "paper"
    if run_dir is None or not (Path(run_dir) / "MANIFEST.json").is_file():
        reason = "no usable run directory: from_run was not given and run_campaign did not produce one"
        stages["emit_paper"] = _skipped_stage("emit_paper", pipeline_dir / "emit_paper", reason)
        stages["referee"] = _skipped_stage("referee", pipeline_dir / "referee", reason)
        stages["publish"] = _skipped_stage("publish", pipeline_dir / "publish", reason)
    else:
        stages["emit_paper"] = _time_stage(
            "emit_paper", pipeline_dir / "emit_paper",
            lambda: paper_mod.emit_paper(run_dir, paper_dir),
        )
        if not stages["emit_paper"].ok:
            reason = f"emit_paper failed: {stages['emit_paper'].error}"
            stages["referee"] = _skipped_stage("referee", pipeline_dir / "referee", reason)
            stages["publish"] = _skipped_stage("publish", pipeline_dir / "publish", reason)
        else:
            stages["referee"] = _time_stage(
                "referee", pipeline_dir / "referee",
                lambda: referee_mod.referee(paper_dir, replay_only=cfg["replay_only"]),
            )
            stages["publish"] = _time_stage(
                "publish", pipeline_dir / "publish",
                lambda: publish_mod.publish(run_dir, paper_dir, dry_run=cfg["dry_run"]),
            )

    outcome = "ok" if all(s.ok for s in stages.values()) else "failed"
    summary = {
        "pipeline_dir": str(pipeline_dir),
        "timestamp": timestamp,
        "campaign": campaign_name,
        "corpus": cfg["corpus"],
        "dry_run": cfg["dry_run"],
        "replay_only": cfg["replay_only"],
        "run_dir": str(run_dir) if run_dir else None,
        "paper_dir": str(paper_dir) if stages["emit_paper"].ran and stages["emit_paper"].ok else None,
        "outcome": outcome,
        "stages": {name: s.to_dict() for name, s in stages.items()},
    }
    (pipeline_dir / "PIPELINE.json").write_text(json.dumps(summary, indent=2, default=str))
    return summary


__all__ = ["run_pipeline", "DEFAULT_CONFIG", "StageResult"]
