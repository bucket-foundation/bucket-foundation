# Classical shadows · S-shadows
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
Classical shadows (Huang–Kueng–Preskill, Nat. Phys. 2020) is a measurement protocol that builds a compact classical sketch of an unknown quantum state ρ from very few measurements, then predicts many properties from that one sketch. Recipe: apply a random unitary from a fixed ensemble (random global Cliffords, or — more practically — random single-qubit Pauli rotations), measure in the computational basis, and invert the measurement channel to get a classical "snapshot." Average $O(\log M/\varepsilon^2)$ snapshots and you can estimate **$M$ different observables** to accuracy $\varepsilon$ with high probability. The headline result: for local observables the number of measurements is **independent of system size** and saturates information-theoretic lower bounds — a fundamentally different scaling from full quantum state tomography, which needs exponentially many measurements. Crucially the target properties can be chosen *after* the data is collected.

## Where it stands (2025–26)
Classical shadows became one of the most-used primitives in near-term quantum computing and a rigorous alternative to variational readout. Applications: estimating energies and forces for chemistry, entanglement entropies, fidelities, two-point correlators, and — the deepest connection — as the efficient tool that makes "learning from quantum data" provable (the exponential advantage in `S-qml`, Huang et al. Science 2022, uses shadow-style measurements). The active research frontier is robustness and specialization: noise-robust shadows under gate-dependent noise, **fermionic** shadows with mode-independent sample complexity for chemistry (2026), qudit and magic-gate variants, and shadows combined with circuit cutting (`S-circuitcut`). The Pauli-measurement version is directly runnable on today's hardware, which is why it displaced heavier tomography for benchmarking and for the atlas's kind of kernel/overlap estimation (`reference-impl/` — shadows are the sample-efficient cousin of the swap/Hadamard-test readout, predicting many overlaps from one measurement budget).

## Key graded claims
- T2 Predict $M$ observables from $O(\log M/\varepsilon^2)$ measurements, size-independent for local observables — Huang–Kueng–Preskill, Nat. Phys. 16, 1050 (2020), arXiv:2002.08953 (established)
- T2 Sample complexity saturates information-theoretic lower bounds — same, with matching lower bounds (established)
- T2 Shadows enable provable exponential advantage learning from quantum experiments — Huang et al., Science 376, 1182 (2022) (demonstrated; quantum data)
- T3 Noise-robust and fermionic shadows extend applicability — Chen et al., PRX Quantum (2021); fermionic-shadow work arXiv:2606.27254 (2026) (established/preprint)

## Speedup / caveat
A **measurement-efficiency** result, not a computational speedup — it reduces how many times you must run and measure a circuit, saturating a fundamental lower bound. Caveats: the estimator variance can be large for global or high-weight observables (random-Pauli shadows scale as $3^k$ for $k$-local operators), so it shines for **low-weight, many-observable** workloads and degrades for global ones; and it presupposes you can prepare ρ repeatedly, so it inherits the state-preparation costs of whatever produced ρ.

## Conflicts / open questions
Which measurement ensemble is optimal for a given task (global Clifford = strong but hard circuits; local Pauli = easy but weaker for global observables). How much shadow variance survives realistic hardware noise at scale — an active robustness question.

## Sources
Nat. Phys. 16, 1050 (2020), arXiv:2002.08953; Science 376, 1182 (2022); arXiv:2011.09636 (robust shadows); arXiv:2606.27254. Cross-links: `S-qml`, `S-variational`, `S-circuitcut`, `S-bench`, `reference-impl/`.
