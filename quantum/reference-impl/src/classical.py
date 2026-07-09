"""Classical baselines: cosine similarity + kernel (Gram) matrix.

These are the ground truth the quantum estimators are benchmarked against.
For unit vectors, cosine_similarity(u, v) == <u, v> (the inner product), which is
exactly what the swap test (|<u|v>|^2) and Hadamard test (<u|v>) estimate on a
quantum device.
"""
from __future__ import annotations
import numpy as np


def normalize(x: np.ndarray) -> np.ndarray:
    """L2-normalize a vector (or each row of a matrix)."""
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
    """<u, v> for already-normalized vectors == cosine similarity."""
    return float(np.dot(normalize(u), normalize(v)))


def kernel_matrix(X: np.ndarray) -> np.ndarray:
    """Classical Gram matrix of pairwise cosine similarities (rows of X)."""
    Xn = normalize(np.asarray(X, dtype=float))
    return Xn @ Xn.T
