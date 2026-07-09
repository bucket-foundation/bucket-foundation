# Quantum in Nuclear & Fusion · I-nuclear
**Layer:** L4 Industries · **Chapter:** §05 · **Status:** depth
**Added:** 2026-07-08 (cycle 3 random-walk — split from `I-energy`; fusion/nuclear is deep enough to stand alone)

## The pitch
Three threads. (1) **Fusion plasma** — magnetized-plasma dynamics in tokamaks/stellarators is a quantum many-body and stiff-PDE problem; quantum simulation and QAOA-for-stability-optimization are pitched to accelerate confinement modeling and coil design. (2) **Nuclear structure & reactions** — lattice/nuclear-physics Hamiltonians are a native quantum-simulation target (the same `S-qsim` logic as chemistry, at the nuclear scale). (3) **Fission engineering** — reactor core optimization, fuel-loading, and materials-under-irradiation modeling as QUBO/chemistry problems.

## Real activity (named, dated)
- **Frontiers in Physics** (March 2025) — *The role of quantum computing in advancing plasma physics simulations for fusion energy and high-energy physics* — a substantive review; QAOA is applied to optimize tokamak plasma-stability criteria, Hamiltonian-simulation to plasma dynamics.
- **PPPL (Princeton Plasma Physics Lab)** — 2025 Kaul Foundation Prize to a team optimizing 3D magnetic fields to control tokamak edge instabilities; the broader lab explores quantum-computing methods for plasma. HPC-classical today, quantum-curious.
- **Nuclear-structure quantum simulation** — VQE/quantum-simulation demos of light-nucleus (deuteron, \ce{^4He}-scale) binding energies on superconducting/trapped-ion hardware (Oak Ridge and others, ongoing since ~2018) — small but genuine physics results.
- **Fusion startups** (Commonwealth Fusion, TAE, Tokamak Energy) and **ENN** (proton-boron) run heavy classical HPC plasma simulation; quantum is on watch-lists, not in the loop.

## Key graded claims
- [T2/T3] VQE/quantum-simulation of light-nucleus binding energies on real hardware — nuclear-physics literature (demonstrated at small scale; landmark physics, not engineering advantage)
- [T3] QAOA for tokamak plasma-stability optimization / Hamiltonian-sim for plasma — Frontiers 2025 review (method framing + small demos)
- [T4] Quantum-accelerated fusion reactor design — vendor/lab aspiration (roadmap)
- [T5] Fusion/nuclear quantum TAM — analyst (speculative)

## Proven today vs promise vs hype
- **Proven:** quantum computers have simulated small nuclei (deuteron-scale) — real nuclear-physics results, no engineering payoff.
- **Promise:** plasma-stability optimization and full plasma dynamics — strong theoretical fit, no advantage over classical HPC yet.
- **Hype:** "quantum computing will crack fusion" — fusion's bottleneck is engineering and confinement, and its modeling is elite classical HPC.

## Honest assessment
Nuclear/fusion has the best *physics* pedigree of any young L4 node — simulating nuclear and plasma Hamiltonians is exactly what quantum computers are for, and the deuteron/light-nucleus results are genuine science. It also has the widest gap to engineering value: fusion plant design runs on world-class classical supercomputing (M3D-C1, JOREK, NIMROD), and quantum methods are at the review-and-small-demo stage. Plasma-stability QAOA is a promising formulation without demonstrated advantage. Realistic engineering value: **2030s+**, gated on fault tolerance. Near-term, the honest role is accelerating specific nuclear/plasma sub-Hamiltonians as a research tool.

## Sources
- Frontiers in Physics "Role of quantum computing in advancing plasma physics simulations for fusion energy": https://www.frontiersin.org/journals/physics/articles/10.3389/fphy.2025.1551209/full
- PPPL 3D-field / Kaul Prize: interestingengineering.com/energy/3d-magnetic-field-breakthrough-nuclear-fusion
- Nuclear-structure VQE (deuteron) — Oak Ridge quantum-simulation literature
- AZoQuantum "Tokamak Reactors and the Key to Nuclear Fusion"
