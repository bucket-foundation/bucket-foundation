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
(`engine`, `runId`, `campaign`, `hypothesisId`, `model`, `branch`,
`title`, `summary`, `kind`, `posterior`, `elo`, `slots`,
`addressTimeBin`, `evidenceRefs`, `derivesFromSlugs`) is filled to that
field's own documented contract, read verbatim from the TS source
rather than assumed:

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

## `tierAssigned` is deliberately left `None` (PR #28's own finding)

`buildEngineNode` feeds `tierAssigned` straight into `graph.nodes.tier`
through `engineTierToGraphTier`, defaulting to `6` when absent. PR #28's
own review of the Phase 0 seed found that column already overloaded:
`tier` is a K-12 grade band (3-12 for a path node) on one row shape and
the canon-bridge sentinel (`90`) on another. `hte.evidence.Tier`'s own
"T1".."T6" ladder is a THIRD, unrelated meaning (source reliability), and
writing it there collides directly with a real grade-3-through-6 node:
an engine hypothesis whose best evidence is `T4` is not a grade-4 node.
This module never populates `tierAssigned` with that ladder for exactly
this reason (leaving it at the interface's own no-data default rather
than actively colliding six different ways); the source-reliability
value lives in the additive `source_tier` field below instead, until the
graph schema gives it a column of its own. Flagged on PR #14's own
follow-up comment and in `docs/BUILD-HISTORY.md`.

## Additive fields beyond `EngineHypothesisInput`'s 2026-09-10 shape

None of the fields below are part of the TypeScript interface as read
from source; each is named plainly so PR #14's own review can decide
whether to widen the type to match:

- `accepted` (bool): whether the hypothesis clears the caller's own
  `floor_P`/`floor_u_max`, `hte.canon_writeback.select_above_floor`'s
  own rule, repeated here since a bridge caller may want it without
  re-deriving the two floors itself.
- `canon_tier` (`"candidate"`, always, snake_case to match the graph
  schema's own column-naming convention rather than the interface's
  camelCase): every hypothesis this module exports is candidate
  material regardless of `accepted`, per `GOVERNANCE.md`; `accepted`
  alone answers "does this clear the floor," never "is this canon."
- `origin` (`"engine"`, always): this row's provenance is the
  hypothesis engine, distinct from a human-authored canon entry or an
  Academy atom, the same distinction PR #22's own importers draw
  between their two source kinds.
- `source_tier` (`hte.evidence.Tier`, "T1".."T6", or `None`): the most
  reliable tier among the hypothesis's own linked evidence. See
  "`tierAssigned` is deliberately left `None`" above for why this lives
  here and not in `tierAssigned`.
- `opinion` (`{"b", "d", "u", "a", "P"}`): the full subjective-logic
  opinion, not just its projection. `posterior` above already carries
  `P` alone for a caller that only wants the interface's own documented
  field; `opinion` exists because `u` (uncertainty mass) has no home in
  `EngineHypothesisInput` at all, and a caller that only reads
  `posterior` cannot tell an unexamined hypothesis (`u` near 1) from an
  examined, moderately-believed one at the same `P`.
  **Routing guidance**: rank and gate on `opinion.P`, capped by a ceiling
  on `opinion.u` (`hte.canon_writeback.select_above_floor`'s own
  `floor_u_max`, or a caller's own choice), never on a linked evidence
  item's own `views["blended_a"]` (the entity-graph resolver's `0.40
  cos + 0.25 fuzzy + 0.10 motif` score, `hte.corpus.sacred_history`'s own
  module docstring): that number is one piece of evidence's own
  evidentiary weight `e_i`, a fact about one citation's own strength.
  Every hypothesis this module exports pools zero or more such items
  through `hte.belief.score` first; only the pooled `opinion` that
  produces means anything at the hypothesis level.
- `evidenceCitations` (`[{ref, sourceId, citation, quote}]`): the source
  citation `evidenceRefs`' own bare ids cannot carry without breaking
  `buildEngineEdges`'s `.map`, kept in this separate, richer field.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from . import canon_writeback

ENGINE_NAME = "hte"
ORIGIN = "engine"


def _source_tier(candidate: "canon_writeback.Candidate") -> str | None:
    """The most reliable (lowest-numbered) `hte.evidence.Tier` among a
    candidate's own linked evidence (supports and refutes both), `None`
    when nothing is linked. This is `source_tier`, never `tierAssigned`;
    see this module's own top docstring for why the two must not be
    conflated (PR #28's `graph.nodes.tier` finding)."""
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
    shaped dict plus this module's own additive fields (see this
    module's own top docstring for the exact mapping, the `tierAssigned`
    exclusion, and the `opinion`/`source_tier`/`canon_tier`/`origin`
    additions). Pure: reads `run_dir` and its own corpus, writes
    nothing."""
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
        opinion = candidate.opinion
        items.append({
            "engine": ENGINE_NAME,
            "runId": ctx.run_id,
            "campaign": ctx.manifest.campaign,
            "hypothesisId": candidate.short_id,
            "model": model_roles.get("generator"),
            # Deliberately `None`: see this module's own top docstring,
            # "`tierAssigned` is deliberately left `None`" (PR #28).
            "tierAssigned": None,
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
            "canon_tier": canon_writeback.CANON_TIER,
            "origin": ORIGIN,
            "source_tier": _source_tier(candidate),
            "opinion": {"b": opinion.b, "d": opinion.d, "u": opinion.u, "a": opinion.a, "P": candidate.posterior},
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


__all__ = ["export_for_bridge", "write_bridge_export", "ENGINE_NAME", "ORIGIN"]
