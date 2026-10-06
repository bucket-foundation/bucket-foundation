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


def test_components_repeat_and_explain_variance():
    v = fixture()
    nodes = [{"id": str(i), "name": str(i), "branch": "physics", "kind": "problem", "solvability": 0.5, "resolved": None} for i in range(20)]
    tokens = [f"t{i}" for i in range(6)]
    tok = atlas.unit(np.random.default_rng(5).normal(size=(6, 8)))
    a = atlas.components(nodes, v, tokens, tok)
    b = atlas.components(nodes, v.copy(), tokens, tok.copy())
    assert a == b
    assert len(a["nodes"]) == 20 and len(a["nodes"][0]["pc"]) == atlas.N_COMPONENTS
    assert 0 < sum(a["explained"]) <= 1
    assert a["explained"] == sorted(a["explained"], reverse=True)
    assert all(len(d["positive"]) == min(atlas.DIRECTION_TOKENS, 6) for d in a["directions"])


def test_full_text_never_names_the_branch():
    sourced = {"id": "x", "name": "x", "branch": "physics", "kind": "sourced", "keywords": ["a"], "statement": "A statement."}
    bare = {"id": "y", "name": "y", "branch": "physics", "kind": "sourced", "keywords": ["k1", "k2"], "statement": ""}
    assert atlas.full_text(sourced) == ("A statement.", "statement")
    assert atlas.full_text(bare) == ("y. k1, k2", "name_keywords")
    assert "physics" not in atlas.full_text(bare)[0]


def test_mark_solved_follows_the_variant_rule():
    nodes = [
        {"id": "p", "kind": "problem", "resolved": 1900},
        {"id": "q", "kind": "problem", "resolved": None},
        {"id": "s", "kind": "sourced", "status": "solved"},
        {"id": "v1", "kind": "variant", "status": "solved", "variant_of": "p"},
        {"id": "v2", "kind": "variant", "status": "solved", "variant_of": "q"},
        {"id": "v3", "kind": "variant", "status": "open", "variant_of": "p"},
        {"id": "t", "kind": "lean", "resolved": 2026},
    ]
    out = {n["id"]: (n["solved"], n["status"]) for n in atlas.mark_solved(nodes)}
    assert out == {"p": (True, "solved"), "q": (False, "open"), "s": (True, "solved"), "v1": (True, "solved"), "v2": (False, "partial"), "v3": (False, "open"), "t": (True, "solved")}


def test_neighbour_rows_store_top_k_and_nearest_solved_problem():
    v = fixture()
    nodes = [{"id": str(i), "solved": i % 3 == 0, "kind": "lean" if i == 0 else "problem"} for i in range(20)]
    rows = atlas.neighbour_rows(nodes, v, k=4, block=7)
    sim = v @ v.T
    for i, r in enumerate(rows):
        assert len(r["n"]) == 4 and i not in r["n"]
        assert r["s"] == sorted(r["s"], reverse=True)
        assert r["n"][0] == int(np.argsort(-np.where(np.arange(20) == i, -2, sim[i]))[0])
        assert r["solved_nearest"]["id"] != "0" and r["solved_nearest"]["id"] != str(i)
        cand = [j for j in range(3, 20, 3) if j != i]
        assert r["solved_nearest"]["id"] == str(max(cand, key=lambda j: sim[i, j]))
    assert rows == atlas.neighbour_rows(nodes, v.copy(), k=4)


def test_cached_encode_reuses_vectors(tmp_path):
    class Model:
        calls = []

        def encode(self, texts, normalize_embeddings=True, batch_size=64):
            self.calls.append(list(texts))
            return np.array([[len(t), 1.0, 0.5] for t in texts], dtype=np.float32)

    m = Model()
    a, fresh = atlas.cached_encode(m, ["one", "three"], cache=tmp_path)
    assert fresh == 2 and a.shape == (2, 3)
    b, fresh = atlas.cached_encode(m, ["three", "one", "seven"], cache=tmp_path)
    assert fresh == 1 and m.calls[-1] and len(m.calls[-1]) == 1
    assert np.allclose(b[0], a[1]) and np.allclose(b[1], a[0])
