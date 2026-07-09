"""Signed-cosine ANGLE SWEEP — the recommended first real-hardware experiment.

Instead of one lucky pair, sweep a single pair of 2-D vectors across a set of angles
so the run traces the estimator across the FULL signed range (cos from +1 down toward
-1). This turns one hardware session into a "measured vs. true cosine" line — the
strongest single-figure evidence that the primitive works on a device, and it exercises
the negative-cosine half that motivates using the Hadamard test at all.

WHY 2-D (dim=2, 1 data qubit)
The 4-D Hadamard-test circuit routes to ~27 two-qubit gates on a heavy-hex device;
the 2-D circuit needs a single controlled rotation -> ~2 two-qubit gates. That 13x
reduction is the difference between a washed-out and a clean first result. (See the
--dim flag rationale in experiment.py.)

TWO STRUCTURAL FACTS (found while validating this design)
1. cos = -1 is EXCLUDED, not a bug. For antiparallel vectors the encoded states differ
   only by a global phase (|psi_v> = -|psi_u>), which amplitude encoding correctly
   discards and the single-register Hadamard test cannot observe -- so cos=-1 reads back
   as +1. The sweep therefore stops at ~160 deg (cos ~ -0.94). If you ever see +1 where
   you expect -1 on hardware, this is why, not noise.
2. Neither vector is a basis state. A pure basis state encodes with zero real rotations
   -- unrepresentative of what the device runs. We offset both vectors by OFFSET rad so
   every swept circuit carries a genuine rotation.

PREDICTION BAND
Each point's predicted error is read from results/studies.json. That curve is the dim=4
UPPER BOUND (~27 gates); the actual dim=2 circuit has ~2, so studies.json OVERPREDICTS
by design. We label the band "dim=4 upper bound" rather than silently rescaling -- the
honest read for the first hardware run is: expect errors at or below the band, and the
gap is the low-depth win made visible.

SAFETY
Gated exactly like experiment.py: `--check` runs a free IBM preflight (transpile +
predict, NO job); a real submission requires `--backend ibm --run`. Simulators are the
default and submit nothing.

Run:
    python -m src.angle_sweep                      # noiseless + noisy simulator sweep + plot
    python -m src.angle_sweep --backend aer_noisy
    python -m src.angle_sweep --backend ibm --check    # free preflight, no job
    python -m src.angle_sweep --backend ibm --run      # submit the sweep (6 tiny jobs)
"""
from __future__ import annotations
import argparse
import json
import os
import numpy as np

from .classical import cosine_similarity
from .experiment import get_runner, make_estimators

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESULTS = os.path.join(ROOT, "results")

OFFSET = 0.4          # rad: keep both vectors off the basis states
MAX_DEG = 160.0       # stop short of 180 (cos=-1 is a global-phase degeneracy)


def sweep_pairs(n=6):
    """n 2-D unit-vector pairs whose true cosine walks from +1 toward ~-0.94.
    Both vectors carry the OFFSET so neither is a computational basis state."""
    thetas = np.linspace(0.0, np.deg2rad(MAX_DEG), n)
    pairs = []
    for dtheta in thetas:
        u = np.array([np.cos(OFFSET), np.sin(OFFSET)])
        v = np.array([np.cos(OFFSET + dtheta), np.sin(OFFSET + dtheta)])
        pairs.append((u, v))
    return pairs


def predicted_band(depol_2q=0.02):
    """Predicted mean |cos err| at a given 2q depolarizing rate, read from the
    noise sweep in studies.json. This is the dim=4 upper bound (conservative)."""
    try:
        with open(os.path.join(RESULTS, "studies.json")) as f:
            rows = json.load(f)["noise_scaling"]
        # nearest tabulated rate
        row = min(rows, key=lambda r: abs(r["depol_2q"] - depol_2q))
        return row["mean_abs_error"], row["depol_2q"]
    except Exception:
        return None, None


def run_sweep(backend="aer", shots=8192, n=6):
    runner = get_runner(backend)
    _, hada = make_estimators(runner)
    band, rate = predicted_band()
    print(f"\n=== signed-cosine angle sweep  (backend={backend}, shots={shots}, "
          f"pairs={n}, dim=2) ===")
    if band is not None:
        print(f"predicted |err| band (dim=4 UPPER bound @ {rate*100:.0f}% 2q noise): "
              f"<= {band:.3f}")
    print(f"{'true cos':>10}{'estimate':>11}{'|err|':>9}")
    rows = []
    for u, v in sweep_pairs(n):
        true = cosine_similarity(u, v)
        est = hada(u, v, shots)
        rows.append((true, est, abs(est - true)))
        print(f"{true:>10.3f}{est:>11.3f}{abs(est - true):>9.3f}")
    return rows, band


def make_plot(rows_noiseless, rows_noisy, band):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    t = [r[0] for r in rows_noiseless]
    fig, ax = plt.subplots(figsize=(5.6, 4.0))
    ax.plot([-1, 1], [-1, 1], "--", color="gray", label="ideal (measured = true)")
    ax.plot(t, [r[1] for r in rows_noiseless], "o-", color="#5b8cff",
            label="noiseless sim")
    if rows_noisy:
        ax.plot(t, [r[1] for r in rows_noisy], "s-", color="#c0606a",
                label="sim hardware (2% 2q)")
    if band:
        ax.fill_between([-1, 1], [-1 - band, 1 - band], [-1 + band, 1 + band],
                        color="#c0606a", alpha=0.10,
                        label=f"predicted band (dim=4 upper, +/-{band:.02f})")
    ax.set_xlabel("true cosine similarity"); ax.set_ylabel("estimated cosine")
    ax.set_title("Signed-cosine sweep on the Hadamard test (dim=2)")
    ax.legend(fontsize=8); fig.tight_layout()
    out = os.path.join(RESULTS, "angle_sweep.png")
    fig.savefig(out, dpi=140)
    print(f"wrote {out}")


def preflight(shots=8192, n=6):
    """QPU-FREE preflight: auth, pick device, transpile the 2-D sweep circuits,
    report 2-qubit-gate cost + the predicted band. Submits NO job."""
    from qiskit import transpile
    from qiskit_ibm_runtime import QiskitRuntimeService
    from .hadamard_test import hadamard_test_circuit
    print("=== IBM preflight for angle sweep (NO job submitted) ===")
    service = QiskitRuntimeService()
    backend = service.least_busy(operational=True, simulator=False)
    print(f"device: {backend.name}  ({backend.num_qubits}q, "
          f"{getattr(backend.status(), 'pending_jobs', '?')} queued)")
    twoq_total = 0
    for u, v in sweep_pairs(n):
        tqc = transpile(hadamard_test_circuit(u, v), backend, optimization_level=3)
        twoq = sum(c for g, c in tqc.count_ops().items() if g in ("cz", "cx", "ecr"))
        twoq_total += twoq
    band, rate = predicted_band()
    print(f"circuits: {n}  |  avg 2-qubit gates/circuit: {twoq_total / n:.1f}  "
          f"(vs ~27 for dim=4)")
    print(f"predicted |err| <= {band:.3f} (dim=4 upper bound @ {rate*100:.0f}% 2q)")
    print(f"shots/job {shots} x {n} jobs = seconds of QPU. Nothing submitted.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--backend", default="aer",
                    choices=["aer", "aer_noisy", "ibm", "braket"])
    ap.add_argument("--shots", type=int, default=8192)
    ap.add_argument("--pairs", type=int, default=6)
    ap.add_argument("--check", action="store_true",
                    help="IBM preflight only (transpile + predict), NO job")
    ap.add_argument("--run", action="store_true",
                    help="required to actually submit an ibm/braket job")
    ap.add_argument("--no-plot", action="store_true")
    args = ap.parse_args()

    if args.check:
        preflight(args.shots, args.pairs)
        return
    if args.backend in ("ibm", "braket") and not args.run:
        print("Refusing to submit a hardware job without --run. "
              "Use --check for a free preflight.")
        return

    rows, band = run_sweep(args.backend, args.shots, args.pairs)
    rows_noisy = None
    if args.backend == "aer":                 # add a simulated-hardware comparison line
        rows_noisy, _ = run_sweep("aer_noisy", args.shots, args.pairs)
    if not args.no_plot:
        try:
            make_plot(rows, rows_noisy, band)
        except Exception as e:
            print(f"(plot skipped: {e})")


if __name__ == "__main__":
    main()
