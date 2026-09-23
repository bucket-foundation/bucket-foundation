import numpy as np
import pytest

from bucket_eval.evaluate import metrics_for
from bucket_eval.metrics import naive_metrics

@pytest.mark.parametrize("case", range(1000))
def test_streamed_equals_full_sort_without_ties(case):
    rng = np.random.default_rng(case)
    n = int(rng.integers(20, 200))
    scores = rng.random(n)
    labels = rng.random(n) < rng.uniform(0.05, 0.5)
    if labels.sum() == 0 or labels.all():
        labels[0] = not labels[0]
    ks = (5, 10)
    streamed = metrics_for(scores, labels, ks)
    naive = naive_metrics(scores, labels, ks, rng, orders=1)
    assert streamed["auc"] == pytest.approx(naive["auc"], abs=1e-12)
    assert streamed["ap"] == pytest.approx(naive["ap_random_ties"], abs=1e-12)
    for k in ks:
        assert streamed[f"p@{k}"] == pytest.approx(naive[f"p@{k}"], abs=1e-12)

@pytest.mark.parametrize("case", range(20))
def test_streamed_ties_match_the_random_tie_expectation(case):
    rng = np.random.default_rng(10_000 + case)
    n = 120
    scores = rng.integers(0, 4, n).astype(float)
    labels = rng.random(n) < 0.3
    streamed = metrics_for(scores, labels, (10, 40))
    naive = naive_metrics(scores, labels, (10, 40), rng, orders=4000)
    assert streamed["auc"] == pytest.approx(naive["auc"], abs=1e-12)
    assert streamed["p@10"] == pytest.approx(naive["p@10"], abs=0.02)
    assert streamed["p@40"] == pytest.approx(naive["p@40"], abs=0.02)
