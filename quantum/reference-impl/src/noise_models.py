from __future__ import annotations

DEFAULT_P1 = 0.002
DEFAULT_P2 = 0.02
DEFAULT_P01 = 0.02
DEFAULT_P10 = 0.04

_ONE_Q_GATES = ["u", "h", "x", "sdg", "rz", "sx"]
_TWO_Q_GATES = ["cx", "cz", "ecr"]

def build_noise_model(p1=DEFAULT_P1, p2=DEFAULT_P2,
                      p01=DEFAULT_P01, p10=DEFAULT_P10,
                      gate_noise=True, readout_noise=True):
    if not gate_noise and not readout_noise:
        return None

    from qiskit_aer.noise import (NoiseModel, depolarizing_error,
                                   ReadoutError)

    nm = NoiseModel()

    if gate_noise:
        nm.add_all_qubit_quantum_error(depolarizing_error(p1, 1), _ONE_Q_GATES)
        nm.add_all_qubit_quantum_error(depolarizing_error(p2, 2), _TWO_Q_GATES)

    if readout_noise:
        ro = ReadoutError([[1.0 - p01, p01],
                           [p10, 1.0 - p10]])
        nm.add_all_qubit_readout_error(ro)

    return nm

def scaled_gate_noise_model(scale, p1=DEFAULT_P1, p2=DEFAULT_P2,
                            p01=DEFAULT_P01, p10=DEFAULT_P10,
                            readout_noise=True):
    p1s = min(p1 * scale, 1.0)
    p2s = min(p2 * scale, 1.0)
    return build_noise_model(p1=p1s, p2=p2s, p01=p01, p10=p10,
                             gate_noise=True, readout_noise=readout_noise)
