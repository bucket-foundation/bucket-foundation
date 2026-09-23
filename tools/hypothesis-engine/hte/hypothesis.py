from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Union

from .address import (
    ALLEN_RELATION_ORDER,
    CONCEPT_SLOT_ORDER,
    DEFAULT_BIN_WIDTH,
    DEFAULT_SPAN_START,
    SlotTuple,
    encode_indices,
    encode_sequence_indices,
    short_id as address_short_id,
    time_bin_index,
)
from .concepts import Slot, Vocabulary
from .timeline import AllenRelation, Interval

@dataclass
class Placement:
    actor: str
    action: str
    object: str
    place: str
    mechanism: str
    interval: Interval
    period_id: str | None = None

    def slot_tuple(
        self,
        vocab: Vocabulary,
        span_start: int = DEFAULT_SPAN_START,
        bin_width: int = DEFAULT_BIN_WIDTH,
    ) -> SlotTuple:
        values = {Slot.ACTOR: self.actor, Slot.ACTION: self.action, Slot.OBJECT: self.object,
                  Slot.PLACE: self.place, Slot.MECHANISM: self.mechanism}
        actor, action, obj, place, mechanism = (
            vocab.vocab_index(slot, values[slot]) for slot in CONCEPT_SLOT_ORDER
        )
        tbin = time_bin_index(self.interval.start, span_start, bin_width)
        return SlotTuple(actor=actor, action=action, object=obj, place=place, time_bin=tbin, mechanism=mechanism)

    def address(self, vocab: Vocabulary, **kw) -> int:
        return encode_indices(self.slot_tuple(vocab, **kw))

    def prior_logit(self, vocab: Vocabulary) -> float:
        values = {Slot.ACTOR: self.actor, Slot.ACTION: self.action, Slot.OBJECT: self.object,
                  Slot.PLACE: self.place, Slot.MECHANISM: self.mechanism}
        total = 0.0
        for slot in CONCEPT_SLOT_ORDER:
            concept = vocab.get(slot, values[slot])
            if concept is None:
                raise KeyError(f"{values[slot]!r} not found in slot {slot.value!r}")
            total += concept.prior_logit
        return total

    def to_dict(self) -> dict:
        return {
            "actor": self.actor, "action": self.action, "object": self.object,
            "place": self.place, "mechanism": self.mechanism,
            "interval": self.interval.to_dict(), "period_id": self.period_id,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Placement":
        return cls(
            actor=d["actor"], action=d["action"], object=d["object"], place=d["place"],
            mechanism=d["mechanism"], interval=Interval.from_dict(d["interval"]),
            period_id=d.get("period_id"),
        )

@dataclass
class Sequence:
    first: Placement
    relation: AllenRelation
    second: Placement

    def address(self, vocab: Vocabulary, **kw) -> int:
        first_tuple = self.first.slot_tuple(vocab, **kw)
        second_tuple = self.second.slot_tuple(vocab, **kw)
        return encode_sequence_indices(first_tuple, ALLEN_RELATION_ORDER.index(self.relation), second_tuple)

    def prior_logit(self, vocab: Vocabulary) -> float:
        return self.first.prior_logit(vocab) + self.second.prior_logit(vocab)

    def to_dict(self) -> dict:
        return {"first": self.first.to_dict(), "relation": self.relation.value, "second": self.second.to_dict()}

    @classmethod
    def from_dict(cls, d: dict) -> "Sequence":
        return cls(
            first=Placement.from_dict(d["first"]),
            relation=AllenRelation(d["relation"]),
            second=Placement.from_dict(d["second"]),
        )

HypothesisContent = Union[Placement, Sequence]

@dataclass
class Hypothesis:
    address: int
    content: HypothesisContent
    claims: list[str] = field(default_factory=list)
    depends_on: list[int] = field(default_factory=list)
    meta: dict = field(default_factory=dict)

    @property
    def short_id(self) -> str:
        return address_short_id(self.address)

    @property
    def is_sequence(self) -> bool:
        return isinstance(self.content, Sequence)

    def prior_logit(self, vocab: Vocabulary) -> float:
        return self.content.prior_logit(vocab)

    @classmethod
    def from_placement(
        cls,
        placement: Placement,
        vocab: Vocabulary,
        *,
        claims: list[str] | None = None,
        depends_on: list[int] | None = None,
        **kw,
    ) -> "Hypothesis":
        return cls(
            address=placement.address(vocab, **kw),
            content=placement,
            claims=list(claims or []),
            depends_on=list(depends_on or []),
        )

    @classmethod
    def from_sequence(
        cls,
        sequence: Sequence,
        vocab: Vocabulary,
        *,
        claims: list[str] | None = None,
        depends_on: list[int] | None = None,
        **kw,
    ) -> "Hypothesis":
        return cls(
            address=sequence.address(vocab, **kw),
            content=sequence,
            claims=list(claims or []),
            depends_on=list(depends_on or []),
        )

    def to_dict(self) -> dict:
        kind = "sequence" if self.is_sequence else "placement"
        return {
            "address": self.address,
            "kind": kind,
            "content": self.content.to_dict(),
            "claims": list(self.claims),
            "depends_on": list(self.depends_on),
            "meta": dict(self.meta),
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Hypothesis":
        kind = d["kind"]
        content: HypothesisContent
        if kind == "placement":
            content = Placement.from_dict(d["content"])
        elif kind == "sequence":
            content = Sequence.from_dict(d["content"])
        else:
            raise ValueError(f"unknown hypothesis kind {kind!r}")
        return cls(
            address=d["address"], content=content,
            claims=list(d.get("claims", [])), depends_on=list(d.get("depends_on", [])),
            meta=dict(d.get("meta", {})),
        )

    def save(self, path: str | Path) -> None:
        Path(path).write_text(json.dumps(self.to_dict(), indent=2))

    @classmethod
    def load(cls, path: str | Path) -> "Hypothesis":
        return cls.from_dict(json.loads(Path(path).read_text()))

def prior_logit_of(hypothesis: Hypothesis, vocab: Vocabulary) -> float:
    return hypothesis.prior_logit(vocab)
