import math

import pytest

from hte import learning, meta
from hte.corpus import learning as lc

def E(d, se, sid="s"):
    return meta.Effect(d, se, False, sid)

def test_parse_effect_forms():
    assert meta.parse_effect("g≈0.51 vs restudy").d == pytest.approx(0.51)
    assert meta.parse_effect("g≈0.51").imputed_se
    e = meta.parse_effect("d = 0.40, 95% CI 0.20 to 0.60")
    assert e.se == pytest.approx(0.2 / 1.959964, rel=1e-4) and not e.imputed_se
    assert meta.parse_effect("about 2σ above").d == 2.0
    assert meta.parse_effect("r = 0.3").d == pytest.approx(2 * 0.3 / math.sqrt(0.91))
    assert meta.parse_effect("d=0.5 in n=400 learners").se == pytest.approx(math.sqrt(4 / 400 + 0.25 / 800))
    assert meta.parse_effect("large margin") is None

def test_t_p_matches_known_values():
    assert meta.t_two_sided_p(2.228, 10) == pytest.approx(0.05, abs=1e-3)
    assert meta.t_two_sided_p(0.0, 5) == pytest.approx(1.0)

def test_random_effects_homogeneous_equals_fixed():
    r = meta.random_effects([E(0.5, 0.1), E(0.5, 0.2)])
    assert r.pooled == pytest.approx(0.5) and r.tau2 == 0 and r.i2 == 0
    assert r.ci_low < 0.5 < r.ci_high

def test_random_effects_dl_worked_example():
    r = meta.random_effects([E(0.1, 0.1), E(0.5, 0.1), E(0.9, 0.1)])
    assert r.tau2 == pytest.approx(0.15, rel=1e-6)
    assert r.i2 == pytest.approx(1 - 2 / 32, rel=1e-6)
    assert r.pooled == pytest.approx(0.5)
    assert r.se == pytest.approx(math.sqrt(0.16 / 3))

def test_egger_detects_small_study_asymmetry():
    asym = [E(0.1, 0.05), E(0.3, 0.1), E(0.6, 0.2), E(0.9, 0.3), E(1.3, 0.4)]
    ei, ep = meta.egger(asym)
    assert ei > 0 and ep < 0.05
    assert meta.egger([E(0.5, 0.1), E(0.5, 0.1), E(0.5, 0.1)]) == (None, None)
    assert meta.egger([E(0.5, 0.1), E(0.4, 0.2)]) == (None, None)

def test_bh():
    q = meta.benjamini_hochberg([0.01, None, 0.04, 0.03, 0.2])
    assert q == [pytest.approx(0.04), None, pytest.approx(0.04 * 4 / 3), pytest.approx(0.04 * 4 / 3), pytest.approx(0.2)]

def test_n_per_group():
    assert meta.n_per_group(0.5) == 64
    assert meta.n_per_group(0.2) == 394
    with pytest.raises(ValueError):
        meta.n_per_group(0)

def test_campaign_reports_meta_and_bucket_tests(tmp_path):
    rows = [
        {"id": f"w{i}", "authors": ["A"], "year": 2020, "title": "t", "study_type": "RCT", "topics": [], "withdrawn": False,
         "finding": f"Spaced practice improved retention, d={d}, n={n}."}
        for i, (d, n) in enumerate([(0.4, 100), (0.6, 200), (0.5, 400)])
    ]
    path = tmp_path / "learning/corpus/works.jsonl"
    path.parent.mkdir(parents=True)
    path.write_text("\n".join(__import__("json").dumps(r) for r in rows) + "\n")
    result = learning.run_campaign(root=tmp_path, mode="fake", cache_dir=tmp_path / "c")
    h = next(x for x in result["hypotheses"] if x["id"] == "spacing>retention")
    assert h["meta"]["k"] == 3 and h["meta"]["k_imputed_se"] == 0
    assert 0.4 < h["meta"]["pooled"] < 0.6
    assert h["q_bh"] is not None
    md = learning.render_markdown(result)
    assert "## Meta-Analysis" in md and "## Tests On Bucket Data" in md
    assert lc.load(tmp_path, cache_dir=tmp_path / "c").effects

def test_bucket_proposal_uses_pooled_effect():
    h = learning.LearningHypothesis("spacing", "retention", supports=["a"])
    h.meta = meta.random_effects([E(0.5, 0.1), E(0.5, 0.1)])
    [p] = learning.bucket_proposals([h])
    assert p["planning_d_source"] == "pooled" and p["n_per_group"] == 64
    assert p["H0"].startswith("In Bucket learner data")
    other = learning.LearningHypothesis("motivation", "persistence", supports=["a"])
    assert learning.bucket_proposals([other]) == []
