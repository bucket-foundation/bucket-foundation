"""Amplitude encoding: put a classical vector INTO a quantum state.

THE IDEA
--------
A quantum register of n qubits has 2^n "computational basis states"
|0...0>, |0...01>, ..., |1...1>. A general n-qubit state is a unit-length
complex vector of length 2^n:

    |psi> = sum_{i=0}^{2^n - 1}  a_i |i>,     with   sum_i |a_i|^2 = 1.

"Amplitude encoding" stores a classical vector x = (x_0, ..., x_{N-1}) in those
amplitudes a_i. Because a quantum state must be unit length, we first L2-normalize
x, so a_i = x_i / ||x||. Then:

    |psi_x> = (1/||x||) sum_i x_i |i>.

Two consequences that make this the natural tool for similarity search:

  1. DENSITY. N = 2^n numbers fit in n qubits. A 1024-dim embedding needs only
     10 qubits. (This is the famous "exponential compression" of state space.)

  2. INNER PRODUCTS ARE PHYSICAL. For two normalized vectors u, v the quantum
     overlap <psi_u | psi_v> equals the classical inner product <u, v>, which for
     unit vectors IS the cosine similarity. So "how similar are these embeddings?"
     becomes "how much do these two quantum states overlap?" -- a quantity the
     swap test and Hadamard test measure directly. See MATH.md, sections 2-5.

WHAT THIS FILE DOES
-------------------
Given a classical vector, it (a) pads it to a power-of-two length, (b) normalizes
it, and (c) returns a Qiskit circuit that prepares |psi_x> from |0...0>, using
Qiskit's StatePrepare (an exact amplitude-encoding compiler). We also expose the
raw statevector so tests can check the encoding is correct before any quantum
subroutine runs.

CAVEAT (honest): exact amplitude encoding of an arbitrary vector costs O(2^n)
gates in the worst case -- the encoding itself is not cheap. For a resume/PhD
project that's fine (we study the SIMILARITY primitive, not data loading), and we
say so explicitly. Efficient approximate loaders (e.g. quantum random-access
memory, or variational loaders) are a known research topic and a natural
"future work" line.
"""
from __future__ import annotations
import numpy as np


def pad_to_pow2(x: np.ndarray) -> np.ndarray:
    """Zero-pad a vector up to the next power-of-two length (needed because a
    register of n qubits has exactly 2^n amplitudes). Complex dtype so complex
    amplitudes are preserved (the Hadamard test's Im branch is then reachable);
    real vectors carry a zero imaginary part and behave identically."""
    x = np.asarray(x, dtype=complex).ravel()
    N = len(x)
    n_qubits = max(1, int(np.ceil(np.log2(N))))
    target = 2 ** n_qubits
    if target != N:
        x = np.concatenate([x, np.zeros(target - N)])
    return x


def normalized_state(x: np.ndarray) -> np.ndarray:
    """Return the unit-length amplitude vector a_i = x_i / ||x|| (padded)."""
    x = pad_to_pow2(x)
    norm = np.linalg.norm(x)
    if norm == 0:
        raise ValueError("cannot encode the zero vector")
    return x / norm


def num_qubits(x: np.ndarray) -> int:
    return int(np.log2(len(pad_to_pow2(x))))


def state_prep_circuit(x: np.ndarray):
    """Build a Qiskit circuit that prepares |psi_x> on n qubits from |0...0>.

    Imported lazily so the module (and the classical baseline + tests that only
    need normalized_state) work even before qiskit is installed.
    """
    from qiskit import QuantumCircuit
    amps = normalized_state(x)
    n = int(np.log2(len(amps)))
    qc = QuantumCircuit(n, name="prep")
    qc.prepare_state(amps.tolist(), list(range(n)))
    return qc
