"""Quantum KERNEL (Gram) MATRIX: pairwise similarities as a matrix operation.

A kernel matrix K is the table of all pairwise similarities of a set of vectors:
K[i, j] = similarity(x_i, x_j). For cosine similarity on unit vectors this is
exactly the Gram matrix X_n X_n^T. Kernel matrices are the object machine learning
actually consumes: an SVM, kernel-ridge regression, spectral clustering, or a
nearest-neighbour search all run on K, not on the raw vectors.

This module builds K by calling the quantum estimator (swap or Hadamard test) on
every pair (i, j), i <= j, and mirroring. So the "matrix multiplication /
operations" angle of the project is literally: assemble a matrix whose every
entry is computed by a quantum subroutine, then feed that matrix to a classical
ML algorithm (see experiment.py: a quantum-kernel SVM).

We also expose the classical K for a side-by-side error map: |K_quantum - K_exact|.
The diagonal is a free sanity check -- K[i, i] must be 1 (a vector is identical to
itself), so any deviation there is pure noise and calibrates the rest.
"""
from __future__ import annotations
import numpy as np


def quantum_kernel_matrix(X, estimator, shots=4096, signed=True):
    """Build the pairwise similarity matrix using a quantum `estimator`.

    Parameters
    ----------
    X : (m, d) array of m vectors.
    estimator : callable(u, v, shots) -> float similarity. Pass one of the
        backend-bound estimators from experiment.py (simulator or hardware).
    signed : if True the estimator returns signed cosine (Hadamard test); if
        False it returns magnitude (swap test).
    """
    X = np.asarray(X, dtype=float)
    m = len(X)
    K = np.eye(m)                       # diagonal = self-similarity = 1
    for i in range(m):
        for j in range(i + 1, m):
            s = estimator(X[i], X[j], shots)
            K[i, j] = s
            K[j, i] = s
    return K


def kernel_error(K_quantum: np.ndarray, K_exact: np.ndarray) -> dict:
    """Summary of how far the quantum kernel is from the exact one."""
    diff = np.abs(K_quantum - K_exact)
    off = ~np.eye(len(diff), dtype=bool)
    return {
        "max_abs_error": float(diff.max()),
        "mean_abs_error": float(diff[off].mean()),
        "rmse": float(np.sqrt((diff[off] ** 2).mean())),
        "diag_max_dev": float(np.abs(np.diag(K_quantum) - 1.0).max()),
    }
