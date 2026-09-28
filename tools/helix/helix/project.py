from __future__ import annotations

import numpy as np

from .schema import SeriesError

MIN_SLICES = 4
EPS = 1e-6
METHOD = (
    "additive log-ratio transform, per-component linear trend by least squares, "
    "leverage-adjusted residual bootstrap scaled by sqrt(n/(n-2)) with refit, inverse transform to the simplex; bands are "
    "componentwise quantiles of on-simplex sample paths"
)

def alr(W: np.ndarray) -> np.ndarray:
    W = W + EPS
    return np.log(W[:, :-1] / W[:, -1:])

def inv_alr(X: np.ndarray) -> np.ndarray:
    Z = np.concatenate([np.exp(X), np.ones(X.shape[:-1] + (1,))], axis=-1)
    return Z / Z.sum(axis=-1, keepdims=True)

def _fit(t: np.ndarray, Y: np.ndarray) -> np.ndarray:
    A = np.column_stack([np.ones_like(t), t])
    coef, *_ = np.linalg.lstsq(A, Y, rcond=None)
    return coef

def project(
    t: np.ndarray, W: np.ndarray, horizon: int, step: float | None = None, seed: int = 0, n_boot: int = 400
) -> dict:
    n = len(t)
    if n < MIN_SLICES:
        raise SeriesError("E_SHORT", "$.slices", f"projection needs at least {MIN_SLICES} slices, got {n}")
    if horizon < 1:
        raise ValueError("horizon must be at least 1")
    step = float(step if step is not None else np.median(np.diff(t)))
    t0 = t[0]
    tt = t - t0
    tf = t[-1] + step * np.arange(1, horizon + 1)
    ttf = tf - t0
    Y = alr(W)
    coef = _fit(tt, Y)
    Af = np.column_stack([np.ones_like(ttf), ttf])
    A = np.column_stack([np.ones_like(tt), tt])
    lev = np.einsum("ij,ji->i", A, np.linalg.pinv(A))
    resid = (Y - A @ coef) / np.sqrt(np.clip(1 - lev, 1e-9, None))[:, None]
    resid -= resid.mean(axis=0)
    scale = np.sqrt(n / max(n - 2, 1))
    rng = np.random.default_rng(seed)
    pinv = np.linalg.pinv(A)
    Yb = A @ coef + resid[rng.integers(0, n, (n_boot, n))] * scale
    cb = pinv @ Yb
    noise = resid[rng.integers(0, n, (n_boot, horizon))] * scale
    paths = inv_alr(Af @ cb + noise)
    point = inv_alr(Af @ coef)
    q = np.quantile(paths, [0.025, 0.1, 0.9, 0.975], axis=0)
    return {
        "method": METHOD,
        "min_slices": MIN_SLICES,
        "n_boot": n_boot,
        "seed": seed,
        "step": step,
        "t": tf.tolist(),
        "point": point.tolist(),
        "lo95": q[0].tolist(),
        "lo80": q[1].tolist(),
        "hi80": q[2].tolist(),
        "hi95": q[3].tolist(),
        "paths_on_simplex": bool(np.allclose(paths.sum(axis=-1), 1.0) and (paths >= 0).all()),
    }
