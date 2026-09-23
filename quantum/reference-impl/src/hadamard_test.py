from __future__ import annotations
import numpy as np
from .encode import state_prep_circuit, num_qubits

def hadamard_test_circuit(u: np.ndarray, v: np.ndarray, imag: bool = False):
    from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister
    n = max(num_qubits(u), num_qubits(v))
    anc = QuantumRegister(1, "a")
    work = QuantumRegister(n, "w")
    cr = ClassicalRegister(1, "c")
    qc = QuantumCircuit(anc, work, cr)

    prep_u = state_prep_circuit(u).to_gate(label="prep_u")
    prep_v = state_prep_circuit(v).to_gate(label="prep_v")
    U = QuantumCircuit(n, name="U")
    U.append(prep_v, range(n))
    U.append(prep_u.inverse(), range(n))
    cU = U.to_gate().control(1)

    qc.h(anc[0])
    if imag:
        qc.sdg(anc[0])
    qc.append(cU, [anc[0]] + work[:])
    qc.h(anc[0])
    qc.measure(anc[0], cr[0])
    return qc

def signed_inner_from_counts(counts: dict, shots: int) -> float:
    n0 = counts.get("0", 0)
    p0 = n0 / shots
    val = 2.0 * p0 - 1.0
    return float(min(1.0, max(-1.0, val)))
