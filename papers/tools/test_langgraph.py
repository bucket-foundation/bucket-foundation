from __future__ import annotations

import hashlib
import importlib.util
from pathlib import Path

import numpy as np
import pytest

_spec = importlib.util.spec_from_file_location("langgraph", Path(__file__).resolve().parent / "langgraph.py")
langgraph = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(langgraph)


def sha(path) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def unit(rows):
    a = np.asarray(rows, dtype=np.float32)
    return (a / np.linalg.norm(a, axis=1, keepdims=True)).astype(np.float16)


@pytest.fixture
def dataset(tmp_path):
    pd = pytest.importorskip("pandas")
    pytest.importorskip("pyarrow")
    rng = np.random.default_rng(0)
    english = ["cat", "dog", "sun"]
    for lang, words in {"es": ["gato", "perro", "sol"], "pt": ["gato", "cao", "sol"], "ru": ["koshka", "sobaka", "solntse"]}.items():
        d = tmp_path / lang
        d.mkdir()
        (d / "words.txt").write_text("\n".join(words), encoding="utf-8")
        for m, dim in (("script", 4), ("phonetic", 5), ("meaning", 6)):
            np.save(d / f"{m}.npy", unit(rng.normal(size=(len(words), dim))))
        pd.DataFrame({"word": words, "english": english, "direction": ["en>xx"] * 3, "new_rank": [0, 0, 0]}).to_parquet(d / "pairs.parquet")
    en = tmp_path / "en"
    en.mkdir()
    (en / "words.txt").write_text("right\nwrite\nnight\nRight", encoding="utf-8")
    np.save(en / "phonetic.npy", unit([[1, 0, 0], [0.99, 0.1, 0], [0, 1, 0], [1, 0, 0]]))
    np.save(en / "script.npy", unit([[1, 0, 0], [0, 0, 1], [0.95, 0.2, 0], [1, 0, 0]]))
    return tmp_path


def test_family_order_groups_scripts():
    assert langgraph.order_by_family(["zh", "ru", "es", "ar", "de"]) == ["de", "es", "ru", "ar", "zh"]


def test_top_edges_are_symmetric_and_sorted():
    sim = [[1, 0.9, 0.1], [0.9, 1, 0.2], [0.1, 0.2, 1]]
    assert langgraph.top_edges(["a", "b", "c"], sim, 1) == [("b", "c"), ("a", "b")]


def test_derive_graph_is_symmetric_with_unit_diagonal(dataset):
    g = langgraph.derive_graph(str(dataset), min_langs=3)
    assert g["langs"] == ["es", "pt", "ru"] and g["anchors"] == 3
    for m in ("script", "phonetic", "meaning"):
        s = np.array(g["sim"][m], dtype=float)
        assert np.allclose(s, s.T)
        assert np.allclose(np.diag(s), 1.0, atol=2e-3)
        x = g["excess"][m]
        assert all(x[i][i] is None for i in range(3))
        assert x[0][1] == x[1][0] == round(g["sim"][m][0][1] - g["null"][m][0][1], 4)


def test_anchor_sample_depends_on_seed_only(dataset):
    a = langgraph.derive_graph(str(dataset), min_langs=3, max_anchors=2, seed=1)
    b = langgraph.derive_graph(str(dataset), min_langs=3, max_anchors=2, seed=1)
    assert a == b and a["anchors"] == 2


def test_missing_pairs_drop_edges():
    sim = [[None, 0.5, None], [0.5, None, None], [None, None, None]]
    assert langgraph.top_edges(["a", "b", "c"], sim, 2) == [("a", "b")]


def test_neighbors_skip_the_word_and_its_case_variant(dataset):
    nb = langgraph.derive_neighbors(str(dataset), "en", "right", k=2)
    assert [x["word"] for x in nb["groups"]["phonetic"]] == ["write", "night"]
    assert [x["word"] for x in nb["groups"]["script"]][0] == "night"


def test_figures_are_byte_stable(dataset, tmp_path):
    g = langgraph.derive_graph(str(dataset), min_langs=3)
    nb = langgraph.derive_neighbors(str(dataset), "en", "right", k=2)
    vals = {"es": 70.0, "ru": 60.0, "zh": 50.0}
    base = {"es": 60.0, "ru": 55.0, "zh": 52.0}
    for run in ("a", "b"):
        langgraph.metric_bars(vals, tmp_path / run / "bars.png", "p", baseline=base)
        langgraph.slope_chart([("first", base, vals)], tmp_path / run / "slope.png", "p")
        langgraph.language_network(g, tmp_path / run / "net.png", k=1)
        langgraph.neighbor_graph(nb, tmp_path / run / "nb.png")
    for name in ("bars.png", "slope.png", "net.png", "nb.png"):
        assert sha(tmp_path / "a" / name) == sha(tmp_path / "b" / name)


def test_cli_draws_bars(tmp_path):
    spec = tmp_path / "bars.json"
    spec.write_text('{"values": {"es": 50, "ja": 40}}', encoding="utf-8")
    out = tmp_path / "bars.png"
    assert langgraph.main(["bars", "--in", str(spec), "--out", str(out)]) == 0
    assert out.read_bytes()[:8] == b"\x89PNG\r\n\x1a\n"
