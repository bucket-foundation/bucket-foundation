# Quantum Fourier Transform & Phase Estimation · S-qft
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
The Quantum Fourier Transform (QFT) is the change of basis that maps amplitudes to their discrete-Fourier coefficients using only $O(n^2)$ gates on $n$ qubits — exponentially fewer than the $O(n\cdot 2^n)$ of the classical FFT on $2^n$ points. On its own the QFT is not a speedup (you cannot read the coefficients out), but it is the engine of Quantum Phase Estimation (QPE): given a unitary $U$ and an eigenstate $\ket{\psi}$ with $U\ket{\psi}=e^{2\pi i\varphi}\ket{\psi}$, QPE estimates the phase $\varphi$ to $n$ bits by applying controlled powers of $U$ into a register and running an inverse QFT. QPE is the primitive that sits *underneath* the famous algorithms — Shor's period-finding (`S-shor`), HHL eigenvalue inversion (`S-hhl`), quantum-chemistry energy estimation (`S-qsim`), and amplitude estimation (`S-qmc`) are all QPE in different clothing.

## Where it stands (2025–26)
QFT (Coppersmith, 1994) and QPE (Kitaev, 1995) are textbook-established. The live engineering story is depth: textbook QPE demands $\sim O(1/\varepsilon)$ coherent applications of $U$ plus a deep controlled-rotation ladder, which is hopeless on NISQ hardware. The response is a family of low-depth variants — iterative/Kitaev-style QPE (one ancilla, classical feedback), Bayesian and statistical phase estimation, Lin–Tong Heisenberg-limited ground-state energy estimation for *early* fault tolerance (PRX Quantum 3, 010318, 2022, shorter maximal circuit depth via a step-function filter), Wan–Berta–Campbell randomized statistical phase estimation (PRL 129, 030503, 2022), and the optimal-precision refinements (arXiv:2403.18927) — that trade circuit depth for repetitions. Approximate QFT (dropping small-angle rotations) cuts gate count with negligible error and is standard in fault-tolerant compilation. QPE is also a special case of QSVT (`S-qsvt`) — the eigenvalue-transform lens. It remains a fault-tolerant algorithm: the canonical demonstration of why long coherent circuits need `S-qec`.

## Key graded claims
- T1 QFT in $O(n^2)$ gates; QPE estimates eigenphase to $n$ bits — Coppersmith 1994 (quant-ph/0201067); Kitaev 1995 (quant-ph/9511026) (established)
- T1 QPE is the shared subroutine under Shor, HHL, quantum chemistry, amplitude estimation — Nielsen & Chuang Ch. 5 (established)
- T2 Iterative/low-depth, statistical, and optimal-precision QPE variants for near-term and early-FT use — Lin–Tong, PRX Quantum 3, 010318 (2022); Wan–Berta–Campbell, PRL 129, 030503 (2022); arXiv:2305.04908; arXiv:2403.18927 (established/demonstrated)

## Speedup / caveat
QPE delivers exponential precision in the phase ($n$ bits from $O(2^n)$ total controlled-$U$ applications) — the engine behind Shor's exponential factoring speedup. Caveat: it needs a good eigenstate to start from and deep coherent evolution of U, so it is a fault-tolerant, not NISQ, primitive; the reference implementation at `reference-impl/` estimates inner products via the shallower swap/Hadamard test precisely to sidestep full QPE depth.

## Conflicts / open questions
How much of the eigenstate-preparation cost (the same qRAM-style assumption that haunts `S-hhl`/`S-qram`) is hidden inside "just run QPE" for real chemistry and finance instances.

## Sources
quant-ph/0201067; quant-ph/9511026; Nielsen & Chuang §5.2; arXiv:2305.04908; arXiv:2403.18927. Cross-links: `S-shor`, `S-hhl`, `S-qmc`, `S-qsim`, `reference-impl/`.
