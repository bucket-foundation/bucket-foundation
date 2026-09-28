from __future__ import annotations

import numpy as np

from ..geometry import coords


def _r(a) -> list:
    return np.round(np.asarray(a, dtype=float), 6).tolist()


def build(
    primes, grid: np.ndarray, W: np.ndarray, omega: float, t0: float, slices_t: np.ndarray, projection: dict | None
) -> dict:
    scene = {
        "schema": "helix.scene/v1",
        "primes": list(primes),
        "omega": omega,
        "t0": t0,
        "slice_t": _r(slices_t),
        "t": _r(grid),
        "points": _r(coords(grid, W, omega, t0)),
    }
    if projection:
        tf = np.asarray(projection["t"])
        scene["projection"] = {
            "t": _r(tf),
            "points": _r(coords(tf, np.asarray(projection["point"]), omega, t0)),
            "lo95": _r(projection["lo95"]),
            "hi95": _r(projection["hi95"]),
        }
    return scene
