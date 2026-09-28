from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
import pytest

from prime_directions import cli, graph
from prime_directions import neighbors as nb

def space(n: int = 300, dim: int = 6, seed: int = 0) -> nb.NeighborSpace:
    rng = np.random.default_rng(seed)
    labels = rng.integers(0, 4, size=n)
    centers = rng.normal(scale=5, size=(4, dim))
    vectors = centers[labels] + rng.normal(size=(n, dim))
    return nb.NeighborSpace(vectors, [f"n{i}" for i in range(n)], [f"t{i}" for i in range(n)], labels)

def test_brute_knn_matches_full_sort():
    s = space()
    q = s.vectors[:7]
    idx, dist = nb.brute_knn(s.vectors, q, 10)
    for r in range(7):
        d = nb.distances(s.vectors, q[r])
        np.testing.assert_allclose(dist[r], np.sort(d)[:10], atol=1e-9)
        assert idx[r, 0] == r

@pytest.mark.parametrize("backend", ["brute", "kdtree", "hnsw"])
def test_backends_agree_with_exact(backend):
    s = space(n=2000)
    index = nb.build_index(backend, s.vectors)
    found, dist = index.query(s.vectors[:50], 10)
    truth, tdist = nb.brute_knn(s.vectors, s.vectors[:50], 10)
    assert nb.recall_at_k(found, truth) >= 0.98
    np.testing.assert_allclose(dist[:, 0], 0, atol=1e-3)

def test_build_index_rejects_unknown_and_pg_without_dsn():
    with pytest.raises(ValueError):
        nb.build_index("annoy", np.zeros((3, 2)))
    with pytest.raises(ValueError):
        nb.build_index("pgvector", np.zeros((3, 2)))

def test_scopes_partition_candidates():
    s = space()
    own = s.labels[0]
    local = nb.neighbors(s, "n0", k=20, scope="local")
    cross = nb.neighbors(s, "n0", k=20, scope="cross")
    glob = nb.neighbors(s, "n0", k=20, scope="global")
    assert all(x.label == own for x in local)
    assert all(x.label != own for x in cross)
    assert all(x.id != "n0" for x in local + cross + glob)
    assert [x.distance for x in glob] == sorted(x.distance for x in glob)
    exact = np.sort(nb.distances(np.delete(s.vectors, 0, axis=0), s.vectors[0]))[:20]
    np.testing.assert_allclose([x.distance for x in glob], exact)

def test_global_with_index_skips_self_and_matches_exact():
    s = space()
    index = nb.build_index("kdtree", s.vectors)
    a = nb.neighbors(s, "n5", k=8, index=index)
    b = nb.neighbors(s, "n5", k=8)
    assert [x.id for x in a] == [x.id for x in b]

def test_scope_errors():
    s = space()
    with pytest.raises(ValueError):
        nb.neighbors(s, "n0", scope="sideways")
    with pytest.raises(ValueError):
        nb.neighbors(s, s.vectors[0], scope="local")
    unlabeled = nb.NeighborSpace(s.vectors, s.ids, s.titles)
    with pytest.raises(ValueError):
        nb.neighbors(unlabeled, "n0", scope="cross")
    with pytest.raises(KeyError):
        nb.neighbors(s, "missing")
    with pytest.raises(ValueError):
        nb.NeighborSpace(np.zeros((2, 2)), ["a"], ["a", "b"])

def test_table_pca_standardizes_and_orthonormal():
    rng = np.random.default_rng(1)
    table = rng.normal(size=(50, 4)) * [1, 10, 100, 0] + [0, 5, -3, 7]
    pca = nb.fit_table_pca(table, ["a", "b", "c", "d"])
    z = pca.transform(table)
    np.testing.assert_allclose(z.mean(axis=0), 0, atol=1e-9)
    np.testing.assert_allclose(pca.components @ pca.components.T, np.eye(pca.components.shape[0]), atol=1e-9)
    assert pca.explained.sum() == pytest.approx(1.0)

def test_advisor_matching_from_csv(tmp_path: Path):
    csv_path = tmp_path / "advisors.csv"
    rows = ["id,name,dept,ml,bio,theory"]
    rows += [f"a{i},Advisor {i},x,{9 - i % 3},{i % 3},{(i * 7) % 5}" for i in range(12)]
    csv_path.write_text("\n".join(rows) + "\n")
    s, pca = nb.advisor_space(csv_path)
    assert pca.columns == ["ml", "bio", "theory"]
    found = nb.match_advisors(s, pca, {"ml": 9, "bio": 0, "theory": 0}, k=3)
    assert len(found) == 3 and found[0].id in {"a0", "a3", "a6", "a9"}
    with pytest.raises(ValueError):
        nb.match_advisors(s, pca, {"ml": 1}, k=3)

def test_read_table_errors(tmp_path: Path):
    empty = tmp_path / "e.csv"
    empty.write_text("id,name\n")
    with pytest.raises(ValueError):
        nb.read_table(empty, "id", "name")
    text = tmp_path / "t.csv"
    text.write_text("id,name\na,b\n")
    with pytest.raises(ValueError):
        nb.read_table(text, "id", "name")

def test_benchmark_rows_and_pg_skip():
    s = space(n=500)
    rows = nb.benchmark(s.vectors, ["brute", "kdtree", "pgvector"], n_queries=20, pg_max_rows=100, repeats=1)
    by = {r["backend"]: r for r in rows}
    assert by["brute"]["recall_at_k"] == 1.0 and by["kdtree"]["recall_at_k"] == 1.0
    assert "skipped" in by["pgvector"]
    assert by["brute"]["query_us"] > 0

def test_benchmark_records_backend_errors():
    rows = nb.benchmark(np.zeros((30, 2)) + np.arange(30)[:, None], ["pgvector"], n_queries=5, dsn="postgresql://127.0.0.1:1/x")
    assert "error" in rows[0]

@pytest.mark.skipif(not os.environ.get("PRIME_TEST_PG"), reason="set PRIME_TEST_PG to a DSN with pgvector")
def test_pgvector_backend_live():
    s = space(n=400)
    index = nb.build_index("pgvector", s.vectors, dsn=os.environ["PRIME_TEST_PG"])
    try:
        found, _ = index.query(s.vectors[:10], 5)
    finally:
        index.close()
    truth, _ = nb.brute_knn(s.vectors, s.vectors[:10], 5)
    assert nb.recall_at_k(found, truth) >= 0.9

def test_cli_neighbors_graph_and_csv(tmp_path: Path, monkeypatch, capsys):
    from tests.test_canon import synthetic_rows

    monkeypatch.setattr(graph, "fetch_rows", lambda dsn: synthetic_rows())
    monkeypatch.setenv("PRIME_DATA_ROOT", str(tmp_path))
    assert cli.main(["neighbors", "--node", "sky-3", "--scope", "local", "--k", "4", "--components", "3"]) == 0
    lines = [json.loads(x) for x in capsys.readouterr().out.strip().splitlines()]
    assert len(lines) == 4 and all(x["id"] != "sky-3" for x in lines)
    assert sum(x["id"].startswith("sky") for x in lines) >= 3
    assert cli.main(["neighbors", "--scope", "local"]) == 2
    csv_path = tmp_path / "adv.csv"
    csv_path.write_text("id,name,a,b\nx,X,1,0\ny,Y,0,1\nz,Z,1,1\n")
    assert cli.main(["neighbors", "--csv", str(csv_path), "--profile", '{"a": 1, "b": 0}', "--k", "1"]) == 0
    assert json.loads(capsys.readouterr().out.strip())["id"] == "x"

def test_distance_recall_counts_ties():
    truth = np.array([[0.0, 1.0, 2.0]])
    assert nb.distance_recall(np.array([[0.0, 1.0, 2.0]]), truth) == 1.0
    assert nb.distance_recall(np.array([[0.0, 1.0, 2.5]]), truth) == pytest.approx(2 / 3)
    v = np.array([[0.0], [1.0], [1.0], [3.0]])
    idx, dist = nb.brute_knn(v, v[:1], 2)
    assert nb.distance_recall(np.array([[0.0, 1.0]]), dist) == 1.0
