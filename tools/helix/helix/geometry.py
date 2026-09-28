from __future__ import annotations

import numpy as np

def phase(K: int, k: int | np.ndarray, omega: float, t: float | np.ndarray) -> np.ndarray:
    return np.asarray(k, dtype=float) / K + omega * np.asarray(t, dtype=float)

def coords(t: np.ndarray, W: np.ndarray, omega: float, t0: float | None = None) -> np.ndarray:
    K = W.shape[1]
    t0 = float(t[0]) if t0 is None else t0
    ph = phase(K, np.arange(K)[None, :], omega, (t - t0)[:, None])
    ang = 2 * np.pi * ph
    return np.stack([W * np.cos(ang), W * np.sin(ang), np.broadcast_to(t[:, None], W.shape)], axis=-1)
