"""Timeline hypothesis views: per-bin, per-event, and per-pair exports.

Mirrors `TIMELINE-AND-COMBINATORICS-SPEC.md` §5's JSON shape. No Lean
counterpart: this is a display-and-export layer over the opinion and
tournament outputs, out of `Bucket.*`'s own scope.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Mapping, Sequence

from .address import time_bin_index
from .belief import Opinion
from .hypothesis import Hypothesis, Placement


def _posterior(h: Hypothesis, opinions: Mapping[int, Opinion]) -> float | None:
    opinion = opinions.get(h.address)
    return opinion.project() if opinion is not None else None


def _rank_key(h: Hypothesis, opinions: Mapping[int, Opinion], elos: Mapping[int, float]):
    """Ranks by projected posterior first, current Elo second, both
    missing-safe: an unscored hypothesis sorts after every scored one at
    the same tier rather than raising or crashing the sort."""
    posterior = _posterior(h, opinions)
    elo = elos.get(h.address)
    return (
        posterior if posterior is not None else float("-inf"),
        elo if elo is not None else float("-inf"),
    )


def _slots_of(placement: Placement) -> dict:
    return {
        "ACTOR": placement.actor, "ACTION": placement.action, "OBJECT": placement.object,
        "PLACE": placement.place, "MECHANISM": placement.mechanism,
    }


def _ranked_entry(h: Hypothesis, opinions: Mapping[int, Opinion], elos: Mapping[int, float]) -> dict:
    return {
        "hypothesis_id": h.short_id,
        "address": h.address,
        "slots": _slots_of(h.content),
        "posterior": _posterior(h, opinions),
        "elo": elos.get(h.address),
    }


def timeline_views(
    hypotheses: Sequence[Hypothesis],
    opinions: Mapping[int, Opinion],
    elos: Mapping[int, float],
    time_bins: Sequence[int],
    *,
    top_k: int = 10,
) -> dict:
    """The three timeline views of `TIMELINE-AND-COMBINATORICS-SPEC.md` §5,
    over `hypotheses` scored by `opinions` (projected posterior) and
    `elos` (tournament rating, the tie-break and fallback sort key when a
    posterior is missing):

    - `bins`: for each bin in `time_bins`, every placement hypothesis
      whose own interval falls in that century bin, ranked and capped at
      `top_k`.
    - `event_views`: every placement hypothesis sharing an (OBJECT, PLACE)
      pair, the competing-claims pattern extended from disputed dates to
      disputed actors and mechanisms.
    - `pair_views`: every sequence hypothesis over the same ordered pair
      of (OBJECT, PLACE) events, one entry per Allen relation the
      evidence has touched.

    Display pruning, `top_k`, lives only here; nothing upstream of this
    function is pruned by it.
    """
    placements = [h for h in hypotheses if not h.is_sequence]
    sequences = [h for h in hypotheses if h.is_sequence]

    bins_out = []
    for tbin in time_bins:
        in_bin = [h for h in placements if time_bin_index(h.content.interval.start) == tbin]
        ranked = sorted(in_bin, key=lambda h: _rank_key(h, opinions, elos), reverse=True)[:top_k]
        bins_out.append({
            "time_bin": {"index": tbin},
            "ranked_hypotheses": [_ranked_entry(h, opinions, elos) for h in ranked],
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
        })

    pairs: dict[tuple, list[Hypothesis]] = {}
    for h in sequences:
        seq = h.content
        key = ((seq.first.object, seq.first.place), (seq.second.object, seq.second.place))
        pairs.setdefault(key, []).append(h)
    pair_views = []
    for (first_key, second_key), hs in pairs.items():
        ranked = sorted(hs, key=lambda h: _rank_key(h, opinions, elos), reverse=True)
        pair_views.append({
            "pair": {
                "first": {"object": first_key[0], "place": first_key[1]},
                "second": {"object": second_key[0], "place": second_key[1]},
            },
            "competing_sequences": [
                {"relation": h.content.relation.value, "posterior": _posterior(h, opinions)}
                for h in ranked
            ],
        })

    return {"bins": bins_out, "event_views": event_views, "pair_views": pair_views}


def write_views(views: dict, out_dir: str | Path) -> None:
    """Writes `views` to `out_dir/timeline.json` verbatim, and a human-
    readable `out_dir/TIMELINE.md` table alongside it, creating `out_dir`
    if it does not exist. `timeline.json` round trips: `json.loads` over
    its own text reproduces `views` exactly, since every value in it is a
    plain JSON type, string, number, bool, `None`, list, or dict."""
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    (out / "timeline.json").write_text(json.dumps(views, indent=2))

    lines = ["# Timeline", ""]
    for b in views.get("bins", []):
        lines.append(f"## Time bin {b['time_bin']['index']}")
        lines.append("")
        lines.append("| Hypothesis | Slots | Posterior | Elo |")
        lines.append("|---|---|---|---|")
        for entry in b["ranked_hypotheses"]:
            lines.append(
                f"| {entry['hypothesis_id']} | {entry['slots']} | {entry['posterior']} | {entry['elo']} |"
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

    (out / "TIMELINE.md").write_text("\n".join(lines) + "\n")


__all__ = ["timeline_views", "write_views"]
