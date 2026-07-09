# Appendix · Lab track

A graded, runnable lab sequence. Every lab is built on the reference implementation shipped in `reference-impl/` — a hardware-validated quantum similarity-search project (swap test, Hadamard test, quantum kernels, error mitigation, real IBM runs). The labs move from a two-line physics demonstration to the project's own error-budget pipeline.

Read `reference-impl/README.md` and `reference-impl/MATH.md` first; the code reads like a transcription of the equations. Every lab except the paper exercise runs on a **classical simulator** and submits nothing to a real device. Real-QPU runs exist only in the last lab and are gated behind an explicit `--run` flag and saved IBM credentials.

## Setup (once)

```bash
cd reference-impl
python3 -m venv .venv && . .venv/bin/activate   # skip the create step if .venv exists
pip install -r requirements.txt                  # qiskit 2.5, qiskit-aer, numpy, scikit-learn
```

Keep this virtual environment active for every lab. Labs 1–2 are short scripts you write yourself and run on the same environment; Labs 4–6 run modules that ship in `src/` and `tests/`.

---

## Lab 1 — CHSH / Bell violation (simulator only)

**Objective.** Measure the CHSH correlation of an entangled pair and confirm it exceeds the classical bound of $2$, approaching the quantum Tsirelson bound $2\sqrt{2} \approx 2.828$.

**Background.** A local hidden-variable theory obeys the CHSH inequality $|S| \le 2$, where $S$ combines four correlation measurements at two settings per party. Quantum mechanics violates it: a Bell pair measured at the right angles reaches $2\sqrt2$. This is the experiment that rules out local realism, and it is the T1 "settled physics" anchor for the whole atlas — see `01-foundations/F-bell.md` and the Tsirelson-bound objective in `01-foundations/_CHAPTER.md`.

**Run.** This script is not part of `src/` — you write it and run it on the lab venv. Save as `chsh.py` in `reference-impl/`, or paste after `python - <<'PY'`.

```python
import numpy as np
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
sim = AerSimulator()
def E(a, b, shots=20000):
    qc = QuantumCircuit(2, 2)
    qc.h(0); qc.cx(0, 1)                 # Bell pair
    qc.ry(-2*a, 0); qc.ry(-2*b, 1)       # measurement-angle rotations
    qc.measure([0, 1], [0, 1])
    c = sim.run(qc, shots=shots).result().get_counts()
    return sum((-1)**(int(k[0]) + int(k[1])) * v for k, v in c.items()) / shots
a, ap = 0, np.pi/4
b, bp = np.pi/8, 3*np.pi/8
S = E(a, b) - E(a, bp) + E(ap, b) + E(ap, bp)
print("CHSH S =", round(S, 3), " (classical <= 2, Tsirelson 2.828)")
```

**Observe.** `S` lands near `2.82`, comfortably above `2`. Each `E(a,b)` is a correlation in $[-1, +1]$.

**Questions.** (1) Set both measurement angles to the same value everywhere (a product state instead of the tuned Bell angles) and confirm `S` drops to $\le 2$. (2) The result sits just under $2.828$, not exactly at it. Which effect from the Math primer's Born-rule section accounts for the gap, and how would you shrink it?

---

## Lab 2 — Grover search on 3 qubits (simulator only)

**Objective.** Amplify a single marked 3-bit string with Grover's algorithm and read it out with high probability after the optimal number of iterations.

**Background.** Grover search finds a marked item among $N = 2^n$ in $O(\sqrt{N})$ oracle calls, a quadratic speedup over classical $O(N)$. Each iteration is an oracle that phase-flips the marked state followed by a diffusion (inversion-about-the-mean) step. For $n = 3$ the optimal count is $\lfloor \tfrac{\pi}{4}\sqrt{8}\rfloor = 2$. Background: `03-stack-algorithms/S-grover.md`.

**Run.** Also a build-it-yourself script on the lab venv (target string `101`):

```python
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
sim = AerSimulator(); n = 3; target = '101'
qc = QuantumCircuit(n, n); qc.h(range(n))
def oracle(qc):
    for i, b in enumerate(target):
        if b == '0': qc.x(i)
    qc.h(2); qc.ccx(0, 1, 2); qc.h(2)        # phase-flip |111>
    for i, b in enumerate(target):
        if b == '0': qc.x(i)
def diffuser(qc):
    qc.h(range(n)); qc.x(range(n))
    qc.h(2); qc.ccx(0, 1, 2); qc.h(2)
    qc.x(range(n)); qc.h(range(n))
for _ in range(2):                            # optimal iteration count for n=3
    oracle(qc); diffuser(qc)
qc.measure(range(n), range(n))
c = sim.run(qc, shots=4096).result().get_counts()
top = max(c, key=c.get)
print("top outcome:", top[::-1], " count", c[top], "of 4096")
```

**Observe.** The marked string `101` dominates — roughly 95% of shots (about 3900 of 4096).

**Questions.** (1) Change the loop to 1 iteration, then 3, and record the success probability each time. Why does 3 iterations do *worse* than 2? (2) Estimate how many oracle calls a classical search would need on average for $N = 8$, and compare to Grover's 2.

---

## Lab 3 — Surface-code overhead (paper exercise + one-liner)

**Objective.** Count the physical qubits a rotated surface code needs to protect one logical qubit at a target logical error rate, and feel the overhead that dominates fault-tolerance planning.

**Background.** The rotated surface code of **distance $d$** uses $d^2$ data qubits plus $d^2 - 1$ measurement (ancilla) qubits, so $2d^2 - 1$ physical qubits per logical qubit. Below the threshold $p_\text{th}$ (about $1\%$ for the surface code), the logical error rate falls roughly as $p_L \approx A\,(p/p_\text{th})^{(d+1)/2}$. Higher distance buys exponentially lower error at quadratic qubit cost. Context: `03-stack-algorithms/S-decoders.md` and the QEC sections of `03-stack-algorithms/_CHAPTER.md`. The reference impl carries no QEC calculator, so this lab is paper plus a tiny arithmetic snippet.

**Run.** Solve on paper for the distance, then check the count:

```python
import math
p, p_th, A, target = 1e-3, 1e-2, 0.1, 1e-12   # physical err, threshold, prefactor, goal
d = 1
while A * (p / p_th) ** ((d + 1) / 2) > target:
    d += 2                                      # surface-code distance is odd
phys = 2 * d**2 - 1
print(f"need distance d={d}: {phys} physical qubits per logical qubit")
```

**Observe.** With $p = 10^{-3}$ you reach $10^{-12}$ around $d = 11$–$13$, i.e. a few hundred physical qubits for one logical qubit — before any algorithm qubits.

**Questions.** (1) Recompute for a worse device, $p = 5\times10^{-3}$. How does the required distance and qubit count move? (2) A useful algorithm might need 1,000 logical qubits. Multiply through and compare your total to the physical-qubit counts quoted in Chapter 2's hardware cards.

---

## Lab 4 — Cosine similarity via the swap and Hadamard tests (simulator only)

**Objective.** Reproduce classical cosine similarity, and a full kernel (Gram) matrix, from quantum overlap measurements. This is the core of the reference project.

**Background.** Amplitude-encode a vector $x$ into $|\psi_x\rangle = \tfrac{1}{\lVert x\rVert}\sum_i x_i|i\rangle$; then the overlap of two encoded states equals the cosine similarity of the originals, $\langle\psi_u|\psi_v\rangle = \cos(u,v)$. The **swap test** estimates $|\cos|^2$; the **Hadamard test** estimates the signed $\cos$ directly. Stacking pairwise values gives a quantum kernel matrix. Full derivation: `reference-impl/MATH.md` §3–6, with code in `src/encode.py`, `src/swap_test.py`, `src/hadamard_test.py`, `src/kernel.py`.

**Run.**

```bash
python tests/test_estimators.py     # correctness proof: quantum == classical
python -m src.experiment            # single-pair + 5x5 kernel demo on the noiseless sim
python -m src.qsvm                  # quantum-kernel SVM on Iris, vs the exact kernel
```

**Observe.** `test_estimators.py` prints `ALL TESTS PASSED` (estimators match `numpy` to within shot tolerance; the kernel diagonal is exactly $1$). `src.experiment` prints the classical, swap, and Hadamard estimates side by side with a $|\text{err}|$ column near $0.01$. `src.qsvm` writes `results/qsvm.json` and reports the quantum-kernel SVM matching the classical kernel's accuracy.

**Questions.** (1) In `MATH.md` §5 the Hadamard test uses $U = \mathrm{prep}_u^\dagger\,\mathrm{prep}_v$ in that order. What does `test_hadamard_matches_signed_cosine` catch if you reverse it? (2) The swap test returns only $|\cos|$ while the Hadamard test returns the sign too. Which pairs in the demo make that difference visible?

---

## Lab 5 — Shot-noise $1/\sqrt{S}$ scaling (simulator only)

**Objective.** Show that a perfect (noiseless) device still has statistical error, and that it falls as $1/\sqrt{S}$ in the shot count $S$.

**Background.** Every quantum estimate reads probabilities off a finite number of measurement repetitions. A probability estimated from $S$ Bernoulli trials has standard error $\sim\sqrt{P(1-P)/S}$, so the cosine error scales as $1/\sqrt{S}$ — halving the error costs $4\times$ the shots. This is the noiseless floor before any hardware imperfection enters. Code: `src/studies.py` (`shot_scaling`), theory in `MATH.md` §4.

**Run.**

```bash
python -m src.studies       # writes results/studies.json + results/shot_scaling.png
```

**Observe.** The console lists `mean|err|` for shots from 128 to 16384; it roughly halves each time shots go up $4\times$. `results/shot_scaling.png` plots the measured error against the $1/\sqrt{S}$ reference line on log-log axes — the two should track closely.

**Questions.** (1) From `studies.json`, take the errors at $S = 1024$ and $S = 4096$ and check the ratio is near $2$. Does it match $1/\sqrt{S}$? (2) You need cosine accuracy $0.005$. Extrapolate the shot budget. Why can shots alone never fix *hardware* noise (see Lab 6)?

---

## Lab 6 — Readout calibration + ZNE, and the hardware gate (simulator; real QPU gated)

**Objective.** Turn on a hardware-like noise model, then recover accuracy with two error-mitigation levers — readout-error calibration and zero-noise extrapolation (ZNE) — and quantify the improvement as a number. Then see how a real-hardware run is staged without submitting one.

**Background.** Real qubits decohere and gates misfire (the open-system decay of the Math primer's Lindblad section). Two mitigations help: **readout calibration** inverts the measured confusion matrix of the ancilla, and **ZNE** deliberately amplifies gate noise by unitary folding then extrapolates back to zero. The reference impl runs a five-condition error budget (noiseless floor, raw noisy, +readout cal, +ZNE, +both) and reports the mean cosine error for each. Code: `src/mitigation.py`, `src/error_budget.py`, `src/noise_models.py`; deep-dive in `writeup/error-mitigation.md`.

**Run.**

```bash
python tests/test_mitigation.py     # proves each primitive in isolation (readout, folding, extrapolation)
python -m src.error_budget          # 5-condition budget -> results/error_budget.{json,png}
```

Real-hardware preview — the safe, QPU-free preflight (transpiles and predicts, submits nothing):

```bash
python -m src.angle_sweep --backend ibm --check    # free preflight: auth + transpile, NO job
# python -m src.angle_sweep --backend ibm --run     # ONLY this submits a real job (needs saved IBM creds)
```

**Observe.** `test_mitigation.py` prints `ALL MITIGATION TESTS PASSED`. `src.error_budget` shows the mean $|\text{cos err}|$ dropping from raw-noisy toward the noiseless floor as mitigations stack — roughly a 77% reduction with both — and writes `results/error_budget.png`. The `--check` path names the least-busy device, transpiles the sweep circuits, reports the two-qubit-gate cost, and submits no job. Without `--run` and saved credentials, nothing reaches a real device.

**Questions.** (1) In the `error_budget.json` `reductions_vs_raw` block, which single lever removes more error — readout calibration or ZNE — and does combining them beat either alone? (2) The `--check` preflight reports two-qubit-gate counts for `dim=2` versus `dim=4`. Why does the low-depth `dim=2` encoding give a cleaner first hardware result (see the rationale in `src/angle_sweep.py`)?

---

## What ran where

| Lab | Maps to | Hardware |
|---|---|---|
| 1 · CHSH | you write `chsh.py`; runs on the lab venv (`qiskit-aer`) | simulator only |
| 2 · Grover | you write the script; runs on the lab venv | simulator only |
| 3 · Surface-code overhead | paper + arithmetic snippet; theory in `03-stack-algorithms/` | none (paper) |
| 4 · Cosine / swap / Hadamard | `tests/test_estimators.py`, `src/experiment.py`, `src/qsvm.py` | simulator only |
| 5 · Shot-noise scaling | `src/studies.py` → `results/shot_scaling.png` | simulator only |
| 6 · Mitigation + gate | `tests/test_mitigation.py`, `src/error_budget.py`, `src/angle_sweep.py` | simulator; real QPU behind `--run` |

Labs 1–3 are self-contained (CHSH and Grover as short scripts on the lab venv; the surface-code lab is arithmetic). Labs 4–6 exercise modules that ship in `reference-impl/src/` and `reference-impl/tests/`. Only Lab 6's `--run` path touches a real device, and only with credentials you supply.
