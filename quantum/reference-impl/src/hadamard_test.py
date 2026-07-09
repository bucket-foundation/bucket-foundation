"""The HADAMARD TEST: measure the SIGNED inner product <u|v>.

WHY WE NEED IT
--------------
The swap test only returns |<u|v>|^2 -- a magnitude. Real embeddings can be
anti-similar (cosine < 0), and the swap test would report those as if they were
positive. The Hadamard test recovers the sign.

WHAT IT COMPUTES
----------------
Prepare |psi_u> and |psi_v>. Using one ancilla and a controlled operation that
maps |psi_u> to |psi_v>, the ancilla's measurement statistics give

    P(ancilla = 0) = 1/2 + 1/2 Re(<u|v>)      ->   Re(<u|v>) = 2 P(0) - 1.

For real-valued unit vectors <u|v> is already real, so this IS the signed cosine
similarity directly:

    cosine_sim(u, v) = 2 P(0) - 1.

(A second variant with an S-gate on the ancilla yields Im(<u|v>); for real
embeddings the imaginary part is ~0 and we can skip it, but the code supports it.)

IMPLEMENTATION USED HERE
------------------------
There are several equivalent constructions. The most hardware-friendly and the
one used here is the "single-register" Hadamard test: we build a unitary
U = Prep_u^dagger . Prep_v (apply prep_v first, then prep_u.inverse()). Then

    <0...0| U |0...0> = <psi_v | psi_u> = <u|v>   (real for real vectors),

and a standard Hadamard test on U with one ancilla estimates Re(<0|U|0>). This
uses n+1 qubits total (vs 2n+1 for the swap test) -- cheaper and lower-noise on
real hardware, which matters when we run on IBM/IonQ. Derivation in MATH.md,
section 5.
"""
from __future__ import annotations
import numpy as np
from .encode import state_prep_circuit, num_qubits


def hadamard_test_circuit(u: np.ndarray, v: np.ndarray, imag: bool = False):
    """Estimate Re(<u|v>) (or Im if imag=True) via a controlled-U Hadamard test.

    U = Prep_u^dagger . Prep_v acts on n qubits; <0|U|0> = <u|v>.
    Layout: qubit 0 = ancilla, qubits 1..n = work register.
    """
    from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister
    n = max(num_qubits(u), num_qubits(v))
    anc = QuantumRegister(1, "a")
    work = QuantumRegister(n, "w")
    cr = ClassicalRegister(1, "c")
    qc = QuantumCircuit(anc, work, cr)

    prep_u = state_prep_circuit(u).to_gate(label="prep_u")
    prep_v = state_prep_circuit(v).to_gate(label="prep_v")
    # We want <0|U|0> = <u|v> = <0| prep_u^dagger prep_v |0>, so the OPERATOR must
    # be U = prep_u^dagger . prep_v. In circuit (left-to-right application) order
    # that is: apply prep_v first, then prep_u^dagger.
    U = QuantumCircuit(n, name="U")
    U.append(prep_v, range(n))
    U.append(prep_u.inverse(), range(n))
    cU = U.to_gate().control(1)      # controlled-U, ancilla is the control

    qc.h(anc[0])
    if imag:
        qc.sdg(anc[0])               # phase for the imaginary part
    qc.append(cU, [anc[0]] + work[:])
    qc.h(anc[0])
    qc.measure(anc[0], cr[0])
    return qc


def signed_inner_from_counts(counts: dict, shots: int) -> float:
    """<u|v> (real part) = 2 P(0) - 1, clamped to [-1, 1]."""
    n0 = counts.get("0", 0)
    p0 = n0 / shots
    val = 2.0 * p0 - 1.0
    return float(min(1.0, max(-1.0, val)))
