from __future__ import annotations

import random
import string
from dataclasses import dataclass, field
from typing import Any, Mapping, Sequence

from .address import decode_indices
from .belief import Opinion
from .calibrate import calibration_curve as _calibration_curve
from .concepts import Concept, ConsensusStatus, Slot, Vocabulary
from .corpus import Corpus, GroundTruthEvent, RetrievalEnvelope
from .evidence import EvidenceItem, EvidenceKind, EvidenceSpan, Source, Stance, Tier
from .generate import PLACEMENT_CONCEPT_SLOTS, neighbors
from .hypothesis import Hypothesis, Placement
from .timeline import Interval

N_EXOTIC_ACTORS = 5

_AXIS_SLOTS: tuple[str, ...] = ("actor", "action", "object", "place", "mechanism")

@dataclass(frozen=True)
class TruePlacement:
    event_id: str
    actor: str
    action: str
    object: str
    place: str
    mechanism: str
    year: int

    def placement(self) -> Placement:
        return Placement(
            actor=self.actor, action=self.action, object=self.object,
            place=self.place, mechanism=self.mechanism,
            interval=Interval(start=self.year, end=self.year),
        )

@dataclass
class SynthWorld:
    seed: int
    vocab: Vocabulary
    true_placements: list[TruePlacement]
    corpus: Corpus
    exotic_actor_ids: list[str]
    config: dict[str, Any]

_LABEL_ALPHABET = string.ascii_uppercase
_LABEL_LENGTH = 14

def _random_label(rng: random.Random) -> str:
    return "".join(rng.choice(_LABEL_ALPHABET) for _ in range(_LABEL_LENGTH))

def _build_vocabulary(
    rng: random.Random, *, n_actors: int, n_actions: int, n_objects: int, n_places: int, n_mechanisms: int,
) -> tuple[Vocabulary, list[str]]:
    by_slot: dict[Slot, list[Concept]] = {Slot.ACTOR: [], Slot.ACTION: [], Slot.OBJECT: [], Slot.PLACE: [], Slot.MECHANISM: []}
    for i in range(n_actors):
        by_slot[Slot.ACTOR].append(Concept(
            id=f"actor-{i}", slot=Slot.ACTOR, label=_random_label(rng),
            prior_logit=rng.uniform(-0.5, 1.5), consensus_status=ConsensusStatus.CONSENSUS,
        ))
    exotic_actor_ids: list[str] = []
    for i in range(N_EXOTIC_ACTORS):
        exotic_id = f"exotic-actor-{i}"
        exotic_actor_ids.append(exotic_id)
        by_slot[Slot.ACTOR].append(Concept(
            id=exotic_id, slot=Slot.ACTOR, label=_random_label(rng),
            prior_logit=-2.0, consensus_status=ConsensusStatus.FRINGE if i % 2 == 0 else ConsensusStatus.CONTESTED,
        ))
    for slot, n in ((Slot.ACTION, n_actions), (Slot.OBJECT, n_objects), (Slot.PLACE, n_places), (Slot.MECHANISM, n_mechanisms)):
        for i in range(n):
            by_slot[slot].append(Concept(
                id=f"{slot.value}-{i}", slot=slot, label=_random_label(rng),
                prior_logit=rng.uniform(-0.5, 1.5), consensus_status=ConsensusStatus.CONSENSUS,
            ))
    return Vocabulary(by_slot=by_slot), exotic_actor_ids

def _axes(vocab: Vocabulary, exotic_actor_ids: Sequence[str]) -> dict[str, list[str]]:
    exotic = set(exotic_actor_ids)
    out: dict[str, list[str]] = {}
    for slot_name in _AXIS_SLOTS:
        slot = Slot(slot_name)
        out[slot_name] = [
            c.id for c in vocab.concepts(slot)
            if c.consensus_status != ConsensusStatus.OTHER and c.id not in exotic
        ]
    return out

def _quote(actor: str, action: str, object_: str, place: str, mechanism: str, year: int) -> str:
    return f"actor={actor} action={action} object={object_} place={place} mechanism={mechanism} year={year}"

def _span(doc_id: str, locator: str, quote: str) -> EvidenceSpan:
    return EvidenceSpan(doc_id=doc_id, locator=locator, quote=quote, char_start=0, char_end=len(quote), doc_length=len(quote))

def make_world(
    seed: int,
    *,
    n_actors: int,
    n_actions: int,
    n_objects: int,
    n_places: int,
    n_mechanisms: int,
    span: tuple[int, int],
    n_true_events: int,
    evidence_per_event: tuple[int, int],
    noise: float = 0.2,
    copy_rate: float = 0.3,
    refute_rate: float = 0.1,
    retract_rate: float = 0.05,
    exotic_rate: float = 0.05,
) -> SynthWorld:
    rng = random.Random(seed)
    vocab, exotic_actor_ids = _build_vocabulary(
        rng, n_actors=n_actors, n_actions=n_actions, n_objects=n_objects, n_places=n_places, n_mechanisms=n_mechanisms,
    )
    axes = _axes(vocab, exotic_actor_ids)

    start_year, end_year = span
    span_len = max(1, end_year - start_year)

    true_placements: list[TruePlacement] = []
    for i in range(n_true_events):
        frac = (i + rng.random()) / n_true_events
        year = min(max(start_year + int(frac * span_len), start_year), end_year)
        true_placements.append(TruePlacement(
            event_id=f"evt-{i}",
            actor=rng.choice(axes["actor"]), action=rng.choice(axes["action"]),
            object=rng.choice(axes["object"]), place=rng.choice(axes["place"]),
            mechanism=rng.choice(axes["mechanism"]), year=year,
        ))

    sources: dict[str, Source] = {}
    provenance: list[RetrievalEnvelope] = []
    evidence: list[EvidenceItem] = []
    ground_truth: list[GroundTruthEvent] = []

    def _add_source(source_id: str, kind: EvidenceKind, year: int, parents: list[str]) -> None:
        sources[source_id] = Source(id=source_id, kind=kind, date=str(year), stemma_parents=parents)
        provenance.append(RetrievalEnvelope(
            retrieval_run_id=f"synth-{seed}", doc_id=source_id, source_path=f"synthetic:{source_id}",
            fetched_at="2026-01-01T00:00:00Z", fixture=True, citation_count=0,
            lineage_count=1 if parents else 0,
        ))

    n_corroborating_total = 0
    for event in true_placements:
        k = max(1, rng.randint(*evidence_per_event))
        headline_source = f"src-{event.event_id}-0"
        _add_source(headline_source, EvidenceKind.MATERIAL, event.year, [])
        evidence.append(EvidenceItem(
            id=event.event_id, kind=EvidenceKind.MATERIAL, tier=Tier.T1, source_id=headline_source,
            span=_span(headline_source, "headline", _quote(event.actor, event.action, event.object, event.place, event.mechanism, event.year)),
            provenance="synthetic-headline",
            actor=event.actor, action=event.action, object=event.object, place=event.place, mechanism=event.mechanism,
            interval=Interval(start=event.year, end=event.year), stance=Stance.POSITIVE,
        ))
        ground_truth.append(GroundTruthEvent(
            id=event.event_id, label=f"synthetic event {event.event_id}", year=event.year,
            doc_id=headline_source, discovery_year=event.year,
        ))

        for n in range(1, k):
            n_corroborating_total += 1
            item_id = f"{event.event_id}-c{n}"
            source_id = f"src-{event.event_id}-{n}"
            is_copy = rng.random() < copy_rate
            _add_source(source_id, EvidenceKind.TEXTUAL, event.year, [headline_source] if is_copy else [])

            values = {"actor": event.actor, "action": event.action, "object": event.object, "place": event.place, "mechanism": event.mechanism}
            is_noisy = rng.random() < noise
            if is_noisy:
                slot = rng.choice(_AXIS_SLOTS)
                pool = [c for c in axes[slot] if c != values[slot]]
                if pool:
                    values[slot] = rng.choice(pool)
            is_refute = rng.random() < refute_rate
            is_retract = rng.random() < retract_rate
            tier = Tier.T4 if is_retract else (Tier.T3 if (is_noisy or is_refute) else Tier.T2)

            evidence.append(EvidenceItem(
                id=item_id, kind=EvidenceKind.TEXTUAL, tier=tier, source_id=source_id,
                span=_span(source_id, f"corroboration-{n}", _quote(values["actor"], values["action"], values["object"], values["place"], values["mechanism"], event.year)),
                provenance="synthetic-copy" if is_copy else "synthetic-corroboration",
                actor=values["actor"], action=values["action"], object=values["object"],
                place=values["place"], mechanism=values["mechanism"],
                interval=Interval(start=event.year, end=event.year),
                is_absence=is_retract, stance=Stance.NEGATIVE if is_refute else Stance.POSITIVE,
            ))

    n_exotic = round(exotic_rate * n_corroborating_total)
    for n in range(n_exotic):
        base = rng.choice(true_placements)
        exotic_actor = rng.choice(exotic_actor_ids)
        item_id = f"exotic-{n}"
        source_id = f"src-exotic-{n}"
        _add_source(source_id, EvidenceKind.TEXTUAL, base.year, [])
        evidence.append(EvidenceItem(
            id=item_id, kind=EvidenceKind.TEXTUAL, tier=Tier.T5, source_id=source_id,
            span=_span(source_id, "exotic", _quote(exotic_actor, base.action, base.object, base.place, base.mechanism, base.year)),
            provenance="synthetic-exotic",
            actor=exotic_actor, action=base.action, object=base.object, place=base.place, mechanism=base.mechanism,
            interval=Interval(start=base.year, end=base.year), stance=Stance.POSITIVE,
        ))

    corpus = Corpus(sources=sources, evidence=evidence, ground_truth=ground_truth, provenance=provenance, vocab=vocab)
    config = {
        "seed": seed, "n_actors": n_actors, "n_actions": n_actions, "n_objects": n_objects,
        "n_places": n_places, "n_mechanisms": n_mechanisms, "span": list(span),
        "n_true_events": n_true_events, "evidence_per_event": list(evidence_per_event),
        "noise": noise, "copy_rate": copy_rate, "refute_rate": refute_rate,
        "retract_rate": retract_rate, "exotic_rate": exotic_rate,
    }
    return SynthWorld(
        seed=seed, vocab=vocab, true_placements=true_placements, corpus=corpus,
        exotic_actor_ids=exotic_actor_ids, config=config,
    )

def _true_address(t: TruePlacement, vocab: Vocabulary, *, span_start: int, bin_width: int) -> int:
    return Hypothesis.from_placement(t.placement(), vocab, span_start=span_start, bin_width=bin_width).address

def _same_event_different_bin(t_tuple, h_tuple) -> bool:
    return (
        h_tuple.actor == t_tuple.actor and h_tuple.action == t_tuple.action
        and h_tuple.object == t_tuple.object and h_tuple.place == t_tuple.place
        and h_tuple.mechanism == t_tuple.mechanism and h_tuple.time_bin != t_tuple.time_bin
    )

def _project(opinions: Mapping[int, Opinion], address: int) -> float | None:
    op = opinions.get(address)
    return op.project() if op is not None else None

def _rank_among_neighbors(
    true_hyp: Hypothesis,
    vocab: Vocabulary,
    survivors_by_address: Mapping[int, Hypothesis],
    opinions: Mapping[int, Opinion],
    elos: Mapping[int, float],
) -> dict[str, Any]:
    candidates = [true_hyp.address] + [n.address for n in neighbors(true_hyp, vocab) if n.address in survivors_by_address]
    present = [addr for addr in dict.fromkeys(candidates) if addr in survivors_by_address and addr in opinions]
    if true_hyp.address not in present:
        return {"rank": None, "n_candidates": len(present)}
    ranked = sorted(present, key=lambda addr: (opinions[addr].project(), elos.get(addr, float("-inf"))), reverse=True)
    return {"rank": ranked.index(true_hyp.address), "n_candidates": len(ranked)}

def score_against_truth(run_artifacts: Any, world: SynthWorld, *, k: int = 5) -> dict[str, Any]:
    manifest = run_artifacts.manifest
    span_start = manifest["time_binning"]["span_start"]
    bin_width = manifest["time_binning"]["bin_width"]
    bin_labels: Mapping[int, str] = manifest["time_binning"].get("bin_labels", {})
    vocab = run_artifacts.corpus.vocab

    survivors_by_address: dict[int, Hypothesis] = {h.address: h for h in run_artifacts.hypotheses if not h.is_sequence}
    opinions: Mapping[int, Opinion] = run_artifacts.opinions
    elos: Mapping[int, float] = run_artifacts.elos

    true_addresses: dict[str, int] = {}
    true_tuples: dict[str, Any] = {}
    for t in world.true_placements:
        addr = _true_address(t, vocab, span_start=span_start, bin_width=bin_width)
        true_addresses[t.event_id] = addr
        true_tuples[t.event_id] = decode_indices(addr)
    true_address_set = set(true_addresses.values())

    predictions: list[dict[str, float]] = []
    ranks: list[dict[str, Any]] = []
    n_matched = 0
    for t in world.true_placements:
        addr = true_addresses[t.event_id]
        if addr not in survivors_by_address or addr not in opinions:
            continue
        n_matched += 1
        true_hyp = survivors_by_address[addr]
        p_true = opinions[addr].project()
        predictions.append({"predicted": p_true, "observed": 1.0})

        t_tuple = true_tuples[t.event_id]
        competitors = [
            (h.address, opinions[h.address].project())
            for h in survivors_by_address.values()
            if h.address in opinions and _same_event_different_bin(t_tuple, decode_indices(h.address))
        ]
        if competitors:
            _, p_wrong = max(competitors, key=lambda pair: pair[1])
            predictions.append({"predicted": p_wrong, "observed": 0.0})

        rank_info = _rank_among_neighbors(true_hyp, vocab, survivors_by_address, opinions, elos)
        ranks.append({"event_id": t.event_id, **rank_info})

    n_true = len(world.true_placements)
    coverage_of_truth = (n_matched / n_true) if n_true else None

    true_only = [p["predicted"] for p in predictions if p["observed"] == 1.0]
    brier_true_only = (sum((p - 1.0) ** 2 for p in true_only) / len(true_only)) if true_only else None

    bins: dict[int, list[int]] = {}
    for addr, tup in ((a, decode_indices(a)) for a in true_address_set):
        bins.setdefault(tup.time_bin, [])
    for h in survivors_by_address.values():
        tbin = decode_indices(h.address).time_bin
        bins.setdefault(tbin, []).append(h.address)

    precision_at_k: dict[str, dict[str, Any]] = {}
    for tbin, addrs in bins.items():
        ranked = sorted(
            addrs, key=lambda a: (opinions[a].project() if a in opinions else float("-inf"), elos.get(a, float("-inf"))),
            reverse=True,
        )[:k]
        hits = sum(1 for a in ranked if a in true_address_set)
        label = bin_labels.get(tbin, str(tbin))
        precision_at_k[label] = {
            "k": k, "n_candidates": len(ranked), "precision": (hits / len(ranked)) if ranked else None,
        }

    found_ranks = [r["rank"] for r in ranks if r["rank"] is not None]

    exotic_survivors = [
        h for h in survivors_by_address.values() if h.content.actor in world.exotic_actor_ids
    ]
    exotic_false_positives = [h for h in exotic_survivors if h.address not in true_address_set]
    exotic_false_positive_rate = (
        len(exotic_false_positives) / len(survivors_by_address) if survivors_by_address else 0.0
    )

    return {
        "coverage_of_truth": coverage_of_truth,
        "n_true_events": n_true,
        "n_matched": n_matched,
        "precision_at_k": precision_at_k,
        "brier_true_only": brier_true_only,
        "rank_among_neighbors": ranks,
        "rank_among_neighbors_mean": (sum(found_ranks) / len(found_ranks)) if found_ranks else None,
        "exotic_false_positive_rate": exotic_false_positive_rate,
        "calibration_curve": _calibration_curve(predictions, n_bins=10),
    }

SMALL_WORLD_KWARGS: dict[str, Any] = {
    "n_actors": 12, "n_actions": 6, "n_objects": 8, "n_places": 6, "n_mechanisms": 5,
    "span": (1900, 2000), "n_true_events": 8, "evidence_per_event": (3, 6),
    "exotic_rate": 0.03,
}

def make_small_world(seed: int, **overrides: Any) -> SynthWorld:
    kwargs = {**SMALL_WORLD_KWARGS, **overrides}
    return make_world(seed, **kwargs)

__all__ = [
    "SynthWorld", "TruePlacement", "make_world", "score_against_truth", "N_EXOTIC_ACTORS",
    "SMALL_WORLD_KWARGS", "make_small_world",
]
