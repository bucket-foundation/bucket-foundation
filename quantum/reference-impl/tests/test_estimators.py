"""Correctness tests: prove the quantum estimators reproduce the classical math.

These run on the noiseless simulator with many shots, so they are tight. They are
the "does the physics actually compute cosine similarity?" proof -- the thing a
skeptical PI (or you) should check first.
"""
import numpy as np
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.encode import normalized_state, num_qubits
from src.classical import cosine_similarity, kernel_matrix
from src.experiment import get_runner, make_estimators
from src.kernel import quantum_kernel_matrix, kernel_error


def test_encoding_is_unit_and_matches():
    x = np.array([3.0, 4.0])            # ||x|| = 5
    a = normalized_state(x)
    assert abs(np.linalg.norm(a) - 1.0) < 1e-12
    assert np.allclose(a, [0.6, 0.8])
    assert num_qubits(np.zeros(1024)) == 10


def test_swap_test_matches_abs_cosine():
    # The swap test measures |<u|v>|^2 LINEARLY in the ancilla probability; the
    # sqrt that recovers |cos| amplifies shot noise near 0, so we check the
    # squared quantity (what the device actually estimates) for a tight bound,
    # and |cos| itself with a looser tolerance.
    runner = get_runner("aer")
    swap_est, _ = make_estimators(runner)
    rng = np.random.default_rng(1)
    for _ in range(6):
        u, v = rng.normal(size=4), rng.normal(size=4)
        approx = swap_est(u, v, shots=50000)          # |cos| estimate
        true = abs(cosine_similarity(u, v))
        # Assert the LINEAR measured quantity (squared overlap); the sqrt that
        # recovers |cos| is ill-conditioned near 0, so we bound |cos| only away
        # from zero where the sqrt is well-behaved.
        assert abs(approx ** 2 - true ** 2) < 0.03     # squared overlap: tight, always
        if true > 0.2:
            assert abs(approx - true) < 0.05           # |cos|: only where sqrt is stable


def test_hadamard_matches_signed_cosine():
    runner = get_runner("aer")
    _, hada_est = make_estimators(runner)
    rng = np.random.default_rng(2)
    for _ in range(6):
        u, v = rng.normal(size=4), rng.normal(size=4)
        approx = hada_est(u, v, shots=20000)
        assert abs(approx - cosine_similarity(u, v)) < 0.03


def test_hadamard_complex_re_and_im():
    """Complex vectors: Re branch recovers Re<u|v>, Im branch recovers Im<u|v>.
    This exercises the imag=True path (previously unreachable when the encoder
    cast complex input to float) and confirms both real and imaginary overlap."""
    from src.hadamard_test import hadamard_test_circuit, signed_inner_from_counts
    runner = get_runner("aer")

    def nrm(x):
        x = np.asarray(x, complex)
        return x / np.linalg.norm(x)

    rng = np.random.default_rng(5)
    for _ in range(4):
        u = rng.normal(size=4) + 1j * rng.normal(size=4)
        v = rng.normal(size=4) + 1j * rng.normal(size=4)
        ref = np.vdot(nrm(u), nrm(v))          # <u|v> = sum conj(u_i) v_i (normalized)
        re = signed_inner_from_counts(runner(hadamard_test_circuit(u, v, imag=False), 40000), 40000)
        im = signed_inner_from_counts(runner(hadamard_test_circuit(u, v, imag=True), 40000), 40000)
        assert abs(re - ref.real) < 0.03
        assert abs(im - ref.imag) < 0.03


def test_kernel_matrix_close():
    runner = get_runner("aer")
    _, hada_est = make_estimators(runner)
    rng = np.random.default_rng(3)
    X = rng.normal(size=(5, 4))
    K_q = quantum_kernel_matrix(X, hada_est, shots=20000)
    err = kernel_error(K_q, kernel_matrix(X))
    assert err["max_abs_error"] < 0.05
    assert err["diag_max_dev"] < 1e-9      # diagonal is exact by construction


if __name__ == "__main__":
    test_encoding_is_unit_and_matches()
    test_swap_test_matches_abs_cosine()
    test_hadamard_matches_signed_cosine()
    test_hadamard_complex_re_and_im()
    test_kernel_matrix_close()
    print("ALL TESTS PASSED")
