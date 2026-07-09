"""Error mitigation for the overlap estimators: readout calibration + ZNE.

Two techniques, both classical post-processing / circuit-level tricks that need
no change to the physics of the swap or Hadamard test:

  1. READOUT-ERROR CALIBRATION  (this file, part A)
     Measure the device's readout confusion matrix by preparing known bit
     strings, then invert it to undo the measurement bias in the raw counts.

  2. ZERO-NOISE EXTRAPOLATION (ZNE)  (this file, part B)
     Deliberately amplify the GATE noise by folding the circuit
     (G -> G G^dag G, exact identity in the noiseless limit), measure the
     observable at several noise scale factors, and extrapolate back to the
     zero-noise limit.

Both are standard NISQ-era methods (Kandala et al. 2019 for ZNE; the calibration
-matrix approach for readout goes back to the earliest IBM devices). We
implement them by hand -- a few dozen lines each -- rather than pulling a
library, so the math is visible and the dependency stays numpy + qiskit.

=========================================================================
PART A -- READOUT-ERROR CALIBRATION
=========================================================================

THE MODEL
The device does not report the true measured bitstring t; it reports an observed
bitstring o drawn from a fixed conditional distribution P(o | t). Collect those
into a 2^k x 2^k column-stochastic matrix A (k = number of measured qubits):

    A[o, t] = P(observe o | true state was t),      sum_o A[o, t] = 1.

If p_true is the (unknown) probability vector we WANT and p_obs is what the
device gives, then

    p_obs = A p_true.

CALIBRATION
We learn A directly: for each basis state t in {0,1}^k, run a circuit that
prepares |t> and measures immediately; the normalized histogram of outcomes is
column t of A. For the swap / Hadamard tests only ONE qubit is measured (the
ancilla), so A is 2x2 and needs just two calibration circuits (|0>, |1>).

INVERSION
Given A and p_obs we recover p_true. The naive p_true = A^{-1} p_obs can produce
negative or >1 "probabilities" because of shot noise. We instead solve the
constrained least-squares problem

    min_x || A x - p_obs ||^2   s.t.   x_i >= 0,  sum_i x_i = 1,

which always returns a valid probability vector. For the common 2x2 case this is
cheap; for k>1 we use scipy's SLSQP. The corrected P(0) then feeds the SAME
2 P(0) - 1 conversion as before.
"""
from __future__ import annotations
import itertools
import numpy as np


# --------------------------------------------------------------------------
# A.1  build the calibration (confusion) matrix
# --------------------------------------------------------------------------
def calibration_matrix(runner, measured_qubits, total_qubits, shots=8192):
    """Measure the readout confusion matrix A[o, t] = P(observe o | prepared t).

    Parameters
    ----------
    runner : run(circuit, shots) -> counts, bound to the noisy backend.
    measured_qubits : list of qubit indices whose readout we calibrate (e.g.
        [0] for the single ancilla of the swap/Hadamard test).
    total_qubits : width of the register the circuit lives on (so the prep
        circuit matches the estimator circuit's layout).
    shots : shots per calibration circuit.

    Returns a (2^k, 2^k) column-stochastic numpy array, k = len(measured_qubits).
    Bitstring index convention matches _counts_to_vec below (qubit order =
    the order of `measured_qubits`, first listed = most significant bit).
    """
    from qiskit import QuantumCircuit
    k = len(measured_qubits)
    dim = 2 ** k
    A = np.zeros((dim, dim))
    for t in range(dim):
        bits = [(t >> (k - 1 - i)) & 1 for i in range(k)]   # MSB-first
        qc = QuantumCircuit(total_qubits, k)
        for i, (q, b) in enumerate(zip(measured_qubits, bits)):
            if b:
                qc.x(q)
        qc.measure(measured_qubits, list(range(k)))
        counts = runner(qc, shots)
        A[:, t] = _counts_to_vec(counts, k, shots)
    return A


def _counts_to_vec(counts, k, shots):
    """Normalized outcome-probability vector of length 2^k from a counts dict.

    Qiskit returns the classical register as a string; bit 0 of that string is
    the LAST classical bit. We measured measured_qubits -> classical 0..k-1, so
    the reported string has classical bit (k-1) first. We read it MSB-first
    (classical bit 0 = most significant) to match calibration_matrix's index t.
    """
    vec = np.zeros(2 ** k)
    for bitstr, n in counts.items():
        s = bitstr.replace(" ", "")
        s = s[-k:].zfill(k)                 # keep the k measured bits
        idx = int(s, 2)
        vec[idx] += n
    total = vec.sum()
    return vec / total if total > 0 else vec


# --------------------------------------------------------------------------
# A.2  invert: corrected probability vector from observed counts
# --------------------------------------------------------------------------
def correct_counts(A, counts, shots):
    """Return a corrected probability vector p_true solving the constrained LSQ
        min || A x - p_obs ||^2  s.t.  x >= 0, sum x = 1.
    """
    k = int(round(np.log2(A.shape[0])))
    p_obs = _counts_to_vec(counts, k, shots)
    return _constrained_inverse(A, p_obs)


def _constrained_inverse(A, p_obs):
    """Solve min ||A x - p_obs||^2 s.t. x>=0, sum x = 1. Returns x (prob vector)."""
    dim = A.shape[1]
    # analytic unconstrained solution first; if it is already a valid simplex
    # point we can skip the optimizer (the common, low-noise case).
    try:
        x0 = np.linalg.solve(A, p_obs)
    except np.linalg.LinAlgError:
        x0, *_ = np.linalg.lstsq(A, p_obs, rcond=None)
    if np.all(x0 >= -1e-9) and abs(x0.sum() - 1) < 1e-9:
        return np.clip(x0, 0, None) / np.clip(x0, 0, None).sum()

    from scipy.optimize import minimize
    cons = ({"type": "eq", "fun": lambda x: x.sum() - 1.0},)
    bounds = [(0.0, 1.0)] * dim
    guess = np.clip(x0, 0, 1)
    guess = guess / guess.sum() if guess.sum() > 0 else np.ones(dim) / dim
    res = minimize(lambda x: float(np.sum((A @ x - p_obs) ** 2)),
                   guess, method="SLSQP", bounds=bounds, constraints=cons,
                   options={"maxiter": 200, "ftol": 1e-12})
    x = np.clip(res.x, 0, None)
    return x / x.sum() if x.sum() > 0 else x


# --------------------------------------------------------------------------
# A.3  readout-mitigated single-ancilla P(0)  (swap / Hadamard test)
# --------------------------------------------------------------------------
def mitigated_p0_single_ancilla(runner, circuit, A, shots):
    """Run `circuit`, correct its ancilla readout with A, return corrected P(0).

    The swap and Hadamard tests both measure exactly one qubit (the ancilla) into
    a 1-bit classical register, so A is 2x2 and the corrected P(0) is x[0].
    """
    counts = runner(circuit, shots)
    x = correct_counts(A, counts, shots)
    return float(x[0])


# =========================================================================
# PART B -- ZERO-NOISE EXTRAPOLATION (ZNE)
# =========================================================================
#
# IDEA
# The observable we read (here P(0), or the cosine derived from it) degrades as
# gate noise grows. If we could DIAL noise up we would see a trend and could
# extrapolate back to zero. We dial it up without touching the hardware by
# UNITARY FOLDING: replace a (sub)circuit G by
#
#     G  ->  G (G^dag G)^m ,     lambda = 2m + 1  in {1, 3, 5, ...}
#
# which equals G exactly (G^dag G = I) but runs 2m extra noisy copies, so the
# accumulated gate error is ~lambda times larger. Measuring the observable
# E(lambda) at lambda = 1, 3, 5 and fitting E(lambda) -> lambda=0 estimates the
# zero-noise value E(0).
#
# We fold the WHOLE circuit up to (but not including) the final measurement --
# "global folding". A local variant that folds only the 2-qubit gates is also
# provided; it amplifies the dominant error source with less single-qubit
# overhead. Readout error is NOT amplified by folding (the single final measure
# is untouched), which is the intended separation of concerns: readout
# calibration handles readout, ZNE handles gate noise. Stacking both is the
# "+both" arm of the error budget.
#
# EXTRAPOLATION FITS
#   - linear:      E(lambda) = a + b lambda ; report a. Robust, few points.
#   - richardson:  exact polynomial through all points, evaluated at 0
#                  (equivalent to the highest-order fit the points allow).
#   - exponential: E(lambda) = E_inf + (E0 - E_inf) exp(-k lambda); the physically
#                  motivated form for depolarizing decay toward the mixed state.
# We default to linear (fewest assumptions) and report the others for comparison.

def fold_global(circuit, scale):
    """Global unitary folding to an ODD integer scale factor (1, 3, 5, ...).

    Returns a new circuit equal to the original up to the final measurements but
    with gate count ~scale x. scale=1 returns the circuit unchanged.
    """
    if scale == 1:
        return circuit.copy()
    if scale % 2 == 0 or scale < 1:
        raise ValueError("global fold scale must be a positive odd integer")
    m = (scale - 1) // 2

    from qiskit import QuantumCircuit
    # split off trailing measurements so we fold only the unitary part
    unitary = circuit.copy_empty_like()
    measures = []
    for instr in circuit.data:
        if instr.operation.name in ("measure", "barrier"):
            measures.append(instr)
        else:
            unitary.append(instr.operation, instr.qubits, instr.clbits)

    folded = circuit.copy_empty_like()
    folded.compose(unitary, inplace=True)
    inv = unitary.inverse()
    for _ in range(m):
        folded.compose(inv, inplace=True)
        folded.compose(unitary, inplace=True)
    for instr in measures:
        folded.append(instr.operation, instr.qubits, instr.clbits)
    return folded


def fold_local_2q(circuit, scale):
    """Local folding: replace each 2-qubit gate g by g (g^dag g)^m.

    Amplifies the dominant (2-qubit) gate error while leaving 1-qubit gates and
    the final measurement alone. scale must be an odd integer; scale=1 is a
    no-op copy.

    IMPORTANT: this folds gates by NAME, so the circuit must already be
    decomposed to a basis whose entangling gates are in `two_q` below (e.g.
    transpile(circuit, basis_gates=["u","cx"]) first). On a high-level circuit
    whose entanglers are still wrapped in a custom gate (like the Hadamard
    test's controlled-U), it finds nothing to fold and returns the circuit
    unchanged. The error-budget study uses GLOBAL folding, which has no such
    requirement.
    """
    if scale == 1:
        return circuit.copy()
    if scale % 2 == 0 or scale < 1:
        raise ValueError("local fold scale must be a positive odd integer")
    m = (scale - 1) // 2

    two_q = {"cx", "cz", "ecr", "cswap", "ccx"}
    folded = circuit.copy_empty_like()
    for instr in circuit.data:
        op = instr.operation
        folded.append(op, instr.qubits, instr.clbits)
        if op.name in two_q:
            for _ in range(m):
                folded.append(op.inverse(), instr.qubits, instr.clbits)
                folded.append(op, instr.qubits, instr.clbits)
    return folded


def zne_estimate(runner, circuit, observable_fn, shots=8192, scales=(1, 3, 5),
                 fold="global", fit="richardson", clamp=(-1.0, 1.0)):
    """Zero-noise-extrapolate a scalar observable of `circuit`.

    Parameters
    ----------
    runner : run(circuit, shots) -> counts, bound to the noisy backend.
    observable_fn : callable(counts, shots) -> float, the observable to
        extrapolate (e.g. lambda c, s: 2*p0(c, s)-1 for the cosine).
    shots : shots per folded circuit.
    scales : odd integer noise scale factors to sample.
    fold : "global" or "local2q".
    fit  : "linear" | "richardson" | "exponential".

    `clamp` bounds the extrapolated value to a physical range (default the
    cosine range [-1, 1]); pass clamp=None to disable. Clamping is essential:
    a degree-(k-1) polynomial through a few noisy points can extrapolate to a
    non-physical value, and an un-clamped outlier destroys a mean-error summary.

    Returns dict {scales, values, extrapolated, extrapolated_raw, fit}.
    """
    folder = fold_global if fold == "global" else fold_local_2q
    values = []
    for sc in scales:
        fc = folder(circuit, sc)
        counts = runner(fc, shots)
        values.append(observable_fn(counts, shots))
    scales = np.asarray(scales, dtype=float)
    values = np.asarray(values, dtype=float)
    ext_raw = _extrapolate(scales, values, fit)
    ext = ext_raw if clamp is None else float(np.clip(ext_raw, clamp[0], clamp[1]))
    return {"scales": scales.tolist(), "values": values.tolist(),
            "extrapolated": float(ext), "extrapolated_raw": float(ext_raw),
            "fit": fit}


def _extrapolate(scales, values, fit):
    """Extrapolate values(scales) to scale=0 with the chosen fit."""
    if fit == "linear":
        b, a = np.polyfit(scales, values, 1)   # values = b*scale + a
        return a
    if fit == "richardson":
        # exact interpolating polynomial of degree len-1, evaluated at 0
        coeffs = np.polyfit(scales, values, len(scales) - 1)
        return np.polyval(coeffs, 0.0)
    if fit == "exponential":
        # E(l) = E_inf + (E0 - E_inf) exp(-k l); depolarizing decays toward the
        # maximally mixed value E_inf. Fit with a bounded curve_fit, fall back
        # to linear if it fails to converge.
        from scipy.optimize import curve_fit
        def model(l, E_inf, amp, k):
            return E_inf + amp * np.exp(-k * l)
        try:
            import warnings
            p0 = (values[-1], values[0] - values[-1], 0.3)
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                popt, _ = curve_fit(model, scales, values, p0=p0, maxfev=10000)
            return model(0.0, *popt)
        except Exception:
            b, a = np.polyfit(scales, values, 1)
            return a
    raise ValueError(f"unknown fit {fit!r}")
