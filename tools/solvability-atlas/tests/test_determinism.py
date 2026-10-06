import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))
import atlas


def fixture():
    rng = np.random.default_rng(3)
    return atlas.unit(rng.normal(size=(20, 8)))


def test_ranked_angles_repeat():
    v = fixture()
    a, _ = atlas.ranked_angles(v)
    b, _ = atlas.ranked_angles(v.copy())
    assert np.array_equal(a, b)
    assert sorted(np.round(a, 9)) == sorted(np.round(np.linspace(0, 2 * np.pi, 20, endpoint=False), 9))


def test_knn_graph_and_stats_repeat():
    v = fixture()
    sim = v @ v.T
    nodes = [{"id": str(i), "name": str(i), "branch": ["mathematics", "physics"][i % 2], "level": 3, "solvability": i / 20, "kind": "problem", "market": []} for i in range(20)]
    s1 = atlas.network_stats(atlas.knn_graph(nodes, sim), nodes)["summary"]
    s2 = atlas.network_stats(atlas.knn_graph(nodes, sim), nodes)["summary"]
    assert s1 == s2
    assert s1["edges"] >= 20 * atlas.K // 2


def test_model_revision_pinned():
    assert len(atlas.MODEL_REVISION) == 40


def test_similarity_rows_hold_the_upper_triangle():
    v = fixture()
    sim = v @ v.T
    nodes = [{"id": str(i)} for i in range(20)]
    rows = atlas.similarity_rows(nodes, sim)
    assert rows["ids"] == [str(i) for i in range(20)]
    assert [len(r) for r in rows["upper"]] == list(range(19, -1, -1))
    assert rows["upper"][0][0] == round(float(sim[0, 1]), 3)
    assert rows == atlas.similarity_rows(nodes, sim.copy())
