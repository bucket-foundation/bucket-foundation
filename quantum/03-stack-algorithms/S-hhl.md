# HHL & quantum linear algebra · S-hhl
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
HHL (Harrow–Hassidim–Lloyd, 2009) solves the linear system $Ax=b$ by preparing a quantum state $\ket{x}\propto A^{-1}\ket{b}$ in time $O(\log(N)\cdot s^2\cdot\kappa^2/\varepsilon)$ — polylogarithmic in the dimension $N$, where $s$ is sparsity, $\kappa$ the condition number, $\varepsilon$ the target accuracy. Mechanism: phase-estimate (`S-qft`) the eigenvalues of $A$ on $\ket{b}$, rotate an ancilla by $1/\lambda$ conditioned on each eigenvalue, then uncompute — inverting $A$ eigenvalue-by-eigenvalue. Against classical Gaussian elimination's $O(N^3)$, or conjugate gradient's $O(Ns\kappa)$ for sparse systems, the $\log(N)$ scaling is an **exponential** improvement in dimension. HHL seeded a whole family: quantum linear algebra, quantum singular value transformation (`S-qsvt`), quantum recommendation systems, and the ML applications that fueled the 2015-era hype. The inner-product primitive at its core — estimating $\braket{u}{v}$ between amplitude-encoded states — is exactly what the manual's **reference implementation** builds and validates on real hardware via the swap and Hadamard tests (`reference-impl/MATH.md` §3, §5, §8).

## Where it stands (2025–26)
HHL is the canonical "read the fine print" algorithm (Aaronson 2015). The exponential speedup survives only if **four assumptions hold together**: (1) $A$ is sparse and well-conditioned — runtime is quadratic in $\kappa$, disqualifying most engineering-grade (ill-conditioned) systems; (2) $\ket{b}$ can be prepared efficiently — a qRAM assumption (`S-qram`) that may itself hide exponential cost; (3) $A$ can be Hamiltonian-simulated efficiently (`S-qsim`); (4) you want a scalar *property* of $x$ ($\bra{x}M\ket{x}$) rather than the vector itself — reading out all $N$ amplitudes takes $O(N)$ tomography and kills the speedup. Ewin Tang's 2018 dequantization of quantum recommendation systems, and the quantum-inspired classical algorithms that followed (Chia et al., Gilyén et al.), removed the exponential gap entirely for **low-rank** instances. Matrix inversion is BQP-complete, so a hard regime provably exists — sparse, high-rank, well-conditioned, with efficient state prep and property readout — but no practical problem has been demonstrated to live there fifteen years on.

## Key graded claims
- [T1] HHL $O(\log N\cdot s^2\kappa^2/\varepsilon)$ runtime under stated assumptions; matrix inversion BQP-complete — PRL 103, 150502 (2009) (established)
- [T2] Caveat catalogue (state prep, κ, sparsity, output access) — Aaronson, Nat. Phys. 11, 291 (2015) (established)
- [T2] Low-rank dequantization removes the exponential gap — Tang, STOC 2019, arXiv:1807.04271; Chia et al., STOC 2020 (established)
- [T1/T2] QSVT subsumes HHL with improved $\kappa$, $\varepsilon$ dependence — Gilyén–Su–Low–Wiebe, STOC 2019, arXiv:1806.01838 (established)

## Speedup / caveat
Exponential in dimension, conditional on four assumptions that rarely hold together in applications. Where they fail, classical or quantum-inspired methods match. QSVT (`S-qsvt`) achieves linear rather than quadratic $\kappa$-scaling — the modern way to state the resource cost.

## Conflicts / open questions
Does any end-to-end application (differential-equation solvers, finance PDEs, `I-finance`) satisfy all four assumptions with real data and beat classical? None demonstrated. The state-preparation bottleneck (`S-qram`) is the load-bearing unknown.

## Sources
PRL 103, 150502 (2009); Nat. Phys. 11, 291 (2015); arXiv:1807.04271; arXiv:1806.01838. Cross-links: `S-qsvt`, `S-qft`, `S-qram`, `S-qsim`, `S-qml`, `reference-impl/`.
