"""End-to-end experiment: estimate cosine similarity + a kernel matrix on a
quantum backend, and benchmark against the classical ground truth.

Backends (all optional at import time so the module never hard-fails):
  - "aer"      : Qiskit Aer simulator (default; noiseless, fast).
  - "aer_noisy": Aer with a simple depolarizing noise model (mimics hardware).
  - "ibm"      : real IBM Quantum hardware (needs an IBM Quantum API token).
  - "braket"   : real IonQ/Rigetti hardware via Amazon Braket (needs AWS creds).

USAGE
-----
    python -m src.experiment                 # noiseless simulator demo
    python -m src.experiment --backend aer_noisy
    python -m src.experiment --backend ibm --shots 4096

The --backend ibm / braket paths are staged behind credentials the user supplies
(see README, "Running on real hardware"). Everything below the credential line is
provider-agnostic: the same swap-test / Hadamard-test circuits run everywhere.
"""
from __future__ import annotations
import argparse
import numpy as np

from .classical import cosine_similarity, kernel_matrix, normalize
from .swap_test import (swap_test_circuit, overlap_sq_from_counts,
                        cosine_from_overlap_sq)
from .hadamard_test import hadamard_test_circuit, signed_inner_from_counts
from .kernel import quantum_kernel_matrix, kernel_error


# --------------------------------------------------------------------------
# backend: returns a function run(circuit, shots) -> counts dict
# --------------------------------------------------------------------------
def get_runner(backend: str = "aer"):
    if backend in ("aer", "aer_noisy"):
        from qiskit_aer import AerSimulator
        from qiskit import transpile
        noise_model = None
        if backend == "aer_noisy":
            from qiskit_aer.noise import NoiseModel, depolarizing_error
            nm = NoiseModel()
            # 1q error on single-qubit gates; 2q error on cx (cswap/other multi-qubit
            # gates decompose to cx during transpile, so this covers them).
            nm.add_all_qubit_quantum_error(depolarizing_error(0.002, 1), ["u", "h", "x", "sdg", "rz", "sx"])
            nm.add_all_qubit_quantum_error(depolarizing_error(0.02, 2), ["cx", "cz", "ecr"])
            noise_model = nm
        sim = AerSimulator(noise_model=noise_model)

        def run(circuit, shots):
            tqc = transpile(circuit, sim)
            result = sim.run(tqc, shots=shots).result()
            return result.get_counts()
        return run

    if backend == "ibm":
        # Real IBM hardware. Requires: pip install qiskit-ibm-runtime and a saved
        # token (see README). We pick the least-busy real device.
        from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2
        from qiskit import transpile
        service = QiskitRuntimeService()          # reads saved account
        backend_obj = service.least_busy(operational=True, simulator=False)

        def run(circuit, shots):
            tqc = transpile(circuit, backend_obj)
            sampler = SamplerV2(mode=backend_obj)
            job = sampler.run([tqc], shots=shots)
            res = job.result()[0]
            return res.data.c.get_counts()
        return run

    if backend == "braket":
        # Real IonQ/Rigetti via Amazon Braket. Requires AWS creds + the
        # qiskit-braket-provider (see README).
        from qiskit_braket_provider import BraketProvider
        from qiskit import transpile
        provider = BraketProvider()
        backend_obj = provider.get_backend("SV1")  # swap for a QPU ARN for HW
        def run(circuit, shots):
            tqc = transpile(circuit, backend_obj)
            job = backend_obj.run(tqc, shots=shots)
            return job.result().get_counts()
        return run

    raise ValueError(f"unknown backend {backend!r}")


# --------------------------------------------------------------------------
# estimators (bound to a runner)
# --------------------------------------------------------------------------
def make_estimators(runner):
    def swap_estimator(u, v, shots=4096):
        counts = runner(swap_test_circuit(u, v), shots)
        return cosine_from_overlap_sq(overlap_sq_from_counts(counts, shots))

    def hadamard_estimator(u, v, shots=4096):
        counts = runner(hadamard_test_circuit(u, v), shots)
        return signed_inner_from_counts(counts, shots)
    return swap_estimator, hadamard_estimator


# --------------------------------------------------------------------------
# demo
# --------------------------------------------------------------------------
def demo(backend="aer", shots=4096, seed=7, n_pairs=5, do_kernel=True, dim=4):
    rng = np.random.default_rng(seed)
    runner = get_runner(backend)
    swap_est, hada_est = make_estimators(runner)

    print(f"\n=== single-pair similarity  (backend={backend}, shots={shots}, pairs={n_pairs}) ===")
    print(f"{'pair':<10}{'classical':>11}{'swap|.|':>11}{'hadamard':>11}{'|err|':>9}")
    for k in range(n_pairs):
        d = dim                                  # dim -> log2(dim) data qubits (dim=2 -> 1 qubit, the low-depth hardware circuit)
        u = rng.normal(size=d); v = rng.normal(size=d)
        c = cosine_similarity(u, v)
        s = swap_est(u, v, shots)                # magnitude (2 jobs w/ hadamard below)
        h = hada_est(u, v, shots)                # signed
        print(f"pair {k:<5}{c:>11.3f}{s:>11.3f}{h:>11.3f}{abs(h-c):>9.3f}")

    if not do_kernel:
        return None
    print("\n=== quantum kernel matrix vs exact (5 vectors, dim 4) ===")
    X = rng.normal(size=(5, 4))
    K_exact = kernel_matrix(X)
    K_q = quantum_kernel_matrix(X, hada_est, shots=shots)
    err = kernel_error(K_q, K_exact)
    np.set_printoptions(precision=2, suppress=True)
    print("exact K:\n", K_exact)
    print("quantum K:\n", K_q)
    print("error summary:", {k: round(v, 4) for k, v in err.items()})
    return err


def preflight(shots=4096):
    """QPU-FREE preflight for the IBM backend. Authenticates, selects the
    least-busy real device, transpiles our circuits to its native gate set, and
    reports cost. Submits NO job -- uses only free metadata + local compilation.
    """
    import numpy as np
    from qiskit import transpile
    from qiskit_ibm_runtime import QiskitRuntimeService
    from .swap_test import swap_test_circuit
    from .hadamard_test import hadamard_test_circuit

    print("=== IBM preflight (NO job submitted) ===")
    service = QiskitRuntimeService()                       # free: reads saved account
    print("auth: OK (account loaded)")
    backend = service.least_busy(operational=True, simulator=False)  # free: metadata
    st = backend.status()
    print(f"selected device : {backend.name}")
    print(f"  qubits        : {backend.num_qubits}")
    print(f"  pending jobs  : {getattr(st, 'pending_jobs', '?')}")
    print(f"  basis gates   : {getattr(backend, 'basis_gates', '?')}")

    rng = np.random.default_rng(0)
    u, v = rng.normal(size=4), rng.normal(size=4)          # 4-dim -> 2-qubit encodings
    for name, qc in [("hadamard_test", hadamard_test_circuit(u, v)),
                     ("swap_test", swap_test_circuit(u, v))]:
        tqc = transpile(qc, backend, optimization_level=3)  # LOCAL compile, free
        ops = tqc.count_ops()
        twoq = sum(c for g, c in ops.items() if g in ("cx", "cz", "ecr"))
        print(f"\n{name} transpiled to {backend.name}:")
        print(f"  qubits used   : {tqc.num_qubits}")
        print(f"  depth         : {tqc.depth()}")
        print(f"  2-qubit gates : {twoq}   (the main error + cost driver)")
        print(f"  total ops     : {dict(ops)}")
    print(f"\nshots per job   : {shots}")
    print("cost note: 1 job per pair. A single pair = 1 tiny job (seconds of QPU).")
    print("Nothing was submitted. To actually run: --backend ibm --run --pairs 1")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--backend", default="aer",
                    choices=["aer", "aer_noisy", "ibm", "braket"])
    ap.add_argument("--shots", type=int, default=4096)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--check", action="store_true",
                    help="IBM preflight only: auth + device + transpile, NO job")
    ap.add_argument("--run", action="store_true",
                    help="required to actually submit an IBM/braket hardware job")
    ap.add_argument("--pairs", type=int, default=5,
                    help="number of single-pair estimates in the demo (safety cap)")
    ap.add_argument("--dim", type=int, default=4,
                    help="vector dimension (must be a power of 2). dim=2 -> 1 data "
                         "qubit -> ~2 two-qubit gates, the recommended low-depth "
                         "first hardware run; dim=4 -> ~27 on a heavy-hex device")
    args = ap.parse_args()

    if args.check:
        preflight(args.shots)
    elif args.backend in ("ibm", "braket") and not args.run:
        print("Refusing to submit a hardware job without --run. "
              "Use --check for a free preflight, or add --run to execute.")
    else:
        # on real hardware, --pairs 1 does exactly one pair and skips the
        # multi-job kernel; the kernel only runs on simulators or when pairs>=5.
        hw = args.backend in ("ibm", "braket")
        demo(args.backend, args.shots, args.seed, n_pairs=args.pairs,
             do_kernel=(not hw) or args.pairs >= 5, dim=args.dim)
