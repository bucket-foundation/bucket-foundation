from __future__ import annotations

import numpy as np
import pytest

from helix.geometry import coords, phase
from helix.interp import lerp, loo_error, sample

def _simplex(rng, k):
    x = rng.random(k) ** 3
    return x / x.sum()

def test_lerp_stays_on_simplex_property():
    rng = np.random.default_rng(7)
    for _ in range(500):
        k = int(rng.integers(2, 12))
        a, b = _simplex(rng, k), _simplex(rng, k)
        s = rng.random()
        v = lerp(a, b, s)
        assert (v >= 0).all()
        assert abs(v.sum() - 1) < 1e-12

@pytest.mark.parametrize("method", ["linear", "pchip"])
def test_sample_stays_on_simplex(method):
    rng = np.random.default_rng(11)
    for _ in range(50):
        n, k = int(rng.integers(2, 9)), int(rng.integers(2, 8))
        t = np.cumsum(rng.random(n) + 0.1)
        W = np.array([_simplex(rng, k) for _ in range(n)])
        G = sample(t, W, np.linspace(t[0], t[-1], 97), method)
        assert (G >= -1e-15).all()
        assert np.allclose(G.sum(axis=1), 1.0, atol=1e-12)

@pytest.mark.parametrize("method", ["linear", "pchip"])
def test_sample_hits_slices(method):
    t = np.array([0.0, 1.0, 3.0])
    W = np.array([[0.2, 0.8], [0.5, 0.5], [0.9, 0.1]])
    assert np.allclose(sample(t, W, t, method), W)

def test_lerp_endpoints():
    a, b = np.array([0.3, 0.7]), np.array([0.6, 0.4])
    assert np.allclose(lerp(a, b, 0), a)
    assert np.allclose(lerp(a, b, 1), b)

def test_loo_zero_on_linear_data():
    t = np.arange(6.0)
    W = np.column_stack([0.1 + 0.1 * t, 0.9 - 0.1 * t])
    err = loo_error(t, W, "linear")
    assert err["max_l1"] == pytest.approx(0, abs=1e-12)
    assert err["points"] == 4

def test_loo_needs_three_slices():
    assert loo_error(np.array([0.0, 1.0]), np.array([[0.5, 0.5], [0.4, 0.6]])) is None

def test_phase_matches_lean_statements():
    K, omega = 5, 0.3
    assert phase(K, 2, omega, 1.5 + 0.7) == pytest.approx(phase(K, 2, omega, 1.5) + omega * 0.7)
    assert phase(K, 3, omega, 1.0) - phase(K, 2, omega, 1.0) == pytest.approx(1 / K)
    assert phase(K, 2 + K, omega, 1.0) == pytest.approx(phase(K, 2, omega, 1.0) + 1)

def test_coords_radius_is_share():
    t = np.array([0.0, 1.0])
    W = np.array([[0.25, 0.75], [0.5, 0.5]])
    P = coords(t, W, 0.5)
    assert np.allclose(np.hypot(P[..., 0], P[..., 1]), W)
    assert np.allclose(P[..., 2], t[:, None])
