# Estimating cosine similarity and kernel matrices on quantum hardware

**Gianangelo Dichio** · working technical note · draft 2026-07-07

> A short, honest report: implement the swap test and Hadamard test as
> cosine-similarity estimators over amplitude-encoded vectors, assemble a quantum
> kernel matrix, drive a classifier with it, and quantify the shots-vs-noise cost
> on simulators and on real IBM hardware (ibm_fez), where the low-depth estimator hits the shot-noise floor.

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
  the real IBM device ibm_fez (IonQ/Braket wired but not yet run).

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

**3.5 Error mitigation.** Two standard techniques were applied to the Hadamard-test
estimator on a modeled noisy device (gate depolarizing + readout): **readout-error
calibration** (characterize the assignment matrix, invert it to correct every P(0)) and
**zero-noise extrapolation** (ZNE — amplify gate noise by unitary folding at scales
1/3/5, extrapolate to zero). The five-condition error budget (30 pairs, `dim=4`):

| condition | mean \|cos error\| |
|---|---|
| noiseless floor | 0.006 |
| raw noisy | 0.189 |
| + readout calibration | 0.172 |
| + ZNE | 0.071 |
| **+ both** | **0.044** |

Combined mitigation cuts the mean error by **77%** (0.189 → 0.044), and the 5×5 kernel
RMSE from 0.243 → 0.054. ZNE does most of the work at this depth (~27 two-qubit gates,
gate-noise-dominated); readout calibration matters more on the low-depth `dim=2` circuit.
The primitives are unit-tested (`tests/test_mitigation.py`): the assignment matrix is the
identity on a noiseless device, and unitary folding is logically inert
($U (U^\dagger U)^k = U$). Full treatment, including the low-depth *destructive* swap test,
in [`writeup/error-mitigation.md`](error-mitigation.md). Regenerate:
`python -m src.error_budget` (→ `results/error_budget.png`, `mitigation_sweep.png`, `error_budget.json`).

![Error budget: noiseless floor → raw → readout → ZNE → both, on the Hadamard test.](results/error_budget.png){width=60%}

## 4. Results (real hardware — IBM `ibm_fez`, 156-qubit Heron)
The signed-cosine estimator was run on IBM Quantum's `ibm_fez` superconducting device
using the low-depth `dim=2` encoding (1 data qubit + 1 ancilla, transpiling to ~2
two-qubit gates). A single pair (true cos = +0.500) returned **+0.486** (\|err\| 0.014).
A full signed-range sweep of 6 pairs (one batched job, 4096 shots each) recovered the
cosine across the whole $[+1, -1]$ range with **mean \|error\| = 0.009** — essentially
the shot-noise floor — and every sign correct:

| true cos | +1.000 | +0.848 | +0.438 | −0.105 | −0.616 | −0.940 |
|---|---|---|---|---|---|---|
| `ibm_fez` | +0.985 | +0.837 | +0.447 | −0.111 | −0.621 | −0.929 |
| \|err\| | 0.015 | 0.011 | 0.009 | 0.007 | 0.005 | 0.010 |

![Signed cosine measured on real IBM hardware (`ibm_fez`) vs the true value — mean error 0.009 across the full range.](results/hardware_sweep.png){width=58%}

Total QPU consumed: 12 s (of the 600 s/month Open-plan budget). The result confirms
the design thesis: keeping the circuit shallow (~2 two-qubit gates) puts a real-device
measurement at the shot-noise floor, where the deep `dim=4` circuit (~27 gates) would
be washed out. The cos = −1 point is excluded by construction (antiparallel encoded
states differ only by a global phase; see `src/angle_sweep.py`).
Regenerate: `python -m src.angle_sweep --backend ibm --check` (preflight) then `--run`.

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
