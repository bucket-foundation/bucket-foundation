# Quantum similarity search

**Estimate cosine similarity and kernel matrices between embedding vectors on a real quantum computer** — via the swap test and the Hadamard test over amplitude-encoded states — assemble the quantum kernel, drive an SVM with it, and quantify the whole error budget. Derived from first principles, checked against `numpy` ground truth, and **validated on real IBM hardware**.

*Python · Qiskit · IBM Quantum. No quantum-speedup claims — see [Honest limits](#honest-limits).*

---

## The result

Run the signed-cosine estimator on IBM's `ibm_fez` (156-qubit Heron), low-depth encoding (~2 two-qubit gates), 4096 shots:

![Signed cosine measured on real IBM hardware vs the true value — mean error 0.009 across the full range.](results/hardware_sweep.png)

**Mean |error| = 0.009 across the full signed cosine range (+1 to −1), every sign correct — at the shot-noise floor. Total QPU used: 12 seconds.**

| what | result |
|---|---|
| Correctness (noiseless sim) | estimators reproduce classical cosine to < 0.01 |
| Shot scaling | error falls as **1/√S** (measured, 128–16384 shots) |
| Quantum-kernel SVM (Iris) | **100%** test accuracy, matching the exact kernel (kernel RMSE 0.007) |
| Error mitigation | readout calibration + zero-noise extrapolation → **26%** error reduction |
| **Real IBM hardware (`ibm_fez`)** | **mean \|error\| 0.009** across the signed range |

---

## The idea in three lines

1. **Amplitude-encode** a normalized vector `x` into a quantum state: `|ψ_x⟩ = (1/‖x‖) Σ xᵢ|i⟩` (a 1024-dim vector fits in 10 qubits).
2. The **overlap of two such states equals the cosine similarity** of the originals: `⟨ψ_u|ψ_v⟩ = cos(u, v)`. That is the whole engine.
3. Measure that overlap two ways — the **swap test** (gives `|cos|²`) and the **Hadamard test** (gives signed `cos`) — stack the pairwise values into a **quantum kernel matrix**, and feed it to a classifier.

Overlap (inner-product / fidelity) estimation is a canonical quantum subroutine — it underlies quantum kernels and HHL-style quantum linear algebra — so this is a small, correct, hardware-validated implementation of a primitive many quantum-ML directions build on.

Full derivation from qubits → encoding → swap/Hadamard test → kernels → noise → complexity: **[`MATH.md`](MATH.md)**. Complete report with every figure and all source: **[`qc-embedding-similarity.pdf`](qc-embedding-similarity.pdf)**.

---

## Quickstart

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt

python tests/test_estimators.py     # correctness proof: quantum == classical (+ mitigation)
python -m src.experiment            # end-to-end demo on the noiseless simulator
python -m src.studies               # shot-scaling + noise-sweep figures
python -m src.qsvm                  # quantum-kernel SVM on Iris
python -m src.mitigation_study      # readout + ZNE error budget
```

**Real hardware (free IBM Open plan).** Save an IBM Cloud account once, then run the sweep:

```bash
python -c "from qiskit_ibm_runtime import QiskitRuntimeService; \
  QiskitRuntimeService.save_account(channel='ibm_cloud', token='YOUR_API_KEY', \
  instance='YOUR_INSTANCE_CRN', set_as_default=True)"

python -m src.angle_sweep --backend ibm --check   # free preflight: transpile + predict, no job
python -m src.angle_sweep --backend ibm --run     # submit the signed-range sweep (seconds of QPU)
```

Every hardware path is `--run`-gated; `--check` and the simulators submit nothing.

---

## Repo layout

```
MATH.md                       derivation from first principles (start here to understand it)
qc-embedding-similarity.pdf   the full report — overview, math, results, all source
writeup/technical-note.md     paper-style writeup with results
src/
  encode.py         amplitude encoding (classical vector → quantum state)
  swap_test.py      swap test → |cos|²
  hadamard_test.py  Hadamard test → signed cos (the hardware target)
  kernel.py         pairwise quantum kernel (Gram) matrix
  classical.py      numpy ground truth
  experiment.py     backends (aer / aer_noisy / ibm / braket) + demo
  studies.py        shot-scaling + noise-sweep
  qsvm.py           quantum-kernel SVM on Iris
  mitigation.py     readout-error calibration + zero-noise extrapolation
  angle_sweep.py    the low-depth signed-range hardware experiment
tests/test_estimators.py  quantum estimators vs classical math (+ mitigation primitives)
results/                  figures + json (shot / noise / mitigation / hardware)
```

**Read order to understand it:** `MATH.md` → `src/encode.py` → `src/swap_test.py` → `src/hadamard_test.py` → `src/kernel.py` → `src/experiment.py`. The code reads like a transcription of the equations.

---

## Honest limits

This is **not** a quantum speedup for similarity search. Exact amplitude encoding of an arbitrary vector costs up to `O(2ⁿ)` gates, while classical cosine similarity is `O(d)` — so the encoder dominates and classical wins today. The value here is a *correct, hardware-validated implementation of a canonical quantum primitive with a measured error budget*, plus the plumbing (encode → estimate overlap → assemble kernel → classify) that a quantum-feature-map kernel would reuse. Knowing what is and isn't a speedup is the point; the writeup states every assumption and where the cost lives.

---

*Author: Gianangelo Dichio. A reference implementation and PhD-application artifact in quantum machine learning — honest by construction.*
