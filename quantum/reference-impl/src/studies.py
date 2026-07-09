"""Quantitative studies: how the quantum cosine-similarity estimate degrades with
(1) shot count and (2) hardware noise. These produce the plots + JSON that make
the "results" section of the writeup.

Run:  python -m src.studies            # writes results/*.json + results/*.png
"""
from __future__ import annotations
import json
import os
import numpy as np

from .classical import cosine_similarity
from .experiment import get_runner, make_estimators

RESULTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "results")
os.makedirs(RESULTS, exist_ok=True)


def shot_scaling(shots_grid=(128, 256, 512, 1024, 2048, 4096, 8192, 16384),
                 n_pairs=40, dim=4, seed=11):
    """Mean |error| of the Hadamard-test cosine vs shots. Theory: error ~ 1/sqrt(S)."""
    rng = np.random.default_rng(seed)
    _, hada = make_estimators(get_runner("aer"))
    pairs = [(rng.normal(size=dim), rng.normal(size=dim)) for _ in range(n_pairs)]
    truth = [cosine_similarity(u, v) for u, v in pairs]
    out = []
    for S in shots_grid:
        errs = [abs(hada(u, v, S) - t) for (u, v), t in zip(pairs, truth)]
        out.append({"shots": int(S), "mean_abs_error": float(np.mean(errs)),
                    "std_abs_error": float(np.std(errs))})
        print(f"  shots={S:>6}  mean|err|={np.mean(errs):.4f}")
    return out


def noise_scaling(noise_grid=(0.0, 0.002, 0.005, 0.01, 0.02, 0.05),
                  n_pairs=40, dim=4, shots=8192, seed=13):
    """Mean |error| vs two-qubit depolarizing rate (fixed shots)."""
    from qiskit_aer import AerSimulator
    from qiskit_aer.noise import NoiseModel, depolarizing_error
    from qiskit import transpile
    from .hadamard_test import hadamard_test_circuit, signed_inner_from_counts

    rng = np.random.default_rng(seed)
    pairs = [(rng.normal(size=dim), rng.normal(size=dim)) for _ in range(n_pairs)]
    truth = [cosine_similarity(u, v) for u, v in pairs]
    out = []
    for p2 in noise_grid:
        nm = NoiseModel()
        if p2 > 0:
            # 1q error on single-qubit gates; 2q error on cx only (cswap decomposes
            # to cx during transpile, so the cx error covers it).
            nm.add_all_qubit_quantum_error(depolarizing_error(p2 / 10, 1), ["u", "h", "x", "sdg", "rz", "sx"])
            nm.add_all_qubit_quantum_error(depolarizing_error(p2, 2), ["cx", "cz", "ecr"])
        sim = AerSimulator(noise_model=nm if p2 > 0 else None)
        errs = []
        for (u, v), t in zip(pairs, truth):
            qc = transpile(hadamard_test_circuit(u, v), sim)
            counts = sim.run(qc, shots=shots).result().get_counts()
            errs.append(abs(signed_inner_from_counts(counts, shots) - t))
        out.append({"depol_2q": float(p2), "mean_abs_error": float(np.mean(errs))})
        print(f"  depol_2q={p2:<6} mean|err|={np.mean(errs):.4f}")
    return out


def make_plots(shot_rows, noise_rows):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    # shot scaling (log-log, with 1/sqrt(S) reference)
    S = np.array([r["shots"] for r in shot_rows])
    e = np.array([r["mean_abs_error"] for r in shot_rows])
    fig, ax = plt.subplots(figsize=(5.2, 3.6))
    ax.loglog(S, e, "o-", label="Hadamard-test error")
    ax.loglog(S, e[0] * np.sqrt(S[0]) / np.sqrt(S), "--", color="gray",
              label=r"$\propto 1/\sqrt{S}$ (shot-noise theory)")
    ax.set_xlabel("shots S"); ax.set_ylabel("mean |cos error|")
    ax.set_title("Cosine-similarity error vs shots (noiseless)"); ax.legend()
    fig.tight_layout(); fig.savefig(os.path.join(RESULTS, "shot_scaling.png"), dpi=140)

    # noise scaling
    p = np.array([r["depol_2q"] for r in noise_rows])
    en = np.array([r["mean_abs_error"] for r in noise_rows])
    fig, ax = plt.subplots(figsize=(5.2, 3.6))
    ax.plot(p * 100, en, "s-", color="#c0606a")
    ax.set_xlabel("two-qubit depolarizing rate (%)"); ax.set_ylabel("mean |cos error|")
    ax.set_title("Cosine-similarity error vs hardware noise (8192 shots)")
    fig.tight_layout(); fig.savefig(os.path.join(RESULTS, "noise_scaling.png"), dpi=140)
    print(f"  wrote {RESULTS}/shot_scaling.png + noise_scaling.png")


def main():
    print("=== shot scaling (noiseless, error ~ 1/sqrt(S)) ===")
    shot_rows = shot_scaling()
    print("=== noise scaling (depolarizing) ===")
    noise_rows = noise_scaling()
    with open(os.path.join(RESULTS, "studies.json"), "w") as f:
        json.dump({"shot_scaling": shot_rows, "noise_scaling": noise_rows}, f, indent=2)
    try:
        make_plots(shot_rows, noise_rows)
    except Exception as e:
        print(f"  (plot step skipped: {e})")
    print(f"wrote {RESULTS}/studies.json")


if __name__ == "__main__":
    main()
