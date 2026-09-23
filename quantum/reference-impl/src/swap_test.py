from __future__ import annotations
import numpy as np
from .encode import state_prep_circuit, num_qubits

def swap_test_circuit(u: np.ndarray, v: np.ndarray):
    from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister
    n = max(num_qubits(u), num_qubits(v))
    anc = QuantumRegister(1, "a")
    ru = QuantumRegister(n, "u")
    rv = QuantumRegister(n, "v")
    cr = ClassicalRegister(1, "c")
    qc = QuantumCircuit(anc, ru, rv, cr)

    qc.append(state_prep_circuit(u).to_gate(label="prep_u"), ru[:])
    qc.append(state_prep_circuit(v).to_gate(label="prep_v"), rv[:])
    qc.barrier()

    qc.h(anc[0])
    for i in range(n):
        qc.cswap(anc[0], ru[i], rv[i])
    qc.h(anc[0])
    qc.barrier()

    qc.measure(anc[0], cr[0])
    return qc

def overlap_sq_from_counts(counts: dict, shots: int) -> float:
    n0 = counts.get("0", 0)
    p0 = n0 / shots
    val = 2.0 * p0 - 1.0
    return float(min(1.0, max(0.0, val)))

def cosine_from_overlap_sq(overlap_sq: float) -> float:
    return float(np.sqrt(max(0.0, overlap_sq)))
