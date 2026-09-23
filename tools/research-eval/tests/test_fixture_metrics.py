import math

import numpy as np
import pytest

from bucket_eval.evaluate import evaluate, evaluate_cutoff, metrics_for
from bucket_eval.graph import candidate_pairs, labels_for, minimal_triples, pair_scores, snapshot, triple_scores, window_counts

PAIRS = [(1, 4), (1, 5), (1, 6), (2, 4), (2, 5), (2, 6), (3, 5), (3, 6), (4, 6)]

def keyed(snap, u, v):
    return [(int(snap.vertices[a]), int(snap.vertices[b])) for a, b in zip(u, v)]

def test_candidates_and_labels(tiny):
    works, _ = tiny
    snap = snapshot(works, 2000, 1)
    u, v = candidate_pairs(snap)
    assert keyed(snap, u, v) == PAIRS
    pairs, triples = window_counts(works, snap, 2000, 5)
    labels = labels_for(list(zip(u.tolist(), v.tolist())), pairs, 1)
    assert [p for p, y in zip(PAIRS, labels) if y] == [(1, 6), (2, 4)]
    tri = minimal_triples(snap)
    assert [tuple(int(snap.vertices[i]) for i in t) for t in tri] == [(1, 2, 3)]
    assert labels_for([tuple(t) for t in tri.tolist()], triples, 1).tolist() == [True]
    assert labels_for([tuple(t) for t in tri.tolist()], triples, 3).tolist() == [False]

def test_hand_scores(tiny):
    works, _ = tiny
    snap = snapshot(works, 2000, 1)
    u, v = candidate_pairs(snap)
    got = {k: dict(zip(keyed(snap, u, v), pair_scores(snap, k, u, v))) for k in ("common_neighbours", "adamic_adar", "jaccard", "degree_product")}
    assert got["common_neighbours"][(1, 4)] == 1 and got["common_neighbours"][(1, 6)] == 0 and got["common_neighbours"][(4, 6)] == 1
    assert got["adamic_adar"][(2, 4)] == pytest.approx(1 / math.log(3))
    assert got["adamic_adar"][(3, 5)] == pytest.approx(1 / math.log(2))
    assert got["jaccard"][(1, 4)] == pytest.approx(1 / 3)
    assert got["jaccard"][(3, 5)] == pytest.approx(1 / 4)
    assert got["jaccard"][(4, 6)] == pytest.approx(1 / 2)
    assert got["degree_product"][(2, 4)] == 4 and got["degree_product"][(1, 6)] == 2

def test_triple_aggregations(tiny):
    works, _ = tiny
    snap = snapshot(works, 2000, 1)
    tri = minimal_triples(snap)
    assert triple_scores(snap, "degree_product", tri, "min").tolist() == [4]
    assert triple_scores(snap, "degree_product", tri, "product").tolist() == [144]
    assert triple_scores(snap, "degree_product", tri, "geomean")[0] == pytest.approx(144 ** (1 / 3))
    assert triple_scores(snap, "common_neighbours", tri, "geomean")[0] == pytest.approx(1)
    with pytest.raises(ValueError):
        triple_scores(snap, "degree_product", tri, "mean")

def test_hand_metrics_common_neighbours(tiny):
    works, fields = tiny
    out = evaluate_cutoff(works, 2000, 5, 1, 1, 7, fields)
    cn = out["pairs"]["common_neighbours"]["all"]
    assert cn["candidates"] == 9 and cn["positives"] == 2
    assert cn["auc"] == pytest.approx(15 / 28)
    assert cn["ap"] == pytest.approx(12 / 35)
    small = metrics_for(np.array([1, 0, 1, 0, 0, 0, 1, 0, 1], dtype=float), np.array([False, False, True, True, False, False, False, False, False]), ks=(1, 2, 4, 5))
    assert small["p@1"] == pytest.approx(0.25)
    assert small["p@2"] == pytest.approx(0.25)
    assert small["p@4"] == pytest.approx(0.25)
    assert small["p@5"] == pytest.approx(0.24)
    assert out["pairs"]["common_neighbours"]["within_field"]["candidates"] == 1
    assert out["pairs"]["common_neighbours"]["across_field"]["candidates"] == 8

def test_constant_model_scores_half(tiny):
    rng = np.random.default_rng(3)
    labels = rng.random(5000) < 0.1
    out = metrics_for(np.zeros(5000), labels, ks=(100,))
    assert out["auc"] == pytest.approx(0.5)
    assert out["p@100"] == pytest.approx(labels.mean())

def test_evaluate_reports_observed_and_both_scrambles(tiny):
    works, fields = tiny
    out = evaluate(works, [2000], [5], [1], 1, 7, fields)
    assert set(out) == {"observed", "curveball_across_field", "curveball_within_field"}
    for table in out.values():
        assert set(table[0]["triples"]["jaccard"]) == {"min", "geomean", "product"}
