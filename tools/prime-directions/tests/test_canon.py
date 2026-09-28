from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest
import scipy.sparse as sp

from prime_directions import canon, charts, cli, graph
from prime_directions.corpora import TOOL_REPO_ROOT

TOPICS = {
    "sea": "whale coral reef tide kelp salmon plankton trawler",
    "sky": "rocket satellite orbit thruster payload apogee launchpad telescope",
    "farm": "wheat barley harvest tractor silo irrigation fertilizer combine",
}

def synthetic_rows(per_topic: int = 30, seed: int = 0):
    rng = np.random.default_rng(seed)
    nodes, edges = [], []
    ids_by_topic: dict[str, list[str]] = {}
    for topic, words in TOPICS.items():
        vocab = words.split()
        for i in range(per_topic):
            node_id = f"{topic}-{i}"
            text = " ".join(rng.choice(vocab, size=5, replace=False))
            prov = {"source": "kruse podcast"} if topic == "sea" and i == 0 else {}
            nodes.append((node_id, node_id, f"{topic} {i}", "concept", f"b-{topic}", text, {"en": {"title": topic}}, prov))
            ids_by_topic.setdefault(topic, []).append(node_id)
    for topic, ids in ids_by_topic.items():
        for a, b in zip(ids, ids[1:]):
            edges.append((a, b, "bridges", 1.0))
        for a in ids[::5]:
            edges.append((a, ids[0], "cites", 1.0))
    return nodes, edges

def small_graph(**kwargs) -> graph.Graph:
    nodes, edges = synthetic_rows(**kwargs)
    return graph.build_graph(nodes, edges)

def test_exclude_private_drops_rows_matching_patterns():
    nodes, _ = synthetic_rows()
    kept, dropped = graph.exclude_private(nodes)
    assert dropped == 1
    assert all("kruse" not in json.dumps(r[7]) for r in kept)
    assert graph.exclude_private(nodes, ())[1] == 0

def test_build_graph_adds_academy_atoms_and_prerequisites():
    nodes, edges = synthetic_rows(per_topic=3)
    nodes.append(("m1", "academy-02-physics-waves", "Waves", "concept", "02-physics", "short", {},
                  {"type": "academy_atom", "atom_id": "waves"}))
    nodes.append(("m2", "canon-waves", "Waves canon", "concept", "02-physics", "bridge", {}, {"academy_atom_id": "waves"}))
    atoms = {
        "waves": {"id": "waves", "title": "Waves", "lesson": "crest trough amplitude", "_branch": "02-physics"},
        "light": {"id": "light", "title": "Light", "lesson": "photon", "requires": ["canon-waves"], "_branch": "02-physics"},
        "sound": {"id": "sound", "title": "Sound", "lesson": "pressure", "_branch": "02-physics"},
    }
    g = graph.build_graph(nodes, edges, atoms)
    by_slug = {n.slug: n for n in g.nodes}
    assert "crest trough amplitude" in by_slug["academy-02-physics-waves"].text
    assert "crest" not in by_slug["canon-waves"].text
    assert by_slug["light"].source == "academy" and by_slug["sound"].source == "academy"
    assert "waves" not in by_slug
    idx = {n.slug: i for i, n in enumerate(g.nodes)}
    assert (idx["canon-waves"], idx["light"], "prerequisite", 1.0) in g.edges
    assert g.meta["academy_added"] == 2 and g.meta["academy_mirrored"] == 1

def test_label_text_walks_nested_json():
    assert graph.label_text({"en": {"title": "A", "tags": ["b", "c"]}, "n": 3}) == "A b c"
    assert graph.label_text('{"x": "y"}') == "y"

def test_pagerank_sums_to_one_and_ranks_the_hub():
    a = sp.csr_matrix(np.array([[0, 1, 0, 0], [0, 0, 1, 0], [1, 0, 0, 0], [1, 0, 0, 0]], dtype=float))
    rank, iterations = graph.pagerank(a)
    assert abs(rank.sum() - 1) < 1e-12
    assert rank.argmax() == 0
    assert iterations < 200

def test_pagerank_handles_dangling_nodes():
    a = sp.csr_matrix(np.array([[0, 1, 0], [0, 0, 0], [0, 1, 0]], dtype=float))
    rank, _ = graph.pagerank(a)
    assert abs(rank.sum() - 1) < 1e-12 and np.all(rank > 0)

@pytest.mark.parametrize("weighting", graph.WEIGHTINGS)
def test_weightings(weighting):
    m = sp.csr_matrix(np.array([[1, 1, 0], [1, 0, 0], [0, 0, 0]], dtype=float))
    w = graph.weight_matrix(m, weighting)
    norms = np.sqrt(np.asarray(w.multiply(w).sum(axis=1)).ravel())
    if weighting == "binary":
        assert (w != m).nnz == 0
    else:
        np.testing.assert_allclose(norms[:2], 1)
        assert norms[2] == 0
    with pytest.raises(ValueError):
        graph.feature_matrix(small_graph(), weighting="nope")

def test_fit_graph_orthonormal_and_residual_identity():
    g = small_graph()
    result = graph.fit_graph(g, k=4, min_df=2, max_df=0.9)
    assert result.orthogonality < 1e-8
    res = result.residuals()
    fitted = (result.raw_scores**2).sum(axis=1)
    np.testing.assert_allclose(res + fitted, result.row_sq_norms, atol=1e-9)
    assert np.all(res >= 0)
    assert any(v.startswith("@") for v in result.vocab)

def test_modularity_known_values():
    a = sp.csr_matrix(np.array([[0, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 1], [0, 0, 1, 0]], dtype=float))
    assert canon.modularity(a, np.array([0, 0, 1, 1])) == pytest.approx(0.5)
    assert canon.modularity(a, np.array([0, 0, 0, 0])) == pytest.approx(0.0)
    assert canon.modularity(sp.csr_matrix((2, 2)), np.array([0, 1])) == 0.0

def test_assign_uses_signed_poles():
    z = np.array([[2.0, 0.1], [-3.0, 1.0], [0.2, -0.5]])
    assert canon.assign(z).tolist() == [0, 1, 3]
    assert canon.pole(3) == (1, -1)

def test_five_number_summary():
    s = canon.five_number(np.array([1.0, 2, 3, 4, 5]))
    assert (s["min"], s["q1"], s["median"], s["q3"], s["max"]) == (1, 2, 3, 4, 5)
    assert s["mean"] == 3 and s["sd"] == pytest.approx(np.sqrt(2))

def test_canon_clusters_numbered_by_pagerank_mass_and_beat_shuffle():
    g = small_graph(per_topic=40)
    result = graph.fit_graph(g, k=3, min_df=2, max_df=0.9)
    rank, _ = graph.pagerank(g.adjacency(symmetric=False))
    out = canon.canon_clusters(result, g.adjacency(), rank, [n.branch for n in g.nodes])
    masses = [c["pagerank_mass"] for c in out.clusters]
    assert masses == sorted(masses, reverse=True)
    assert [c["canon"] for c in out.clusters] == list(range(1, len(out.clusters) + 1))
    assert out.labels.min() == 0 and out.labels.max() == len(out.clusters) - 1
    assert out.metrics["modularity"] > out.metrics["modularity_shuffled_mean"] + 3 * out.metrics["modularity_shuffled_sd"]
    assert all(c["name"].startswith(f"Canon {c['canon']}: ") and len(c["name"]) > 10 for c in out.clusters)

def test_charts_write_pngs_and_validate_axes(tmp_path: Path):
    g = small_graph()
    result = graph.fit_graph(g, k=4, min_df=2, max_df=0.9)
    labels = canon.assign(result.scores)
    labels = np.unique(labels, return_inverse=True)[1]
    rank, _ = graph.pagerank(g.adjacency(symmetric=False))
    for smooth in (False, True):
        p = charts.projection(result, tmp_path / f"p{smooth}.png", labels=labels, size=rank, smooth=smooth)
        assert p.read_bytes()[:4] == b"\x89PNG"
    path, stats = charts.boxplot(result, tmp_path / "b.png")
    assert len(stats) == 4 and stats[0]["min"] <= stats[0]["median"] <= stats[0]["max"]
    path, summary = charts.residuals(result, tmp_path / "r.png", against=rank)
    assert 0 <= summary["residual_share"]["min"] <= summary["residual_share"]["max"] <= 1
    with pytest.raises(ValueError):
        charts.projection(result, tmp_path / "x.png", axes=(2, 2))
    with pytest.raises(ValueError):
        charts.projection(result, tmp_path / "x.png", axes=(1, 9))

def test_parse_charts():
    assert cli.parse_charts("boxplot, residuals") == ["boxplot", "residuals"]
    with pytest.raises(ValueError):
        cli.parse_charts("pie")

def test_cmd_canon_end_to_end(tmp_path: Path, monkeypatch):
    nodes, edges = synthetic_rows()
    seen = {}

    def fake_fetch(dsn):
        seen["dsn"] = dsn
        return nodes, edges

    monkeypatch.setattr(graph, "fetch_rows", fake_fetch)
    monkeypatch.setenv("PRIME_DATA_ROOT", str(tmp_path))
    out = tmp_path / "canon"
    code = cli.main(["canon", "--out", str(out), "--k", "3", "--min-df", "2", "--max-df", "0.9", "--smooth", "--dsn", "postgresql://x"])
    assert code == 0 and seen["dsn"] == "postgresql://x"
    data = json.loads((out / "canon.json").read_text())
    assert data["graph"]["excluded_private"] == 1
    assert "kruse" not in (out / "canon.json").read_text().lower()
    for name in ("projection.png", "projection-smooth.png", "boxplot.png", "residuals.png", "globe.png"):
        assert (out / name).exists()
    assert len(data["component_summaries"]) == 3
    assert {"modularity", "nmi_vs_branch", "modularity_louvain"} <= set(data["cluster_metrics"])

def test_cmd_canon_private_needs_outside_dir(monkeypatch, capsys):
    monkeypatch.setattr(graph, "fetch_rows", lambda dsn: synthetic_rows())
    code = cli.main(["canon", "--out", str(TOOL_REPO_ROOT / "tools" / "x"), "--include-private"])
    assert code == 2
    assert "private" in capsys.readouterr().err

def test_cmd_canon_private_writes_outside_repo_and_keeps_private_nodes(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(graph, "fetch_rows", lambda dsn: synthetic_rows())
    monkeypatch.setenv("PRIME_DATA_ROOT", str(tmp_path / "data"))
    out = tmp_path / "private"
    code = cli.main(["canon", "--out", str(out), "--include-private", "--k", "3", "--min-df", "2", "--max-df", "0.9",
                     "--charts", "boxplot", "--no-globe"])
    assert code == 0
    data = json.loads((out / "canon.json").read_text())
    assert data["kind"] == "canon-clusters"
    assert data["graph"]["excluded_private"] == 0 and data["graph"]["private_patterns"] == 0
    assert len(data["nodes"]) == 90
    assert (out / "boxplot.png").exists() and not (out / "projection.png").exists()

def test_exclude_private_uses_video_metadata_and_propagates_by_video(tmp_path: Path):
    vid = "AbCdEfGhIjK"
    folder = tmp_path / f"{vid}-some-talk"
    folder.mkdir()
    (folder / "metadata.json").write_text(json.dumps({"title": "Light talk with Dr. Jack Kruse", "channel": "c"}))
    rows = [
        ("a", "a", "clip one", "excerpt", "b", "sunlight", {}, {"url": f"https://www.youtube.com/watch?v={vid}&t=5", "video": "Light talk with Dr. "}),
        ("b", "b", "clip two", "excerpt", "b", "water", {}, {"url": f"https://youtu.be/{vid}"}),
        ("c", "c", "clip three", "excerpt", "b", "orbit", {}, {"url": "https://www.youtube.com/watch?v=ZZZZZZZZZZZ"}),
        ("d", "d", "plain", "concept", "b", "text", {}, {}),
    ]
    meta = graph.video_metadata({vid, "ZZZZZZZZZZZ"}, tmp_path)
    assert set(meta) == {vid}
    kept, dropped = graph.exclude_private(rows, graph.PRIVATE_PATTERNS, meta)
    assert [r[0] for r in kept] == ["c", "d"] and dropped == 2
    assert graph.exclude_private(rows, graph.PRIVATE_PATTERNS, {})[1] == 0
    assert graph.video_metadata({vid}, tmp_path / "missing") == {}
