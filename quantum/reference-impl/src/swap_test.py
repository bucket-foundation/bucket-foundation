"""The SWAP TEST: measure |<u|v>|^2 between two quantum states.

WHAT IT COMPUTES
----------------
Given two n-qubit states |psi_u> and |psi_v>, the swap test outputs a single
"ancilla" qubit whose probability of measuring 0 is

    P(ancilla = 0) = 1/2 + 1/2 |<psi_u | psi_v>|^2.

Rearranging, the squared overlap (a.k.a. state fidelity) is

    |<psi_u | psi_v>|^2 = 2 P(0) - 1.

For amplitude-encoded UNIT vectors, <psi_u|psi_v> = <u,v> = cosine_sim(u,v), so

    cosine_sim(u, v) = sqrt(2 P(0) - 1)     (up to a sign; see note below).

We estimate P(0) by running the circuit many times ("shots") and counting how
often the ancilla is 0. With S shots the statistical (shot-noise) error on P(0)
scales like 1/sqrt(S) -- this is the standard quantum-measurement sampling cost,
and studying it vs S is one of the experiments.

THE CIRCUIT (three moves)
-------------------------
    1. Hadamard on the ancilla:            puts it in (|0> + |1>)/sqrt(2).
    2. Controlled-SWAP (Fredkin) gates:    conditioned on the ancilla, swap the
                                           u-register with the v-register qubit
                                           by qubit.
    3. Hadamard on the ancilla again, then measure it.

Interference between the "swapped" and "not swapped" branches makes the ancilla
land on 0 more often when the two states are more alike -- that is the entire
trick. Full derivation in MATH.md, section 4.

SIGN NOTE
---------
The swap test only sees the MAGNITUDE |<u|v>|^2, so it cannot tell +cos from
-cos. For real-valued embeddings whose similarity can be negative, use the
Hadamard test (hadamard_test.py), which recovers the signed inner product. We
report both and cross-check them.
"""
from __future__ import annotations
import numpy as np
from .encode import state_prep_circuit, num_qubits


def swap_test_circuit(u: np.ndarray, v: np.ndarray):
    """Build the swap-test circuit for vectors u, v.

    Layout: qubit 0 = ancilla; qubits 1..n = |psi_u>; qubits n+1..2n = |psi_v>.
    """
    from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister
    n = max(num_qubits(u), num_qubits(v))
    anc = QuantumRegister(1, "a")
    ru = QuantumRegister(n, "u")
    rv = QuantumRegister(n, "v")
    cr = ClassicalRegister(1, "c")
    qc = QuantumCircuit(anc, ru, rv, cr)

    # 1) load the two vectors into their registers
    qc.append(state_prep_circuit(u).to_gate(label="prep_u"), ru[:])
    qc.append(state_prep_circuit(v).to_gate(label="prep_v"), rv[:])
    qc.barrier()

    # 2) swap test
    qc.h(anc[0])
    for i in range(n):
        qc.cswap(anc[0], ru[i], rv[i])   # controlled-SWAP (Fredkin)
    qc.h(anc[0])
    qc.barrier()

    # 3) measure the ancilla
    qc.measure(anc[0], cr[0])
    return qc


def overlap_sq_from_counts(counts: dict, shots: int) -> float:
    """Convert measurement counts {'0': n0, '1': n1} -> estimated |<u|v>|^2.

    |<u|v>|^2 = 2 P(0) - 1, clamped to [0, 1] because shot noise can push the
    raw estimate slightly outside the physical range.
    """
    n0 = counts.get("0", 0)
    p0 = n0 / shots
    val = 2.0 * p0 - 1.0
    return float(min(1.0, max(0.0, val)))


def cosine_from_overlap_sq(overlap_sq: float) -> float:
    """|<u|v>| = sqrt(overlap_sq). Magnitude only (sign via Hadamard test)."""
    return float(np.sqrt(max(0.0, overlap_sq)))
