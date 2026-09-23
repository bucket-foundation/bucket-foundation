import numpy as np
import pytest

from bucket_eval.bootstrap import full_poisson_bootstrap_auc_difference, intervals_agree, paired_positive_bootstrap
from bucket_eval.evaluate import counts_for

def synthetic(seed, n_neg=400_000, n_pos=400):
    rng = np.random.default_rng(seed)
    labels = np.zeros(n_neg + n_pos, dtype=bool)
    labels[:n_pos] = True
    signal = rng.normal(size=n_neg + n_pos) + labels * 0.8
    model = signal + rng.normal(scale=0.5, size=len(signal))
    base = signal + rng.normal(scale=1.5, size=len(signal))
    return model, base, labels

def test_same_seed_same_interval_and_self_difference_zero():
    model, base, labels = synthetic(1, 20_000, 300)
    m = counts_for(model, labels)
    b = counts_for(base, labels)
    strata = ["y2012"] * 150 + ["y2015"] * 150
    one = paired_positive_bootstrap(m, b, strata, 200, seed=5)
    two = paired_positive_bootstrap(m, b, strata, 200, seed=5)
    assert one == two
    self = paired_positive_bootstrap(m, m, strata, 200, seed=5)
    assert all(v == {"difference": 0.0, "low": 0.0, "high": 0.0} for v in self.values())

def test_positive_resample_matches_full_candidate_bootstrap():
    model, base, labels = synthetic(2)
    m = counts_for(model, labels)
    b = counts_for(base, labels)
    fast = paired_positive_bootstrap(m, b, ["all"] * int(labels.sum()), 1000, seed=11)["auc"]
    full = full_poisson_bootstrap_auc_difference(model[labels], model[~labels], base[labels], base[~labels], 200, seed=13, block=100_000)
    assert fast["difference"] == pytest.approx(full["difference"], abs=1e-9)
    assert intervals_agree(fast, full, 0.10), (fast, full)

def test_unpaired_rankers_are_refused():
    model, base, labels = synthetic(3, 1000, 50)
    m = counts_for(model, labels)
    b = counts_for(base[:-1], labels[:-1])
    with pytest.raises(ValueError):
        paired_positive_bootstrap(m, b, ["all"] * 50, 10, seed=1)

def test_intervals_of_equal_width_must_also_overlap_and_share_a_centre():
    a = {"low": 0.10, "high": 0.20}
    assert intervals_agree(a, {"low": 0.105, "high": 0.205})
    assert not intervals_agree(a, {"low": 0.30, "high": 0.40})
    assert not intervals_agree(a, {"low": 0.15, "high": 0.25})
    assert not intervals_agree(a, {"low": 0.10, "high": 0.30})
