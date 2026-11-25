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
    h = learning.LearningHypothesis("retrieval_practice", "retention", supports=["a"])
    h.meta = meta.random_effects([E(0.5, 0.1), E(0.5, 0.1)])
    [p] = learning.bucket_proposals([h])
    assert p["planning_d_source"] == "pooled" and p["design"] == "two_sample" and p["n"] == 64
    assert p["H0"].startswith("In Bucket learner data")
    other = learning.LearningHypothesis("motivation", "persistence", supports=["a"])
    assert learning.bucket_proposals([other]) == []

def test_imputed_pool_is_descriptive_and_defaults_planning_d():
    imputed = [meta.Effect(0.5, 0.15, True, "a"), meta.Effect(0.6, 0.15, True, "b"), E(0.4, 0.1, "c")]
    r = meta.random_effects(imputed)
    assert r.descriptive and r.p is None and r.ci_low is None
    assert r.imputed_share == pytest.approx(2 / 3)
    single = meta.random_effects([E(0.5, 0.1)])
    assert single.descriptive and single.p is None
    h = learning.LearningHypothesis("retrieval_practice", "retention", supports=["a"])
    h.meta = r
    [p] = learning.bucket_proposals([h])
    assert p["planning_d_source"] == "default" and p["planning_d"] == learning.DEFAULT_PLANNING_D

def test_regression_and_mixed_designs_use_f2():
    assert meta.n_regression(0.5) == math.ceil((1.959964 + 0.841621) ** 2 / 0.0625 + 2)
    lex = learning.LearningHypothesis("comprehensible_input", "comprehension", supports=["a"])
    sp = learning.LearningHypothesis("spacing", "retention", supports=["a"])
    a, b = learning.bucket_proposals([lex, sp])
    assert a["design"] == "regression" and a["n_unit"] == "total learners"
    assert b["design"] == "mixed" and "simulate" in b["note"]

def test_se_parsing_and_effect_string():
    from hte.corpus import learning_extract as lx
    s = lx.effect_string({"effect_size": "d=0.3", "se": 0.05, "ci": "0.2 to 0.4", "n": 120})
    e = meta.parse_effect(s)
    assert e.se == pytest.approx(0.05) and not e.imputed_se
    assert lx.effect_string({"effect_size": None, "se": 0.1}) is None

def _sign_root(tmp_path):
    import json
    rows = [{"id": f"w{i}", "authors": ["A"], "year": 2020, "title": "t", "study_type": "RCT", "topics": [], "withdrawn": False,
             "finding": f"Spaced practice improved retention, d=0.5, n={n}."} for i, n in enumerate((100, 200))]
    path = tmp_path / "learning/corpus/works.jsonl"
    path.parent.mkdir(parents=True)
    path.write_text("\n".join(json.dumps(r) for r in rows) + "\n")
    (tmp_path / "learning/corpus/claims.jsonl").write_text(json.dumps(
        {"id": "c1", "name": "Spacing", "statement": "Spaced practice improves retention, d=0.5.", "topics": [],
         "supports": [], "contradicted_by": ["w0", "w1"]}) + "\n")
    return tmp_path

def test_contradicted_by_signs_effect_negative(tmp_path):
    root = _sign_root(tmp_path)
    corpus = lc.load(root, cache_dir=root / "c")
    hyps = {h.id: h for h in learning.build_hypotheses(corpus.corpus.evidence)}
    h = hyps["spacing>retention"]
    learning.attach_meta(corpus, [h])
    assert any(i.startswith("claim:c1@") for i in h.refutes)
    assert h.meta.k == 2
    by_id = {e.id: e for e in corpus.corpus.evidence}
    neg_only = learning.LearningHypothesis("spacing", "retention", refutes=[i for i in h.refutes if i in by_id])
    learning.attach_meta(corpus, [neg_only])
    assert neg_only.meta.pooled < 0

def test_bh_skips_descriptive_rows(tmp_path):
    a = learning.LearningHypothesis("spacing", "retention")
    b = learning.LearningHypothesis("tutoring", "achievement")
    a.meta = meta.random_effects([E(0.5, 0.1), E(0.6, 0.1)])
    b.meta = meta.random_effects([E(0.5, 0.1)])
    qs = meta.benjamini_hochberg([h.meta.p if not h.meta.descriptive else None for h in (a, b)])
    assert qs[0] is not None and qs[1] is None
