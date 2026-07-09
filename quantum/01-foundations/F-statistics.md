# Identical Particles & Spin-Statistics · F-statistics
**Layer:** L0 Foundations · **Chapter:** §01 · **Status:** depth-complete

## What it is
Identical quantum particles are indistinguishable: the joint state must be symmetric or antisymmetric under exchange of any two. The spin-statistics theorem (Fierz 1939, Pauli 1940, from relativistic QFT) fixes which: integer-spin particles are **bosons** (symmetric, can share a state) and half-integer-spin particles are **fermions** (antisymmetric, forbidden from sharing — the Pauli exclusion principle). Exchanging two particles multiplies the wavefunction by $+1$ (bosons) or $-1$ (fermions). In two dimensions the exchange phase can take any value $e^{i\theta}$, giving **anyons**, and non-abelian anyons carry a whole unitary matrix.

## Core idea / key equation
The rule is a single sign on exchange: $\psi(r_1, r_2) = \pm\psi(r_2, r_1)$, with **$+1$ for bosons and $-1$ for fermions**. The minus sign is the whole Pauli principle — put two fermions in the same single-particle state and $\psi = -\psi$ forces $\psi = 0$, so that state cannot be occupied twice. Written as occupation numbers, the average filling of a level of energy $\varepsilon$ follows the two distributions $n(\varepsilon) = 1/(e^{\beta(\varepsilon-\mu)} \mp 1)$: the minus sign (Bose-Einstein) lets occupation diverge and pile particles into the ground state (condensation), the plus sign (Fermi-Dirac) caps every level at one and stacks fermions up to the Fermi energy. In two dimensions the exchange is no longer a bare sign but a phase $e^{i\theta}$ that can sit anywhere between the boson value $\theta = 0$ and the fermion value $\theta = \pi$ — that is what "any-on" names. For a fractional quantum Hall state at filling $\nu = 1/m$ the quasiparticles carry charge $e/m$ and exchange phase $\theta = \pi/m$. Non-abelian anyons replace the phase with a unitary matrix, so exchanging them rotates the state inside a degenerate subspace.

## Why it matters for quantum tech
Exchange antisymmetry is why atoms have shell structure and why chemistry exists at all — so any quantum simulation of molecules or materials must enforce fermionic statistics. Mapping fermionic modes onto qubits (Jordan-Wigner, Bravyi-Kitaev transforms) is a core primitive of quantum chemistry algorithms, and the Jordan-Wigner string overhead is a real cost driver in the circuit depth of those simulations (see S-qsim, S-variational, I-pharma, I-chem). Bosonic statistics underlie photonic quantum computing, where the Hong-Ou-Mandel effect (two indistinguishable photons bunching at a beam splitter) is the basic two-photon gate ingredient, and boson sampling is a near-term quantum-advantage benchmark (see H-photonic, S-bench). Non-abelian anyons are the entire premise of topological quantum computing: braiding them enacts fault-tolerant gates protected by topology, which is what Microsoft's Majorana program pursues (see H-topo, F-berry).

## Key graded claims
- T1 Integer spin → symmetric states (bosons); half-integer spin → antisymmetric states (fermions), forced by relativistic locality — Pauli, Phys. Rev. 58, 716 (1940) (status: established)
- T1 Two-dimensional systems admit anyonic exchange statistics — Leinaas & Myrheim (1977); Wilczek (1982); confirmed via fractional quantum Hall interferometry, Nakamura et al., Nature Physics 16, 931 (2020) (status: established/demonstrated)
- T2 Anyon collider directly measures fractional exchange statistics at filling $\nu = 1/3$ — anyon-anyon collisions give an exchange phase $\theta \approx \pi/3$, matching the predicted $1/3$ statistics — Bartolomei et al., Science 368, 173 (2020) (status: demonstrated)
- T2 Bose-Einstein condensation realizes bosons macroscopically sharing one quantum state — ~2000 rubidium-87 atoms condensed at ~170 nK, Anderson et al., Science 269, 198 (1995), Nobel 2001 (status: established)

## Conflicts / open questions
- Non-abelian anyons (Majorana zero modes) as computational objects remain contested at the device level — see C-majorana-existence (evidence/CONFLICTS.md) and H-topo.

## Go deeper
- Wilczek, "Quantum Mechanics of Fractional-Spin Particles," PRL 49, 957 (1982)
- Nayak et al., "Non-Abelian anyons and topological quantum computation," RMP 80, 1083 (2008)

## Sources
- Pauli, Phys. Rev. 58, 716 (1940). doi:10.1103/PhysRev.58.716
- Nakamura et al., Nature Physics 16, 931 (2020)
- Bartolomei et al., Science 368, 173 (2020). doi:10.1126/science.aaz5601
- Anderson, Ensher, Matthews, Wieman & Cornell, Science 269, 198 (1995). doi:10.1126/science.269.5221.198
