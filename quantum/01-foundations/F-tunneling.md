# Quantum Tunneling · F-tunneling
**Layer:** L0 Foundations · **Chapter:** §01 · **Status:** depth-complete

## What it is
A particle described by a wavefunction has nonzero amplitude on the far side of an energy barrier it could not classically climb, so it can appear there with finite probability. The transmission amplitude falls off exponentially with barrier width and the square root of barrier height. Tunneling was worked out in 1928 by Gamow, and independently Gurney & Condon, to explain alpha decay — the alpha particle escapes the nucleus by tunneling through the Coulomb barrier — and by Fowler & Nordheim for field emission. It is a direct consequence of the Schrödinger equation, with no classical analogue.

## Core idea / key equation
Inside a barrier taller than the particle's energy, the Schrödinger equation gives an evanescent (decaying) wave rather than an oscillating one, so the transmission probability through a barrier of height $V_0$ and width $d$ for a particle of energy $E$ is $T \approx e^{-2\kappa d}$, with the decay constant $\kappa = \sqrt{2m(V_0-E)}/\hbar$. Two features do the work: the dependence is **exponential in width** (double the barrier and the tunneling rate does not halve — it drops by a huge factor), and $\kappa$ scales with the **square root of the barrier height** above the particle's energy. This exponential sensitivity is why alpha-decay half-lives span more than twenty orders of magnitude for a narrow range of decay energies (the Geiger-Nuttall law), and why a scanning tunneling microscope resolves single atoms: the tunneling current changes by about a decade for every 1 Å the tip moves. The Josephson junction is the coherent version, carried by the tunneling amplitude of Cooper pairs rather than the incoherent rate of single particles.

## Why it matters for quantum tech
Tunneling is the physical mechanism inside the Josephson junction: Cooper pairs tunnel coherently across a thin insulating barrier, and the resulting nonlinear inductance is what makes a transmon or flux qubit a usable anharmonic oscillator (see H-supercon). The same $I = I_c\sin\varphi$ relation sets the qubit frequency, the coupling to readout resonators, and the parametric amplifiers that read the qubits out. It is also the readout physics of the scanning tunneling microscope (Binnig & Rohrer, 1981 Nobel 1986) used to image and place the individual dopants and defects that seed some qubit platforms, the operating principle of flash-memory Fowler-Nordheim programming, and the leakage that limits classical transistor scaling. In quantum annealing, tunneling through (rather than thermal hopping over) energy barriers is the proposed source of any advantage (see H-anneal, F-adiabatic), and tunneling matrix elements govern the reaction and electron-transfer rates that molecular quantum simulators aim to compute (see S-qsim, I-chem, I-pharma).

## Key graded claims
- [T1] A quantum particle transmits through a classically forbidden barrier with exponentially suppressed probability — Gamow (1928); Gurney & Condon, Nature 122, 439 (1928) (status: established)
- [T1] Cooper-pair tunneling across a Josephson junction obeys $I = I_c\sin\varphi$, $d\varphi/dt = 2eV/\hbar$ — Josephson, Phys. Lett. 1, 251 (1962), Nobel 1973 (status: established)
- [T2] The scanning tunneling microscope resolves single atoms because the tunneling current decays ~1 order of magnitude per 1 Å of tip-sample gap, giving ~0.1 nm lateral and ~0.01 nm vertical resolution — Binnig, Rohrer, Gerber & Weibel, PRL 49, 57 (1982), Nobel 1986 (status: established)
- [T3] The tunneling delay time in strong-field ionization of atomic hydrogen is zero within an uncertainty of 12 attoseconds (attoclock) — Sainadh et al., Nature 568, 75 (2019) (status: demonstrated, interpretation debated)

## Conflicts / open questions
- Tunneling *time* — how long a particle "spends" in the barrier — remains debated (Hartman effect, attoclock experiments); no impact on device physics.

## Go deeper
- Razavy, *Quantum Theory of Tunneling* (2003)
- Tinkham, *Introduction to Superconductivity*, ch. 6 (Josephson effects)

## Sources
- Gamow, Z. Phys. 51, 204 (1928)
- Josephson, Phys. Lett. 1, 251 (1962). doi:10.1016/0031-9163(62)91369-0
- Binnig, Rohrer, Gerber & Weibel, PRL 49, 57 (1982). doi:10.1103/PhysRevLett.49.57 · Nobel Prize in Physics 1986
- Sainadh et al., Nature 568, 75 (2019). doi:10.1038/s41586-019-1028-3
