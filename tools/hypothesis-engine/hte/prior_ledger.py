from __future__ import annotations

import dataclasses
import json
import math
from pathlib import Path
from typing import Iterable, Mapping, Sequence

from .belief import Opinion, sigmoid
from .concepts import Slot, Vocabulary
from .hypothesis import CONCEPT_SLOT_ORDER, Hypothesis

DEFAULT_STRENGTH = 4.0
Counts = dict[tuple[str, str], tuple[int, int]]

def logit(p: float) -> float:
    p = min(1.0 - 1e-9, max(1e-9, p))
    return math.log(p / (1.0 - p))

def outcomes(hypotheses: Sequence[Hypothesis], opinions: Mapping[int, Opinion]) -> Counts:
    counts: Counts = {}
    for h in hypotheses:
        opinion = opinions.get(h.address)
        if opinion is None or not opinion.scored() or opinion.lift() == 0.0:
            continue
        won = opinion.lift() > 0.0
        for slot in CONCEPT_SLOT_ORDER:
            concept_id = getattr(h.content, slot.value.lower(), None)
            if concept_id is None:
                continue
            key = (slot.value, concept_id)
            s, f = counts.get(key, (0, 0))
            counts[key] = (s + won, f + (not won))
    return counts

def append(path: str | Path, *, run_id: str, corpus: str, counts: Counts) -> int:
    rows = [
        {"run_id": run_id, "corpus": corpus, "slot": slot, "concept": cid, "successes": s, "failures": f}
        for (slot, cid), (s, f) in sorted(counts.items()) if s or f
    ]
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("a") as fh:
        for row in rows:
            fh.write(json.dumps(row) + "\n")
    return len(rows)

def load_counts(path: str | Path, *, corpus: str) -> tuple[Counts, int]:
    p = Path(path)
    counts: Counts = {}
    runs: set[str] = set()
    if not p.is_file():
        return counts, 0
    for line in p.read_text().splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        if row.get("corpus") != corpus:
            continue
        key = (row["slot"], row["concept"])
        s, f = counts.get(key, (0, 0))
        counts[key] = (s + int(row["successes"]), f + int(row["failures"]))
        runs.add(row["run_id"])
    return counts, len(runs)

def apply(vocab: Vocabulary, counts: Counts, *, strength: float = DEFAULT_STRENGTH) -> int:
    moved = 0
    for (slot_value, cid), (s, f) in counts.items():
        slot = Slot(slot_value)
        bucket = vocab.by_slot.get(slot, [])
        index = next((i for i, c in enumerate(bucket) if c.id == cid), None)
        if index is None or not (s or f):
            continue
        concept = bucket[index]
        m = sigmoid(concept.prior_logit)
        bucket[index] = dataclasses.replace(concept, prior_logit=logit((m * strength + s) / (strength + s + f)))
        moved += 1
    return moved
