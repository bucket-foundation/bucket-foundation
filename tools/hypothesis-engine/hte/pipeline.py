from __future__ import annotations

import dataclasses
import json
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from . import artifacts as artifacts_mod
from . import paper as paper_mod
from . import periods as periods_mod
from . import publish as publish_mod
from . import referee as referee_mod

DEFAULT_CONFIG: dict[str, Any] = {
    "campaign": None,
    "corpus": "quantum-history",
    "out_dir": "runs",
    "pipeline_out_dir": None,
    "from_run": None,
    "budget": 10.0,
    "dry_run": True,
    "replay_only": False,
    "seeds": 3,
    "runner_overrides": {},
    "writeback": False,
    "writeback_branch": None,
    "writeback_signoff": None,
    "writeback_floor_P": 0.6,
    "writeback_floor_u_max": 0.5,
    "writeback_fdr_q": 1.0,
    "writeback_out_root": "bucket-canon",
    "writeback_ledger_path": None,
    "skip_publish": False,
}

@dataclass
class StageResult:
    name: str
    ran: bool
    ok: bool
    seconds: float
    output: Any = None
    error: str | None = None
    prereg_mismatch: list[str] | None = None

    @property
    def outcome(self) -> str:
        if not self.ran:
            return "skipped" if self.ok else "failed"
        return "ok" if self.ok else "failed"

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name, "ran": self.ran, "ok": self.ok, "outcome": self.outcome,
            "seconds": round(self.seconds, 3), "output": self.output, "error": self.error,
            "prereg_mismatch": self.prereg_mismatch,
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

def _failed_stage(name: str, stage_dir: Path, reason: str) -> StageResult:
    result = StageResult(name=name, ran=False, ok=False, seconds=0.0, error=reason)
    _write_stage_json(stage_dir, result)
    return result

def _prereg_mismatch(run_dir: Path, gate: dict[str, Any]) -> list[str]:
    manifest = json.loads((Path(run_dir) / "MANIFEST.json").read_text())
    criteria = (manifest.get("prereg") or {}).get("criteria") or {}
    return sorted(key for key, value in gate.items() if key in criteria and criteria[key] != value)

def run_pipeline(config: dict[str, Any] | None = None) -> dict[str, Any]:
    cfg = {**DEFAULT_CONFIG, **(config or {})}
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    pipeline_dir = Path(cfg["pipeline_out_dir"] or (Path(cfg["out_dir"]) / "_pipeline" / timestamp))
    pipeline_dir.mkdir(parents=True, exist_ok=True)

    stages: dict[str, StageResult] = {}
    run_dir: Path | None = Path(cfg["from_run"]) if cfg["from_run"] else None
    campaign_name = cfg["campaign"] or cfg["corpus"]

    from_run_error: str | None = None
    if cfg["from_run"]:
        from_run_dir = Path(cfg["from_run"])
        if not from_run_dir.is_dir():
            from_run_error = f"from_run={cfg['from_run']!r} does not exist or is not a directory"
        else:
            try:
                artifacts_mod.load_run(from_run_dir)
            except Exception as exc:  # noqa: BLE001 - any artifact-contract failure is this precondition's own finding
                from_run_error = (
                    f"from_run={cfg['from_run']!r} exists but fails hte.artifacts.load_run "
                    f"(not a usable campaign run directory): {type(exc).__name__}: {exc}"
                )

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
            from . import runner
            runner_cfg = {
                "campaign": campaign_name, "corpus": cfg["corpus"], "out_dir": cfg["out_dir"],
                "replay_only": cfg["replay_only"], "seeds": cfg["seeds"],
                "floor_P": cfg["writeback_floor_P"], "floor_u_max": cfg["writeback_floor_u_max"],
                "fdr_q": cfg["writeback_fdr_q"], **cfg["runner_overrides"],
            }
            artifacts = runner.run_campaign(runner_cfg)
            nonlocal run_dir
            run_dir = artifacts.run_dir
            return {"run_dir": str(artifacts.run_dir), "manifest": artifacts.manifest["counts"]}

        stages["run_campaign"] = _time_stage("run_campaign", pipeline_dir / "run_campaign", _run_campaign)

    paper_dir = pipeline_dir / "paper"
    if from_run_error is not None:
        stages["emit_paper"] = _failed_stage("emit_paper", pipeline_dir / "emit_paper", from_run_error)
        reason = f"emit_paper failed: {from_run_error}"
        stages["referee"] = _skipped_stage("referee", pipeline_dir / "referee", reason)
        stages["writeback"] = _skipped_stage("writeback", pipeline_dir / "writeback", reason)
        stages["publish"] = _skipped_stage("publish", pipeline_dir / "publish", reason)
    elif run_dir is None or not (Path(run_dir) / "MANIFEST.json").is_file():
        reason = "no usable run directory: from_run was not given and run_campaign did not produce one"
        stages["emit_paper"] = _skipped_stage("emit_paper", pipeline_dir / "emit_paper", reason)
        stages["referee"] = _skipped_stage("referee", pipeline_dir / "referee", reason)
        stages["writeback"] = _skipped_stage("writeback", pipeline_dir / "writeback", reason)
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

        if cfg["writeback"]:
            if not cfg["writeback_branch"]:
                stages["writeback"] = _failed_stage(
                    "writeback", pipeline_dir / "writeback",
                    "writeback=True but writeback_branch was not given",
                )
            elif not cfg["writeback_signoff"]:
                stages["writeback"] = _failed_stage(
                    "writeback", pipeline_dir / "writeback",
                    "writeback=True but writeback_signoff was not given: a named human "
                    "approver is required before any write into bucket-canon/ (PLAN.md "
                    "section 10, GOVERNANCE.md)",
                )
            else:
                from . import runner as runner_mod
                gate = {
                    "floor_P": cfg["writeback_floor_P"], "floor_u": cfg["writeback_floor_u_max"],
                    "lift_floor": cfg["runner_overrides"].get("lift_floor", runner_mod.DEFAULT_CONFIG["lift_floor"]),
                    "fdr_q": cfg["writeback_fdr_q"],
                }

                def _writeback() -> list[str]:
                    from . import canon_writeback
                    paths = canon_writeback.write_back(
                        run_dir, branch=cfg["writeback_branch"], signoff=cfg["writeback_signoff"],
                        floor_P=gate["floor_P"], floor_u_max=gate["floor_u"],
                        lift_floor=gate["lift_floor"], fdr_q=gate["fdr_q"],
                        out_root=cfg["writeback_out_root"], dry_run=cfg["dry_run"],
                        replay_only=cfg["replay_only"], ledger_path=cfg["writeback_ledger_path"],
                    )
                    return [str(p) for p in paths]

                stages["writeback"] = _time_stage("writeback", pipeline_dir / "writeback", _writeback)
                stages["writeback"] = dataclasses.replace(stages["writeback"], prereg_mismatch=_prereg_mismatch(run_dir, gate))
        else:
            stages["writeback"] = _skipped_stage(
                "writeback", pipeline_dir / "writeback",
                "writeback not requested (pass writeback=True / hte-pipeline run --writeback)",
            )

        if stages["emit_paper"].ok:
            if cfg["skip_publish"]:
                stages["publish"] = _skipped_stage(
                    "publish", pipeline_dir / "publish",
                    "skip_publish=True (--skip-publish); the caller's own PR carries commit/gdrive",
                )
            else:
                stages["publish"] = _time_stage(
                    "publish", pipeline_dir / "publish",
                    lambda: publish_mod.publish(run_dir, paper_dir, dry_run=cfg["dry_run"]),
                )

    if all(s.ok for s in stages.values()):
        outcome = "ok"
    elif from_run_error is not None:
        outcome = "error"
    else:
        outcome = "failed"
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
