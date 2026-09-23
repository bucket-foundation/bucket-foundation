from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from . import canon_writeback

ENGINE_NAME = "hte"
ORIGIN = "engine"

def _source_tier(candidate: "canon_writeback.Candidate") -> str | None:
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
    run_dir: str | Path, *, floor_P: float = 0.6, floor_u_max: float = 0.5, lift_floor: float = 0.25,
    fdr_q: float = 1.0, branch: str = "",
) -> list[dict[str, Any]]:
    candidates, ctx = canon_writeback.reconstruct_candidates(run_dir)
    accepted_ids = {
        id(c) for c in canon_writeback.select_above_floor(
            candidates, floor_P=floor_P, floor_u_max=floor_u_max, lift_floor=lift_floor, fdr_q=fdr_q,
        )
    }
    model_roles = (ctx.manifest.models or {}).get("roles", {}) if isinstance(ctx.manifest.models, dict) else {}

    items: list[dict[str, Any]] = []
    for candidate in candidates:
        opinion = candidate.opinion
        accepted = id(candidate) in accepted_ids
        evidence_items = candidate.supports + candidate.refutes
        items.append({
            "engine": ENGINE_NAME,
            "runId": ctx.run_id,
            "campaign": ctx.manifest.campaign,
            "hypothesisId": candidate.short_id,
            "model": model_roles.get("generator"),
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
            "opinion": {**opinion.to_dict(), "P": candidate.posterior},
            "evidenceCitations": [
                {"ref": item.id, "sourceId": item.source_id, "citation": item.span.locator, "quote": item.span.quote}
                for item in evidence_items
            ],
        })
    return items

def write_bridge_export(
    run_dir: str | Path, *, envelope_path: Path, floor_P: float = 0.6, floor_u_max: float = 0.5, lift_floor: float = 0.25,
    fdr_q: float = 1.0, branch: str = "",
) -> Path:
    items = export_for_bridge(run_dir, floor_P=floor_P, floor_u_max=floor_u_max, lift_floor=lift_floor, fdr_q=fdr_q, branch=branch)
    out_path = envelope_path.with_name(f"{envelope_path.stem}.bridge.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(items, indent=2), encoding="utf-8")
    return out_path

__all__ = ["export_for_bridge", "write_bridge_export", "ENGINE_NAME", "ORIGIN"]
