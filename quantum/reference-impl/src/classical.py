from __future__ import annotations
import numpy as np

def normalize(x: np.ndarray) -> np.ndarray:
    x = np.asarray(x, dtype=float)
    if x.ndim == 1:
        n = np.linalg.norm(x)
        return x / n if n > 0 else x
    n = np.linalg.norm(x, axis=1, keepdims=True)
    n[n == 0] = 1.0
    return x / n

def cosine_similarity(u: np.ndarray, v: np.ndarray) -> float:
    u = np.asarray(u, dtype=float)
    v = np.asarray(v, dtype=float)
    du = np.linalg.norm(u)
    dv = np.linalg.norm(v)
    if du == 0 or dv == 0:
        return 0.0
    return float(np.dot(u, v) / (du * dv))

def inner_product(u: np.ndarray, v: np.ndarray) -> float:
    return float(np.dot(normalize(u), normalize(v)))

def kernel_matrix(X: np.ndarray) -> np.ndarray:
    Xn = normalize(np.asarray(X, dtype=float))
    return Xn @ Xn.T
