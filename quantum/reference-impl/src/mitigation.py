from __future__ import annotations
import itertools
import numpy as np

def calibration_matrix(runner, measured_qubits, total_qubits, shots=8192):
    from qiskit import QuantumCircuit
    k = len(measured_qubits)
    dim = 2 ** k
    A = np.zeros((dim, dim))
    for t in range(dim):
        bits = [(t >> (k - 1 - i)) & 1 for i in range(k)]
        qc = QuantumCircuit(total_qubits, k)
        for i, (q, b) in enumerate(zip(measured_qubits, bits)):
            if b:
                qc.x(q)
        qc.measure(measured_qubits, list(range(k)))
        counts = runner(qc, shots)
        A[:, t] = _counts_to_vec(counts, k, shots)
    return A

def _counts_to_vec(counts, k, shots):
    vec = np.zeros(2 ** k)
    for bitstr, n in counts.items():
        s = bitstr.replace(" ", "")
        s = s[-k:].zfill(k)
        idx = int(s, 2)
        vec[idx] += n
    total = vec.sum()
    return vec / total if total > 0 else vec

def correct_counts(A, counts, shots):
    k = int(round(np.log2(A.shape[0])))
    p_obs = _counts_to_vec(counts, k, shots)
    return _constrained_inverse(A, p_obs)

def _constrained_inverse(A, p_obs):
    dim = A.shape[1]
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

def mitigated_p0_single_ancilla(runner, circuit, A, shots):
    counts = runner(circuit, shots)
    x = correct_counts(A, counts, shots)
    return float(x[0])

def fold_global(circuit, scale):
    if scale == 1:
        return circuit.copy()
    if scale % 2 == 0 or scale < 1:
        raise ValueError("global fold scale must be a positive odd integer")
    m = (scale - 1) // 2

    from qiskit import QuantumCircuit
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
    if fit == "linear":
        b, a = np.polyfit(scales, values, 1)
        return a
    if fit == "richardson":
        coeffs = np.polyfit(scales, values, len(scales) - 1)
        return np.polyval(coeffs, 0.0)
    if fit == "exponential":
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
