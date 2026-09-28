from __future__ import annotations

import numpy as np
import pytest

from helix.project import inv_alr, project
from helix.schema import SeriesError

def _series(rng, n, noise=0.15):
    t = np.arange(n, dtype=float)
    X = np.column_stack([0.2 * t - 1, -0.1 * t + 0.5])
    return t, inv_alr(X + rng.normal(0, noise, X.shape)), X

def test_short_series_raises():
    with pytest.raises(SeriesError) as exc:
        project(np.arange(3.0), np.full((3, 2), 0.5), 2)
    assert exc.value.code == "E_SHORT"

def test_bands_on_simplex_and_ordered():
    rng = np.random.default_rng(3)
    t, W, _ = _series(rng, 10)
    out = project(t, W, 4)
    assert out["paths_on_simplex"]
    lo95, lo80, hi80, hi95 = (np.array(out[k]) for k in ("lo95", "lo80", "hi80", "hi95"))
    assert ((0 <= lo95) & (lo95 <= lo80) & (lo80 <= hi80) & (hi80 <= hi95) & (hi95 <= 1)).all()
    assert np.allclose(np.array(out["point"]).sum(axis=1), 1)
    assert out["t"] == [10.0, 11.0, 12.0, 13.0]

def test_seed_makes_bands_repeatable():
    rng = np.random.default_rng(5)
    t, W, _ = _series(rng, 8)
    assert project(t, W, 2, seed=9) == project(t, W, 2, seed=9)

def test_band_coverage():
    rng = np.random.default_rng(42)
    hits = 0
    trials = 200
    for i in range(trials):
        t, W, _ = _series(rng, 13)
        out = project(t[:12], W[:12], 1, seed=i, n_boot=200)
        lo, hi = out["lo95"][0][0], out["hi95"][0][0]
        hits += lo <= W[12, 0] <= hi
    assert hits / trials >= 0.90
