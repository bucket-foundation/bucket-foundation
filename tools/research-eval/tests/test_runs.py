import json

import pytest

from bucket_eval.runs import LockError, load_config, start_run

CONFIG = """name: d2-topics
dataset: openalex-works
vertices: topics
cutoffs: [2012, 2015, 2018]
horizons: [3, 5]
m: [1, 3]
min_works: 20
seed: 7
bootstrap_reps: 2000
aggregations: [min, geomean, product]
full_bootstrap_check: {cutoff: 2012, reps: 200}
"""

def test_lock_holds_the_config(tmp_path):
    cfg = tmp_path / "d2.yaml"
    cfg.write_text(CONFIG)
    run = start_run(cfg, tmp_path)
    assert json.loads(run.lock.read_text())["config_sha256"] == run.sha256
    assert start_run(cfg, tmp_path).sha256 == run.sha256
    cfg.write_text(CONFIG.replace("seed: 7", "seed: 8"))
    with pytest.raises(LockError):
        start_run(cfg, tmp_path)

def test_results_without_a_lock_refuse_a_new_lock(tmp_path):
    cfg = tmp_path / "d2.yaml"
    cfg.write_text(CONFIG)
    (tmp_path / "d2-topics.results.json").write_text("{}")
    with pytest.raises(LockError):
        start_run(cfg, tmp_path)

@pytest.mark.parametrize("bad", ["aggregations: [min, product]", "aggregations: [product, geomean, min]", "vertices: concepts", "full_bootstrap_check: {cutoff: 2018, reps: 200}"])
def test_config_rules(tmp_path, bad):
    key = bad.split(":")[0]
    text = "\n".join(bad if line.startswith(key + ":") else line for line in CONFIG.splitlines()) + "\n"
    cfg = tmp_path / "bad.yaml"
    cfg.write_text(text)
    with pytest.raises(ValueError):
        load_config(cfg)
