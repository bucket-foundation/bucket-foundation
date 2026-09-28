from __future__ import annotations

import numpy as np

METHODS = ("linear", "pchip")


def lerp(a: np.ndarray, b: np.ndarray, s: float) -> np.ndarray:
    return (1.0 - s) * a + s * b


def _pchip_slopes(t: np.ndarray, y: np.ndarray) -> np.ndarray:
    h = np.diff(t)
    d = np.diff(y) / h
    m = np.zeros_like(y)
    if len(y) == 2:
        m[:] = d[0]
        return m
    for i in range(1, len(y) - 1):
        if d[i - 1] * d[i] > 0:
            w1 = 2 * h[i] + h[i - 1]
            w2 = h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    m[0] = d[0]
    m[-1] = d[-1]
    return m


def _pchip(t: np.ndarray, y: np.ndarray, grid: np.ndarray) -> np.ndarray:
    m = _pchip_slopes(t, y)
    idx = np.clip(np.searchsorted(t, grid, side="right") - 1, 0, len(t) - 2)
    h = t[idx + 1] - t[idx]
    s = (grid - t[idx]) / h
    h00 = 2 * s**3 - 3 * s**2 + 1
    h10 = s**3 - 2 * s**2 + s
    h01 = -2 * s**3 + 3 * s**2
    h11 = s**3 - s**2
    return h00 * y[idx] + h10 * h * m[idx] + h01 * y[idx + 1] + h11 * h * m[idx + 1]


def to_simplex(W: np.ndarray) -> np.ndarray:
    W = np.clip(W, 0.0, None)
    total = W.sum(axis=1, keepdims=True)
    return np.divide(W, total, out=np.full_like(W, 1.0 / W.shape[1]), where=total > 0)


def sample(t: np.ndarray, W: np.ndarray, grid: np.ndarray, method: str = "linear") -> np.ndarray:
    if method not in METHODS:
        raise ValueError(f"method must be one of {METHODS}")
    grid = np.clip(grid, t[0], t[-1])
    if method == "linear":
        out = np.column_stack([np.interp(grid, t, W[:, k]) for k in range(W.shape[1])])
        return out
    return to_simplex(np.column_stack([_pchip(t, W[:, k], grid) for k in range(W.shape[1])]))


def loo_error(t: np.ndarray, W: np.ndarray, method: str = "linear") -> dict | None:
    n = len(t)
    if n < 3:
        return None
    errs = []
    for i in range(1, n - 1):
        keep = np.arange(n) != i
        guess = sample(t[keep], W[keep], np.array([t[i]]), method)[0]
        errs.append(np.abs(guess - W[i]))
    E = np.array(errs)
    l1 = E.sum(axis=1)
    return {
        "method": "leave-one-out on interior slices, L1 distance on shares",
        "points": int(len(l1)),
        "max_l1": float(l1.max()),
        "mean_l1": float(l1.mean()),
        "per_prime_max": [float(x) for x in E.max(axis=0)],
    }
