"""Cleaned-vs-raw error budget: how much does each mitigation lever buy?

Runs the Hadamard-test cosine estimator through FIVE conditions and reports the
mean |cos error| for each, so the value of readout calibration and ZNE is a
number, not a claim:

  1. noiseless floor       -- shot noise only (the best achievable at these shots)
  2. raw noisy             -- gate + readout error, no mitigation
  3. + readout calibration -- invert the measured confusion matrix
  4. + ZNE                 -- global folding + extrapolation (gate noise only)
  5. + both                -- readout calibration inside the ZNE observable

Two measurements:
  - a set of ~30 random 4-D pairs (single-pair error);
  - a 5x5 kernel matrix (RMSE vs the exact Gram matrix, the ML-relevant object).

Two figures:
  - results/error_budget.png    grouped bars, one group per condition;
  - results/mitigation_sweep.png a signed-cosine angle sweep (dim=2) showing raw
    noisy vs fully-mitigated vs ideal across the full [+1, -1] range.

Run:  python -m src.error_budget
All numbers come from the gate+readout noise model in src.noise_models with its
default (modeled, not device-fit) rates. No hardware, no speedup claims.
"""
from __future__ import annotations
import json
import os
import numpy as np

from .classical import cosine_similarity, kernel_matrix, normalize
from .experiment import make_aer_runner
from .noise_models import build_noise_model
from .mitigation import (calibration_matrix, correct_counts, zne_estimate)
from .hadamard_test import hadamard_test_circuit, signed_inner_from_counts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESULTS = os.path.join(ROOT, "results")
os.makedirs(RESULTS, exist_ok=True)

SHOTS = 20000
N_PAIRS = 30
DIM = 4
SCALES = (1, 3, 5)


def _p0(counts, shots):
    return counts.get("0", 0) / shots


def _make_estimators(run_noisy, run_clean, A):
    """Return the five per-pair cosine estimators sharing a calibration matrix A."""
    def noiseless(u, v):
        c = run_clean(hadamard_test_circuit(u, v), SHOTS)
        return 2 * _p0(c, SHOTS) - 1

    def raw(u, v):
        c = run_noisy(hadamard_test_circuit(u, v), SHOTS)
        return 2 * _p0(c, SHOTS) - 1

    def readout_cal(u, v):
        c = run_noisy(hadamard_test_circuit(u, v), SHOTS)
        x = correct_counts(A, c, SHOTS)
        return 2 * float(x[0]) - 1

    def zne_only(u, v):
        obs = lambda c, s: 2 * _p0(c, s) - 1
        return zne_estimate(run_noisy, hadamard_test_circuit(u, v), obs,
                            shots=SHOTS, scales=SCALES, fold="global",
                            fit="richardson")["extrapolated"]

    def both(u, v):
        def obs(c, s):
            x = correct_counts(A, c, s)
            return 2 * float(x[0]) - 1
        return zne_estimate(run_noisy, hadamard_test_circuit(u, v), obs,
                            shots=SHOTS, scales=SCALES, fold="global",
                            fit="richardson")["extrapolated"]

    return {"noiseless floor": noiseless, "raw noisy": raw,
            "+readout cal": readout_cal, "+ZNE": zne_only, "+both": both}


def single_pair_budget(seed=11):
    rng = np.random.default_rng(seed)
    pairs = [(rng.normal(size=DIM), rng.normal(size=DIM)) for _ in range(N_PAIRS)]
    truth = [cosine_similarity(u, v) for u, v in pairs]

    nm = build_noise_model(gate_noise=True, readout_noise=True)
    run_noisy = make_aer_runner(nm, seed=1)
    run_clean = make_aer_runner(None, seed=1)
    A = calibration_matrix(run_noisy, [0], hadamard_test_circuit(*pairs[0]).num_qubits, SHOTS)

    ests = _make_estimators(run_noisy, run_clean, A)
    out = {}
    for name, est in ests.items():
        errs = [abs(est(u, v) - t) for (u, v), t in zip(pairs, truth)]
        out[name] = {"mean_abs_error": float(np.mean(errs)),
                     "std_abs_error": float(np.std(errs))}
        print(f"  {name:<16} mean|err| = {np.mean(errs):.4f}")
    return out, A, run_noisy, run_clean


def kernel_budget(A, run_noisy, run_clean, seed=3):
    """5x5 kernel-matrix RMSE vs exact, for raw and fully-mitigated."""
    rng = np.random.default_rng(seed)
    X = rng.normal(size=(5, DIM))
    K_exact = kernel_matrix(X)
    ests = _make_estimators(run_noisy, run_clean, A)

    def build_K(est):
        m = len(X)
        K = np.eye(m)
        for i in range(m):
            for j in range(i + 1, m):
                s = est(X[i], X[j])
                K[i, j] = K[j, i] = s
        return K

    out = {}
    for name in ("raw noisy", "+both"):
        K = build_K(ests[name])
        off = ~np.eye(len(X), dtype=bool)
        rmse = float(np.sqrt(np.mean((K - K_exact)[off] ** 2)))
        out[name] = {"kernel_rmse": rmse}
        print(f"  kernel RMSE {name:<12} = {rmse:.4f}")
    return out


def mitigation_sweep(A, run_noisy, run_clean, n=7, shots=20000):
    """Signed-cosine angle sweep (dim=2): raw noisy vs +both vs ideal."""
    from .mitigation import correct_counts, zne_estimate
    OFFSET, MAX_DEG = 0.4, 160.0
    thetas = np.linspace(0.0, np.deg2rad(MAX_DEG), n)
    rows = []
    A2 = None
    for dth in thetas:
        u = np.array([np.cos(OFFSET), np.sin(OFFSET)])
        v = np.array([np.cos(OFFSET + dth), np.sin(OFFSET + dth)])
        true = cosine_similarity(u, v)
        qc = hadamard_test_circuit(u, v)
        if A2 is None:
            A2 = calibration_matrix(run_noisy, [0], qc.num_qubits, shots)
        craw = run_noisy(qc, shots)
        raw = 2 * (craw.get("0", 0) / shots) - 1
        def obs(c, s):
            x = correct_counts(A2, c, s)
            return 2 * float(x[0]) - 1
        both = zne_estimate(run_noisy, qc, obs, shots=shots, scales=SCALES,
                            fold="global", fit="richardson")["extrapolated"]
        rows.append({"true": float(true), "raw": float(raw), "both": float(both)})
    return rows


def make_plots(pair_budget, sweep_rows):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    try:
        apply_figure_style()
    except NameError:
        pass

    # --- grouped bars ---
    names = list(pair_budget.keys())
    means = [pair_budget[n]["mean_abs_error"] for n in names]
    stds = [pair_budget[n]["std_abs_error"] for n in names]
    colors = ["#7a7a7a", "#c0606a", "#e0a458", "#5b8cff", "#4a9d6a"]
    fig, ax = plt.subplots(figsize=(6.4, 4.0))
    x = np.arange(len(names))
    ax.bar(x, means, 0.62, yerr=stds, capsize=3,
           color=colors[:len(names)], error_kw={"lw": 1, "ecolor": "#444"})
    for xi, m in zip(x, means):
        ax.text(xi, m, f"{m:.3f}", ha="center", va="bottom", fontsize=7)
    ax.set_xticks(x); ax.set_xticklabels(names, rotation=15, ha="right")
    ax.set_ylabel("mean |cosine error|  (30 pairs, dim=4)")
    ax.set_title("Error budget: each mitigation lever vs the raw noisy estimate")
    ax.margins(y=0.16)
    fig.tight_layout()
    fig.savefig(os.path.join(RESULTS, "error_budget.png"), dpi=140)

    # --- angle sweep ---
    t = [r["true"] for r in sweep_rows]
    fig2, ax2 = plt.subplots(figsize=(5.6, 4.2))
    ax2.plot([-1, 1], [-1, 1], "--", color="gray", label="ideal (measured = true)")
    ax2.plot(t, [r["raw"] for r in sweep_rows], "x-", color="#c0606a", label="raw noisy")
    ax2.plot(t, [r["both"] for r in sweep_rows], "o-", color="#4a9d6a",
             label="readout cal + ZNE")
    ax2.set_xlabel("true cosine similarity"); ax2.set_ylabel("estimated cosine")
    ax2.set_title("Mitigation across the signed-cosine range (dim=2)")
    ax2.legend(fontsize=8, frameon=False, loc="upper left")
    fig2.tight_layout()
    fig2.savefig(os.path.join(RESULTS, "mitigation_sweep.png"), dpi=140)
    print(f"  wrote error_budget.png + mitigation_sweep.png")


def main():
    print("=== single-pair error budget (30 pairs, dim=4, gate+readout) ===")
    pair_budget, A, run_noisy, run_clean = single_pair_budget()
    print("=== 5x5 kernel-matrix RMSE ===")
    kbudget = kernel_budget(A, run_noisy, run_clean)
    print("=== signed-cosine angle sweep (dim=2) ===")
    sweep = mitigation_sweep(A, run_noisy, run_clean)

    # fractional reductions vs raw
    raw = pair_budget["raw noisy"]["mean_abs_error"]
    floor = pair_budget["noiseless floor"]["mean_abs_error"]
    reductions = {}
    for n in ("+readout cal", "+ZNE", "+both"):
        m = pair_budget[n]["mean_abs_error"]
        reductions[n] = {"mean_abs_error": m,
                         "frac_reduction_vs_raw": float((raw - m) / raw),
                         "frac_of_excess_removed": float((raw - m) / (raw - floor))}
    with open(os.path.join(RESULTS, "error_budget.json"), "w") as f:
        json.dump({"config": {"shots": SHOTS, "n_pairs": N_PAIRS, "dim": DIM,
                              "zne_scales": list(SCALES), "zne_fit": "richardson"},
                   "single_pair": pair_budget, "kernel": kbudget,
                   "reductions_vs_raw": reductions, "sweep": sweep}, f, indent=2)
    make_plots(pair_budget, sweep)
    print(f"wrote {RESULTS}/error_budget.json")
    return pair_budget, reductions


if __name__ == "__main__":
    main()
