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
    # `hte.canon_writeback.write_back`'s own optional stage, after
    # `referee` and before `publish` (`bkt-hte-build-history`):
    # `writeback=False` (the default) skips it outright; `writeback=True`
    # needs `writeback_branch` set. `dry_run` (the pipeline's own existing
    # flag, above) doubles as this stage's own dry-run switch, the same
    # "plan the write, touch nothing" contract `publish` already gives
    # `dry_run`: `write_back(..., dry_run=cfg["dry_run"])` lists every
    # card path it would write rather than writing any of them.
    "writeback": False,
    "writeback_branch": None,
    # A named human approver, required whenever `writeback=True` (PLAN.md
    # section 10, GOVERNANCE.md): `hte.canon_writeback.write_back` itself
    # hard-refuses a missing signoff, and this stage checks it up front
    # too so the failure reads as a labeled precondition failure.
    "writeback_signoff": None,
    "writeback_floor_P": 0.6,
    "writeback_floor_u_max": 0.5,
    "writeback_out_root": "bucket-canon",
    # `skip_publish=True` renders the `publish` stage a `_skipped_stage`
    # rather than running it: a caller doing a real (non-dry-run)
    # write-back through a PR that already carries its own commit/gdrive
    # step (`publish`'s own job) wants writeback's own file writes without
    # `publish` committing or mirroring anything a second time.
    "skip_publish": False,
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

    @property
    def outcome(self) -> str:
        """One of `"ok"`/`"failed"`/`"skipped"`, the same three-way
        vocabulary `run_pipeline`'s own `PIPELINE.json["outcome"]` uses,
        now on every individual `STAGE.json` too (`bkt-hte-writeback-
        review`, PR #36's own review): `"skipped"` is `_skipped_stage`'s
        own deliberate, non-failing skip (`ran=False, ok=True`);
        `"failed"` covers both a stage that ran and raised (`ran=True,
        ok=False`) and `_failed_stage`'s own precondition failure
        (`ran=False, ok=False`, this dataclass's own docstring); `"ok"`
        is the only `ran=True, ok=True` case. A caller reading one
        `STAGE.json` in isolation no longer has to cross-reference
        `ran`/`ok` by hand to tell a deliberate skip from a real
        failure."""
        if not self.ran:
            return "skipped" if self.ok else "failed"
        return "ok" if self.ok else "failed"

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name, "ran": self.ran, "ok": self.ok, "outcome": self.outcome,
            "seconds": round(self.seconds, 3), "output": self.output, "error": self.error,
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
    """A stage that did not run because its own precondition failed,
    distinct from `_skipped_stage`'s intentional, non-failing skip
    (FINDING-2026-09-10-005, `tests/swarm/FINDINGS-2026-09-10.md`): `ok`
    reads `False` here, so this stage's failure is never laundered into
    `run_pipeline`'s own `all(s.ok for s in stages.values())` outcome
    check the way a deliberate `_skipped_stage` skip is by design."""
    result = StageResult(name=name, ran=False, ok=False, seconds=0.0, error=reason)
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
    `referee` -> `writeback` -> `publish`.

    **Cascade rule** (`bkt-hte-writeback-review`, PR #36's own review):
    a stage that raises, or whose own precondition is unmet, never stops
    a later stage that does not depend on its own output; it stops only
    the stages that DO.
    - No usable run directory (`run_campaign` failed, or a `from_run`
      that fails `hte.artifacts.load_run`): every downstream stage,
      `emit_paper` included, reports itself skipped/failed for that one
      reason, since none of them have anything to read.
    - `emit_paper` failing (a real run directory in hand, but the paper
      itself would not write) skips `referee` and `publish`, both of
      which read `emit_paper`'s own output; it never skips `writeback`,
      which reads only `run_dir` (`hte.canon_writeback.write_back`'s own
      re-ingest of the campaign's corpus), a real, complete artifact
      whether or not the paper on top of it ever gets written.
    - `writeback` failing (its own precondition unmet, e.g. `writeback=
      True` with no `writeback_branch`, or `write_back` itself raising)
      never skips `publish` in turn: `publish` commits and mirrors the
      run and its paper, neither of which `writeback`'s own outcome
      changes. (The CLI's own `--writeback` requires `--branch`
      validation, `hte.cli_pipeline`, catches the mistyped-branch case
      this rule alone would not: before `run_pipeline` ever starts,
      rather than papering over it with a cascade skip after the fact.)
    - `writeback` not being requested at all (`writeback=False`, the
      default) is a `_skipped_stage`, the same deliberate, non-failing
      skip every other stage gets; it never affects `publish` either
      way.

    Every stage's own `STAGE.json` under the pipeline's own output
    directory carries an explicit `outcome` (`"ok"`/`"failed"`/
    `"skipped"`, `StageResult.outcome`) alongside `ran`/`ok`, and a
    skipped or failed stage's own `output`/`error` names the reason,
    quoting whichever upstream stage's own failure caused it when that
    is why. `PIPELINE.json["outcome"]` reads `"ok"` when every stage
    that ran (or was required to) came back `ok`, `"failed"` when at
    least one did not, and `"error"` for the one from-run-precondition
    case above (a configuration mistake caught before any stage ran,
    distinct from a stage that ran and raised).
    """
    cfg = {**DEFAULT_CONFIG, **(config or {})}
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    pipeline_dir = Path(cfg["pipeline_out_dir"] or (Path(cfg["out_dir"]) / "_pipeline" / timestamp))
    pipeline_dir.mkdir(parents=True, exist_ok=True)

    stages: dict[str, StageResult] = {}
    run_dir: Path | None = Path(cfg["from_run"]) if cfg["from_run"] else None
    campaign_name = cfg["campaign"] or cfg["corpus"]

    # FINDING-2026-09-10-005/006 (`tests/swarm/FINDINGS-2026-09-10.md`): a
    # `from_run` that was given but names a missing or malformed run
    # directory (no `MANIFEST.json`) is a real, actionable failure, not
    # the same "nothing to do" shape as `from_run` never being given at
    # all. `from_run_error` names precisely which of those two ways it
    # failed, quoting the actual path, so `emit_paper` below can fail
    # loudly instead of reusing the generic "from_run was not given"
    # skip reason for a `from_run` that WAS given.
    from_run_error: str | None = None
    if cfg["from_run"]:
        from_run_dir = Path(cfg["from_run"])
        if not from_run_dir.is_dir():
            from_run_error = f"from_run={cfg['from_run']!r} does not exist or is not a directory"
        else:
            # `hte.artifacts.load_run` is this pipeline's own artifact
            # contract (`bkt-hte-artifact-contract`): reading `from_run`
            # through it, rather than only checking `MANIFEST.json`'s own
            # existence, catches a malformed or drifted manifest here,
            # at this precondition, with a clear `from_run_error` message,
            # instead of only surfacing three stages later as an
            # `emit_paper` crash over a run this pipeline already
            # accepted as usable.
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
            # `referee` and `publish` both read `emit_paper`'s own paper
            # output, so a failed emit_paper cascades to both; `writeback`
            # reads only `run_dir` (real regardless of emit_paper's own
            # outcome), so it is evaluated below on its own precondition
            # rather than cascade-skipped here (`bkt-hte-writeback-
            # review`, this function's own docstring).
            reason = f"emit_paper failed: {stages['emit_paper'].error}"
            stages["referee"] = _skipped_stage("referee", pipeline_dir / "referee", reason)
            stages["publish"] = _skipped_stage("publish", pipeline_dir / "publish", reason)
        else:
            stages["referee"] = _time_stage(
                "referee", pipeline_dir / "referee",
                lambda: referee_mod.referee(paper_dir, replay_only=cfg["replay_only"]),
            )

        # `writeback` depends only on `run_dir`, never on `emit_paper`/
        # `referee`'s own paper-writing outcome (this function's own
        # docstring, "Cascade rule"): it runs on its own precondition
        # here regardless of whether emit_paper above just failed.
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
                def _writeback() -> list[str]:
                    from . import canon_writeback
                    paths = canon_writeback.write_back(
                        run_dir, branch=cfg["writeback_branch"], signoff=cfg["writeback_signoff"],
                        floor_P=cfg["writeback_floor_P"], floor_u_max=cfg["writeback_floor_u_max"],
                        out_root=cfg["writeback_out_root"], dry_run=cfg["dry_run"],
                    )
                    return [str(p) for p in paths]

                stages["writeback"] = _time_stage("writeback", pipeline_dir / "writeback", _writeback)
        else:
            stages["writeback"] = _skipped_stage(
                "writeback", pipeline_dir / "writeback",
                "writeback not requested (pass writeback=True / hte-pipeline run --writeback)",
            )

        # `publish` depends only on `emit_paper`'s own paper, never on
        # `writeback`'s own outcome (this function's own docstring,
        # "Cascade rule"): a failed writeback (a missing --branch, a
        # missing --signoff, or `write_back` itself raising) never blocks
        # committing/mirroring the run and paper; writeback leaves the
        # run and paper untouched either way.
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
        # A bad from_run is a configuration error caught before any stage
        # ran, its own distinct outcome value from "failed" (a stage that
        # ran and raised), so a caller who typos --from-run gets a loud,
        # distinguishable outcome (FINDING-2026-09-10-005b).
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
