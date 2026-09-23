from __future__ import annotations
import json
import os
import numpy as np

from .classical import normalize, kernel_matrix
from .experiment import get_runner, make_estimators

RESULTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "results")
os.makedirs(RESULTS, exist_ok=True)

def _cross_kernel(A, B, estimator, shots):
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

    X, y = load_iris(return_X_y=True)
    mask = y < 2
    X, y = X[mask], y[mask]
    X = PCA(n_components=dim, random_state=seed).fit_transform(X)
    X = normalize(X)
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.4, random_state=seed, stratify=y)

    Ktr_c = kernel_matrix(Xtr)
    Kte_c = normalize(Xte) @ normalize(Xtr).T

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
