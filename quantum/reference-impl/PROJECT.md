# Quantum Similarity & Kernel Estimation

**One-line description.**
Estimate cosine similarity and kernel (Gram) matrices between embedding vectors on
real quantum hardware — via the swap test and Hadamard test over amplitude-encoded
states — drive a quantum-kernel SVM, and quantify the full error budget.

**Longer description.**
Embeddings and cosine similarity power retrieval, recommendation, and kernel machine
learning. The inner product of two amplitude-encoded quantum states equals the cosine
similarity of the original vectors, and inner-product (overlap) estimation is a
canonical quantum subroutine underlying quantum kernels and HHL-style quantum linear
algebra. This project implements that primitive two ways (swap test → magnitude;
Hadamard test → signed), assembles the pairwise quantum kernel matrix, feeds it to a
classical SVM, proves the estimators reproduce the classical math on simulators,
quantifies the sampling (1/√S) and hardware-noise cost, applies readout-error
calibration and zero-noise extrapolation, and validates on real IBM hardware. It makes
no false speedup claim — its value is a correct, hardware-validated primitive with a
measured error budget, and a bridge from a real ML workload to quantum devices.

**Status.** Complete and validated end-to-end: derivation → estimators → quantum-kernel
SVM → shot/noise studies → error mitigation → **real IBM hardware (`ibm_fez`): mean
error 0.009 across the full signed cosine range**. IonQ/Braket path wired, not yet run.

**Read.** `README.md` (overview + run commands), `MATH.md` (derivation from first
principles), `writeup/technical-note.md` (paper-style results),
`writeup/error-mitigation.md` (mitigation deep-dive), `qc-embedding-similarity.pdf`
(everything in one file).

**Owner.** Gianangelo Dichio. **Purpose.** Reference implementation and
PhD-application artifact in quantum machine learning; a reusable foundation for
quantum-kernel experiments.

**Public repo.** https://github.com/gianyrox/quantum-similarity
