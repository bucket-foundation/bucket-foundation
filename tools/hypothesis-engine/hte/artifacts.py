"""The artifact contract every run-writing and run-reading module in this
package shares: typed dataclasses for the four files `hte.runner.
run_campaign` writes under one run directory (`MANIFEST.json`,
`self-report.json`, `calibration.json`, `timeline.json`), a `load_run`
that reads all four off disk, and `RUN_ARTIFACT_VERSION`, a version
string `hte.runner.run_campaign` stamps into `MANIFEST.json` and this
module's own loader checks.

Motivating incident (`bkt-hte-artifact-contract`, 2026-09-10): `hte.
calibrate`'s own `bkt-hte-calibration-redesign` rewrite (`README.md`'s
Design notes) changed `calibration.json`'s real shape from a
`"n_sources"`-keyed discovery-date-only holdout to `"n_holdout_events"`/
`"n_covered_events"`, covering both discovery-date and k-fold modes.
Nothing updated `hte.paper._abstract`, which read `data.calibration
['n_sources']` by direct dict index; every run written after that
rewrite crashed `emit_paper` with `KeyError: 'n_sources'`
(`runs/_pipeline/20260910T093235Z/PIPELINE.json`, over
`runs/quantum-history/20260910T085020Z`), while `tests/test_paper.py`'s
own `test_emit_paper_and_build_pdf_over_a_real_run` kept passing because
it is pinned to `runs/quantum-history-real/20260910T001819Z`, a run
directory that predates the redesign and still carries the old
`"n_sources"` key. A hand-rolled test fixture and a real run's own
writer drifted apart with no test to catch it, since the only place both
were compared was `hte.paper` reading a real run in production, months
after the fixture was written.

This module is that comparison point, made explicit and load-bearing:
every dataclass field below is named for a real key `hte.runner.
run_campaign` (or `hte.calibrate.write_calibration`, or `hte.export.
write_views`) is confirmed to write today, `tests/test_artifacts.py`
loads every real run directory this checkout carries plus one freshly
generated `hte-synth` run, and any future rewrite of a writer's own
output shape that this module is not updated to match fails that test
immediately, at the loader, rather than three modules downstream inside
`hte.paper`.

Every dataclass field is optional except `ManifestArtifact.campaign`,
`ManifestArtifact.timestamp`, `ManifestArtifact.corpus`, and `RunData.
manifest` itself: a run's identity, and the manifest that names it, are
the two things `load_run` treats as non-negotiable, since a paper, a
referee report, or a publish commit message all need at least a
campaign name to run at all. Every other field an artifact file is
missing (an older run predating a field, a disabled stage, a corpus with
no ground truth) falls back to its own dataclass default (most fields
default to `None`, a bare "not recorded" `hte.paper._fmt` renders as
such) and logs
one `logging.warning` naming the missing field and the file it was
missing from, in place of the `KeyError` this module exists to close
off.
"""
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


# --------------------------------------------------------------------------
# Shared field-filling helpers
# --------------------------------------------------------------------------


def _read_json(path: Path) -> dict[str, Any] | None:
    if not path.is_file():
        return None
    return json.loads(path.read_text())


def _opt(data: dict[str, Any], key: str, default: Any, *, path: str) -> Any:
    """`data[key]` when the key is present (even when its own value is
    `None`, JSON's own explicit way of saying "no value", e.g.
    `calibration.json`'s `cutoff_years` under k-fold mode), else
    `default`, logging one warning naming the missing key and `path`.
    This module's own "documented fallback instead of a `KeyError`"
    contract (module docstring)."""
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


# `(dataclass, field_name) -> nested dataclass type`, read by `_build`
# below to recurse into the handful of sub-structures this contract does
# model as their own dataclass (`RunCounts.coverage`, `RunCounts.
# target_blind`). Every other nested value (`vocab_added`, `meta_review`,
# `calibration_curve`, `predictions`, `folds`, `aggregate`, `constants`,
# and MANIFEST.json's own `config`/`models`/`cache`/`llm_stats`/
# `time_binning`) is read as a plain `dict`/`list`, unmodeled beyond that:
# `hte.paper` and friends already read those with `.get()` internally,
# and this contract's own motivating bug (module docstring) was a count
# printed straight off `RunCounts`/`CalibrationArtifact` itself, a flat
# field on one of those two dataclasses.
_NESTED: dict[tuple[type, str], type] = {}


def _build(cls: type, data: dict[str, Any] | None, *, path: str) -> Any:
    """One `cls` dataclass instance built from `data` (a raw JSON dict,
    or `None` for a whole file that was missing): every field `cls`
    declares that is present in `data` (even as `None`) is read as-is
    (recursing into `_NESTED`'s own sub-dataclasses when the raw value is
    itself a dict); every field absent from `data` falls back to its own
    dataclass default and logs one warning through `_opt`'s own
    machinery. `data=None` reads every field as absent, so a whole
    missing file still returns a fully-defaulted instance rather than
    `None` itself (`load_run`'s own contract for `self_report`/
    `timeline`; `calibration` alone stays `None` when its own file is
    absent, since "no discovery-date holdout ran" is a real, distinct
    state `hte.paper._calibration` renders on its own)."""
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


# --------------------------------------------------------------------------
# MANIFEST.json
# --------------------------------------------------------------------------


@dataclass
class CoverageStats:
    """`RunCounts.coverage`: `hte.unknowns.coverage_interval`'s own
    return shape, as written into `MANIFEST.json["counts"]["coverage"]`."""
    observed: int | None = None
    chao1_estimate: float | None = None
    missing_mass: float | None = None
    coverage_low: float | None = None
    coverage_high: float | None = None


@dataclass
class TargetBlindStats:
    """`RunCounts.target_blind`: `hte.runner._target_blind_check`'s own
    return shape."""
    rate: float | None = None
    prior_rate: float | None = None
    steady: bool | None = None
    first_run: bool | None = None


@dataclass
class RunCounts:
    """`MANIFEST.json["counts"]`: `hte.runner.run_campaign`'s own
    `run_summary`, the one dict every number `hte.paper`'s abstract and
    results sections print comes from. `meta_review` stays a plain
    `dict` rather than its own dataclass: `hte.paper._results` checks it
    for plain truthiness (`if meta_review else "(this run's meta-review
    returned nothing)"`), which a dataclass instance (always truthy)
    would silently defeat."""
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
    # `bkt-hte-retraction-propagation`: `hte.propagate.rank_fragility`'s
    # own return shape, the ten most fragile survivors this run scored.
    fragility_top10: list[dict[str, Any]] = field(default_factory=list)


_NESTED[(RunCounts, "coverage")] = CoverageStats
_NESTED[(RunCounts, "target_blind")] = TargetBlindStats


@dataclass
class ManifestArtifact:
    """`MANIFEST.json`, `hte.runner.run_campaign`'s own top-level
    manifest. `campaign` is the only required field in this whole
    contract (module docstring), the one identity every downstream
    stage needs to name what it is reporting on; `timestamp`/`corpus`
    are individually optional (defaulted, with a logged warning, the
    same as every other field below) even though `hte.runner.
    run_campaign` always writes both today, since a hand-built manifest
    (a test fixture, an older or partial run) naming a campaign but not
    a timestamp is still worth reading as far as it goes."""
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

    # `run_artifact_version`'s own absence or mismatch gets its own
    # distinct warning wording (`_check_run_artifact_version`) instead of
    # `_opt`'s generic "missing optional field" message, so a reader of
    # the log sees a version-schema note distinct from an ordinary field
    # default.
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
    """`_manifest_from_dict`, exposed for a writer to call on its own
    in-memory dict before it ever touches disk. `hte.runner.run_campaign`
    calls this on its own manifest dict immediately before writing
    `MANIFEST.json`, so a shape this contract cannot read is caught at
    the one call site that would introduce the drift, instead of only
    surfacing later as a `hte.paper.emit_paper` crash over a run already
    committed to disk (this module's own motivating incident, module
    docstring)."""
    return _manifest_from_dict(data, path=path)


# --------------------------------------------------------------------------
# self-report.json
# --------------------------------------------------------------------------


@dataclass
class SelfReportArtifact:
    """`self-report.json`, `hte.roles.self_report`'s own response,
    written verbatim by `hte.runner.run_campaign`. Every field is
    optional: a role response missing a key it normally carries is still
    worth reading as far as it goes, `hte.paper._limitations` quotes the
    whole thing verbatim regardless."""
    assumptions: list[str] = field(default_factory=list)
    incomplete_vocabularies: list[str] = field(default_factory=list)
    missing_mass_estimate: float | str | None = None
    calibration_summary: str | None = None
    target_blind_steady: bool | None = None
    target_blind_note: str | None = None
    # `bkt-hte-retraction-propagation`: the same `fragility_top10` shape
    # `RunCounts` carries, folded into `self-report.json` by `hte.
    # runner.run_campaign` the same way a refusal or clamp note is,
    # after the role's own response comes back.
    fragility_top10: list[dict[str, Any]] = field(default_factory=list)


def validate_self_report(data: dict[str, Any], *, path: str = "<self-report>") -> SelfReportArtifact:
    """`self-report.json`'s own contract, exposed the same way
    `validate_manifest` is: `hte.runner.run_campaign` calls this on the
    role's own response dict before writing `self-report.json`."""
    return _build(SelfReportArtifact, data, path=path)


# --------------------------------------------------------------------------
# calibration.json
# --------------------------------------------------------------------------


@dataclass
class CalibrationArtifact:
    """`calibration.json`: the flat shape both `hte.calibrate.
    run_holdout` (discovery-date mode) and `hte.calibrate.holdout_kfold`
    (k-fold mode) return, dispatched by `hte.calibrate.run_calibration`
    and written by `hte.calibrate.write_calibration`. `mode`/`k`/`seed`/
    `resolution`/`folds`/`aggregate` are k-fold-only fields, `None` under
    discovery-date mode; `n_holdout_events`/`n_covered_events` are the
    field this contract's own motivating bug (module docstring) was
    about, `run_holdout`'s post-`bkt-hte-calibration-redesign` rewrite of
    what an older shape called `n_sources`. That older name is not
    modeled here at all: a run written before the redesign (`runs/
    quantum-history-real/20260910T001819Z`, kept for exactly this reason)
    still loads clean, its own `n_sources` value silently unread rather
    than crashing, and `n_holdout_events`/`n_covered_events` read `None`
    for it (logged, "not recorded") since that run's own calibration
    pass never computed them under that name."""
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


# --------------------------------------------------------------------------
# cascade.json (`bkt-hte-retraction-propagation`)
# --------------------------------------------------------------------------


@dataclass
class CascadeArtifact:
    """`cascade.json`: `hte.propagate.CascadeReport.to_dict`'s own shape,
    written by `hte.runner.run_campaign` on every run, whether or not
    any retraction happened this run: an empty `entries` list is the
    documented no-retraction case. `load_run` still reads `None` for a
    run written before this bead, since that older run wrote no
    `cascade.json` at all."""
    roots: list[int] = field(default_factory=list)
    threshold: float | None = None
    entries: list[dict[str, Any]] = field(default_factory=list)


# --------------------------------------------------------------------------
# timeline.json
# --------------------------------------------------------------------------


@dataclass
class TimelineArtifact:
    """`timeline.json`, `hte.export.timeline_views`'s own return shape,
    written by `hte.export.write_views`."""
    bins: list[dict[str, Any]] = field(default_factory=list)
    event_views: list[dict[str, Any]] = field(default_factory=list)
    pair_views: list[dict[str, Any]] = field(default_factory=list)


# --------------------------------------------------------------------------
# load_run: every artifact one run directory carries, loaded once
# --------------------------------------------------------------------------


@dataclass
class RunData:
    """Every artifact `hte.paper`, `hte.referee`, `hte.publish`, and
    `hte.pipeline` read out of one run directory, loaded once by
    `load_run`."""
    run_dir: Path
    manifest: ManifestArtifact
    timeline: TimelineArtifact
    calibration: CalibrationArtifact | None
    self_report: SelfReportArtifact
    # `bkt-hte-retraction-propagation`: `None` for a run predating
    # `cascade.json` (the same `CalibrationArtifact`-style "no file, no
    # defaulting" reading, module docstring), never defaulted to an
    # empty `CascadeArtifact` a reader could confuse with "ran, found
    # nothing to retract."
    cascade: CascadeArtifact | None = None

    @property
    def campaign(self) -> str:
        return self.manifest.campaign

    @property
    def counts(self) -> RunCounts:
        return self.manifest.counts


def load_manifest(run_dir: str | Path) -> ManifestArtifact:
    """`MANIFEST.json` alone, read and validated through this module's
    own contract, with `calibration.json`/`timeline.json`/`self-
    report.json` untouched. For a caller that needs only a run's own
    identity (`hte.publish.publish`'s own `campaign`, for its commit
    message and gdrive path) rather than its full reported content:
    `hte.publish`'s job is committing whatever artifact files a run
    directory carries, valid JSON or not, so it must not fail over one
    of those OTHER files' own malformed content the way `load_run`
    (which reads and parses all four) would."""
    run_dir = Path(run_dir)
    manifest_path = run_dir / "MANIFEST.json"
    if not manifest_path.is_file():
        raise FileNotFoundError(f"no MANIFEST.json under {run_dir}")
    return _manifest_from_dict(json.loads(manifest_path.read_text()), path=str(manifest_path))


def load_run(run_dir: str | Path) -> RunData:
    """Every artifact this package's own downstream stages need from
    `run_dir` (`hte.runner.run_campaign`'s own output layout): `MANIFEST.
    json` (required, `FileNotFoundError` when absent, since a run with no
    manifest names no campaign to report on at all), `timeline.json`,
    `calibration.json` (kept `None` when its own file is absent, no
    defaulting: no discovery-date holdout having run is its own real,
    distinct state), and `self-report.json`.

    Every field any of the four carries missing falls back to its own
    documented default and logs one warning (`_opt`/`_build`'s own
    machinery) rather than raising; only `MANIFEST.json`'s own absence,
    and its own missing `campaign` field, are treated as fatal, per this
    module's own docstring. A caller that needs only `MANIFEST.json`
    itself, and must not fail over another file's own unrelated bad
    content, wants `load_manifest` instead."""
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

    return RunData(
        run_dir=run_dir, manifest=manifest, timeline=timeline, calibration=calibration,
        self_report=self_report, cascade=cascade,
    )


__all__ = [
    "RUN_ARTIFACT_VERSION",
    "CoverageStats", "TargetBlindStats", "RunCounts", "ManifestArtifact",
    "SelfReportArtifact", "CalibrationArtifact", "TimelineArtifact", "CascadeArtifact",
    "RunData", "load_run", "load_manifest", "validate_manifest", "validate_self_report",
]
