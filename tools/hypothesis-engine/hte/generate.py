"""Hypothesis generation: lazy enumeration, neighbor mutation, the four
evidence-driven generators, and sequence pairing.

Mirrors `main.tex` §Combinatorial hypothesis space's lazy-enumeration rule
(`lem:size`, `def:neighbors`) and `HISTORY-HYPOTHESIS-ENGINE-SPEC.md` §5's
four generator kinds, evidence cluster, claim gap, contradiction,
cross-period analogy, as re-grounded on the combinatorial address scheme by
`TIMELINE-AND-COMBINATORICS-SPEC.md` §3 and §6. This module has no Lean
counterpart: the generator is explicitly out of scope for `Bucket.*`
(`README.md`'s own module-map note), so every design choice below is this
package's own, documented in place rather than read off a proof.

No function here scores or prunes. A hypothesis this module yields still
needs `hte.belief.score` before it means anything; generation is complete
and address-carrying the moment a slot assignment exists, per `main.tex`'s
own "scoring and display prune the result; generation does not."
"""
from __future__ import annotations

import itertools
from typing import Iterable, Iterator

from .address import (
    ALLEN_RELATION_ORDER,
    DEFAULT_BIN_WIDTH,
    DEFAULT_SPAN_START,
    decode,
    decode_indices,
    encode_sequence_indices,
    time_bin_index,
)
from .concepts import ConsensusStatus, Slot, Vocabulary
from .evidence import EvidenceItem
from .hypothesis import Hypothesis, Placement, Sequence
from .timeline import Interval, Resolution, relate
from .timeline import bin as timeline_bin

# The five concept-bearing placement slots, in `hte.address.CONCEPT_SLOT_ORDER`
# order. `Slot.value` for each of these names the matching `Placement`
# attribute exactly (`Slot.ACTOR.value == "actor"`, and so on), which is
# what lets `_with_slot` below set a field by name without a lookup table.
PLACEMENT_CONCEPT_SLOTS: tuple[Slot, ...] = (
    Slot.ACTOR, Slot.ACTION, Slot.OBJECT, Slot.PLACE, Slot.MECHANISM,
)


def _interval_for_bin(
    bin_index: int,
    span_start: int = DEFAULT_SPAN_START,
    bin_width: int = DEFAULT_BIN_WIDTH,
) -> Interval:
    """The representative `Interval` for century-bin `bin_index`, the
    inverse of `hte.timeline.time_bin_index` at the same default span and
    width `hte.address.encode`/`Hypothesis.address` resolve TIME_BIN
    through. Every generator in this module builds a placement's interval
    through this one function, so a bin index round-trips through
    `time_bin_index` back to itself."""
    start = span_start + bin_index * bin_width
    return Interval(start=start, end=start + bin_width - 1)


def _with_slot(placement: Placement, slot: Slot, concept_id: str) -> Placement:
    """A copy of `placement` with one concept slot replaced by
    `concept_id`; every other field, interval and `period_id` included,
    stays fixed."""
    fields = {
        "actor": placement.actor, "action": placement.action, "object": placement.object,
        "place": placement.place, "mechanism": placement.mechanism,
    }
    fields[slot.value] = concept_id
    return Placement(interval=placement.interval, period_id=placement.period_id, **fields)


def _slot_value(placement: Placement, slot: Slot) -> str:
    return {
        Slot.ACTOR: placement.actor, Slot.ACTION: placement.action, Slot.OBJECT: placement.object,
        Slot.PLACE: placement.place, Slot.MECHANISM: placement.mechanism,
    }[slot]


# --------------------------------------------------------------------------
# Lazy enumeration (`main.tex` §Combinatorial hypothesis space)
# --------------------------------------------------------------------------


def enumerate_placements(
    vocab: Vocabulary,
    time_bins: Iterable[int],
    *,
    include_other: bool = True,
    max_items: int | None = None,
) -> Iterator[Hypothesis]:
    """The lazy product over `H = ACTOR x ACTION x OBJECT x PLACE x
    TIME_BIN x MECHANISM` (`Eq. placement-space`), never materializing the
    full `|H|` `lem:size` bounds. `time_bins` gives the century-bin
    indices to sweep, in `hte.timeline.time_bin_index` units; each combo's
    representative interval comes from `_interval_for_bin`. Iteration order
    is fixed: ACTOR varies slowest, TIME_BIN fastest, matching
    `itertools.product`'s own left-to-right nesting, so two calls over the
    same arguments yield the identical sequence.

    Every slot's vocabulary already carries its `OTHER` placeholder
    (`hte.concepts.Vocabulary`'s own contract), so `include_other=True`
    (the default) means OTHER is swept like any other concept, in its
    vocabulary-index position, with no special casing. `include_other=False`
    drops OTHER from every slot's axis before taking the product, for a
    caller that wants a tighter, closed-vocabulary-only sweep. `max_items`
    caps the total number of hypotheses yielded, cutting the lazy product
    short rather than filtering it after the fact.
    """
    def axis(slot: Slot) -> list:
        concepts = vocab.concepts(slot)
        if not include_other:
            concepts = [c for c in concepts if c.consensus_status != ConsensusStatus.OTHER]
        return concepts

    actors = axis(Slot.ACTOR)
    actions = axis(Slot.ACTION)
    objects_ = axis(Slot.OBJECT)
    places = axis(Slot.PLACE)
    mechanisms = axis(Slot.MECHANISM)
    bins = list(time_bins)

    count = 0
    for actor, action, obj, place, mechanism, tbin in itertools.product(
        actors, actions, objects_, places, mechanisms, bins
    ):
        if max_items is not None and count >= max_items:
            return
        placement = Placement(
            actor=actor.id, action=action.id, object=obj.id, place=place.id,
            mechanism=mechanism.id, interval=_interval_for_bin(tbin),
        )
        yield Hypothesis.from_placement(placement, vocab)
        count += 1


# --------------------------------------------------------------------------
# Neighbor mutation (`def:neighbors`, `Eq. neighbors`)
# --------------------------------------------------------------------------


def _placement_neighbors(placement: Placement, vocab: Vocabulary) -> Iterator[Placement]:
    """One-slot concept mutations of `placement` over every concept-bearing
    slot's full vocabulary (`Eq. neighbors`), plus the placement's own
    one-bin time shift: the two adjacent century bins its own interval's
    start does not already occupy. A shift below bin 0 (`time_bin_index`'s
    own floor) is dropped instead of yielded, so a placement already at
    the start of the span gets one time-shift neighbor instead of two.
    """
    for slot in PLACEMENT_CONCEPT_SLOTS:
        current = _slot_value(placement, slot)
        for concept in vocab.concepts(slot):
            if concept.id == current:
                continue
            yield _with_slot(placement, slot, concept.id)

    idx = time_bin_index(placement.interval.start)
    for neighbor_idx in (idx - 1, idx + 1):
        if neighbor_idx < 0:
            continue
        yield Placement(
            actor=placement.actor, action=placement.action, object=placement.object,
            place=placement.place, mechanism=placement.mechanism,
            interval=_interval_for_bin(neighbor_idx), period_id=placement.period_id,
        )


def neighbors(h: Hypothesis, vocab: Vocabulary) -> Iterator[Hypothesis]:
    """The evolver's smallest move (`def:neighbors`): every one-slot
    concept mutation of `h`, its one-bin time shift(s), and, when `h` is a
    sequence, every other Allen relation with both member placements held
    fixed. A sequence also gets each member placement's own slot and
    time-shift neighbors in turn, the other member fixed.
    """
    if not h.is_sequence:
        for mutated in _placement_neighbors(h.content, vocab):
            yield Hypothesis.from_placement(mutated, vocab)
        return

    seq = h.content
    for mutated_first in _placement_neighbors(seq.first, vocab):
        yield Hypothesis.from_sequence(Sequence(first=mutated_first, relation=seq.relation, second=seq.second), vocab)
    for mutated_second in _placement_neighbors(seq.second, vocab):
        yield Hypothesis.from_sequence(Sequence(first=seq.first, relation=seq.relation, second=mutated_second), vocab)
    for relation in ALLEN_RELATION_ORDER:
        if relation == seq.relation:
            continue
        yield Hypothesis.from_sequence(Sequence(first=seq.first, relation=relation, second=seq.second), vocab)


# --------------------------------------------------------------------------
# Evidence-driven generators (`HISTORY-HYPOTHESIS-ENGINE-SPEC.md` §5)
# --------------------------------------------------------------------------


def _referenced_addresses(item: EvidenceItem) -> list[int]:
    """Every hypothesis address `item` names, `supports` then `refutes`,
    order preserved and deduplicated."""
    return list(dict.fromkeys(list(item.supports) + list(item.refutes)))


def _hypothesis_from_address(address: int, vocab: Vocabulary) -> Hypothesis | None:
    """Rebuild a `Hypothesis` from a bare address, trying a placement
    reading first and a sequence reading second. Returns `None` for an
    address this `vocab` cannot decode, leftover prime factors, or a
    vocabulary index past the end of a slot's list, instead of raising, so
    one malformed evidence pointer does not abort a whole generation pass
    over the rest of the evidence set.
    """
    try:
        slots, tbin = decode(address, vocab, sequence=False)
    except (ValueError, KeyError, IndexError):
        pass
    else:
        placement = Placement(
            actor=slots[Slot.ACTOR], action=slots[Slot.ACTION], object=slots[Slot.OBJECT],
            place=slots[Slot.PLACE], mechanism=slots[Slot.MECHANISM], interval=_interval_for_bin(tbin),
        )
        return Hypothesis.from_placement(placement, vocab)

    try:
        first_slots, first_bin, relation, second_slots, second_bin = decode(address, vocab, sequence=True)
    except (ValueError, KeyError, IndexError):
        return None
    first = Placement(
        actor=first_slots[Slot.ACTOR], action=first_slots[Slot.ACTION], object=first_slots[Slot.OBJECT],
        place=first_slots[Slot.PLACE], mechanism=first_slots[Slot.MECHANISM], interval=_interval_for_bin(first_bin),
    )
    second = Placement(
        actor=second_slots[Slot.ACTOR], action=second_slots[Slot.ACTION], object=second_slots[Slot.OBJECT],
        place=second_slots[Slot.PLACE], mechanism=second_slots[Slot.MECHANISM], interval=_interval_for_bin(second_bin),
    )
    return Hypothesis.from_sequence(Sequence(first=first, relation=relation, second=second), vocab)


def _evidence_cluster_hypotheses(
    evidence_items: Iterable[EvidenceItem], vocab: Vocabulary, resolution: Resolution
) -> list[Hypothesis]:
    """Groups the placements evidence names by shared `EvidenceKind` and by
    overlapping interval, read here as sharing one `hte.timeline.bin` at
    `resolution`, then re-emits each cluster's own placements
    (`HISTORY-HYPOTHESIS-ENGINE-SPEC.md` §5's "enumerate ... from the
    cluster's own claims"). Sequence readings are left to the other three
    generators and to `sequences_from`."""
    hyps_by_key: dict[tuple, dict[int, Hypothesis]] = {}
    ids_by_key: dict[tuple, set[str]] = {}
    for item in evidence_items:
        for address in _referenced_addresses(item):
            hyp = _hypothesis_from_address(address, vocab)
            if hyp is None or hyp.is_sequence:
                continue
            bucket = timeline_bin(hyp.content.interval, resolution)
            key = (item.kind, bucket.start, bucket.end)
            hyps_by_key.setdefault(key, {})[hyp.address] = hyp
            ids_by_key.setdefault(key, set()).add(item.id)

    out: list[Hypothesis] = []
    for key, hyps in hyps_by_key.items():
        evidence_ids = sorted(ids_by_key[key])
        for hyp in hyps.values():
            hyp.meta = {"generator": "evidence-cluster", "evidence": evidence_ids}
            out.append(hyp)
    return out


def _claim_gap_hypotheses(evidence_items: Iterable[EvidenceItem], vocab: Vocabulary) -> list[Hypothesis]:
    """Reads every evidence-named placement as a claim with one slot
    treated, in turn, as the missing predicate `HISTORY-HYPOTHESIS-
    ENGINE-SPEC.md` §5 calls a claim gap: for each of the five
    concept-bearing slots, the other four plus TIME_BIN stay fixed at the
    evidence's own attested values while that one slot sweeps its full
    vocabulary, `OTHER` included, per `IDEAL-STATE-AND-UNKNOWNS-SPEC.md`
    §6a."""
    out: list[Hypothesis] = []
    seen: set[tuple[int, str, str]] = set()
    for item in evidence_items:
        for address in _referenced_addresses(item):
            base_hyp = _hypothesis_from_address(address, vocab)
            if base_hyp is None or base_hyp.is_sequence:
                continue
            base = base_hyp.content
            for slot in PLACEMENT_CONCEPT_SLOTS:
                for concept in vocab.concepts(slot):
                    mutated = _with_slot(base, slot, concept.id)
                    mutated_hyp = Hypothesis.from_placement(mutated, vocab)
                    key = (mutated_hyp.address, item.id, slot.value)
                    if key in seen:
                        continue
                    seen.add(key)
                    mutated_hyp.meta = {"generator": "claim-gap", "evidence": [item.id], "gap_slot": slot.value}
                    out.append(mutated_hyp)
    return out


def _contradiction_hypotheses(evidence_items: Iterable[EvidenceItem], vocab: Vocabulary) -> list[Hypothesis]:
    """An item whose `supports` and `refutes` disagree, both non-empty, is
    a single piece of evidence carrying two opposed claims at once. Both
    readings are materialized and tagged (`HISTORY-HYPOTHESIS-ENGINE-
    SPEC.md` §5's "two claims with comparable priors that conflict yield a
    hypothesis reconciling or arbitrating them"): a caller's critic or
    tournament decides between them, this generator only puts both on the
    frontier.
    """
    out: list[Hypothesis] = []
    for item in evidence_items:
        if not item.supports or not item.refutes:
            continue
        for reading, addresses in (("supported", item.supports), ("refuted", item.refutes)):
            for address in addresses:
                hyp = _hypothesis_from_address(address, vocab)
                if hyp is None:
                    continue
                hyp.meta = {"generator": "contradiction", "evidence": [item.id], "reading": reading}
                out.append(hyp)
    return out


def _cross_period_hypotheses(
    evidence_items: Iterable[EvidenceItem], vocab: Vocabulary, seed: int
) -> list[Hypothesis]:
    """Copies each evidence-named placement into another time bin already
    attested elsewhere in this same evidence set (`HISTORY-HYPOTHESIS-
    ENGINE-SPEC.md` §5's cross-period analogy: "a motif recurring in
    claims from distant periods yields a hypothesis testing common cause
    against independent recurrence"). When more than one other bin is on
    file, `seed` picks a fixed one deterministically rather than copying
    into every one of them, keeping this generator's output one analogy
    per source placement instead of a combinatorial fan-out."""
    named: list[tuple[EvidenceItem, int, Placement]] = []
    bins: set[int] = set()
    for item in evidence_items:
        for address in _referenced_addresses(item):
            hyp = _hypothesis_from_address(address, vocab)
            if hyp is None or hyp.is_sequence:
                continue
            tbin = time_bin_index(hyp.content.interval.start)
            named.append((item, tbin, hyp.content))
            bins.add(tbin)

    distinct_bins = sorted(bins)
    out: list[Hypothesis] = []
    for item, tbin, placement in named:
        others = [b for b in distinct_bins if b != tbin]
        if not others:
            continue
        target_bin = others[seed % len(others)]
        analog = Placement(
            actor=placement.actor, action=placement.action, object=placement.object,
            place=placement.place, mechanism=placement.mechanism,
            interval=_interval_for_bin(target_bin),
        )
        hyp = Hypothesis.from_placement(analog, vocab)
        hyp.meta = {
            "generator": "cross-period-analogy", "evidence": [item.id],
            "source_bin": tbin, "target_bin": target_bin,
        }
        out.append(hyp)
    return out


def from_evidence(
    evidence_items: Iterable[EvidenceItem],
    vocab: Vocabulary,
    resolution: Resolution,
    *,
    seed: int = 0,
) -> list[Hypothesis]:
    """The four evidence-driven generators of `HISTORY-HYPOTHESIS-ENGINE-
    SPEC.md` §5, run over `evidence_items` and pooled into one list:
    evidence-cluster, claim-gap, contradiction, and cross-period-analogy.
    Every hypothesis this function returns carries `hyp.meta["generator"]`
    naming which of the four produced it and `hyp.meta["evidence"]`, the
    evidence item ids behind it, this package's own `meta` field standing
    in for the paper's `provenance.derived_by.generator` shape (`hte.
    hypothesis.Hypothesis`)."""
    out: list[Hypothesis] = []
    out.extend(_evidence_cluster_hypotheses(evidence_items, vocab, resolution))
    out.extend(_claim_gap_hypotheses(evidence_items, vocab))
    out.extend(_contradiction_hypotheses(evidence_items, vocab))
    out.extend(_cross_period_hypotheses(evidence_items, vocab, seed))
    return out


# --------------------------------------------------------------------------
# Sequence pairing (`Eq. sequence-space`)
# --------------------------------------------------------------------------


def sequences_from(placements: Iterable[Hypothesis], *, max_pairs: int) -> Iterator[Hypothesis]:
    """Every ordered pair of placement hypotheses in `placements`, joined
    by the Allen relation their own intervals hold (`hte.timeline.relate`),
    up to `max_pairs` pairs, in the input's own order (`i` before `j`
    whenever `i` precedes `j` in `placements`). A placement hypothesis's
    own address already carries its resolved slot-index tuple
    (`hte.address.decode_indices` recovers it from the address alone), so a
    pair's sequence address is built directly from the two placements'
    addresses and the relation index; no `Vocabulary` is needed at this
    step, matching this function's own signature."""
    items = list(placements)
    count = 0
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            if count >= max_pairs:
                return
            first, second = items[i], items[j]
            if first.is_sequence or second.is_sequence:
                continue
            first_tuple = decode_indices(first.address)
            second_tuple = decode_indices(second.address)
            relation = relate(first.content.interval, second.content.interval)
            seq_address = encode_sequence_indices(first_tuple, ALLEN_RELATION_ORDER.index(relation), second_tuple)
            seq = Sequence(first=first.content, relation=relation, second=second.content)
            yield Hypothesis(address=seq_address, content=seq)
            count += 1


__all__ = [
    "PLACEMENT_CONCEPT_SLOTS",
    "enumerate_placements",
    "neighbors",
    "from_evidence",
    "sequences_from",
]
