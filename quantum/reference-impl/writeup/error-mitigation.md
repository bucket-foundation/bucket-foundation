# Error mitigation and a low-depth encoding for the overlap estimators

This note extends the reference implementation with two error-mitigation
techniques and one lower-depth circuit, all validated on the simulator before any
hardware run. It answers a concrete question: **given a noisy device, how much of
the error can we remove in software, and how much by using a cheaper circuit?**

Everything here runs from the repo:

```
python -m src.error_budget       # the five-condition error budget + figures
python tests/test_mitigation.py  # correctness of every primitive below
```

All noise is the modeled `src.noise_models` channel (gate depolarizing + readout),
not a fit to a specific device. No number here is a hardware claim, and nothing
below changes the O(2^n) amplitude-encoding cost or implies a quantum speedup.

---

## 1. A realistic noise model (`src/noise_models.py`)

The original `aer_noisy` backend modeled only gate error (depolarizing on 1- and
2-qubit gates). Both estimators read a **single ancilla** and convert its P(0)
directly into the answer, `cos = 2 P(0) - 1`, so the largest missing error source
is **readout error** on that one qubit. We add it as an asymmetric per-qubit
confusion channel:

- P(measure 1 | prepared 0) = `p01` (default 0.02)
- P(measure 0 | prepared 1) = `p10` (default 0.04, larger — relaxation during
  readout makes 1→0 more likely)

Gate and readout noise are independent switches, so the budget can isolate each
lever. Verified effect on a known pair (Hadamard test, single ancilla): readout
error alone biases the cosine by +0.025; gate error alone by +0.05; combined
+0.08. Both biases point toward cos = 0 (states wash toward the maximally mixed
state), which is what the mitigation below reverses.

---

## 2. Readout-error calibration (`src/mitigation.py`, part A)

**Model.** The device reports outcome `o` from a fixed conditional distribution
given the true measured state `t`. Collect these into a column-stochastic
calibration matrix `A[o, t] = P(observe o | true t)`, so `p_obs = A p_true`.

**Calibrate.** For each basis state `t` in {0,1}^k, prepare `|t>`, measure
immediately, and read the normalized histogram as column `t`. The swap and
Hadamard tests measure one qubit, so `A` is 2×2 and needs two calibration
circuits.

**Invert.** Rather than the naive `A^{-1} p_obs` (which can return negative
"probabilities" under shot noise) we solve the constrained least squares

```
    min_x || A x - p_obs ||^2   s.t.   x >= 0,  sum_i x_i = 1,
```

which always returns a valid probability vector. The corrected P(0) feeds the
same `2 P(0) - 1` conversion.

**Result.** The learned 2×2 matrix recovers the injected rates (P(1|0)=0.021 vs
0.02; P(0|1)=0.039 vs 0.04). On a readout-only model the cosine bias drops from
+0.025 to −0.002 — fully removed to shot noise. On the combined model,
calibration removes the readout slice and leaves the gate bias for ZNE.

---

## 3. Zero-noise extrapolation (`src/mitigation.py`, part B)

**Idea.** Amplify gate noise on purpose, measure the observable at several noise
levels, and extrapolate back to zero noise. We amplify by **unitary folding**:
replace the circuit `G` by `G (G† G)^m`, with scale factor `λ = 2m+1 ∈ {1,3,5}`.
`G† G = I`, so the logical result is unchanged, but the accumulated gate error
grows ≈ λ×. The single final measurement is untouched, so folding does **not**
amplify readout error — the intended separation of concerns (readout calibration
handles readout; ZNE handles gate noise).

Verified: global folding scales the 2-qubit-gate count linearly (24 → 72 → 120 at
λ = 1, 3, 5) and is the identity at λ = 1.

**Extrapolation.** Three fits to `E(λ) → E(0)`: linear (fewest assumptions),
Richardson (exact interpolating polynomial at 0), and exponential (`E_inf + (E0 −
E_inf) e^{−kλ}`, the physically motivated depolarizing form). The extrapolated
cosine is **clamped to [−1, 1]** — a degree-(k−1) polynomial through a few noisy
points can extrapolate to a non-physical value, and one unclamped outlier
destroys a mean-error summary. Across 30 random pairs, **Richardson is the most
robust** (0/30 clamped, lowest mean error), so it is the default.

![ZNE extrapolation on one pair](/home/gian/.claude-science/orgs/0161b4aa-f3a1-4648-8485-561283ff1e41/artifacts/proj_21cf0cae2b00/3bd4c098-2acf-4981-a74f-16c3ddcb5c55/ve9cd31b2_zne_extrapolation.png)

*Readout-calibrated estimate measured at λ = 1, 3, 5 and extrapolated to λ = 0.
Raw error +0.082 → +0.040 (linear) / +0.019 (Richardson) / +0.011 (exponential).*

---

## 4. Low-depth encoding: the destructive swap test (`src/destructive_swap.py`)

The standard swap test needs an ancilla and *n* controlled-SWAP (Fredkin) gates;
each Fredkin decomposes into many two-qubit gates. The **destructive** swap test
(Cincio, Subaşı, Sornborger & Coles, *Learning the quantum algorithm for state overlap*, New J. Phys. **20**, 113022, 2018; doi:10.1088/1367-2630/aae94a, arXiv:1803.04114) computes the same `|<u|v>|^2` with no
ancilla and no Fredkin: a single transversal layer of one CNOT + one Hadamard per
qubit pair (a Bell-basis measurement), then a classical parity of the measured
bits,

```
    |<u|v>|^2 = E[ prod_i (-1)^{x_i AND y_i} ].
```

**Verified equal to classical |cos|** on the noiseless simulator at dims 2, 4, 8.

**Depth on a line coupling map, IBM-native basis (`results/depth_comparison.json`):**

| dim | standard (qubits / depth / 2q) | destructive (qubits / depth / 2q) | 2q reduction |
|----:|-------------------------------:|----------------------------------:|-------------:|
|   2 |                    3 / 41 / 10 |                        2 / 12 / 1 |        10.0× |
|   4 |                   5 / 103 / 28 |                        4 / 25 / 7 |         4.0× |
|   8 |                   7 / 148 / 63 |                       6 / 47 / 26 |         2.4× |

![Destructive vs standard swap test](/home/gian/.claude-science/orgs/0161b4aa-f3a1-4648-8485-561283ff1e41/artifacts/proj_21cf0cae2b00/dfdc6d17-b19f-4b57-a5b2-6d8c0f84d083/v9c642a3b_depth_comparison.png)

**The honest tradeoff.** On the gate-error axis the destructive test wins at
every dim (mean |err| 0.016 vs 0.045 at dim 2; 0.041 vs 0.055 at dim 4,
gate-only). But it measures all 2*n* data qubits and multiplies their parities,
so it is exposed to readout error on every one of them, while the standard test
reads a single ancilla. With readout error added it still wins at dim 2 (0.042 vs
0.060) but loses at dim 4 (0.095 vs 0.072). Two consequences: the destructive
test is the right choice for the low-qubit first-hardware run, and it is exactly
the circuit that most benefits from the readout calibration of §2.

---

## 5. Cleaned-vs-raw error budget (`src/error_budget.py`)

Mean |cosine error| over 30 random dim-4 pairs at 20k shots, gate+readout model:

| condition            | mean \|cos error\| | vs raw |
|----------------------|-------------------:|-------:|
| noiseless floor      |              0.006 |     —  |
| raw noisy            |              0.190 |     —  |
| + readout cal        |              0.172 |   −9%  |
| + ZNE                |              0.070 |  −63%  |
| + both               |          **0.043** | **−77%** |

The combined estimator removes **79% of the excess error** above the shot-noise
floor. At dim 4 gate error dominates, so ZNE is the larger lever and readout
calibration is a smaller correction — the ordering flips toward readout
calibration on the low-depth destructive circuit, where 2-qubit-gate error is
already minimal (§4).

The ML-relevant object improves in step: the 5×5 quantum kernel-matrix RMSE
against the exact Gram matrix drops from **0.242 (raw) to 0.053 (both)**.

![Error budget](/home/gian/.claude-science/orgs/0161b4aa-f3a1-4648-8485-561283ff1e41/artifacts/proj_21cf0cae2b00/6bab2e3b-4619-4945-8b51-ccd6014eeac7/vb41782eb_error_budget.png)

![Signed-cosine sweep, mitigated vs raw](/home/gian/.claude-science/orgs/0161b4aa-f3a1-4648-8485-561283ff1e41/artifacts/proj_21cf0cae2b00/c7d0e01e-5b18-45b7-a93b-daa314541964/v3231687c_mitigation_sweep.png)

*Left: each lever vs the raw noisy estimate. Right: mitigation across the full
signed-cosine range (dim 2) — the mitigated line tracks the ideal diagonal; the
raw line is compressed toward zero by noise.*

---

## 6. Assumptions and limits

- **Modeled noise, not a device fit.** Rates are plausible superconducting-device
  magnitudes. Real hardware adds coherent errors, crosstalk, drift, and
  non-Markovian effects the depolarizing+readout model omits.
- **ZNE is bias reduction, not a noise floor removed.** Extrapolation trades bias
  for variance and assumes the observable's noise-scaling is well captured by the
  fit form; it cannot recover information destroyed by decoherence.
- **No speedup.** Amplitude encoding is O(2^n); classical cosine is O(d). This
  note is about running the *similarity primitive* more cleanly on a noisy
  device, nothing more.
- **Reproducibility.** Every number above regenerates with `python -m
  src.error_budget` and `python tests/test_mitigation.py`.
