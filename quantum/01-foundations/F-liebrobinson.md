# Lieb-Robinson Bounds (Emergent Locality) · F-liebrobinson

**Layer:** L0 Foundations · **Chapter:** §01 · **Status:** depth-complete

## What it is
Non-relativistic quantum mechanics has no built-in speed limit — the Schrödinger equation is not Lorentz-invariant, and a local perturbation could in principle be felt everywhere at once. Lieb and Robinson (1972) proved that for lattice systems with short-range interactions this does not happen: information propagates at most at a finite emergent velocity, and outside a linear "light cone" correlations are exponentially small. This speed limit is effective rather than fundamental — it emerges from the Hamiltonian's locality — yet it acts like relativity's light cone for spin chains and cold atoms. Hastings and Koma (2006) extended it and used it to prove that a spectral gap forces exponential decay of ground-state correlations, one of the most-used tools in modern many-body physics.

## Core idea / key equation
For local operators $A$ and $B$ supported on regions separated by distance $d$, evolving $A$ to time $t$ under a local Hamiltonian gives a commutator bound of the form
$$\|[A(t), B]\| \le C\, \|A\|\, \|B\| \cdot \exp\!\left(\frac{v|t| - d}{\xi}\right),$$
where $v$ is the Lieb-Robinson velocity, $\xi$ a length scale set by the interaction range, and $C$ depends on the boundary of the supports. The commutator measures how much a probe at $B$ can detect a disturbance at $A$. It stays exponentially small until $v|t| \approx d$ — the arrival time of the effective light cone — and only then becomes order one.

Plain version: poke one spin, and a spin a distance $d$ away barely notices until a time $d/v$ has passed. A local Hamiltonian — each term touching only nearby sites — is enough to manufacture an approximate causal structure with a group velocity, with no relativity in the theory.

## Why it matters for quantum tech
Lieb-Robinson velocity sets the clock for how fast entanglement and information spread, bounding how quickly a quantum computer can move data across a chip and how fast entangling gates over distance can be (H-supercon, H-ion, S-gates). It underpins the area law for entanglement entropy and the efficiency of tensor-network (MPS/DMRG) simulation, so it controls what classical machines can and cannot simulate (F-qinfo). The gap-implies-clustering result explains why local error correction and topological order are stable (S-qec, S-logical). It also bounds state-transfer rates in quantum networks and metrology protocols spread over many sites (A-qinternet, A-sensing).

## Key graded claims
- T1 Short-range lattice Hamiltonians have a finite group velocity; correlations vanish exponentially outside a linear light cone — Lieb & Robinson, Commun. Math. Phys. 28, 251 (1972) (status: established)
- T1 A nonzero spectral gap implies exponential decay of ground-state correlations, via Lieb-Robinson bounds — Hastings & Koma, Commun. Math. Phys. 265, 781 (2006); Nachtergaele & Sims, Commun. Math. Phys. 265, 119 (2006) (status: established)
- T2 A light-cone spread of correlations at a finite velocity was observed directly in a quantum gas — Cheneau et al., Nature 481, 484 (2012); trapped-ion light cones, Jurcevic et al. & Richerme et al., Nature 511, 202 & 198 (2014) (status: demonstrated)

## Conflicts / open questions
- The tight velocity and light-cone shape for long-range (power-law $1/r^\alpha$) interactions are still being pinned down; whether the cone is linear, polynomial, or logarithmic depends on $\alpha$, and recent work keeps sharpening the boundaries.
- Optimal (tight) Lieb-Robinson velocities for generic interacting models remain open; known bounds are often loose by a constant or more.

## Go deeper
- Nachtergaele & Sims, "Lieb-Robinson bounds in quantum many-body physics," Contemp. Math. 529, 141 (2010), arXiv:1004.2086
- Chen, Lucas & Yin, "Speed limits and locality in many-body quantum dynamics," Rep. Prog. Phys. 86, 116001 (2023), arXiv:2303.07386

## Sources
- Lieb & Robinson, Commun. Math. Phys. 28, 251 (1972). doi:10.1007/BF01645779
- Hastings & Koma, Commun. Math. Phys. 265, 781 (2006). doi:10.1007/s00220-006-0030-4
- Cheneau et al., Nature 481, 484 (2012). doi:10.1038/nature10748
