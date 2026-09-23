from __future__ import annotations
import numpy as np

def quantum_kernel_matrix(X, estimator, shots=4096, signed=True):
    X = np.asarray(X, dtype=float)
    m = len(X)
    K = np.eye(m)
    for i in range(m):
        for j in range(i + 1, m):
            s = estimator(X[i], X[j], shots)
            K[i, j] = s
            K[j, i] = s
    return K

def kernel_error(K_quantum: np.ndarray, K_exact: np.ndarray) -> dict:
    diff = np.abs(K_quantum - K_exact)
    off = ~np.eye(len(diff), dtype=bool)
    return {
        "max_abs_error": float(diff.max()),
        "mean_abs_error": float(diff[off].mean()),
        "rmse": float(np.sqrt((diff[off] ** 2).mean())),
        "diag_max_dev": float(np.abs(np.diag(K_quantum) - 1.0).max()),
    }
