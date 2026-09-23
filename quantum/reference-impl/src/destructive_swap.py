from __future__ import annotations
import numpy as np
from .encode import state_prep_circuit, num_qubits

def destructive_swap_circuit(u: np.ndarray, v: np.ndarray):
    from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister
    n = max(num_qubits(u), num_qubits(v))
    ra = QuantumRegister(n, "a")
    rb = QuantumRegister(n, "b")
    ca = ClassicalRegister(n, "ca")
    cb = ClassicalRegister(n, "cb")
    qc = QuantumCircuit(ra, rb, ca, cb)

    qc.append(state_prep_circuit(u).to_gate(label="prep_u"), ra[:])
    qc.append(state_prep_circuit(v).to_gate(label="prep_v"), rb[:])
    qc.barrier()

    for i in range(n):
        qc.cx(ra[i], rb[i])
        qc.h(ra[i])
    qc.barrier()

    qc.measure(ra[:], ca[:])
    qc.measure(rb[:], cb[:])
    return qc

def overlap_sq_from_counts(counts: dict, shots: int, n: int) -> float:
    total = 0.0
    for key, c in counts.items():
        parts = key.split()
        a_bits = parts[-1].zfill(n)
        b_bits = parts[0].zfill(n)
        sign = 1
        for i in range(n):
            xi = int(a_bits[n - 1 - i])
            yi = int(b_bits[n - 1 - i])
            if xi & yi:
                sign = -sign
        total += sign * c
    val = total / shots
    return float(min(1.0, max(0.0, val)))

def cosine_from_overlap_sq(overlap_sq: float) -> float:
    return float(np.sqrt(max(0.0, overlap_sq)))
