# The Classical-Simulation Frontier — Where the Boundary Actually Is · O-classical-sim
**Layer:** L7 Frontier & open · **Chapter:** §08 · **Status:** depth

## The open question
Every quantum-advantage claim implicitly draws a line: on *this* side, classical computers can reproduce the result; on *that* side, they can't. The line moves. It is set by the best classical algorithm anyone has written, and clever people keep writing better ones — so a claim that looked beyond-classical in year N is routinely pulled back inside the boundary in year N+2. The sharp question is not "can a quantum computer beat brute-force state-vector simulation" (it can, at ~50 qubits) but "where does the boundary sit against the *best* classical method — tensor networks, belief propagation, neural quantum states, Clifford-plus-few-T sparsification — for the specific structured problems quantum machines actually run?" Getting this boundary right is what separates real advantage (O-advantage) from a benchmark artifact.

## Where the disagreement is
- **Boundary-is-close-and-moving camp.** Classical simulation has repeatedly caught up: Google's 2019 "10,000 years" fell to days on tensor-network/GPU methods within ~3 years; IBM's 2023 utility experiment was matched within days by 2D tensor networks (gPEPS, Tindall et al.) and sparse Pauli methods (Sandia, Caltech). The Flatiron Institute's belief-propagation tensor networks reproduced D-Wave's flagship spin-glass dynamics (*Science*, May 2026). Neural quantum states and matrix-product-state methods keep extending reach. The lesson: most "advantage" demos sit *near* the boundary, on structured problems (low entanglement, shallow depth, geometric locality) that classical heuristics exploit, and headline speedups often used weak classical baselines T2/T3.
- **Boundary-is-being-crossed-for-real camp.** Not every problem yields to classical heuristics. The March 2026 result "Tensor Networks with Belief Propagation Cannot Feasibly Simulate Google's Quantum Echoes" (arXiv:2604.15427) argues the leading classical attack *fails* on that OTOC problem — the first advantage claim in a while that resists the usual counterattack T3. Volume-law-entangled, deep, non-geometrically-local circuits are believed hard for all known classical methods; fault-tolerant Shor and genuine quantum simulation live provably beyond the boundary given a working FTQC machine [T1/T2 theory]. The camp argues the boundary, while it moves, is *converging* on a stable frontier that quantum machines are now starting to clear.

## What would resolve it
For any specific claim: a sustained failure of *all* classical methods (tensor networks with belief propagation, neural quantum states, Clifford perturbation theory, MPS/PEPS, quantum Monte Carlo) to match it over ~3 years of motivated attack. Quantum Echoes is the current live probe — if it holds against classical attack through 2027–28 it marks a real, stable boundary crossing; if a classical method matches it, the "near-the-boundary" reading wins again. Field-wide, a rigorous complexity-theoretic characterization of *which structured problems* admit efficient classical simulation would convert this from an empirical arms race into settled theory.

## Sources
- Tindall et al., "Efficient tensor network simulation of IBM's largest quantum processors," arXiv:2309.15642 / PRX Quantum 5, 010308 T2
- Flatiron/BU classical annealing-dynamics algorithm — *Science* adx2728 (May 2026) T2
- arXiv:2604.15427 — belief-propagation tensor networks cannot feasibly simulate Quantum Echoes (2026) T3
- arXiv:2510.06324 — classical sampling of noisy circuits under approximate Markovianity (2025) T3
- arXiv:2508.05720 — "The vast world of quantum advantage" T3
