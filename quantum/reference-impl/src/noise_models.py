"""Realistic Aer noise models for the mitigation studies.

WHY THIS FILE EXISTS
--------------------
The original `aer_noisy` backend (experiment.py) models only GATE error: a
depolarizing channel on 1- and 2-qubit gates. That is enough to show cosine
estimates degrade with circuit depth, but it leaves out the single largest
per-shot error source on today's superconducting devices -- READOUT error, the
probability that a qubit prepared in |0> is reported as 1 (and vice versa).

Readout error matters here specifically because BOTH estimators
(swap test, Hadamard test) read a single ancilla and convert its P(0) directly
into the answer: cos = 2 P(0) - 1. A readout bias on that one qubit maps
one-to-one onto a bias in the reported cosine. It is also the error source that
readout-calibration mitigation is designed to remove -- so without it in the
model, the calibration step in mitigation.py would have nothing to correct.

WHAT THIS BUILDER ADDS
----------------------
1. GATE depolarizing error, identical rates to experiment.py's aer_noisy
   (1q: p1 on u/h/x/sdg/rz/sx; 2q: p2 on cx/cz/ecr). cswap and controlled-U
   decompose to these during transpile, so the 2q rate covers them.
2. READOUT error: an asymmetric per-qubit confusion channel with
       p(read 1 | prepared 0) = p01,
       p(read 0 | prepared 1) = p10,   with p10 > p01,
   which is the empirically typical asymmetry (relaxation during readout makes
   1->0 more likely than 0->1). Applied to every measured qubit.

Every rate is an independent knob so the error-budget study can turn gate noise
and readout noise on and off separately, and the ZNE study can scale gate noise
without touching readout.

HONESTY NOTE
------------
These are MODELED channels with plausible-but-illustrative rates, not a fit to a
specific device's calibration data. They exist to exercise and quantify the
mitigation primitives on the simulator before any hardware run. Real-device
error is richer (coherent errors, crosstalk, drift, non-Markovian effects); the
depolarizing + readout model captures the two dominant incoherent contributions
and nothing more. No number produced under this model is a hardware claim.
"""
from __future__ import annotations

# Default rates. p2 (2-qubit depolarizing) is the dominant gate-error driver and
# matches experiment.py's aer_noisy; p1 is p2/10. Readout rates are typical
# superconducting-device magnitudes with 1->0 > 0->1 asymmetry.
DEFAULT_P1 = 0.002       # 1-qubit gate depolarizing rate
DEFAULT_P2 = 0.02        # 2-qubit gate depolarizing rate
DEFAULT_P01 = 0.02       # P(measure 1 | prepared 0)
DEFAULT_P10 = 0.04       # P(measure 0 | prepared 1)  (asymmetric: relaxation)

_ONE_Q_GATES = ["u", "h", "x", "sdg", "rz", "sx"]
_TWO_Q_GATES = ["cx", "cz", "ecr"]


def build_noise_model(p1=DEFAULT_P1, p2=DEFAULT_P2,
                      p01=DEFAULT_P01, p10=DEFAULT_P10,
                      gate_noise=True, readout_noise=True):
    """Return an Aer NoiseModel with optional gate depolarizing + readout error.

    Parameters
    ----------
    p1, p2 : 1- and 2-qubit depolarizing rates (used iff gate_noise).
    p01    : P(measure 1 | prepared 0)  (used iff readout_noise).
    p10    : P(measure 0 | prepared 1)  (used iff readout_noise).
    gate_noise, readout_noise : master switches for each error family, so the
        error-budget study can isolate one lever at a time.

    Returns None when both families are off (i.e. the noiseless model), so the
    caller can pass the result straight to AerSimulator(noise_model=...).
    """
    if not gate_noise and not readout_noise:
        return None

    from qiskit_aer.noise import (NoiseModel, depolarizing_error,
                                   ReadoutError)

    nm = NoiseModel()

    if gate_noise:
        nm.add_all_qubit_quantum_error(depolarizing_error(p1, 1), _ONE_Q_GATES)
        nm.add_all_qubit_quantum_error(depolarizing_error(p2, 2), _TWO_Q_GATES)

    if readout_noise:
        # Row r = true prepared value, column c = reported value.
        # [[P(0|0), P(1|0)],
        #  [P(0|1), P(1|1)]]
        ro = ReadoutError([[1.0 - p01, p01],
                           [p10, 1.0 - p10]])
        nm.add_all_qubit_readout_error(ro)

    return nm


def scaled_gate_noise_model(scale, p1=DEFAULT_P1, p2=DEFAULT_P2,
                            p01=DEFAULT_P01, p10=DEFAULT_P10,
                            readout_noise=True):
    """Noise model with GATE rates multiplied by `scale`, readout untouched.

    Used by the ZNE cross-check that amplifies noise by raising the physical
    error rate (a sanity companion to circuit folding, which amplifies noise by
    lengthening the circuit at fixed rate). Rates are clamped to <= the
    depolarizing physical maximum.
    """
    p1s = min(p1 * scale, 1.0)
    p2s = min(p2 * scale, 1.0)
    return build_noise_model(p1=p1s, p2=p2s, p01=p01, p10=p10,
                             gate_noise=True, readout_noise=readout_noise)
