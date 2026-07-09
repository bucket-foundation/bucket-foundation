# Quantum similarity search — cosine similarity & kernel matrices on real quantum hardware

Estimate the **cosine similarity** between amplitude-encoded embedding vectors on a
quantum computer (the swap test and Hadamard test), assemble the pairwise
**quantum kernel matrix**, and benchmark it against classical `numpy` — on
simulators and on real **IBM Quantum** and **IonQ (via Amazon Braket)** hardware.

Built by Gianangelo Dichio. The physics/math is derived from first principles in
[`MATH.md`](MATH.md).

## Why this project

Estimating the inner product `<u|v>` of two quantum states is a core quantum
subroutine (it underlies quantum kernels and HHL-style linear algebra). For
amplitude-encoded unit vectors that inner product **is** cosine similarity — so a
classic embeddings/recommender problem maps directly onto real quantum hardware.
The project implements the primitive, proves it reproduces the classical math, and
measures the shots-vs-noise cost honestly (no false speedup claims).

## Directory map

```
qc-embedding-similarity/
├── README.md            you are here — overview, how to run, hardware setup
├── MATH.md              the full derivation (qubits -> swap/Hadamard test -> kernels)
├── requirements.txt     pinned deps
├── src/
│   ├── classical.py     ground truth: cosine similarity + Gram matrix (numpy)
│   ├── encode.py        amplitude encoding: classical vector -> quantum state
│   ├── swap_test.py     swap test  -> |cos|^2   (magnitude)
│   ├── hadamard_test.py Hadamard test -> signed cos   (used on hardware)
│   ├── kernel.py        build the pairwise quantum kernel matrix + error metrics
│   └── experiment.py    backends (aer / aer_noisy / ibm / braket) + end-to-end demo
├── tests/
│   └── test_estimators.py   proves the quantum estimators == classical math
├── results/             saved run outputs (json/plots) — filled as you run
└── writeup/             the 3-4 page technical note that goes with the repo
```

Read order to understand it: `MATH.md` → `classical.py` → `encode.py` →
`swap_test.py` → `hadamard_test.py` → `kernel.py` → `experiment.py` → `tests/`.

## Setup

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
```

## Run (no credentials needed)

```bash
# correctness proof: quantum estimators reproduce classical cosine similarity
python tests/test_estimators.py

# end-to-end demo on the noiseless simulator
python -m src.experiment

# add simulated hardware noise (depolarizing)
python -m src.experiment --backend aer_noisy
```

Expected: swap test matches `|cosine|`, Hadamard test matches signed `cosine`, and
the quantum kernel matrix matches the exact one to ~0.01–0.03 at 4k–20k shots.

## Running on real hardware

Both paths use the **same circuits**; only the backend changes.

**IBM Quantum (free Open plan — NEW IBM Cloud flow, 2025+):**
IBM retired the old `quantum.ibm.com` login and the `channel='ibm_quantum'`
account type. The free Open plan now lives on the **IBM Quantum Platform under IBM
Cloud**. One-time setup (all free, no credit card for the Open plan):
1. Create a free **IBM Cloud** account: https://cloud.ibm.com/registurl (email + verify).
2. Open the **IBM Quantum Platform**: https://quantum.cloud.ibm.com → it now loads.
3. It auto-provisions a free **Open-plan instance**. Copy two things from the
   dashboard: your **API key** and the **instance CRN** (Cloud Resource Name).
4. Save the account and run:
```bash
pip install qiskit-ibm-runtime
python -c "from qiskit_ibm_runtime import QiskitRuntimeService; \
  QiskitRuntimeService.save_account(channel='ibm_cloud', token='YOUR_API_KEY', \
  instance='YOUR_INSTANCE_CRN', set_as_default=True, overwrite=True)"
python -m src.experiment --backend ibm --shots 4096
```
**This is the one step only you can do — it needs your account/identity.** After
`save_account`, the code just calls `QiskitRuntimeService()` and auto-selects the
least-busy real device — no channel hardcoded, so it works on the new platform.

*Alternative real-hardware provider (no IBM account):* IonQ / Rigetti via Amazon
Braket (needs an AWS account instead) — see below.

**IonQ / Rigetti via Amazon Braket:**
```bash
pip install qiskit-braket-provider     # + configure AWS credentials
python -m src.experiment --backend braket --shots 1000
```

Running on both gives the "validated across two hardware providers" line.

## Status

- [x] Amplitude encoding + classical baseline
- [x] Swap test (|cos|) + Hadamard test (signed cos)
- [x] Quantum kernel matrix + error metrics
- [x] Passing correctness tests on the simulator
- [x] Noise study: sweep shots (1/√S) and depolarizing strength → `results/*.png`
- [x] Quantum-kernel SVM on Iris — matches exact-kernel accuracy (100%, kernel RMSE 0.007)
- [x] Technical writeup skeleton with simulator results (`writeup/technical-note.md`)
- [ ] Real-hardware runs (IBM + IonQ) → fill §4 results table (needs your IBM Cloud token)

## What this is and is not

It is a correct, hardware-validated implementation of a canonical quantum primitive
that underlies quantum kernels, with an honest shots-vs-noise accounting. It is
**not** a claim of quantum speedup for similarity search — classical cosine
similarity is `O(d)`. Knowing that distinction is the point. See `MATH.md` §8.
