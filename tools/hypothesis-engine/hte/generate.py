from __future__ import annotations

import itertools
import math
import random
from typing import Any, Iterable, Iterator

from .address import (
    ALLEN_RELATION_ORDER,
    DEFAULT_BIN_WIDTH,
    DEFAULT_SPAN_START,
    decode,
    decode_indices,
    encode_sequence_indices,
    time_bin_index,
)
from .concepts import ConsensusStatus, Slot, Vocabulary, other_id
from .evidence import EvidenceItem
from .hypothesis import Hypothesis, Placement, Sequence
from .temporal_consistency import flag_hypothesis
from .timeline import Interval, Resolution, relate
from .timeline import bin as timeline_bin

PLACEMENT_CONCEPT_SLOTS: tuple[Slot, ...] = (
    Slot.ACTOR, Slot.ACTION, Slot.OBJECT, Slot.PLACE, Slot.MECHANISM,
)

def _interval_for_bin(
    bin_index: int,
    span_start: int = DEFAULT_SPAN_START,
    bin_width: int = DEFAULT_BIN_WIDTH,
) -> Interval:
    start = span_start + bin_index * bin_width
    return Interval(start=start, end=start + bin_width - 1)

def _with_slot(placement: Placement, slot: Slot, concept_id: str) -> Placement:
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

def enumerate_placements(
    vocab: Vocabulary,
    time_bins: Iterable[int],
    *,
    include_other: bool = True,
    max_items: int | None = None,
    span_start: int = DEFAULT_SPAN_START,
    bin_width: int = DEFAULT_BIN_WIDTH,
) -> Iterator[Hypothesis]:
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
            mechanism=mechanism.id, interval=_interval_for_bin(tbin, span_start, bin_width),
        )
        yield Hypothesis.from_placement(placement, vocab, span_start=span_start, bin_width=bin_width)
        count += 1

def combinatorial_sample(
    vocab: Vocabulary,
    time_bins: Iterable[int],
    *,
    max_items: int,
    seed: int = 0,
    span_start: int = DEFAULT_SPAN_START,
    bin_width: int = DEFAULT_BIN_WIDTH,
    status_balanced: bool = True,
) -> list[Hypothesis]:
    axes = {slot: vocab.concepts(slot) for slot in PLACEMENT_CONCEPT_SLOTS}
    bins = list(time_bins)
    if not bins or any(not concepts for concepts in axes.values()) or max_items <= 0:
        return []

    total_space = len(bins)
    for concepts in axes.values():
        total_space *= len(concepts)
    target = min(max_items, total_space)

    rng = random.Random(seed)
    actor_by_status: dict[ConsensusStatus, list] = {}
    if status_balanced:
        for concept in axes[Slot.ACTOR]:
            actor_by_status.setdefault(concept.consensus_status, []).append(concept)
    status_keys = sorted(actor_by_status)

    def draw_actor():
        if not status_keys:
            return rng.choice(axes[Slot.ACTOR])
        return rng.choice(actor_by_status[rng.choice(status_keys)])

    seen: set[int] = set()
    out: list[Hypothesis] = []
    max_attempts = max(target * 20, 20)
    attempts = 0
    while len(out) < target and attempts < max_attempts:
        attempts += 1
        placement = Placement(
            actor=draw_actor().id,
            action=rng.choice(axes[Slot.ACTION]).id,
            object=rng.choice(axes[Slot.OBJECT]).id,
            place=rng.choice(axes[Slot.PLACE]).id,
            mechanism=rng.choice(axes[Slot.MECHANISM]).id,
            interval=_interval_for_bin(rng.choice(bins), span_start, bin_width),
        )
        hyp = Hypothesis.from_placement(placement, vocab, span_start=span_start, bin_width=bin_width)
        if hyp.address in seen:
            continue
        seen.add(hyp.address)
        out.append(hyp)
    return out

def _stratum_label(h: Hypothesis, vocab: Vocabulary) -> str:
    if h.is_sequence:
        return "sequence"
    actor_id = h.content.actor
    concept = vocab.get(Slot.ACTOR, actor_id)
    status = concept.consensus_status if concept is not None else ConsensusStatus.OTHER
    return f"actor:{actor_id}|status:{status.value}"

def _apportion(capacities: dict[str, int], total: int) -> dict[str, int]:
    total = max(0, min(total, sum(capacities.values())))
    alloc = {label: 0 for label in capacities}
    if total == 0 or not capacities:
        return alloc
    cap_sum = sum(capacities.values())
    shares = {label: capacities[label] * total / cap_sum for label in capacities}
    for label in capacities:
        alloc[label] = min(capacities[label], int(shares[label]))
    remainder = total - sum(alloc.values())
    order = sorted(capacities, key=lambda label: (-(shares[label] - int(shares[label])), label))
    while remainder > 0:
        placed = False
        for label in order:
            if remainder <= 0:
                break
            if alloc[label] < capacities[label]:
                alloc[label] += 1
                remainder -= 1
                placed = True
        if not placed:
            break
    return alloc

def stratified_sample(
    hypotheses: Iterable[Hypothesis],
    vocab: Vocabulary,
    *,
    cap: int,
    seed: int = 0,
) -> tuple[list[Hypothesis], dict[str, Any]]:
    pool = list(hypotheses)
    if cap <= 0 or not pool:
        return [], {"cap": cap, "n_strata": 0, "strata": {}}

    by_stratum: dict[str, list[Hypothesis]] = {}
    for h in pool:
        by_stratum.setdefault(_stratum_label(h, vocab), []).append(h)

    labels = sorted(by_stratum)
    n_strata = len(labels)
    sizes = {label: len(by_stratum[label]) for label in labels}
    total = sum(sizes.values())

    if total <= cap:
        kept_counts = dict(sizes)
    else:
        floor_target = math.ceil(cap / n_strata)
        floor_counts = {label: min(sizes[label], floor_target) for label in labels}
        if sum(floor_counts.values()) > cap:
            floor_counts = _apportion(floor_counts, cap)
        kept_counts = dict(floor_counts)
        remaining = cap - sum(kept_counts.values())
        if remaining > 0:
            room = {label: sizes[label] - kept_counts[label] for label in labels}
            extra = _apportion(room, remaining)
            for label in labels:
                kept_counts[label] += extra[label]

    rng = random.Random(seed)
    kept: list[Hypothesis] = []
    frame_strata: dict[str, dict[str, int]] = {}
    for label in labels:
        bucket = sorted(by_stratum[label], key=lambda h: h.address)
        k = kept_counts[label]
        sample = bucket if k >= len(bucket) else rng.sample(bucket, k)
        kept.extend(sample)
        frame_strata[label] = {"generated": sizes[label], "kept": k}

    kept.sort(key=lambda h: h.address)
    return kept, {"cap": cap, "n_strata": n_strata, "strata": frame_strata}

def _placement_neighbors(placement: Placement, vocab: Vocabulary) -> Iterator[Placement]:
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
        yield flag_hypothesis(Hypothesis.from_sequence(Sequence(first=seq.first, relation=relation, second=seq.second), vocab))

def _referenced_addresses(item: EvidenceItem) -> list[int]:
    return list(dict.fromkeys(list(item.supports) + list(item.refutes)))

def _hypothesis_from_address(
    address: int,
    vocab: Vocabulary,
    *,
    span_start: int = DEFAULT_SPAN_START,
    bin_width: int = DEFAULT_BIN_WIDTH,
) -> Hypothesis | None:
    try:
        slots, tbin = decode(address, vocab, sequence=False)
    except (ValueError, KeyError, IndexError):
        pass
    else:
        placement = Placement(
            actor=slots[Slot.ACTOR], action=slots[Slot.ACTION], object=slots[Slot.OBJECT],
            place=slots[Slot.PLACE], mechanism=slots[Slot.MECHANISM],
            interval=_interval_for_bin(tbin, span_start, bin_width),
        )
        return Hypothesis.from_placement(placement, vocab, span_start=span_start, bin_width=bin_width)

    try:
        first_slots, first_bin, relation, second_slots, second_bin = decode(address, vocab, sequence=True)
    except (ValueError, KeyError, IndexError):
        return None
    first = Placement(
        actor=first_slots[Slot.ACTOR], action=first_slots[Slot.ACTION], object=first_slots[Slot.OBJECT],
        place=first_slots[Slot.PLACE], mechanism=first_slots[Slot.MECHANISM],
        interval=_interval_for_bin(first_bin, span_start, bin_width),
    )
    second = Placement(
        actor=second_slots[Slot.ACTOR], action=second_slots[Slot.ACTION], object=second_slots[Slot.OBJECT],
        place=second_slots[Slot.PLACE], mechanism=second_slots[Slot.MECHANISM],
        interval=_interval_for_bin(second_bin, span_start, bin_width),
    )
    return Hypothesis.from_sequence(
        Sequence(first=first, relation=relation, second=second), vocab,
        span_start=span_start, bin_width=bin_width,
    )

def _hypothesis_from_evidence_slots(
    item: EvidenceItem,
    vocab: Vocabulary,
    *,
    span_start: int = DEFAULT_SPAN_START,
    bin_width: int = DEFAULT_BIN_WIDTH,
) -> Hypothesis | None:
    if item.interval is None:
        return None
    values: dict[str, str] = {}
    for slot in PLACEMENT_CONCEPT_SLOTS:
        value = getattr(item, slot.value)
        values[slot.value] = value if value is not None else other_id(slot)
    placement = Placement(interval=item.interval, **values)
    try:
        return Hypothesis.from_placement(placement, vocab, span_start=span_start, bin_width=bin_width)
    except (KeyError, ValueError):
        return None

def _evidence_cluster_hypotheses(
    evidence_items: Iterable[EvidenceItem], vocab: Vocabulary, resolution: Resolution,
    *, span_start: int = DEFAULT_SPAN_START, bin_width: int = DEFAULT_BIN_WIDTH,
) -> list[Hypothesis]:
    hyps_by_key: dict[tuple, dict[int, Hypothesis]] = {}
    ids_by_key: dict[tuple, set[str]] = {}

    def _add(item: EvidenceItem, hyp: Hypothesis) -> None:
        bucket = timeline_bin(hyp.content.interval, resolution)
        key = (item.kind, bucket.start, bucket.end)
        hyps_by_key.setdefault(key, {})[hyp.address] = hyp
        ids_by_key.setdefault(key, set()).add(item.id)

    for item in evidence_items:
        for address in _referenced_addresses(item):
            hyp = _hypothesis_from_address(address, vocab, span_start=span_start, bin_width=bin_width)
            if hyp is None or hyp.is_sequence:
                continue
            _add(item, hyp)

        own_hyp = _hypothesis_from_evidence_slots(item, vocab, span_start=span_start, bin_width=bin_width)
        if own_hyp is not None:
            _add(item, own_hyp)

    out: list[Hypothesis] = []
    for key, hyps in hyps_by_key.items():
        evidence_ids = sorted(ids_by_key[key])
        for hyp in hyps.values():
            hyp.meta = {"generator": "evidence-cluster", "evidence": evidence_ids}
            out.append(hyp)
    return out

def _claim_gap_hypotheses(
    evidence_items: Iterable[EvidenceItem], vocab: Vocabulary,
    *, span_start: int = DEFAULT_SPAN_START, bin_width: int = DEFAULT_BIN_WIDTH,
) -> list[Hypothesis]:
    out: list[Hypothesis] = []
    seen: set[tuple[int, str, str]] = set()
    for item in evidence_items:
        bases: dict[int, Placement] = {}
        for address in _referenced_addresses(item):
            base_hyp = _hypothesis_from_address(address, vocab, span_start=span_start, bin_width=bin_width)
            if base_hyp is None or base_hyp.is_sequence:
                continue
            bases[base_hyp.address] = base_hyp.content
        own_hyp = _hypothesis_from_evidence_slots(item, vocab, span_start=span_start, bin_width=bin_width)
        if own_hyp is not None:
            bases[own_hyp.address] = own_hyp.content

        for base in bases.values():
            for slot in PLACEMENT_CONCEPT_SLOTS:
                for concept in vocab.concepts(slot):
                    mutated = _with_slot(base, slot, concept.id)
                    mutated_hyp = Hypothesis.from_placement(mutated, vocab, span_start=span_start, bin_width=bin_width)
                    key = (mutated_hyp.address, item.id, slot.value)
                    if key in seen:
                        continue
                    seen.add(key)
                    mutated_hyp.meta = {"generator": "claim-gap", "evidence": [item.id], "gap_slot": slot.value}
                    out.append(mutated_hyp)
    return out

def _contradiction_hypotheses(
    evidence_items: Iterable[EvidenceItem], vocab: Vocabulary,
    *, span_start: int = DEFAULT_SPAN_START, bin_width: int = DEFAULT_BIN_WIDTH,
) -> list[Hypothesis]:
    out: list[Hypothesis] = []
    for item in evidence_items:
        if not item.supports or not item.refutes:
            continue
        for reading, addresses in (("supported", item.supports), ("refuted", item.refutes)):
            for address in addresses:
                hyp = _hypothesis_from_address(address, vocab, span_start=span_start, bin_width=bin_width)
                if hyp is None:
                    continue
                hyp.meta = {"generator": "contradiction", "evidence": [item.id], "reading": reading}
                out.append(hyp)
    return out

def _cross_period_hypotheses(
    evidence_items: Iterable[EvidenceItem], vocab: Vocabulary, seed: int,
    *, span_start: int = DEFAULT_SPAN_START, bin_width: int = DEFAULT_BIN_WIDTH,
) -> list[Hypothesis]:
    named: list[tuple[EvidenceItem, int, Placement]] = []
    bins: set[int] = set()
    for item in evidence_items:
        for address in _referenced_addresses(item):
            hyp = _hypothesis_from_address(address, vocab, span_start=span_start, bin_width=bin_width)
            if hyp is None or hyp.is_sequence:
                continue
            tbin = time_bin_index(hyp.content.interval.start, span_start, bin_width)
            named.append((item, tbin, hyp.content))
            bins.add(tbin)

        own_hyp = _hypothesis_from_evidence_slots(item, vocab, span_start=span_start, bin_width=bin_width)
        if own_hyp is not None:
            tbin = time_bin_index(own_hyp.content.interval.start, span_start, bin_width)
            named.append((item, tbin, own_hyp.content))
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
            interval=_interval_for_bin(target_bin, span_start, bin_width),
        )
        hyp = Hypothesis.from_placement(analog, vocab, span_start=span_start, bin_width=bin_width)
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
    span_start: int = DEFAULT_SPAN_START,
    bin_width: int = DEFAULT_BIN_WIDTH,
) -> list[Hypothesis]:
    out: list[Hypothesis] = []
    out.extend(_evidence_cluster_hypotheses(evidence_items, vocab, resolution, span_start=span_start, bin_width=bin_width))
    out.extend(_claim_gap_hypotheses(evidence_items, vocab, span_start=span_start, bin_width=bin_width))
    out.extend(_contradiction_hypotheses(evidence_items, vocab, span_start=span_start, bin_width=bin_width))
    out.extend(_cross_period_hypotheses(evidence_items, vocab, seed, span_start=span_start, bin_width=bin_width))
    return out

def sequences_from(placements: Iterable[Hypothesis], *, max_pairs: int) -> Iterator[Hypothesis]:
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
    "combinatorial_sample",
    "neighbors",
    "from_evidence",
    "sequences_from",
]
