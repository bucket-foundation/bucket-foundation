# Quantum Project — Quantum Similarity & Kernel Estimation

**Project name:** **Quantum Project** *(working name)*

**One-line description:**
This project estimates the cosine similarity and kernel (Gram) matrices between
embedding vectors on real quantum hardware — via the swap test and Hadamard test
over amplitude-encoded states — and drives a quantum-kernel classifier, with an
honest shots-vs-noise error budget.

**Longer description:**
Embeddings and cosine similarity power retrieval, recommendation, and kernel
machine learning. The inner product of two amplitude-encoded quantum states equals
the cosine similarity of the original vectors, and inner-product (overlap)
estimation is a canonical quantum subroutine underlying quantum kernels and
HHL-style quantum linear algebra. it implements that primitive two ways
(swap test → magnitude; Hadamard test → signed), assembles the pairwise quantum
kernel matrix, feeds it to a classical SVM, proves the estimators reproduce the
classical math on simulators, quantifies the sampling (1/√S) and hardware-noise
cost, and validates on IBM Quantum + IonQ hardware. It makes no false speedup
claim — its value is a correct, hardware-validated primitive with a measured error
budget, and a bridge from a real ML workload to quantum devices.

**Status:** simulator side complete + validated; real-hardware runs pending a
single IBM Open-plan job. See `README.md` for the run commands, `MATH.md` for the
full derivation, `writeup/technical-note.md` for results.

**Owner:** Gianangelo Dichio. **Purpose:** PhD-application artifact (quantum
computing / quantum ML) + a reusable foundation for quantum-kernel experiments.

**Repo path:** `~/agfarms/biophysics-phd-review/qc-embedding-similarity/`
