from __future__ import annotations

from typing import Mapping, Sequence

import numpy as np

from .curveball import scramble, scramble_within
from .graph import AGGREGATIONS, RANKERS, Snapshot, Work, candidate_pairs, labels_for, minimal_triples, pair_scores, snapshot, triple_scores, window_counts
from .metrics import PositiveCounts, auc, average_precision, chunked, count_negatives, precision_at

KS = (100, 1000)

def metrics_for(scores: np.ndarray, labels: np.ndarray, ks: Sequence[int] = KS) -> dict[str, float]:
    pos = scores[labels]
    neg = chunked(scores[~labels], 1_000_000)
    counts = count_negatives(pos, neg)
    out = {"candidates": int(len(scores)), "positives": int(labels.sum()), "auc": auc(counts), "ap": average_precision(counts)}
    for k in ks:
        out[f"p@{k}"] = precision_at(k, pos, neg)
    return out

def counts_for(scores: np.ndarray, labels: np.ndarray) -> PositiveCounts:
    return count_negatives(scores[labels], chunked(scores[~labels], 1_000_000))

def _strata(snap: Snapshot, keys: np.ndarray, field_of: Mapping[int, int] | None) -> dict[str, np.ndarray]:
    everything = np.ones(len(keys), dtype=bool)
    if field_of is None or len(keys) == 0:
        return {"all": everything}
    fields = np.vectorize(lambda i: field_of.get(int(snap.vertices[i]), -1))(keys)
    within = np.all(fields == fields[:, :1], axis=1)
    return {"all": everything, "within_field": within, "across_field": ~within}

def evaluate_cutoff(
    works: Sequence[Work],
    cutoff: int,
    horizon: int,
    m: int,
    min_works: int,
    seed: int,
    field_of: Mapping[int, int] | None = None,
    rankers: Sequence[str] = RANKERS,
    aggregations: Sequence[str] = AGGREGATIONS,
) -> dict:
    snap = snapshot(works, cutoff, min_works)
    pair_window, triple_window = window_counts(works, snap, cutoff, horizon)
    u, v = candidate_pairs(snap)
    pair_keys = np.stack([u, v], axis=1) if len(u) else np.empty((0, 2), dtype=np.int64)
    pair_labels = labels_for([tuple(k) for k in pair_keys.tolist()], pair_window, m)
    triples = minimal_triples(snap)
    triple_labels = labels_for([tuple(k) for k in triples.tolist()], triple_window, m)
    pair_strata = _strata(snap, pair_keys, field_of)
    triple_strata = _strata(snap, triples, field_of)
    out: dict = {"cutoff": cutoff, "horizon": horizon, "m": m, "vertices": int(len(snap.vertices)), "pairs": {}, "triples": {}}
    for r in rankers:
        scores = pair_scores(snap, r, u, v, seed)
        out["pairs"][r] = {name: metrics_for(scores[mask], pair_labels[mask]) for name, mask in pair_strata.items()}
        out["triples"][r] = {}
        for agg in aggregations:
            ts = triple_scores(snap, r, triples, agg, seed)
            out["triples"][r][agg] = {name: metrics_for(ts[mask], triple_labels[mask]) for name, mask in triple_strata.items()}
    return out

def scrambled_works(works: Sequence[Work], seed: str, within_field: bool) -> list[Work]:
    rows = [list(w.topics) for w in works]
    strata = [(w.year, w.field) if within_field else (w.year,) for w in works]
    mixed = scramble_within(rows, strata, seed)
    return [Work(w.year, tuple(r), w.field) for w, r in zip(works, mixed)]

def evaluate(
    works: Sequence[Work],
    cutoffs: Sequence[int],
    horizons: Sequence[int],
    ms: Sequence[int],
    min_works: int,
    seed: int,
    field_of: Mapping[int, int] | None = None,
    aggregations: Sequence[str] = AGGREGATIONS,
) -> dict:
    tables = {
        "observed": list(works),
        "curveball_across_field": scrambled_works(works, f"s1-across-{seed}", within_field=False),
        "curveball_within_field": scrambled_works(works, f"s1-within-{seed}", within_field=True),
    }
    return {
        name: [
            evaluate_cutoff(table, y, h, m, min_works, seed, field_of, aggregations=aggregations)
            for y in cutoffs
            for h in horizons
            for m in ms
        ]
        for name, table in tables.items()
    }

__all__ = ["evaluate", "evaluate_cutoff", "metrics_for", "counts_for", "scrambled_works", "scramble"]
