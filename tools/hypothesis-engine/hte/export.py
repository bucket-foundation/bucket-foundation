"""Timeline hypothesis views: per-bin, per-event, and per-pair exports.

Mirrors `TIMELINE-AND-COMBINATORICS-SPEC.md` §5's JSON shape. No Lean
counterpart: this is a display-and-export layer over the opinion and
tournament outputs, out of `Bucket.*`'s own scope.
"""
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
    """`opinion.to_dict()` (`hte.belief.Opinion.to_dict`: `b`/`d`/`u`/`a`
    plus the derived, prior-excluded `lift` and `tipping_prior_0_6`) with
    `P` set to `posterior` alongside it, `None` when `opinion` itself is
    missing (the same missing-safe reading `_posterior`/`elos.get`
    already give the rest of a ranked entry). Matches `hte.bridge_export.
    export_for_bridge`'s and `hte.api._enrich_entry`'s own opinion-dict
    convention, so a caller reading any of the three sees the same shape.

    `bkt-hte-timeline-opinion-export`: before this, `timeline.json` (and
    `TIMELINE.md`) carried only the projected posterior `P`, `u`
    (uncertainty mass) had no home there at all, so a reader could not
    tell an unexamined hypothesis (`u` near 1, `P` set entirely by its
    prior `a`) from an examined, moderately-believed one at the same
    `P`, the exact distinction `hte.canon_writeback.select_above_floor`'s
    own `u`-floor gate exists to draw, and had to reconstruct the whole
    run just to see it (`hte.canon_writeback`'s own top docstring)."""
    if opinion is None:
        return None
    return {**opinion.to_dict(), "P": posterior}


def _rank_key(h: Hypothesis, opinions: Mapping[int, Opinion], elos: Mapping[int, float]):
    """Ranks scored opinions (`Opinion.scored`, any evidence bound) ahead
    of unscored ones, then by evidence-only lift (`b - d`, prior `a`
    excluded), projected posterior, and current Elo, all missing-safe: a
    hypothesis at its prior never outranks one the evidence reached. Lift leads so two
    hypotheses built from the same evidence rank together regardless of
    which prior label (`ConsensusStatus`) either was assigned
    (`STATISTICAL-AUDIT-2026-09-15.md`'s Younger Dryas case)."""
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
    """The three timeline views of `TIMELINE-AND-COMBINATORICS-SPEC.md` §5,
    over `hypotheses` scored by `opinions` (projected posterior) and
    `elos` (tournament rating, the tie-break and fallback sort key when a
    posterior is missing). `span_start`/`bin_width` must match whatever
    the run that produced `hypotheses` used for its own TIME_BIN axis
    (`hte.generate.enumerate_placements`'s parameters of the same name),
    since bin membership below is decided by re-deriving each placement's
    own bin index from its interval under the same span and rung; the
    module defaults reproduce this package's original fixed 20,000-year/
    century behavior for a caller that passes none. `bin_labels`, when
    given, names each bin in `time_bins` (`hte.timeline.bin_label`,
    `"1900s"` in place of a bare index); a bin missing from it, or a
    `None` map, falls back to `str(index)`.

    - `bins`: for each bin in `time_bins`, every placement hypothesis
      whose own interval falls in that century bin, ranked and capped at
      `top_k`.
    - `event_views`: every placement hypothesis sharing an (OBJECT, PLACE)
      pair, the competing-claims pattern extended from disputed dates to
      disputed actors and mechanisms.
    - `pair_views`: every sequence hypothesis over the same ordered pair
      of (OBJECT, PLACE) events, one entry per Allen relation the
      evidence has touched.

    Every ranked hypothesis, in a bin's own `ranked_hypotheses`, an
    event's own `ranked_placements`, or a pair's own `competing_sequences`,
    carries its full opinion (`opinion`, `_opinion_dict`'s own `{"b", "d",
    "u", "a", "P"}` shape) alongside `posterior` (`P` again, kept for a
    caller that only wants the bare projection) and `elo`
    (`bkt-hte-timeline-opinion-export`). `event_views`'s own `competing_
    placements` stays the bare `short_id` list it always was, `hte.canon_
    writeback.reconstruct_candidates`'s own read of it; `ranked_placements`
    carries the same hypotheses in the same order with their full entries
    alongside it, additive rather than a replacement.

    Every entry also carries `partition` (`hte.partition.partition_odds`'s
    `{"share", "bayes_factor_vs_best", "shared_evidence"}`). `evidence`,
    when given, names `shared_evidence`; the empty default leaves it empty.

    Display pruning, `top_k`, lives only here; nothing upstream of this
    function is pruned by it. `event_views` and `pair_views` are never
    capped by `top_k`: every placement or sequence hypothesis they
    partition is carried, in ranked order.
    """
    placements = [h for h in hypotheses if not h.is_sequence]
    sequences = [h for h in hypotheses if h.is_sequence]
    # `address -> hte.partition.partition_odds`'s per-member entry, over
    # every competing set `hte.partition.partition` finds (each address
    # in exactly one set, so this merge never collides).
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

    # `hte.partition.partition`'s own sequence key is exactly this view's
    # pair key ((OBJECT, PLACE), (OBJECT, PLACE)); grouping sequences a
    # second time here used to duplicate that call, so this reads its
    # groups directly instead of rebuilding them.
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
    """`value` rounded to `decimals` places, or the literal string
    `"None"` when there is nothing to score (an unopined or unrated
    hypothesis, `_posterior`/`elos.get`'s own missing-safe reading):
    `TIMELINE.md`'s own display layer, never `timeline.json`, which
    keeps every value at full precision for a caller that re-derives
    from it."""
    return f"{value:.{decimals}f}" if value is not None else "None"


def _opinion_field(entry: dict, field: str) -> float | None:
    """`entry["opinion"][field]`, `None`-safe both when `entry` carries no
    `opinion` at all (an older `timeline.json`, predating
    `bkt-hte-timeline-opinion-export`) and when `opinion` itself is
    `None` (`_opinion_dict`'s own reading for a hypothesis with no
    opinion at all)."""
    opinion = entry.get("opinion")
    return opinion.get(field) if opinion else None


def _partition_field(entry: dict, field: str) -> float | None:
    """`entry["partition"][field]`, `None`-safe like `_opinion_field`."""
    partition_entry = entry.get("partition")
    return partition_entry.get(field) if partition_entry else None


def write_views(
    views: dict, out_dir: str | Path, *,
    fragility_ranked: list[dict] | None = None, fragility_threshold: float | None = None,
) -> None:
    """Writes `views` to `out_dir/timeline.json` verbatim, and a human-
    readable `out_dir/TIMELINE.md` table alongside it, creating `out_dir`
    if it does not exist. `timeline.json` round trips: `json.loads` over
    its own text reproduces `views` exactly, since every value in it is a
    plain JSON type, string, number, bool, `None`, list, or dict.

    `TIMELINE.md`'s own table lists every one of a bin's own `ranked_
    hypotheses` (`timeline_views`'s `top_k` is where display pruning, if
    any, already happened; this function prunes nothing further), each
    row's posterior, uncertainty mass (`u`, beside `P`,
    `bkt-hte-timeline-opinion-export`), evidence-only lift (`b - d`),
    tipping-point prior at the 0.6 floor, partition share, and Bayes
    factor against the set's own best other member, rounded to 3
    decimals and its Elo to 1, all purely a display rounding:
    `timeline.json` alongside it keeps every value at the full precision
    `timeline_views` computed.

    `fragility_ranked` (`bkt-hte-retraction-propagation`, `docs/
    PROPAGATION.md`), when given, is `hte.propagate.rank_fragility`'s
    own return shape: a "## Fragility" section lists every row, most
    fragile first, and any row whose own `fragility` clears `fragility_
    threshold` (default `hte.propagate.FRAGILITY_FLAG_THRESHOLD`) is
    marked `flagged` in its own column. `timeline.json` is untouched by
    this parameter: fragility is a `TIMELINE.md`-only display, per this
    task's own instruction to flag it there. `timeline.json`'s own
    round-tripping shape stays exactly whatever `timeline_views` computed.
    """
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    (out / "timeline.json").write_text(json.dumps(views, indent=2))

    # ros-11 remainder (PLAN.md section 10 item 3): every other campaign
    # surface carrying an Elo number already labels it unvalidated
    # (canon_writeback.render_index's own header note, and the feed402
    # envelope's `elo_status: "unvalidated_tournament_ranking"` field).
    # This base export ran with no such label; the note and the column
    # header below close that gap, matching render_index's own wording.
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
