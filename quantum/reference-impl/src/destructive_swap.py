"""The DESTRUCTIVE SWAP TEST: |<u|v>|^2 with no ancilla and no controlled-SWAP.

WHY A LOW-DEPTH VARIANT
-----------------------
The standard swap test (swap_test.py) needs an ancilla and n controlled-SWAP
(Fredkin) gates. A Fredkin gate is a 3-qubit operation; each one decomposes into
several two-qubit gates on real hardware (typically ~7-8 CNOTs per Fredkin on a
device with limited connectivity, plus the ancilla has to couple to every data
qubit). Two-qubit gates are the dominant error and cost driver, so the standard
swap test washes out quickly as n grows.

The DESTRUCTIVE swap test (Cincio, Subasi, Sornborger & Coles 2018, "Learning the
quantum algorithm for state overlap") computes the SAME quantity |<u|v>|^2 with:
  - NO ancilla qubit,
  - NO controlled-SWAP; instead a single TRANSVERSAL layer of one CNOT + one
    Hadamard per data-qubit pair (a Bell-basis measurement),
  - a purely classical parity post-processing of the measured bits.

For n data qubits per register it uses exactly n two-qubit gates (one CNOT per
pair) versus n Fredkin gates (each many CNOTs) for the standard test -- the depth
and 2-qubit-gate reduction is what makes it the better first-hardware circuit.

THE MATH
--------
Load |psi_u> on register A (qubits a_0..a_{n-1}) and |psi_v> on register B
(qubits b_0..b_{n-1}). For each pair (a_i, b_i) apply

    CNOT(a_i -> b_i),   then   H(a_i),

and measure both qubits, getting classical bits (x_i, y_i). Cincio et al. show
that the single-shot quantity

    P_shot = product_i (-1)^{ x_i AND y_i }

has expectation value

    E[P_shot] = |<psi_u | psi_v>|^2 = Tr(rho_u rho_v).

So we average P_shot over shots to estimate the squared overlap. Like the
standard swap test this returns a MAGNITUDE (no sign); for signed cosine use the
Hadamard test. The estimate is clamped to [0, 1] because shot/hardware noise can
push the raw average slightly outside the physical range.
"""
from __future__ import annotations
import numpy as np
from .encode import state_prep_circuit, num_qubits


def destructive_swap_circuit(u: np.ndarray, v: np.ndarray):
    """Bell-basis destructive swap test for vectors u, v.

    Layout: qubits 0..n-1 = register A (|psi_u>); qubits n..2n-1 = register B
    (|psi_v>). Classical bits 0..n-1 record the A qubits, n..2n-1 the B qubits.
    No ancilla.
    """
    from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister
    n = max(num_qubits(u), num_qubits(v))
    ra = QuantumRegister(n, "a")
    rb = QuantumRegister(n, "b")
    ca = ClassicalRegister(n, "ca")
    cb = ClassicalRegister(n, "cb")
    qc = QuantumCircuit(ra, rb, ca, cb)

    # load the two states
    qc.append(state_prep_circuit(u).to_gate(label="prep_u"), ra[:])
    qc.append(state_prep_circuit(v).to_gate(label="prep_v"), rb[:])
    qc.barrier()

    # transversal Bell-basis measurement: one CNOT + one H per qubit pair
    for i in range(n):
        qc.cx(ra[i], rb[i])
        qc.h(ra[i])
    qc.barrier()

    # measure A -> ca, B -> cb
    qc.measure(ra[:], ca[:])
    qc.measure(rb[:], cb[:])
    return qc


def overlap_sq_from_counts(counts: dict, shots: int, n: int) -> float:
    """|<u|v>|^2 = mean over shots of  prod_i (-1)^{x_i AND y_i}.

    Qiskit joins multiple classical registers with a space in the outcome key,
    MOST-significant register first. We declared ca (A bits) then cb (B bits),
    so a key reads "cb_bits ca_bits". Within each register bit 0 is the rightmost
    character. We pair a-bit i with b-bit i and accumulate the parity sign.
    """
    total = 0.0
    for key, c in counts.items():
        parts = key.split()
        # parts[-1] = ca (A register), parts[0] = cb (B register), MSB-first join
        a_bits = parts[-1].zfill(n)
        b_bits = parts[0].zfill(n)
        sign = 1
        for i in range(n):
            xi = int(a_bits[n - 1 - i])     # A bit i (bit 0 = rightmost)
            yi = int(b_bits[n - 1 - i])     # B bit i
            if xi & yi:
                sign = -sign
        total += sign * c
    val = total / shots
    return float(min(1.0, max(0.0, val)))


def cosine_from_overlap_sq(overlap_sq: float) -> float:
    """|<u|v>| = sqrt(overlap_sq). Magnitude only (sign via Hadamard test)."""
    return float(np.sqrt(max(0.0, overlap_sq)))
