import json
import sys
from pathlib import Path

import numpy as np
import pytest

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))

import atlas
import embed_ablation
import embed_compare

RESULT = HERE / "ablation" / "embeddinggemma-2.json"


def test_the_shipped_model_stays_first_and_default():
    first = embed_ablation.MODELS[0]
    assert (first["name"], first["revision"]) == (atlas.MODEL, atlas.MODEL_REVISION) == ("BAAI/bge-small-en-v1.5", "5c38ec7c405ec4b44b94cc5a9bb96e735b38267a")
    assert embed_ablation.cache_of(first) == atlas.CACHE
    assert all(spec.get("optional") for spec in embed_ablation.MODELS[1:])
    assert all(embed_ablation.cache_of(spec) != atlas.CACHE for spec in embed_ablation.MODELS[1:])
    with pytest.raises(SystemExit):
        embed_ablation.spec_of("no-such-model")


def test_truncation_renormalizes_and_labels_the_shorter_width():
    spec = embed_ablation.spec_of("embeddinggemma-2")
    emb = atlas.unit(np.random.default_rng(1).normal(size=(5, 768)))
    short = embed_ablation.truncated(emb, 256)
    assert short.shape == (5, 256) and np.allclose(np.linalg.norm(short, axis=1), 1)
    assert embed_ablation.truncated(emb, 768) is emb and embed_ablation.truncated(emb, None) is emb
    assert embed_ablation.label_at(spec, 768) == "embeddinggemma-2" and embed_ablation.label_at(spec, 256) == "embeddinggemma-2@256"
    assert embed_ablation.label_at(embed_ablation.MODELS[0], None) == "bge-small-en-v1.5"


def test_the_prompt_wrapper_passes_its_task_name_and_the_cache_key_carries_it(tmp_path, monkeypatch):
    calls = []

    class Model:
        def encode(self, texts, **kwargs):
            calls.append(kwargs)
            return np.array([[float(len(t)), 1.0] for t in texts], dtype=np.float32)

    spec = {"name": "m/x", "revision": "r", "label": "x", "prompt_name": "Clustering", "batch_size": 4}
    monkeypatch.setattr(atlas, "CACHE", tmp_path)
    emb, fresh = embed_ablation.encode(spec, embed_ablation.Prompted(Model(), "Clustering"), ["a", "bbb"])
    assert fresh == 2 and emb.shape == (2, 2)
    assert calls[0]["prompt_name"] == "Clustering" and calls[0]["batch_size"] == 4 and calls[0]["normalize_embeddings"] is True
    assert (tmp_path / "x" / "vectors.npy").exists() and not (tmp_path / "vectors.npy").exists()
    assert (atlas.MODEL, atlas.MODEL_REVISION) == (embed_ablation.MODELS[0]["name"], embed_ablation.MODELS[0]["revision"])


def test_pick_reads_the_shipped_model_only():
    def result(model, variant, auc):
        return {"model": model, "variant": variant, "score": {"auc": auc, "undatedRemoved": {"auc": auc}}}

    rows = [result(embed_ablation.DEFAULT_MODEL, "name", 0.7), result(embed_ablation.DEFAULT_MODEL, "current", 0.99), result("embeddinggemma-2", "name", 0.95)]
    assert embed_ablation.pick(rows)["model"] == embed_ablation.DEFAULT_MODEL and embed_ablation.pick(rows)["variant"] == "name"


def test_permutation_spread_is_wide_with_few_positives_and_centred_on_chance():
    rng = np.random.default_rng(3)
    rows = [(f"r{i}", float(rng.random()), i < 8) for i in range(400)]
    got = embed_compare.permutation_spread(rows, permutations=2000)
    assert got["rows"] == 400 and got["positives"] == 8
    lo, hi = got["null_95"]
    assert lo < 0.5 < hi and 0.12 < got["spread"] < 0.3
    assert 0 < got["p_one_sided"] <= 1


def test_paired_difference_uses_shared_rows():
    a = [("x", 0.9, True), ("y", 0.1, False), ("z", 0.5, False), ("only-a", 0.2, True)]
    b = [("x", 0.1, True), ("y", 0.9, False), ("z", 0.5, False), ("only-b", 0.2, True)]
    got = embed_compare.paired_difference(a, b, n=200)
    assert got["rows"] == 3 and got["positives"] == 1
    assert got["difference"] == -1.0


def test_the_rule_needs_both_the_gain_and_every_pair():
    def side(auc, spread):
        return {"forecast_2021": {"auc_undated_removed": auc}, "permutation": {"spread": spread}}

    assert embed_compare.verdict(side(0.7, 0.1), side(0.85, 0.1), embed_compare.PAIR_TARGET)["switch"] is True
    assert embed_compare.verdict(side(0.7, 0.1), side(0.85, 0.1), embed_compare.PAIR_TARGET - 1)["switch"] is False
    assert embed_compare.verdict(side(0.7, 0.2), side(0.85, 0.1), embed_compare.PAIR_TARGET)["switch"] is False
    assert embed_compare.verdict(side(0.7, 0.1), side(0.65, 0.1), embed_compare.PAIR_TARGET)["switch"] is False


def test_the_committed_comparison_applies_the_rule_it_states():
    if not RESULT.exists():
        pytest.skip("no committed comparison")
    r = json.load(open(RESULT))
    assert r["rule"] == embed_compare.RULE and r["baseline"] == "bge-small-en-v1.5"
    base = r["models"]["bge-small-en-v1.5"]["dims"]["bge-small-en-v1.5"]
    for name, v in r["verdict"].items():
        other = next(m["dims"][name] for m in r["models"].values() if name in m["dims"])
        assert v["switch"] == (other["forecast_2021"]["auc_undated_removed"] - base["forecast_2021"]["auc_undated_removed"] > v["permutation_spread"] and v["pair_hits"] == v["pair_target"])
        assert len(other["leakage_ladder"]) == 4
