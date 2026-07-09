# Entanglement-based clock networks · A-entclock
**Layer:** L3 Adjacent tech · **Chapter:** §04 · **Status:** deepened (cycle 3, new node)

## What it is
Distinct from both the clocks (`A-clocks`) and the classical time-transfer plumbing (`A-timedist`): this node is the proposal to **entangle distant clocks** so a network of them behaves as one collective quantum sensor. The theory (Kómár et al., Nat. Phys. 2014) is clean: with K clocks of N atoms each linked by entanglement into a shared GHZ state, the frequency uncertainty scales toward the **Heisenberg limit ∝ 1/(K·N)** instead of the standard quantum limit **∝ 1/√(K·N)** — a network of 10 optical-lattice clocks of 1,000 atoms each could in principle reach an Allan deviation of **~2×10⁻¹⁸ at 1 s**, beating any single clock. It would also give a *distributed* reference immune to a single node being spoofed or lost, and enable clock comparisons whose precision beats the link noise.

## Maturity & real deployments (2025–26)
**Research — theoretically compelling, experimentally embryonic, and its practical advantage is contested.**
- **First realization (2022)**: two Sr⁸⁸⁺ **ion clocks** separated by ~2 m were entangled via a photonic link, and entanglement reduced the number of measurements needed toward the Heisenberg-limit scaling — a proof of principle at benchtop distance, not a network.
- **Metropolitan groundwork (2025)**: an entanglement-based clock **syntonization** demonstration synchronized two rubidium clocks to **<12 ps** at all times over **48–50 km** of deployed fiber across the Métropole Côte d'Azur, riding an entanglement-based QKD link (~7 kbit/s key). This shows entanglement infrastructure and clock timing can share a real fiber network — a step toward, not a demonstration of, Heisenberg-limited networked clocks.
- **On paper**: multiple 2025–26 surveys/roadmaps (arXiv:2604.04437, 2606.15421) map the architectures; long-baseline entanglement distribution (`A-qinternet`) is the missing enabler.

## Key graded claims
- T1 GHZ-entangled clock networks scale to Heisenberg-limited frequency precision ∝1/(KN) — Kómár et al., Nat. Phys. 10 (2014) (established theory)
- T2 Two remote ion clocks entangled via photonic link, sub-Heisenberg measurement reduction — 2022 experiment (demonstrated, ~2 m)
- T2 Entanglement-based clock syntonization, <12 ps over 48 km deployed fiber — Appl. Phys. Lett. 126, 174003 (2025) (demonstrated)
- T6 Continental Heisenberg-limited entangled clock network — roadmap only (speculative)

## Conflicts / open questions
- **Does entanglement actually help in practice?** A 2026 critical assessment (arXiv:2604.10243) argues that for real time-synchronization tasks, classical comb-stabilized optical transfer already saturates the useful precision, and GHZ states are fragile (one lost photon collapses the whole network state), so the theoretical 1/N gain may not survive loss and decoherence over network distances. This is the same skepticism flagged in `A-timedist`.
- **Enabler dependency**: it cannot exist without long-distance entanglement distribution and quantum memories (`A-qinternet`, `A-qmemory-hw`), which themselves have not reached the repeater crossover.

## The honest call
**A beautiful idea that is nowhere near a network.** The Heisenberg-scaling theory is solid and the benchtop/metropolitan building blocks are real, but there is no fielded entangled clock network, and credible physicists question whether entanglement beats good classical optical transfer for actual timekeeping once loss is included. Grade as research/speculative — the near-term "quantum clock network" is classically-linked quantum clocks (`A-timedist`), not entangled ones.

## Sources
- https://pubs.aip.org/aip/apl/article/126/17/174003/3345796/ (entanglement-based clock syntonization, 48 km, 2025)
- Kómár et al., "A quantum network of clocks," Nature Physics 10 (2014)
- https://arxiv.org/pdf/2604.04437 (Quantum Clock Synchronization Networks: A Survey)
- https://arxiv.org/pdf/2604.10243 (critical assessment of quantum time-sync)
