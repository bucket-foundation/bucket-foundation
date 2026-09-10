"""Research OS <-> hypothesis engine bridge export (`bkt-ros`, PR #14
`feat/ros-engine-bridge-v2`, `src/lib/research-os/engine-bridge.ts`'s own
`EngineHypothesisInput`).

`engine-bridge.ts` is a pure, dependency-free mapping layer on the
TypeScript side: `buildEngineNode`/`buildEngineEdges` take an
`EngineHypothesisInput` and produce a `graph.nodes`/`graph.edges` draft,
no I/O of their own. This module is the Python-side producer of that
same input shape, over a completed `hte.runner.run_campaign` run,
reusing `hte.canon_writeback.reconstruct_candidates`'s own reconstruction
(the same real `(b, d, u, a)` opinion, linked evidence, and dated
interval `hte.canon_writeback.write_back` renders into a card) rather
than re-deriving it a second way.

`export_for_bridge` is pure: it reads `run_dir` and returns a plain
`list[dict]`, no file write. `write_bridge_export` is the thin I/O
wrapper `hte.canon_writeback.write_back` calls, writing the result next
to the run's own feed402 envelope.

## Field mapping against `EngineHypothesisInput` (2026-09-10 read of
`src/lib/research-os/engine-bridge.ts`)

Every field below whose name matches the TypeScript interface exactly
(`engine`, `runId`, `campaign`, `hypothesisId`, `model`, `tierAssigned`,
`branch`, `title`, `summary`, `kind`, `posterior`, `elo`, `slots`,
`addressTimeBin`, `evidenceRefs`, `derivesFromSlugs`) is filled to that
field's own documented contract, read verbatim from the TS source
rather than assumed:

- `tierAssigned` follows the interface's own docstring, `hte.evidence.
  Tier` ("T1".."T6"), a source-reliability axis this module keeps
  separate from Bucket's own `draft`/`candidate`/`canon` canon-maturity
  axis: this module reads it as the most reliable
  (lowest-numbered) tier among the hypothesis's own linked evidence,
  `None` when nothing linked. A caller wanting the canon-maturity axis
  reads the additive `canonTier` field below instead.
- `slots` is typed `Record<string, string | null>` in the TS source (one
  bare concept-id string per slot name); this module emits `{id, label}`
  per slot instead, since a downstream bridge node benefits from a
  human-readable label with no second vocabulary lookup. This is a
  widening of the documented type, flagged in this task's own PR #14
  comment rather than silently shipped.
- `evidenceRefs` stays the documented bare `string[]` of evidence-item
  ids (`buildEngineEdges` maps each entry straight to a `cites` edge
  target slug; an object here would break that `.map`). The source
  citation the coordinating task also asked for lives in the additive
  `evidenceCitations` field instead, never inside `evidenceRefs` itself.

Two fields the coordinating task named are not part of `EngineHypothesisInput`
as read from the TS source at all: `accepted` and the canon-maturity
tier. Both are added here as additive fields beyond the interface's own
2026-09-10 shape, named plainly (`accepted`, `canonTier`) so PR #14's own
review can decide whether to widen the TypeScript type to match, per the
PR comment this task posts alongside this file.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from . import canon_writeback

ENGINE_NAME = "hte"


def _dominant_evidence_tier(candidate: "canon_writeback.Candidate") -> str | None:
    """The most reliable (lowest-numbered) `hte.evidence.Tier` among a
    candidate's own linked evidence (supports and refutes both), `None`
    when nothing is linked. Matches `EngineHypothesisInput.tierAssigned`'s
    own documented reading, `hte.evidence.Tier`, distinct from Bucket's
    `canon_tier` axis (see this module's own top docstring)."""
    items = candidate.supports + candidate.refutes
    if not items:
        return None
    return min((item.tier.value for item in items), key=lambda tier: int(tier[1]))


def _slots_for_bridge(candidate: "canon_writeback.Candidate", ctx: "canon_writeback.RunContext") -> dict[str, dict[str, str] | None]:
    return {
        name: (
            {"id": candidate.slots[name], "label": canon_writeback._label_of(ctx.corpus, name, candidate.slots[name])}
            if candidate.slots.get(name) else None
        )
        for name in canon_writeback._SLOT_NAMES
    }


def export_for_bridge(
    run_dir: str | Path, *, floor_P: float = 0.6, floor_u_max: float = 0.5, branch: str = "",
) -> list[dict[str, Any]]:
    """Every survivor `run_dir` carries, as an `EngineHypothesisInput`-
    shaped dict (see this module's own top docstring for the exact field
    mapping and its two additive fields, `accepted` and `canonTier`).
    Pure: reads `run_dir` and its own corpus, writes nothing."""
    candidates, ctx = canon_writeback.reconstruct_candidates(run_dir)
    # `MANIFEST.json["models"]` is `hte.llm._model_policy()`'s own whole
    # file (`{"_note", "roles": {"generator": ..., ...}, "escalation"}`),
    # not a flat `{"generator": ...}` map; the role alias lives one level
    # down, under `"roles"`.
    model_roles = (ctx.manifest.models or {}).get("roles", {}) if isinstance(ctx.manifest.models, dict) else {}

    items: list[dict[str, Any]] = []
    for candidate in candidates:
        accepted = candidate.posterior >= floor_P and candidate.opinion.u <= floor_u_max
        evidence_items = candidate.supports + candidate.refutes
        items.append({
            "engine": ENGINE_NAME,
            "runId": ctx.run_id,
            "campaign": ctx.manifest.campaign,
            "hypothesisId": candidate.short_id,
            "model": model_roles.get("generator"),
            "tierAssigned": _dominant_evidence_tier(candidate),
            "branch": branch,
            "title": canon_writeback._statement(ctx.corpus, candidate),
            "summary": None,
            "kind": "derivation",
            "posterior": candidate.posterior,
            "elo": candidate.elo,
            "slots": _slots_for_bridge(candidate, ctx),
            "addressTimeBin": candidate.time_bin,
            "evidenceRefs": [item.id for item in evidence_items],
            "derivesFromSlugs": [],
            "accepted": accepted,
            "canonTier": canon_writeback.CANON_TIER if accepted else None,
            "evidenceCitations": [
                {"ref": item.id, "sourceId": item.source_id, "citation": item.span.locator, "quote": item.span.quote}
                for item in evidence_items
            ],
        })
    return items


def write_bridge_export(
    run_dir: str | Path, *, envelope_path: Path, floor_P: float = 0.6, floor_u_max: float = 0.5, branch: str = "",
) -> Path:
    """`export_for_bridge`'s own I/O wrapper: writes the result next to
    the feed402 envelope `hte.canon_writeback.write_back` already wrote,
    at `<envelope_path's own stem>.bridge.json` (`public/research/
    hypotheses/<run-id>.bridge.json` for `write_back`'s own envelope
    path). Returns the path written."""
    items = export_for_bridge(run_dir, floor_P=floor_P, floor_u_max=floor_u_max, branch=branch)
    out_path = envelope_path.with_name(f"{envelope_path.stem}.bridge.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(items, indent=2), encoding="utf-8")
    return out_path


__all__ = ["export_for_bridge", "write_bridge_export", "ENGINE_NAME"]
