"""Quantum-kernel SVM: use the quantum-estimated cosine-similarity kernel as the
kernel of a support-vector machine on a real dataset, and compare accuracy to the
exact classical kernel. This is the capstone that turns the primitive into a
working ML pipeline (and the piece that speaks to the quantum-ML PIs).

Pipeline:
  1. Load a small real dataset (sklearn Iris), reduce to `dim` features (PCA).
  2. Build the training kernel K_train and test kernel K_test by estimating
     cosine similarity between every pair -- once CLASSICALLY (exact) and once with
     the QUANTUM Hadamard-test estimator on the simulator.
  3. Fit sklearn SVC(kernel='precomputed') on each and compare test accuracy.

The point: a kernel assembled entirely from quantum overlap measurements still
drives a classifier to (near) the same accuracy as the exact kernel -- with a
controlled, measurable degradation from shot noise.

Run:  python -m src.qsvm
"""
from __future__ import annotations
import json
import os
import numpy as np

from .classical import normalize, kernel_matrix
from .experiment import get_runner, make_estimators

RESULTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "results")
os.makedirs(RESULTS, exist_ok=True)


def _cross_kernel(A, B, estimator, shots):
    """Similarity matrix between rows of A and rows of B via a quantum estimator."""
    K = np.zeros((len(A), len(B)))
    for i in range(len(A)):
        for j in range(len(B)):
            K[i, j] = estimator(A[i], B[j], shots)
    return K


def run(dim=4, n_per_class=20, shots=4096, seed=0):
    from sklearn.datasets import load_iris
    from sklearn.decomposition import PCA
    from sklearn.model_selection import train_test_split
    from sklearn.svm import SVC
    from sklearn.metrics import accuracy_score

    # 1) data -> dim features, two classes for a clean binary task
    X, y = load_iris(return_X_y=True)
    mask = y < 2                                     # classes 0 and 1
    X, y = X[mask], y[mask]
    X = PCA(n_components=dim, random_state=seed).fit_transform(X)
    X = normalize(X)                                # unit vectors -> cos = inner product
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.4, random_state=seed, stratify=y)

    # 2) exact (classical) kernels
    Ktr_c = kernel_matrix(Xtr)
    Kte_c = normalize(Xte) @ normalize(Xtr).T

    # 3) quantum kernels (Hadamard test on the simulator)
    _, hada = make_estimators(get_runner("aer"))
    Ktr_q = _sym_kernel(Xtr, hada, shots)
    Kte_q = _cross_kernel(Xte, Xtr, hada, shots)

    def fit_eval(Ktr, Kte):
        clf = SVC(kernel="precomputed").fit(Ktr, ytr)
        return float(accuracy_score(yte, clf.predict(Kte)))

    acc_c = fit_eval(Ktr_c, Kte_c)
    acc_q = fit_eval(Ktr_q, Kte_q)
    kernel_rmse = float(np.sqrt(np.mean((Ktr_q - Ktr_c) ** 2)))
    out = {"dim": dim, "shots": shots, "n_train": len(Xtr), "n_test": len(Xte),
           "accuracy_classical_kernel": acc_c, "accuracy_quantum_kernel": acc_q,
           "train_kernel_rmse": kernel_rmse}
    print("quantum-kernel SVM vs classical-kernel SVM:")
    print(f"  classical-kernel test accuracy: {acc_c:.3f}")
    print(f"  quantum-kernel  test accuracy:  {acc_q:.3f}")
    print(f"  train-kernel RMSE (q vs exact): {kernel_rmse:.4f}")
    with open(os.path.join(RESULTS, "qsvm.json"), "w") as f:
        json.dump(out, f, indent=2)
    print(f"wrote {RESULTS}/qsvm.json")
    return out


def _sym_kernel(X, estimator, shots):
    m = len(X)
    K = np.eye(m)
    for i in range(m):
        for j in range(i + 1, m):
            s = estimator(X[i], X[j], shots)
            K[i, j] = K[j, i] = s
    return K


if __name__ == "__main__":
    run()
