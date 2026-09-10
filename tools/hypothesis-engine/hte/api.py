"""`hypothesize`: the concrete surface Research OS calls when a K-12
production arrives.

One function, `hypothesize(request, *, config=None) -> dict`, sits between
a production record (or a batch of them) and `hte.runner.run_campaign`
(README.md's "one call that wires all of it together"), matching the
request/response shape `docs/K12-INTEGRATION.md`'s own `hypothesize` tool
names, expanded per `docs/RESEARCH-OS-INTEGRATION.md`'s "write-side hook"
section: per-bin ranked hypotheses carrying their full opinion, slots
resolved to labels, and linked evidence ids; gap nodes ranked by value of
information; coverage, surprise items, and prior-profile robustness;
self-report assumptions and refusal counts; artifact version, run id, and
timings.

Request shape::

    {
      "productions": {...} | [{...}, ...],   # one PRODUCTION-SCHEMA record, a `graph.productions` row (Research OS's own shape, auto-detected and normalized), or a list mixing either; "production" (singular) also accepted for a single record
      "status_min": "peer-reviewed",          # optional, one of draft/peer-reviewed/teacher-reviewed/accepted; default "peer-reviewed", hte.corpus.production's own default
      "seeds": 1,                             # optional, default 1
      "max_hypotheses": 100,                  # optional, default 100
      "llm_mode": "fake",                     # optional, "fake" or "claude"; unset leaves HTE_LLM_MODE as the process already has it
      "replay_only": false,                   # optional, default false
      "prior_profile": "consensus"            # optional, one of consensus/skeptic/fringe/uniform; default "consensus"
    }

`config` is the escape hatch for every other `hte.runner.run_campaign`
knob (`generate_n`, `combinatorial_max_items`, `tournament_rounds`,
`max_time_bins`, ...); it is merged on top of this module's own latency-
tuned defaults and the request-derived overrides above, in that order.

`hypothesize()` raises on a malformed request or a failed campaign rather
than returning an `"ok": false` envelope; `hte.serve`'s HTTP layer is what
turns those exceptions into the `{"ok": false, "error": ...}` shape a
caller over HTTP sees. Two exception classes: `RequestValidationError`
(the request failed PRODUCTION-SCHEMA validation, or carried a bad
option, before any campaign ran) and `CampaignError` (`run_campaign`
itself raised). Both subclass `HypothesizeError`.

No adapter file this module reads is modified: `hte.corpus.production`
has no `load_records`, so the in-memory-record path below builds a
`Corpus` directly, reusing `production.Production.from_dict` and
`production._build_corpus` (the same building blocks `production.load`/
`load_supabase` call), and reaches `hte.runner.run_campaign` through a
one-shot registration on `hte.runner._CORPUS_LOADERS` under a unique key,
the same pattern `tests/test_runner.py`'s own
`test_education_atlas_campaign_run_completes_end_to_end_in_fake_mode`
already uses to feed `run_campaign` a corpus with no registered loader of
its own.

Every response value is drawn from `RunArtifacts`' own in-memory fields
(`hte.runner.RunArtifacts`), never re-read off disk: the temp run
directory `run_campaign` writes to is deleted before `hypothesize()`
returns, and nothing in the response ever carries that directory's own
path, a `claude -p` prompt string, or an environment value (`SUPABASE_URL`
and friends are never read by this module at all).
"""
from __future__ import annotations

import contextlib
import os
import re
import shutil
import tempfile
import time
import uuid
from pathlib import Path
from typing import Any

from . import export, runner, unknowns
from .concepts import Slot, Vocabulary
from .corpus import production
from .evidence import EvidenceKind, Tier

DEFAULT_STATUS_MIN = "peer-reviewed"

_PRIOR_PROFILES = frozenset({"consensus", "skeptic", "fringe", "uniform"})
_LLM_MODES = frozenset({"fake", "claude"})
_ALLOWED_AUTHOR_ROLES = frozenset({"student", "teacher", "researcher", "agent"})
_ALLOWED_EVIDENCE_KINDS = frozenset(k.value for k in EvidenceKind)
_ALLOWED_TIERS = frozenset(t.value for t in Tier)
_ALLOWED_STATUSES = frozenset(production._ALL_STATUSES)
_SLOT_NAME_TO_ENUM: dict[str, Slot] = {slot.name: slot for slot in production._SLOT_KEYS}

_GAP_NODE_LIMIT = 25

# Latency-tuned defaults for a synchronous request/response call, well
# below `hte.runner.DEFAULT_CONFIG`'s own batch-campaign-sized defaults
# (`generate_n=20`, `combinatorial_max_items=150`, `max_hypotheses=400`,
# `seeds=3`): a K-12 production batch is corpus-sized in the dozens of
# evidence items, where `quantum-history`/`education-atlas` carry
# hundreds, so this module's own defaults trade population breadth for a
# response an HTTP caller gets back in well under a second in fake mode.
# Every key here, and every other `hte.runner.run_campaign` key this
# dict omits, is still overridable through `hypothesize`'s own `config`
# argument.
_API_DEFAULTS: dict[str, Any] = {
    "campaign": "hypothesize",
    "seeds": 1,
    "generate_n": 5,
    "generate_evidence_sample": 8,
    "combinatorial_max_items": 40,
    "max_hypotheses": 100,
    "tournament_rounds": 1,
    "max_time_bins": 10,
    "run_extraction": False,
    "run_calibration": True,
    "critic_batch_size": 8,
    "judge_batch_size": 8,
    "verbose": False,
}


class HypothesizeError(Exception):
    """Base class for every error `hypothesize()` raises."""


class RequestValidationError(HypothesizeError):
    """The request failed `PRODUCTION-SCHEMA.md` validation, or carried a
    bad option, before any campaign ran. `str(exc)` is a `"; "`-joined
    list of every problem this request collected."""


class CampaignError(HypothesizeError):
    """`hte.runner.run_campaign` raised while running this request's
    campaign, after the request itself passed validation. `str(exc)` is
    sanitized: the temp run directory this call created is never named."""


# --------------------------------------------------------------------------
# request validation
# --------------------------------------------------------------------------


def _validate_production_record(idx: int, raw: Any, vocab: Vocabulary, errors: list[str]) -> None:
    """`vocab` (`production.load_vocab()`, the fixed K-12 production seed)
    is used below for enum-shaped fields only (`author_role`, `review.
    status`, evidence `kind`/`tier`, claim `stance`): every one of those
    has a fixed, closed set of legal values no corpus content ever
    extends. A claim's own `slots` values are NOT checked against `vocab`
    here: `hte.corpus.production._build_corpus` resolves every slot value
    for real, via `hte.vocab_induce.induce`, once the full corpus is
    built, so a value this fixed seed does not yet name (a Research OS
    graph-node id, `docs/PRODUCTION-SCHEMA-ALIGNMENT.md`'s own physics
    case) is not a validation error, it is a concept this request's own
    campaign is about to induce."""
    prefix = f"productions[{idx}]"
    if not isinstance(raw, dict):
        errors.append(f"{prefix}: expected an object, got {type(raw).__name__}")
        return

    for key in ("id", "created_at", "author_role", "grade_band", "school_or_district_id", "research_question", "review"):
        if key not in raw:
            errors.append(f"{prefix}: missing required field {key!r}")

    author_role = raw.get("author_role")
    if author_role is not None and author_role not in _ALLOWED_AUTHOR_ROLES:
        errors.append(f"{prefix}.author_role: {author_role!r} is not one of {sorted(_ALLOWED_AUTHOR_ROLES)}")

    review = raw.get("review")
    if review is not None:
        if not isinstance(review, dict) or "status" not in review:
            errors.append(f"{prefix}.review: must be an object with a 'status' field")
        else:
            status = review["status"]
            if status not in _ALLOWED_STATUSES:
                errors.append(f"{prefix}.review.status: {status!r} is not one of {sorted(_ALLOWED_STATUSES)}")
            for hi, entry in enumerate(review.get("history", []) or []):
                if not isinstance(entry, dict) or "status" not in entry or "date" not in entry:
                    errors.append(f"{prefix}.review.history[{hi}]: must be an object with 'status' and 'date'")

    claims = raw.get("claims", [])
    if not isinstance(claims, list):
        errors.append(f"{prefix}.claims: expected a list, got {type(claims).__name__}")
        claims = []

    for ci, claim in enumerate(claims):
        cprefix = f"{prefix}.claims[{ci}]"
        if not isinstance(claim, dict):
            errors.append(f"{cprefix}: expected an object, got {type(claim).__name__}")
            continue
        if "text" not in claim:
            errors.append(f"{cprefix}: missing required field 'text'")
        stance = claim.get("stance")
        if "stance" not in claim:
            errors.append(f"{cprefix}: missing required field 'stance'")
        elif stance not in production._STANCE_MAP:
            errors.append(f"{cprefix}.stance: {stance!r} is not one of {sorted(production._STANCE_MAP)}")

        slots = claim.get("slots") or {}
        if not isinstance(slots, dict):
            errors.append(f"{cprefix}.slots: expected an object, got {type(slots).__name__}")

        interval = claim.get("interval")
        if interval is not None and (not isinstance(interval, dict) or "start" not in interval or "end" not in interval):
            errors.append(f"{cprefix}.interval: must be an object with 'start' and 'end'")

        evidence = claim.get("evidence", [])
        if not isinstance(evidence, list):
            errors.append(f"{cprefix}.evidence: expected a list, got {type(evidence).__name__}")
            evidence = []
        for ei, ev in enumerate(evidence):
            eprefix = f"{cprefix}.evidence[{ei}]"
            if not isinstance(ev, dict):
                errors.append(f"{eprefix}: expected an object, got {type(ev).__name__}")
                continue
            for key in ("source_id", "locator", "quote", "kind", "tier"):
                if key not in ev:
                    errors.append(f"{eprefix}: missing required field {key!r}")
            kind = ev.get("kind")
            if kind is not None and kind not in _ALLOWED_EVIDENCE_KINDS:
                errors.append(f"{eprefix}.kind: {kind!r} is not one of {sorted(_ALLOWED_EVIDENCE_KINDS)}")
            tier = ev.get("tier")
            if tier is not None and tier not in _ALLOWED_TIERS:
                errors.append(f"{eprefix}.tier: {tier!r} is not one of {sorted(_ALLOWED_TIERS)}")
            for cti, cite in enumerate(ev.get("citations", []) or []):
                if not isinstance(cite, dict) or "type" not in cite or "value" not in cite:
                    errors.append(f"{eprefix}.citations[{cti}]: must be an object with 'type' and 'value'")


def _normalize_productions_field(request: dict[str, Any], errors: list[str]) -> list[Any]:
    raw = request["productions"] if "productions" in request else request.get("production")
    if raw is None:
        errors.append("request must carry 'productions': one production record (PRODUCTION-SCHEMA) or a list of them")
        return []
    if isinstance(raw, dict):
        return [raw]
    if isinstance(raw, list):
        if not raw:
            errors.append("request['productions'] must carry at least one production record")
        return raw
    errors.append(f"request['productions'] must be an object or a list, got {type(raw).__name__}")
    return []


def _normalize_research_os_records(raw_list: list[Any], errors: list[str]) -> list[Any]:
    """Normalize every `graph.productions`-shaped record in `raw_list` onto
    `PRODUCTION-SCHEMA.md`'s own shape (`production.normalize_research_os_
    record`) before `_validate_production_record` ever sees it, so every
    validation error this module raises is expressed in one vocabulary
    regardless of which shape a caller sent. A record already in
    `PRODUCTION-SCHEMA.md`'s own shape passes through untouched
    (`production.is_research_os_record` returns `False` for it).

    A malformed Research OS record (missing `id` or `target_node_id`, an
    unrecognized `status`, or neither `updated_at` nor `created_at`,
    every field `normalize_research_os_record` cannot default around) is
    collected into `errors` the same way every other problem this module
    finds is, rather than raising past this function: `hypothesize()`
    still reports every problem in one request together, per its own
    `RequestValidationError` contract."""
    out: list[Any] = []
    for idx, raw in enumerate(raw_list):
        if isinstance(raw, dict) and production.is_research_os_record(raw):
            try:
                out.append(production.normalize_research_os_record(raw))
            except ValueError as exc:
                errors.append(f"productions[{idx}]: {exc}")
                out.append(raw)  # keep the index aligned; still fails PRODUCTION-SCHEMA validation below
        else:
            out.append(raw)
    return out


# --------------------------------------------------------------------------
# corpus-loader registration (`hte.runner._CORPUS_LOADERS` is a plain
# module-level dict; this is the same one-shot-key pattern `tests/
# test_runner.py` already uses to hand `run_campaign` a corpus with no
# registered loader of its own, never a change to `runner.py` itself)
# --------------------------------------------------------------------------


@contextlib.contextmanager
def _temporary_corpus_loader(corpus):
    key = f"__hypothesize_{uuid.uuid4().hex}__"
    runner._CORPUS_LOADERS[key] = lambda: corpus
    try:
        yield key
    finally:
        runner._CORPUS_LOADERS.pop(key, None)


@contextlib.contextmanager
def _llm_mode_override(mode: str | None):
    if mode is None:
        yield
        return
    previous = os.environ.get("HTE_LLM_MODE")
    os.environ["HTE_LLM_MODE"] = mode
    try:
        yield
    finally:
        if previous is None:
            os.environ.pop("HTE_LLM_MODE", None)
        else:
            os.environ["HTE_LLM_MODE"] = previous


def _sanitize(text: str, run_dir: Path) -> str:
    """`text` with this call's own temp run directory, and anything that
    looks like an absolute filesystem path, replaced by a placeholder.
    Applied to every exception message this module re-raises, per this
    module's own "never an absolute path in the response" contract. The
    path-root allowlist below covers every root a real deployment of this
    package is known to run under (a developer's own `/home` or `/Users`,
    a container's `/root` or `/app`, a server's `/srv` or `/opt`, and
    `/tmp`/`/var` for a temp or log path); a root outside this list stays
    a gap this backstop leaves open behind the explicit `run_dir`
    replacement above, worth widening the moment a real deployment names
    a root not yet on it."""
    sanitized = text.replace(str(run_dir), "<run_dir>")
    return re.sub(r"/(?:home|tmp|Users|var|srv|opt|root|app|mnt|data|etc)/\S*", "<path>", sanitized)


# --------------------------------------------------------------------------
# response assembly
# --------------------------------------------------------------------------


def _slot_labels(vocab: Vocabulary, slots_raw: dict[str, str | None]) -> dict[str, str | None]:
    out: dict[str, str | None] = {}
    for name, raw_id in slots_raw.items():
        slot = _SLOT_NAME_TO_ENUM.get(name)
        concept = vocab.get(slot, raw_id) if slot is not None and raw_id is not None else None
        out[name] = concept.label if concept is not None else raw_id
    return out


def _evidence_link_maps(evidence_items) -> tuple[dict[int, list[str]], dict[int, list[str]]]:
    supports: dict[int, list[str]] = {}
    refutes: dict[int, list[str]] = {}
    for item in evidence_items:
        for addr in item.supports:
            supports.setdefault(addr, []).append(item.id)
        for addr in item.refutes:
            refutes.setdefault(addr, []).append(item.id)
    return supports, refutes


def _enrich_entry(entry: dict[str, Any], vocab: Vocabulary, opinions, supports_map, refutes_map) -> dict[str, Any]:
    address = entry["address"]
    opinion = opinions.get(address)
    return {
        "hypothesis_id": entry["hypothesis_id"],
        "address": address,
        "slots": entry["slots"],
        "slot_labels": _slot_labels(vocab, entry["slots"]),
        "opinion": (
            {"b": opinion.b, "d": opinion.d, "u": opinion.u, "a": opinion.a, "P": opinion.project()}
            if opinion is not None else None
        ),
        "elo": entry["elo"],
        "linked_evidence": {
            "supports": sorted(supports_map.get(address, [])),
            "refutes": sorted(refutes_map.get(address, [])),
        },
    }


def _rank_gap_nodes(corpus, hypotheses, opinions) -> list[dict[str, Any]]:
    """A gap node per evidence item naming no value for at least one of
    its five concept slots (`docs/K12-INTEGRATION.md`'s own reading of a
    gap node against a corpus with no `hte.unknowns.GapNode` wiring of
    its own yet, `README.md`'s "nothing yet calls them from `hte.
    runner`"), ranked by `hte.unknowns.value_of_information` against the
    surviving population this run scored."""
    nodes = []
    for item in corpus.evidence:
        unresolved = [
            name for name, value in (
                ("actor", item.actor), ("action", item.action), ("object", item.object),
                ("place", item.place), ("mechanism", item.mechanism),
            ) if value is None
        ]
        if not unresolved:
            continue
        would_move = sorted(set(item.supports) | set(item.refutes))
        nodes.append(unknowns.GapNode(
            id=f"gap-{item.id}", kind="unresolved-slot",
            description=f"evidence {item.id} names no value for: {', '.join(unresolved)}",
            would_move=would_move,
        ))
    scored = sorted(
        ((node, unknowns.value_of_information(node, hypotheses, opinions)) for node in nodes),
        key=lambda pair: pair[1], reverse=True,
    )
    return [
        {
            "id": node.id, "kind": node.kind, "description": node.description,
            "would_move": node.would_move, "value_of_information": voi,
        }
        for node, voi in scored[:_GAP_NODE_LIMIT]
    ]


def _surprise_entry(item) -> dict[str, Any]:
    return {
        "id": item.id, "source_id": item.source_id, "kind": item.kind.value, "tier": item.tier.value,
        "quote": production._truncate(item.span.quote), "actor": item.actor, "action": item.action,
        "object": item.object, "place": item.place, "mechanism": item.mechanism,
    }


def _calibration_summary(calibration: dict[str, Any] | None) -> dict[str, Any] | None:
    if not calibration:
        return None
    return {
        "mode": calibration.get("mode"),
        "brier_score": calibration.get("brier_score"),
        "coverage_of_truth": calibration.get("coverage_of_truth"),
    }


def _build_response(
    artifacts, *, corpus, prior_profile: str, status_min: str, n_productions: int, elapsed_s: float,
) -> dict[str, Any]:
    manifest = artifacts.manifest
    vocab = corpus.vocab
    time_binning = manifest.get("time_binning") or {}
    bin_labels = time_binning.get("bin_labels") or {}
    time_bins = sorted(bin_labels.keys())

    views = export.timeline_views(
        artifacts.hypotheses, artifacts.opinions, artifacts.elos, time_bins,
        top_k=max(len(artifacts.hypotheses), 1),
        span_start=time_binning.get("span_start", 0),
        bin_width=time_binning.get("bin_width", 1),
        bin_labels=bin_labels,
    )
    supports_map, refutes_map = _evidence_link_maps(corpus.evidence)
    bins_out = [
        {
            "time_bin": b["time_bin"],
            "ranked_hypotheses": [
                _enrich_entry(e, vocab, artifacts.opinions, supports_map, refutes_map)
                for e in b["ranked_hypotheses"]
            ],
        }
        for b in views["bins"]
    ]

    self_report = artifacts.self_report or {}
    refusal_counts = {role: len(ids) for role, ids in (manifest.get("refusals") or {}).items()}
    llm_stats = manifest.get("llm_stats") or {}
    counts = manifest.get("counts") or {}

    return {
        "ok": True,
        "run_id": f"{manifest.get('campaign', 'hypothesize')}-{manifest.get('timestamp', '')}",
        "artifact_version": manifest.get("run_artifact_version"),
        # `manifest["models"]` (`hte.llm._model_policy()`, `model-policy.json`'s
        # own role-to-CLI-alias map plus the `escalation` fallback): a
        # caller storing this run's provenance alongside a learner's
        # production needs which model backed it, not just this run's id,
        # so both travel together rather than only `run_id` reaching the
        # response.
        "models": manifest.get("models"),
        "corpus": {
            "n_productions": n_productions, "status_min": status_min, "prior_profile": prior_profile,
            "n_sources": counts.get("n_sources"), "n_evidence": counts.get("n_evidence"),
            "n_hypotheses_generated": counts.get("n_hypotheses_generated"), "n_survivors": counts.get("n_survivors"),
        },
        "timeline": {"bins": bins_out},
        "gap_nodes": _rank_gap_nodes(corpus, artifacts.hypotheses, artifacts.opinions),
        "coverage": artifacts.coverage,
        "surprise_items": [_surprise_entry(item) for item in artifacts.surprise_items],
        "prior_profile_robustness": {
            "requested_profile": prior_profile,
            "profiles": sorted(_PRIOR_PROFILES),
            "stable_fraction": counts.get("robustness_stable_fraction"),
        },
        "self_report": {
            "assumptions": list(self_report.get("assumptions", [])),
            "incomplete_vocabularies": list(self_report.get("incomplete_vocabularies", [])),
            "missing_mass_estimate": self_report.get("missing_mass_estimate"),
            "calibration_summary": self_report.get("calibration_summary"),
            "target_blind_steady": self_report.get("target_blind_steady"),
            "refusal_counts": refusal_counts,
        },
        "calibration": _calibration_summary(artifacts.calibration),
        "timings": {
            "total_s": round(elapsed_s, 3),
            "llm_wall_time_s": {role: row.get("wall_time_s", 0.0) for role, row in llm_stats.items()},
        },
    }


# --------------------------------------------------------------------------
# public entry point
# --------------------------------------------------------------------------


def hypothesize(request: dict[str, Any], *, config: dict[str, Any] | None = None) -> dict[str, Any]:
    """Run a hypothesis-engine campaign over `request`'s own production
    record(s) and return the response shape this module's docstring
    documents. Raises `RequestValidationError` on a malformed request,
    `CampaignError` if `hte.runner.run_campaign` itself raises. See the
    module docstring for the request shape and every option's default.
    """
    if not isinstance(request, dict):
        raise RequestValidationError(f"request must be an object, got {type(request).__name__}")

    errors: list[str] = []
    raw_list = _normalize_productions_field(request, errors)
    raw_list = _normalize_research_os_records(raw_list, errors)

    status_min = request.get("status_min", DEFAULT_STATUS_MIN)
    try:
        production._check_status_min(status_min)
    except ValueError as exc:
        errors.append(str(exc))

    prior_profile = request.get("prior_profile", "consensus")
    if prior_profile not in _PRIOR_PROFILES:
        errors.append(f"prior_profile must be one of {sorted(_PRIOR_PROFILES)}, got {prior_profile!r}")

    llm_mode = request.get("llm_mode")
    if llm_mode is not None and llm_mode not in _LLM_MODES:
        errors.append(f"llm_mode must be one of {sorted(_LLM_MODES)}, got {llm_mode!r}")

    seeds = request.get("seeds", 1)
    if not isinstance(seeds, int) or isinstance(seeds, bool) or seeds < 1:
        errors.append(f"seeds must be a positive integer, got {seeds!r}")

    max_hypotheses = request.get("max_hypotheses", 100)
    if not isinstance(max_hypotheses, int) or isinstance(max_hypotheses, bool) or max_hypotheses < 1:
        errors.append(f"max_hypotheses must be a positive integer, got {max_hypotheses!r}")

    replay_only = request.get("replay_only", False)
    if not isinstance(replay_only, bool):
        errors.append(f"replay_only must be a boolean, got {replay_only!r}")

    vocab = production.load_vocab()
    for idx, raw in enumerate(raw_list):
        _validate_production_record(idx, raw, vocab, errors)

    if errors:
        raise RequestValidationError("; ".join(errors))

    try:
        productions = [production.Production.from_dict(raw) for raw in raw_list]
        corpus = production._build_corpus(
            productions, status_min=status_min, retrieval_run_id="hypothesize-api",
            source_path_for=lambda p: f"inmemory:{p.id}",
        )
    except (KeyError, ValueError) as exc:
        raise RequestValidationError(f"production record failed to build: {exc}") from exc

    corpus.vocab = unknowns.prior_profiles(corpus.vocab)[prior_profile]

    run_cfg = dict(_API_DEFAULTS)
    run_cfg.update({"seeds": seeds, "max_hypotheses": max_hypotheses, "replay_only": replay_only})
    if config:
        run_cfg.update(config)

    temp_root = Path(tempfile.mkdtemp(prefix="hte-hypothesize-"))
    started = time.monotonic()
    try:
        with _temporary_corpus_loader(corpus) as loader_key, _llm_mode_override(llm_mode):
            run_cfg["corpus"] = loader_key
            run_cfg["out_dir"] = str(temp_root)
            # `artifacts = run_campaign(...)` and the `_build_response(...)`
            # call that turns them into this function's own return value
            # share one try/except: a bug in response assembly (a manifest
            # shape edge case, a `None` where a dict was expected) is just
            # as much a failure of "run this campaign and hand back its
            # result" as `run_campaign` raising outright, and both must
            # reach the caller as the one documented `CampaignError`
            # contract, never a bare `KeyError`/`TypeError`/`AttributeError`
            # that bypasses it.
            try:
                artifacts = runner.run_campaign(run_cfg)
                elapsed = time.monotonic() - started
                return _build_response(
                    artifacts, corpus=corpus, prior_profile=prior_profile, status_min=status_min,
                    n_productions=len(productions), elapsed_s=elapsed,
                )
            except Exception as exc:
                raise CampaignError(_sanitize(f"{type(exc).__name__}: {exc}", temp_root)) from exc
    finally:
        shutil.rmtree(temp_root, ignore_errors=True)


__all__ = ["hypothesize", "HypothesizeError", "RequestValidationError", "CampaignError", "DEFAULT_STATUS_MIN"]
