from __future__ import annotations
import numpy as np

def pad_to_pow2(x: np.ndarray) -> np.ndarray:
    x = np.asarray(x, dtype=complex).ravel()
    N = len(x)
    n_qubits = max(1, int(np.ceil(np.log2(N))))
    target = 2 ** n_qubits
    if target != N:
        x = np.concatenate([x, np.zeros(target - N)])
    return x

def normalized_state(x: np.ndarray) -> np.ndarray:
    x = pad_to_pow2(x)
    norm = np.linalg.norm(x)
    if norm == 0:
        raise ValueError("cannot encode the zero vector")
    return x / norm

def num_qubits(x: np.ndarray) -> int:
    return int(np.log2(len(pad_to_pow2(x))))

def state_prep_circuit(x: np.ndarray):
    from qiskit import QuantumCircuit
    amps = normalized_state(x)
    n = int(np.log2(len(amps)))
    qc = QuantumCircuit(n, name="prep")
    qc.prepare_state(amps.tolist(), list(range(n)))
    return qc
