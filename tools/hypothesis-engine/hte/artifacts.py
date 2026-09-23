from __future__ import annotations

import json
import logging
from dataclasses import MISSING, dataclass, field, fields as dc_fields
from pathlib import Path
from typing import Any

logger = logging.getLogger("hte.artifacts")

RUN_ARTIFACT_VERSION = "1.0.0"
"""The artifact-shape version `hte.runner.run_campaign` stamps into
`MANIFEST.json`'s own `run_artifact_version` field, and this module's
`load_run` checks against. A run written before this field existed (every
run this checkout carried as of 2026-09-10, `bkt-hte-artifact-contract`'s
own day) carries no such field at all; `load_run` logs one warning and
reads that as a legacy manifest, since every one of its other fields is
still individually readable under this module's own per-field
defaulting. A run stamped with a version other than this one logs a
mismatch warning for the same reason: the shape may have moved since,
and this loader reads it best-effort under that assumption, logging so
a caller can tell.
"""

def _read_json(path: Path) -> dict[str, Any] | None:
    if not path.is_file():
        return None
    return json.loads(path.read_text())

def _opt(data: dict[str, Any], key: str, default: Any, *, path: str) -> Any:
    if key not in data:
        logger.warning("hte.artifacts: %s missing optional field %r, defaulting to %r", path, key, default)
        return default
    return data[key]

def _default_for(f: Any) -> Any:
    if f.default is not MISSING:
        return f.default
    if f.default_factory is not MISSING:  # type: ignore[misc]
        return f.default_factory()
    return None

_NESTED: dict[tuple[type, str], type] = {}

def _build(cls: type, data: dict[str, Any] | None, *, path: str) -> Any:
    data = data or {}
    kwargs: dict[str, Any] = {}
    for f in dc_fields(cls):
        nested_cls = _NESTED.get((cls, f.name))
        if f.name in data:
            raw = data[f.name]
            kwargs[f.name] = _build(nested_cls, raw, path=f"{path}.{f.name}") if nested_cls is not None else raw
        else:
            default = _default_for(f)
            logger.warning("hte.artifacts: %s missing optional field %r, defaulting to %r", path, f.name, default)
            kwargs[f.name] = _build(nested_cls, None, path=f"{path}.{f.name}") if nested_cls is not None else default
    return cls(**kwargs)

@dataclass
class CoverageStats:
    observed: int | None = None
    chao1_estimate: float | None = None
    missing_mass: float | None = None
    coverage_low: float | None = None
    coverage_high: float | None = None

@dataclass
class TargetBlindStats:
    rate: float | None = None
    prior_rate: float | None = None
    steady: bool | None = None
    first_run: bool | None = None

@dataclass
class RunCounts:
    campaign: str | None = None
    n_sources: int | None = None
    n_evidence: int | None = None
    n_hypotheses_generated: int | None = None
    n_survivors: int | None = None
    vocab_added: list[dict[str, Any]] = field(default_factory=list)
    coverage: CoverageStats = field(default_factory=CoverageStats)
    robustness_stable_fraction: float | None = None
    surprise_rate: float | None = None
    calibration_brier: float | None = None
    target_blind: TargetBlindStats = field(default_factory=TargetBlindStats)
    meta_review: dict[str, Any] = field(default_factory=dict)
    fragility_top10: list[dict[str, Any]] = field(default_factory=list)
    sampling: dict[str, Any] = field(default_factory=dict)

_NESTED[(RunCounts, "coverage")] = CoverageStats
_NESTED[(RunCounts, "target_blind")] = TargetBlindStats

@dataclass
class ManifestArtifact:
    campaign: str
    timestamp: str | None = None
    corpus: str | None = None
    run_artifact_version: str | None = None
    constants: dict[str, Any] = field(default_factory=dict)
    time_binning: dict[str, Any] = field(default_factory=dict)
    models: dict[str, Any] = field(default_factory=dict)
    cache: dict[str, Any] = field(default_factory=dict)
    llm_stats: dict[str, Any] = field(default_factory=dict)
    seeds: list[int] = field(default_factory=list)
    git_sha: str | None = None
    config: dict[str, Any] = field(default_factory=dict)
    extraction: dict[str, Any] | None = None
    counts: RunCounts = field(default_factory=RunCounts)

def _check_run_artifact_version(version: str | None, *, path: str) -> None:
    if version is None:
        logger.warning(
            "hte.artifacts: %s carries no run_artifact_version (pre-dates this contract, "
            "%s); reading it as a legacy manifest under best-effort per-field defaults.",
            path, RUN_ARTIFACT_VERSION,
        )
    elif version != RUN_ARTIFACT_VERSION:
        logger.warning(
            "hte.artifacts: %s was written under run_artifact_version %r, this loader "
            "targets %r; reading it under best-effort per-field defaults for any shape that moved.",
            path, version, RUN_ARTIFACT_VERSION,
        )

def _manifest_from_dict(data: dict[str, Any], *, path: str) -> ManifestArtifact:
    if "campaign" not in data:
        raise KeyError(f"{path}: required field 'campaign' missing from MANIFEST.json")

    version = data.get("run_artifact_version")
    _check_run_artifact_version(version, path=path)

    return ManifestArtifact(
        campaign=data["campaign"],
        timestamp=_opt(data, "timestamp", None, path=path),
        corpus=_opt(data, "corpus", None, path=path),
        run_artifact_version=version,
        constants=_opt(data, "constants", {}, path=path),
        time_binning=_opt(data, "time_binning", {}, path=path),
        models=_opt(data, "models", {}, path=path),
        cache=_opt(data, "cache", {}, path=path),
        llm_stats=_opt(data, "llm_stats", {}, path=path),
        seeds=_opt(data, "seeds", [], path=path),
        git_sha=_opt(data, "git_sha", None, path=path),
        config=_opt(data, "config", {}, path=path),
        extraction=_opt(data, "extraction", None, path=path),
        counts=_build(RunCounts, data.get("counts"), path=f"{path}.counts"),
    )

def validate_manifest(data: dict[str, Any], *, path: str = "<manifest>") -> ManifestArtifact:
    return _manifest_from_dict(data, path=path)

@dataclass
class SelfReportArtifact:
    assumptions: list[str] = field(default_factory=list)
    incomplete_vocabularies: list[str] = field(default_factory=list)
    missing_mass_estimate: float | str | None = None
    calibration_summary: str | None = None
    target_blind_steady: bool | None = None
    target_blind_note: str | None = None
    fragility_top10: list[dict[str, Any]] = field(default_factory=list)

def validate_self_report(data: dict[str, Any], *, path: str = "<self-report>") -> SelfReportArtifact:
    return _build(SelfReportArtifact, data, path=path)

@dataclass
class CalibrationArtifact:
    mode: str | None = None
    mode_reason: str | None = None
    k: int | None = None
    seed: int | None = None
    cutoff_years: int | None = None
    match_threshold: float | None = None
    resolution: str | None = None
    n_holdout_events: int | None = None
    n_covered_events: int | None = None
    coverage_of_truth: float | None = None
    coverage_note: str | None = None
    brier_score: float | None = None
    calibration_curve: list[dict[str, Any]] = field(default_factory=list)
    predictions: list[dict[str, Any]] = field(default_factory=list)
    constants: dict[str, Any] = field(default_factory=dict)
    folds: list[dict[str, Any]] | None = None
    aggregate: dict[str, Any] | None = None

@dataclass
class CascadeArtifact:
    roots: list[int] = field(default_factory=list)
    threshold: float | None = None
    entries: list[dict[str, Any]] = field(default_factory=list)

@dataclass
class TimelineArtifact:
    bins: list[dict[str, Any]] = field(default_factory=list)
    event_views: list[dict[str, Any]] = field(default_factory=list)
    pair_views: list[dict[str, Any]] = field(default_factory=list)

@dataclass
class SurvivorsArtifact:
    artifact_version: str | None = None
    campaign: str | None = None
    corpus: str | None = None
    survivors: list[dict[str, Any]] = field(default_factory=list)

@dataclass
class RunData:
    run_dir: Path
    manifest: ManifestArtifact
    timeline: TimelineArtifact
    calibration: CalibrationArtifact | None
    self_report: SelfReportArtifact
    cascade: CascadeArtifact | None = None
    survivors: SurvivorsArtifact | None = None

    @property
    def campaign(self) -> str:
        return self.manifest.campaign

    @property
    def counts(self) -> RunCounts:
        return self.manifest.counts

def load_manifest(run_dir: str | Path) -> ManifestArtifact:
    run_dir = Path(run_dir)
    manifest_path = run_dir / "MANIFEST.json"
    if not manifest_path.is_file():
        raise FileNotFoundError(f"no MANIFEST.json under {run_dir}")
    return _manifest_from_dict(json.loads(manifest_path.read_text()), path=str(manifest_path))

def load_run(run_dir: str | Path) -> RunData:
    run_dir = Path(run_dir)
    manifest = load_manifest(run_dir)

    timeline_path = run_dir / "timeline.json"
    timeline = _build(TimelineArtifact, _read_json(timeline_path), path=str(timeline_path))

    calibration_path = run_dir / "calibration.json"
    calibration_data = _read_json(calibration_path)
    calibration = _build(CalibrationArtifact, calibration_data, path=str(calibration_path)) if calibration_data is not None else None

    self_report_path = run_dir / "self-report.json"
    self_report = _build(SelfReportArtifact, _read_json(self_report_path), path=str(self_report_path))

    cascade_path = run_dir / "cascade.json"
    cascade_data = _read_json(cascade_path)
    cascade = _build(CascadeArtifact, cascade_data, path=str(cascade_path)) if cascade_data is not None else None

    survivors_path = run_dir / "survivors.json"
    survivors_data = _read_json(survivors_path)
    survivors = _build(SurvivorsArtifact, survivors_data, path=str(survivors_path)) if survivors_data is not None else None

    return RunData(
        run_dir=run_dir, manifest=manifest, timeline=timeline, calibration=calibration,
        self_report=self_report, cascade=cascade, survivors=survivors,
    )

__all__ = [
    "RUN_ARTIFACT_VERSION",
    "CoverageStats", "TargetBlindStats", "RunCounts", "ManifestArtifact",
    "SelfReportArtifact", "CalibrationArtifact", "TimelineArtifact", "CascadeArtifact",
    "SurvivorsArtifact", "RunData", "load_run", "load_manifest", "validate_manifest",
    "validate_self_report",
]
