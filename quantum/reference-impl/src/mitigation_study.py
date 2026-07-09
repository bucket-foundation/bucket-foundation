"""Error-budget study: raw vs readout-corrected vs readout+ZNE on a realistic noise
model (two-qubit depolarizing + readout error). Produces the before/after numbers and
a figure for the writeup. Uses the mitigation primitives in `mitigation.py`.

Run:  python -m src.mitigation_study
"""
from __future__ import annotations
import json
import os
import numpy as np

from .classical import cosine_similarity
from .encode import num_qubits
from .hadamard_test import hadamard_test_circuit
from .mitigation import calibration_matrix, correct_counts, zne_estimate

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESULTS = os.path.join(ROOT, "results")


def noisy_runner(depol_2q=0.02, readout=0.02):
    """AerSimulator with two-qubit depolarizing + symmetric readout error —
    the two dominant channels on a superconducting device."""
    from qiskit_aer import AerSimulator
    from qiskit_aer.noise import NoiseModel, depolarizing_error, ReadoutError
    from qiskit import transpile
    nm = NoiseModel()
    nm.add_all_qubit_quantum_error(depolarizing_error(depol_2q / 10, 1),
                                   ["u", "h", "x", "sdg", "rz", "sx"])
    nm.add_all_qubit_quantum_error(depolarizing_error(depol_2q, 2), ["cx", "cz", "ecr"])
    nm.add_all_qubit_readout_error(ReadoutError([[1 - readout, readout],
                                                 [readout, 1 - readout]]))
    sim = AerSimulator(noise_model=nm)

    def run(circuit, shots):
        tqc = transpile(circuit, sim)
        return sim.run(tqc, shots=shots).result().get_counts()
    return run


def _p0(counts, shots):
    return counts.get("0", 0) / shots


def run_study(n_pairs=30, dim=4, shots=8192, scales=(1, 3, 5), seed=17):
    runner = noisy_runner()
    n = max(1, dim.bit_length() - 1)                 # data qubits
    total_q = n + 1                                  # + ancilla (measured = qubit 0)
    A = calibration_matrix(runner, [0], total_q, shots)   # readout assignment matrix

    def cos_raw(counts, shots):                      # signed cosine, no correction
        return 2 * _p0(counts, shots) - 1

    def cos_readout(counts, shots):                  # readout-corrected signed cosine
        return 2 * correct_counts(A, counts, shots)[0] - 1

    rng = np.random.default_rng(seed)
    pairs = [(rng.normal(size=dim), rng.normal(size=dim)) for _ in range(n_pairs)]
    e_raw, e_ro, e_zne = [], [], []
    for u, v in pairs:
        true = cosine_similarity(u, v)
        circ = hadamard_test_circuit(u, v)
        raw = cos_raw(runner(circ, shots), shots)                        # no mitigation
        ro = cos_readout(runner(circ, shots), shots)                     # readout only
        zne = zne_estimate(runner, circ, cos_readout, shots, scales)["extrapolated"]
        e_raw.append(abs(np.clip(raw, -1, 1) - true))
        e_ro.append(abs(np.clip(ro, -1, 1) - true))
        e_zne.append(abs(np.clip(zne, -1, 1) - true))

    mae = {"raw": round(float(np.mean(e_raw)), 4),
           "readout_corrected": round(float(np.mean(e_ro)), 4),
           "readout_plus_zne": round(float(np.mean(e_zne)), 4)}
    out = {"n_pairs": n_pairs, "dim": dim, "shots": shots, "scales": list(scales),
           "depol_2q": 0.02, "readout": 0.02, "mean_abs_error": mae,
           "assignment_matrix": A.round(4).tolist()}
    print("=== error budget (mean |cos error|, 30 pairs, 2% 2q depol + 2% readout) ===")
    for k, v in mae.items():
        print(f"  {k:20} {v:.4f}")
    red = 100 * (1 - mae["readout_plus_zne"] / mae["raw"]) if mae["raw"] else 0
    print(f"  -> mitigation cuts mean error by {red:.0f}%")
    with open(os.path.join(RESULTS, "mitigation.json"), "w") as f:
        json.dump(out, f, indent=2)
    print(f"wrote {RESULTS}/mitigation.json")
    return out


def make_plot(out):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    mae = out["mean_abs_error"]
    labels = ["raw", "readout\ncorrected", "readout\n+ ZNE"]
    vals = [mae["raw"], mae["readout_corrected"], mae["readout_plus_zne"]]
    fig, ax = plt.subplots(figsize=(4.8, 3.6))
    bars = ax.bar(labels, vals, color=["#c0606a", "#e0b450", "#46c08a"])
    for b, v in zip(bars, vals):
        ax.text(b.get_x() + b.get_width() / 2, v + 0.002, f"{v:.3f}",
                ha="center", fontsize=9)
    ax.set_ylabel("mean |cosine error|")
    ax.set_title("Error mitigation on the Hadamard test\n(2% 2q depol + 2% readout, 30 pairs)")
    fig.tight_layout()
    out_png = os.path.join(RESULTS, "mitigation.png")
    fig.savefig(out_png, dpi=140)
    print(f"wrote {out_png}")


if __name__ == "__main__":
    out = run_study()
    try:
        make_plot(out)
    except Exception as e:
        print(f"(plot skipped: {e})")
