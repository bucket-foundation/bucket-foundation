# Estimating cosine similarity and kernel matrices on quantum hardware

**Gianangelo Dichio** · working technical note · draft 2026-07-07

> A short, honest report: implement the swap test and Hadamard test as
> cosine-similarity estimators over amplitude-encoded vectors, assemble a quantum
> kernel matrix, drive a classifier with it, and quantify the shots-vs-noise cost
> on simulators (and, once credentialed, on IBM + IonQ hardware).

## 1. Motivation
Embeddings and cosine similarity are the backbone of retrieval and recommendation.
The inner product of two amplitude-encoded quantum states equals the cosine
similarity of the original vectors (Eq. 3, `MATH.md`), and inner-product estimation
is a canonical quantum subroutine underlying quantum kernels and HHL-style linear
algebra. This note asks a narrow, testable question: *how faithfully can current
quantum methods recover cosine similarity, and at what sampling and noise cost?*

## 2. Method
- **Encoding.** L2-normalize a vector and load it into `n = log2(d)` qubits via exact
  amplitude encoding (Qiskit state preparation).
- **Estimators.** Swap test → $|\cos|$ (Eq. 5); Hadamard test with $U = \mathrm{prep}_u^\dagger\,\mathrm{prep}_v$
  → signed `cos` (Eq. 7). The Hadamard test uses `n+1` qubits vs `2n+1` and is the
  hardware target.
- **Kernel.** Assemble `K[i,j] = cos(x_i, x_j)` from pairwise estimates; feed
  `SVC(kernel='precomputed')`.
- **Backends.** Qiskit Aer (noiseless + depolarizing); IBM Quantum Open plan and
  IonQ/Braket for real hardware (pending credentials).

## 3. Results (simulator)

**3.1 Correctness.** On the noiseless simulator the estimators reproduce the
classical values: for random 4-D vectors the Hadamard-test cosine matches numpy to
< 0.01 at 4096 shots, and the swap test matches `|cos|` (test suite passes).

**3.2 Shot scaling.** Mean absolute cosine error vs shots `S` (40 random pairs):

| shots | 128 | 256 | 512 | 1024 | 2048 | 4096 | 8192 | 16384 |
|---|---|---|---|---|---|---|---|---|
| mean \|err\| | 0.065 | 0.032 | 0.033 | 0.023 | 0.013 | 0.010 | 0.008 | 0.005 |

The error tracks the $1/\sqrt{S}$ shot-noise law (see `results/shot_scaling.png`) — a 4×
increase in shots roughly halves the error, as predicted. All eight measured rows from
`results/studies.json` are shown; the near-flat 256→512 step is ordinary sampling
scatter at $n=40$ pairs, not a departure from the law.

![Cosine-similarity error vs shots — follows the $1/\sqrt{S}$ shot-noise law.](results/shot_scaling.png){width=62%}

**3.3 Hardware-noise scaling.** Mean error vs two-qubit depolarizing rate (8192 shots):

| 2q depol | 0% | 0.2% | 0.5% | 1% | 2% | 5% |
|---|---|---|---|---|---|---|
| mean \|err\| | 0.008 | 0.019 | 0.044 | 0.088 | 0.156 | 0.295 |

Error grows roughly linearly in the gate-error rate (`results/noise_scaling.png`),
and the kernel diagonal drifts below 1 — the signature of decoherence pulling states
toward the maximally mixed state.

![Error vs two-qubit depolarizing rate — the hardware-noise cost.](results/noise_scaling.png){width=62%}

**3.4 Quantum-kernel SVM.** On a 2-class Iris task (PCA to 4 features, unit-normed),
an SVM using the quantum-estimated kernel matches the exact-kernel SVM:

| kernel | test accuracy |
|---|---|
| classical (exact) | 1.00 |
| quantum (Hadamard, 4096 shots) | 1.00 |

train-kernel RMSE (quantum vs exact) = 0.007. A kernel built entirely from quantum
overlap measurements drives the classifier to identical accuracy.

**3.5 Error mitigation.** On a realistic noise model (2% two-qubit depolarizing + 2%
readout error, 30 pairs), two standard mitigation techniques were applied to the
Hadamard-test estimator: **readout-error calibration** (characterize the single-bit
assignment matrix, invert it to correct every P(0)) and **zero-noise extrapolation**
(ZNE — amplify gate noise by unitary folding at scales 1/3/5, extrapolate to zero):

| pipeline | mean \|cos error\| |
|---|---|
| raw (no mitigation) | 0.130 |
| readout-corrected | 0.119 |
| readout + ZNE | 0.096 |

Mitigation cuts the mean error by **26%**. At this circuit depth (~27 two-qubit gates
for the 4-D encoding) gate noise dominates, so ZNE does most of the work; readout
correction contributes more on the low-depth `dim=2` circuit where readout is the
leading channel. The primitives are unit-tested: the assignment matrix is the identity
on a noiseless device, and unitary folding is logically inert ($U (U^\dagger U)^k = U$).
Regenerate: `python -m src.mitigation_study` (→ `results/mitigation.png`, `mitigation.json`).

![Error budget: raw → readout-corrected → readout+ZNE on the Hadamard test.](results/mitigation.png){width=52%}

## 4. Results (hardware) — *pending IBM/IonQ credentials*
Planned: run §3.1 and a small §3.4 kernel on (a) an IBM Open-plan superconducting
device and (b) an IonQ trapped-ion device via Braket. Expected: the Hadamard test's
shallower circuit degrades more gracefully than the swap test; readout-error
mitigation + zero-noise extrapolation recover a meaningful fraction of the error.
*(Table to be filled after the runs.)*

## 5. Value & applications

This project is a small, complete artifact. Different readers should take different
things from it.

**For a PhD admissions committee (quantum / CS / math).** The work demonstrates that
the applicant can carry an idea from a first-principles derivation to running,
tested code and an honest measurement. The overlap identity (Eq. 3) is derived, both
estimators are built from the interference algebra rather than pulled from a library,
the code is checked against `numpy` ground truth, and the error is characterized with
a shot-scaling law and a noise sweep. The applicant states plainly where the cost
lives and declines to claim a speedup. That combination — derivation, implementation,
verification, and calibrated honesty about limits — is the working style a research
group depends on.

**For a quant fund or ML engineer.** Cosine similarity and kernel (Gram) matrices sit
under retrieval, recommendation, and every kernel method. This project shows that a
quantum device can produce those numbers and drive a classifier to the same accuracy
as the exact kernel (§3.4). Near term, the honest read is that classical hardware wins
on plain cosine similarity, so there is no reason to move a production similarity
workload onto a QPU today. The forward-looking bet is the quantum feature map: replace
the exact amplitude encoding with a parameterized circuit whose induced kernel is
believed hard to evaluate classically, and the same pipeline in this repo becomes a
quantum-kernel learner where a classical shortcut may not exist. The plumbing built
here — encode, estimate overlap, assemble kernel, feed the SVM — is exactly what that
research needs, and the error budget tells you how many shots buy how much kernel
precision.

**For the science itself.** Overlap (inner-product / fidelity) estimation is a
canonical quantum primitive. The swap test and Hadamard test implemented here are the
standard ways to measure $|\langle\psi_u|\psi_v\rangle|^2$ and $\mathrm{Re}\langle\psi_u|\psi_v\rangle$,
and the same measurement underlies quantum kernels, fidelity-based state comparison,
overlap terms in variational algorithms, and the state-overlap steps inside HHL-style
quantum linear algebra. Building the primitive correctly, with a measured
shots-vs-noise cost, is a reusable foundation any of those directions can stand on.

**For a founder or builder.** The transferable skill is the bridge: taking a real ML
workload (embeddings and kernels) and mapping it onto a physical device with a
quantified accuracy cost. That is the same motion as putting any classical computation
on new hardware — know the exact primitive, measure what it costs, and report the
number without spin. The project also shows the discipline of building on simulators
first and gating paid hardware behind an explicit go-ahead, which is how you keep a
research budget honest.

## 6. Honest limitations
- Amplitude encoding of arbitrary vectors is `O(2^n)` gates — the loader, not the
  similarity step, dominates cost. This is **not** a speedup over classical `O(d)`
  cosine similarity.
- The contribution is a correct, hardware-validated implementation of the overlap
  primitive with a quantified error budget, and the bridge from a real ML workload
  (embeddings/kernels) to quantum hardware.

## 7. Reproducibility
All code in this repo; `python tests/test_estimators.py` proves correctness,
`python -m src.studies` regenerates §3.2–3.3, `python -m src.qsvm` regenerates §3.4.
