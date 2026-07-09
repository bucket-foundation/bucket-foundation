# Quantum Thermodynamics · F-qthermo
**Layer:** L0 Foundations · **Chapter:** §01 · **Status:** depth-complete

## What it is
Thermodynamics rebuilt for single quantum systems, where work and heat are stochastic, information is physical, and coherence itself enters the energy books. Anchors: Landauer's principle (erasing one bit costs at least $kT\ln 2$), Bennett's resolution of Maxwell's demon via erasure cost, fluctuation theorems (Jarzynski, Crooks) that hold arbitrarily far from equilibrium, and resource-theoretic "second laws" for quantum states.

## Core idea / key equation
The founding law is **Landauer's principle**: erasing one bit of information forces the environment to absorb at least $kT\ln 2$ of heat — about $3\times 10^{-21}$ J, or 0.018 eV, at room temperature ($T = 300$ K, $k$ = Boltzmann's constant). Reversible computation dodges this floor; the cost lands only when information is discarded. That is how Bennett exorcised Maxwell's demon: the demon must eventually reset its memory, and that erasure pays back exactly the work it appeared to conjure. Away from equilibrium the accounting sharpens into the **Jarzynski equality**, $\langle e^{-\beta W}\rangle = e^{-\beta\Delta F}$, with $\beta = 1/kT$. Read it plainly: take the stochastic work $W$ done in any drive of the system — fast or slow, gentle or violent — repeat the drive many times, average $e$ to the minus-$\beta W$ over those runs, and the result equals $e$ to the minus-$\beta$ times the equilibrium free-energy change $\Delta F$. A free-energy difference, an equilibrium quantity, is recovered from irreversible non-equilibrium pulls. Crooks' theorem refines this into a symmetry between the forward and reverse work distributions.

## Why it matters for quantum tech
Sets the energetic floor of computation and the physics of cooling: dilution refrigerators, algorithmic cooling, and the (open) question of the true energy cost per logical qubit of a fault-tolerant machine. Landauer's $kT\ln 2$ is the hard floor beneath every erasure in a quantum error-correction cycle — each syndrome reset and each measurement discard has a thermodynamic price that scales with the code's overhead (see S-qec, S-logical). Trapped-ion and superconducting platforms run their whole logic inside milli-kelvin baths, so the wall-plug cost of pumping that heat out dominates system power budgets (see H-ion, H-supercon). Quantum heat engines and absorption refrigerators are candidate on-chip coolers for keeping qubits near their ground state, and fluctuation theorems give the estimation tools for reading free energies out of the noisy, driven dynamics that quantum simulators produce (see S-qsim).

## Key graded claims
- T1 Erasure of one bit dissipates $\ge kT\ln 2$ — Landauer, IBM J. Res. Dev. 5, 183 (1961); demon exorcised by erasure cost, Bennett, Int. J. Theor. Phys. 21, 905 (1982) (status: established)
- T2 Landauer's bound verified experimentally — classically with a colloidal particle (Bérut et al., Nature 483, 187, 2012) and in the quantum regime with a trapped ion (Yan et al., PRL 120, 210601, 2018) (status: demonstrated)
- T2 Single-atom heat engine operated with one trapped ion — Roßnagel et al., Science 352, 325 (2016), doi:10.1126/science.aad6320 (status: demonstrated)
- T2 Quantum coherence measurably increases the power output of a microscopic engine in the small-action regime — Klatzow et al., PRL 122, 110601 (2019), NV-center working fluid in diamond (status: demonstrated)
- T2 Fluctuation theorems: $\langle e^{-\beta W}\rangle = e^{-\beta\Delta F}$ — Jarzynski, PRL 78, 2690 (1997); quantum versions established (status: established)

## Conflicts / open questions
- Definitions of work and heat for coherent quantum systems remain multiple and inequivalent; whether quantum coherence/entanglement give thermodynamic advantage in engines is case-by-case, still contested.

## Go deeper
- Goold et al., "The role of quantum information in thermodynamics," J. Phys. A 49, 143001 (2016), arXiv:1505.07835
- Vinjanampathy & Anders, Contemp. Phys. 57, 545 (2016), arXiv:1508.06099

## Sources
- Landauer (1961) doi:10.1147/rd.53.0183 · Jarzynski (1997) doi:10.1103/PhysRevLett.78.2690
- Roßnagel et al., Science 352, 325 (2016) · Yan et al., PRL 120, 210601 (2018)
- Klatzow et al., PRL 122, 110601 (2019). doi:10.1103/PhysRevLett.122.110601
