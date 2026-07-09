# Quantum singular value transformation (QSVT) · S-qsvt
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
QSVT is the modern unifying lens for quantum algorithm design. Given a matrix A block-encoded inside a larger unitary (A sits in a corner of U, accessed by ancilla-controlled calls), QSVT applies a **polynomial transformation to the singular values of A** using $O(\deg(p))$ calls to $U$ and its inverse, plus one ancilla and a sequence of single-qubit rotations whose angles encode the polynomial $p$. It generalizes **quantum signal processing** (Low–Chuang 2017), which does the same for the eigenvalues of a single qubit's rotation, up to arbitrary block-encoded operators (Gilyén–Su–Low–Wiebe, STOC 2019). The payoff is conceptual and practical: pick the right polynomial and you recover most known quantum algorithms as special cases. $p\approx$ sign function → **amplitude amplification / Grover** (`S-grover`); $p\approx 1/x$ on the spectrum → **matrix inversion / HHL** (`S-hhl`); $p\approx e^{-ixt}$ → **Hamiltonian simulation** (`S-hamsim`, `S-qsim`); a rectangular window → **phase estimation** (`S-qft`) and eigenstate filtering; a threshold → quantum walks (`S-walk`). Martyn–Rossi–Tan–Chuang (2021) laid this out as an explicit "grand unification of quantum algorithms."

## Where it stands (2025–26)
QSVT is now the standard framework in which fault-tolerant algorithms are designed and their costs are stated, because it gives near-optimal query complexity with transparent resource accounting: the cost is the polynomial degree, and Chebyshev-approximation theory tells you the degree needed for a target accuracy. For matrix inversion it achieves **linear** dependence on the condition number $\kappa$ (versus HHL's $\kappa^2$) and additive $\log(1/\varepsilon)$ precision — the tightest statement of the linear-systems cost. It also delivers optimal-scaling Hamiltonian simulation matching the qubitization lower bound (`S-hamsim`). The practical friction is **phase-angle computation**: finding the rotation angles that realize a target polynomial was numerically unstable for high-degree polynomials; 2020–24 work (Haah; Dong–Meng–Whaley–Lin; Motlagh–Wiebe) produced stable O(deg) angle-finding, largely closing that gap. QSVT is a fault-tolerant tool — it assumes a block-encoding, which itself needs coherent access to A (a qRAM-style or sparse-oracle assumption, `S-qram`), so it inherits the same input-model caveats as the algorithms it unifies.

## Key graded claims
- [T1] QSVT: polynomial transform of singular values of a block-encoded operator, $O(\deg)$ queries — Gilyén–Su–Low–Wiebe, STOC 2019, arXiv:1806.01838 (established)
- [T1] Quantum signal processing (the single-qubit precursor) — Low–Chuang, PRL 118, 010501 (2017) + PRX 6, 041067 (2016) (established)
- [T2] Grand unification: amplitude amplification, HHL, Hamiltonian simulation as QSVT instances — Martyn–Rossi–Tan–Chuang, PRX Quantum 2, 040203 (2021) (established, tutorial)
- [T2] Stable phase-angle finding for high-degree polynomials — Dong et al., PRA 103, 042419 (2021); Motlagh–Wiebe, PRX Quantum (2024) (established)
- [T2] QSVT is dequantizable in the low-rank / sampling-access regime — Gharibian–Le Gall, STOC 2022, arXiv:2111.09079 (established; bounds where it does NOT help)

## Speedup / caveat
Not itself a speedup — a **design framework** that yields near-optimal versions of the speedups already in the map. Its honest limit is the same one that runs through `S-hhl`/`S-qram`: the whole edifice sits on top of an efficient block-encoding of the input, and where that block-encoding is only "sampling access" to a low-rank matrix, Gharibian–Le Gall showed QSVT is classically dequantizable. So QSVT sharpens *what* is provably fast and *where* the classical counterattack bites, in one language.

## Conflicts / open questions
Which real applications admit an efficient block-encoding that is not itself the bottleneck (the recurring `S-hhl` question). Whether angle-finding and block-encoding constant factors are small enough for early-fault-tolerant machines, or whether QSVT stays a large-scale-only tool.

## Sources
arXiv:1806.01838; PRL 118, 010501 (2017); PRX Quantum 2, 040203 (2021); PRA 103, 042419 (2021); arXiv:2111.09079. Cross-links: `S-hhl`, `S-grover`, `S-hamsim`, `S-qsim`, `S-qft`, `S-walk`, `S-qram`, `reference-impl/`.
