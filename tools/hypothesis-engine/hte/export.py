from __future__ import annotations

import json
from pathlib import Path
from typing import Mapping, Sequence

from .address import DEFAULT_BIN_WIDTH, DEFAULT_SPAN_START, time_bin_index
from .belief import Opinion
from .evidence import EvidenceItem
from .hypothesis import Hypothesis, Placement
from .partition import partition, partition_odds

def _posterior(h: Hypothesis, opinions: Mapping[int, Opinion]) -> float | None:
    opinion = opinions.get(h.address)
    return opinion.project() if opinion is not None else None

def _opinion_dict(opinion: Opinion | None, posterior: float | None) -> dict[str, float] | None:
    if opinion is None:
        return None
    return {**opinion.to_dict(), "P": posterior}

def _rank_key(h: Hypothesis, opinions: Mapping[int, Opinion], elos: Mapping[int, float]):
    opinion = opinions.get(h.address)
    lift = opinion.lift() if opinion is not None else None
    posterior = _posterior(h, opinions)
    elo = elos.get(h.address)
    return (
        bool(opinion is not None and opinion.scored()),
        lift if lift is not None else float("-inf"),
        posterior if posterior is not None else float("-inf"),
        elo if elo is not None else float("-inf"),
    )

def _slots_of(placement: Placement) -> dict:
    return {
        "ACTOR": placement.actor, "ACTION": placement.action, "OBJECT": placement.object,
        "PLACE": placement.place, "MECHANISM": placement.mechanism,
    }

def _ranked_entry(
    h: Hypothesis, opinions: Mapping[int, Opinion], elos: Mapping[int, float],
    partition_info: Mapping[int, dict] | None = None,
) -> dict:
    posterior = _posterior(h, opinions)
    return {
        "hypothesis_id": h.short_id,
        "address": h.address,
        "slots": _slots_of(h.content),
        "posterior": posterior,
        "elo": elos.get(h.address),
        "opinion": _opinion_dict(opinions.get(h.address), posterior),
        "partition": (partition_info or {}).get(h.address),
    }

def timeline_views(
    hypotheses: Sequence[Hypothesis],
    opinions: Mapping[int, Opinion],
    elos: Mapping[int, float],
    time_bins: Sequence[int],
    *,
    top_k: int = 10,
    span_start: int = DEFAULT_SPAN_START,
    bin_width: int = DEFAULT_BIN_WIDTH,
    bin_labels: Mapping[int, str] | None = None,
    evidence: Sequence[EvidenceItem] = (),
) -> dict:
    placements = [h for h in hypotheses if not h.is_sequence]
    sequences = [h for h in hypotheses if h.is_sequence]
    partition_info: dict[int, dict] = {}
    for members in partition(hypotheses).values():
        partition_info.update(partition_odds(members, opinions, evidence))

    bins_out = []
    for tbin in time_bins:
        in_bin = [h for h in placements if time_bin_index(h.content.interval.start, span_start, bin_width) == tbin]
        ranked = sorted(in_bin, key=lambda h: _rank_key(h, opinions, elos), reverse=True)[:top_k]
        label = (bin_labels or {}).get(tbin, str(tbin))
        bins_out.append({
            "time_bin": {"index": tbin, "label": label},
            "ranked_hypotheses": [_ranked_entry(h, opinions, elos, partition_info) for h in ranked],
        })

    events: dict[tuple[str, str], list[Hypothesis]] = {}
    for h in placements:
        events.setdefault((h.content.object, h.content.place), []).append(h)
    event_views = []
    for (obj, place), hs in events.items():
        ranked = sorted(hs, key=lambda h: _rank_key(h, opinions, elos), reverse=True)
        event_views.append({
            "event": {"object": obj, "place": place},
            "competing_placements": [h.short_id for h in ranked],
            "ranked_placements": [_ranked_entry(h, opinions, elos, partition_info) for h in ranked],
        })

    pair_views = []
    for key, hs in partition(sequences).items():
        _, first_key, second_key = key
        ranked = sorted(hs, key=lambda h: _rank_key(h, opinions, elos), reverse=True)
        pair_views.append({
            "pair": {
                "first": {"object": first_key[0], "place": first_key[1]},
                "second": {"object": second_key[0], "place": second_key[1]},
            },
            "competing_sequences": [
                {
                    "hypothesis_id": h.short_id,
                    "relation": h.content.relation.value,
                    "posterior": _posterior(h, opinions),
                    "elo": elos.get(h.address),
                    "opinion": _opinion_dict(opinions.get(h.address), _posterior(h, opinions)),
                    "partition": partition_info.get(h.address),
                }
                for h in ranked
            ],
        })

    return {"bins": bins_out, "event_views": event_views, "pair_views": pair_views}

def _fmt(value: float | None, decimals: int) -> str:
    return f"{value:.{decimals}f}" if value is not None else "None"

def _opinion_field(entry: dict, field: str) -> float | None:
    opinion = entry.get("opinion")
    return opinion.get(field) if opinion else None

def _partition_field(entry: dict, field: str) -> float | None:
    partition_entry = entry.get("partition")
    return partition_entry.get(field) if partition_entry else None

def write_views(
    views: dict, out_dir: str | Path, *,
    fragility_ranked: list[dict] | None = None, fragility_threshold: float | None = None,
) -> None:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    (out / "timeline.json").write_text(json.dumps(views, indent=2))

    lines = [
        "# Timeline",
        "",
        "Elo is unvalidated: a within-run tournament ranking, no discovery-date "
        "holdout track record yet (`PLAN.md` section 10). Rank on Posterior.",
        "",
    ]
    for b in views.get("bins", []):
        lines.append(f"## Time bin {b['time_bin'].get('label', b['time_bin']['index'])}")
        lines.append("")
        lines.append(
            "| Hypothesis | Slots | Scored | Posterior | u | Lift | Tipping prior (0.6) | Elo (unvalidated) | "
            "Share | Bayes factor vs best |"
        )
        lines.append("|---|---|---|---|---|---|---|---|---|---|")
        for entry in b["ranked_hypotheses"]:
            lines.append(
                f"| {entry['hypothesis_id']} | {entry['slots']} | "
                f"{'yes' if _opinion_field(entry, 'scored') else 'no'} | "
                f"{_fmt(entry['posterior'], 3)} | {_fmt(_opinion_field(entry, 'u'), 3)} | "
                f"{_fmt(_opinion_field(entry, 'lift'), 3)} | {_fmt(_opinion_field(entry, 'tipping_prior_0_6'), 3)} | "
                f"{_fmt(entry['elo'], 1)} | {_fmt(_partition_field(entry, 'share'), 3)} | "
                f"{_fmt(_partition_field(entry, 'bayes_factor_vs_best'), 3)} |"
            )
        lines.append("")

    lines.append("## Competing placements by event")
    lines.append("")
    lines.append("| Object | Place | Competing hypotheses |")
    lines.append("|---|---|---|")
    for event in views.get("event_views", []):
        lines.append(
            f"| {event['event']['object']} | {event['event']['place']} | "
            f"{', '.join(event['competing_placements'])} |"
        )
    lines.append("")

    lines.append("## Competing sequences by pair")
    lines.append("")
    lines.append("| First | Second | Relation | Posterior |")
    lines.append("|---|---|---|---|")
    for pair in views.get("pair_views", []):
        for seq in pair["competing_sequences"]:
            lines.append(
                f"| {pair['pair']['first']} | {pair['pair']['second']} | "
                f"{seq['relation']} | {seq['posterior']} |"
            )

    if fragility_ranked is not None:
        from .propagate import FRAGILITY_FLAG_THRESHOLD
        flag_at = fragility_threshold if fragility_threshold is not None else FRAGILITY_FLAG_THRESHOLD
        lines.append("")
        lines.append("## Fragility")
        lines.append("")
        lines.append(
            f"`fragility = fan_out * (1 - independent_support_share)`. Flagged at > {flag_at}: "
            "a node whose own collapse would drag several dependents toward their base rate, "
            "and whose own support leans on thin, non-independent corroboration."
        )
        lines.append("")
        lines.append("| Hypothesis | Fragility | Fan-out | Independent support share | Flagged |")
        lines.append("|---|---|---|---|---|")
        for row in fragility_ranked:
            flagged = "yes" if row["fragility"] > flag_at else "no"
            lines.append(
                f"| {row['short_id']} | {_fmt(row['fragility'], 3)} | {row['fan_out']} | "
                f"{_fmt(row['independent_support_share'], 3)} | {flagged} |"
            )

    (out / "TIMELINE.md").write_text("\n".join(lines) + "\n")

__all__ = ["timeline_views", "write_views"]
