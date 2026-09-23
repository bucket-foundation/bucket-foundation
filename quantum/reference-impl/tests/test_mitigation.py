import numpy as np
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.classical import cosine_similarity
from src.experiment import get_runner, make_aer_runner
from src.noise_models import build_noise_model
from src.mitigation import (calibration_matrix, correct_counts, _extrapolate,
                            fold_global, mitigated_p0_single_ancilla)
from src.hadamard_test import hadamard_test_circuit, signed_inner_from_counts
from src.destructive_swap import (destructive_swap_circuit,
                                  overlap_sq_from_counts as dst_osq)
from src.encode import num_qubits

def test_readout_inversion_recovers_truth():
    p01, p10 = 0.03, 0.06
    A = np.array([[1 - p01, p10],
                  [p01, 1 - p10]])
    for p0_true in (0.5, 0.75, 0.2, 0.95):
        p_true = np.array([p0_true, 1 - p0_true])
        p_obs = A @ p_true
        shots = 200000
        n0 = int(round(p_obs[0] * shots))
        counts = {"0": n0, "1": shots - n0}
        x = correct_counts(A, counts, shots)
        assert abs(x[0] - p0_true) < 0.01, (p0_true, x[0])

def test_calibration_matrix_learns_known_rates():
    p01, p10 = 0.02, 0.04
    nm = build_noise_model(gate_noise=False, readout_noise=True, p01=p01, p10=p10)
    run = make_aer_runner(nm, seed=1)
    A = calibration_matrix(run, [0], 1, shots=100000)
    assert abs(A[1, 0] - p01) < 0.01
    assert abs(A[0, 1] - p10) < 0.01
    rng = np.random.default_rng(3)
    u, v = rng.normal(size=4), rng.normal(size=4)
    qc = hadamard_test_circuit(u, v)
    A2 = calibration_matrix(run, [0], qc.num_qubits, shots=100000)
    p0 = mitigated_p0_single_ancilla(run, qc, A2, 100000)
    assert abs((2 * p0 - 1) - cosine_similarity(u, v)) < 0.02

def test_fold_lambda1_is_identity():
    runner = get_runner("aer")
    rng = np.random.default_rng(0)
    u, v = rng.normal(size=4), rng.normal(size=4)
    true = cosine_similarity(u, v)
    base = hadamard_test_circuit(u, v)
    assert fold_global(base, 1).count_ops() == base.count_ops()
    for s in (1, 3, 5):
        c = runner(fold_global(base, s), 30000)
        assert abs(signed_inner_from_counts(c, 30000) - true) < 0.03

def test_fold_amplifies_two_qubit_gates():
    from qiskit import transpile
    rng = np.random.default_rng(1)
    u, v = rng.normal(size=4), rng.normal(size=4)
    base = hadamard_test_circuit(u, v)

    def twoq(c):
        t = transpile(c, basis_gates=["u", "cx"], optimization_level=0)
        return sum(n for g, n in t.count_ops().items() if g == "cx")

    g1, g3, g5 = twoq(fold_global(base, 1)), twoq(fold_global(base, 3)), twoq(fold_global(base, 5))
    assert abs(g3 - 3 * g1) <= 2 and abs(g5 - 5 * g1) <= 2, (g1, g3, g5)

def test_extrapolation_recovers_known_value():
    E0, E_inf, k = -0.30, 0.0, 0.35
    scales = np.array([1.0, 3.0, 5.0])
    vals = E_inf + (E0 - E_inf) * np.exp(-k * scales)
    assert abs(_extrapolate(scales, vals, "exponential") - E0) < 1e-3
    lin = _extrapolate(scales, vals, "linear")
    assert lin < vals[0] and abs(lin - E0) < 0.12
    rich = _extrapolate(scales, vals, "richardson")
    assert abs(rich - E0) < 0.05

def test_destructive_swap_matches_abs_cosine():
    run = make_aer_runner(None, seed=2)
    rng = np.random.default_rng(5)
    for dim in (2, 4, 8):
        u, v = rng.normal(size=dim), rng.normal(size=dim)
        n = max(num_qubits(u), num_qubits(v))
        osq = dst_osq(run(destructive_swap_circuit(u, v), 60000), 60000, n)
        true_sq = cosine_similarity(u, v) ** 2
        assert abs(osq - true_sq) < 0.02, (dim, osq, true_sq)

if __name__ == "__main__":
    test_readout_inversion_recovers_truth()
    test_calibration_matrix_learns_known_rates()
    test_fold_lambda1_is_identity()
    test_fold_amplifies_two_qubit_gates()
    test_extrapolation_recovers_known_value()
    test_destructive_swap_matches_abs_cosine()
    print("ALL MITIGATION TESTS PASSED")
