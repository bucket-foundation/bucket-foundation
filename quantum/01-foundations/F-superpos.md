# Superposition & the State Vector · F-superpos
**Layer:** L0 Foundations · **Chapter:** §01 · **Status:** depth-complete

## What it is
A quantum system is described by a state vector $|\psi\rangle$ in a Hilbert space, and any normalized linear combination of valid states is itself a valid state. Before measurement the system holds all components of the combination at once, with complex amplitudes; the amplitudes interfere, which is what separates quantum from classical probability. This is the first postulate of quantum mechanics and the raw resource behind everything downstream.

## Core idea / key equation
$|\psi\rangle = \sum_i c_i |i\rangle$ with complex amplitudes $c_i$ obeying $\sum_i |c_i|^2 = 1$. For a single qubit this is $|\psi\rangle = \alpha|0\rangle + \beta|1\rangle$ with $|\alpha|^2 + |\beta|^2 = 1$ — a point on the Bloch sphere (see F-qubit). The content is Dirac's superposition principle: add any two allowed states with complex weights and you get another allowed state. The weights carry a phase, and phases add and cancel — that is interference. A classical mixture sums probabilities; a quantum superposition sums amplitudes and squares the total (see the Born rule, F-measure), so cross terms $2\,\mathrm{Re}(c_i^* c_j)$ appear that have no classical analog. Everything quantum — interference fringes, entanglement, algorithmic speedup — traces back to this one linearity axiom.

## Why it matters for quantum tech
An $n$-qubit register in superposition spans $2^n$ amplitudes simultaneously — the state space quantum algorithms compute in. A physical qubit realizes $|\psi\rangle = \alpha|0\rangle + \beta|1\rangle$ as two circulating supercurrent directions on a transmon (H-supercon), two hyperfine levels of an ion (H-ion), or two Rydberg/ground states of a neutral atom (H-neutral). Interference between amplitudes is how algorithms extract answers: Shor's algorithm (S-shor) routes the right period into a constructive peak of the quantum Fourier transform (F-qft), and Grover's search (S-grover) amplifies the marked amplitude by repeated reflection. Single-qubit gates (S-gates) are exactly the operations that rotate a superposition on the Bloch sphere. The frontier question — how large a superposition survives — is set by decoherence (F-decoher), which is why coherence time bounds every architecture.

## Key graded claims
- T1 Physical states superpose linearly; interference of single particles is observed directly — Schrödinger, Ann. Phys. 384, 361 (1926); Dirac, *Principles of Quantum Mechanics* (1930); single-electron double-slit buildup, Tonomura et al., Am. J. Phys. 57, 117 (1989) (status: established)
- T1 Matter-wave interference holds for whole molecules: C60 buckyballs (720 amu, de Broglie wavelength ~2.5 pm, ~400× smaller than the molecule) diffracted through a 100 nm-period grating — Arndt, Nairz, Vos-Andreae, Keller, van der Zouw, Zeilinger, Nature 401, 680 (1999), doi:10.1038/44348 (status: established)
- T2 Superposition persists in ever-larger objects: matter-wave interference demonstrated for functionalized oligoporphyrin molecules beyond 25 kDa (~2,000 atoms, ~2×10⁴ amu) in a Talbot-Lau interferometer — Fein et al., Nat. Phys. 15, 1242 (2019), doi:10.1038/s41567-019-0663-9 (status: demonstrated)

## Conflicts / open questions
- Where (if anywhere) superposition breaks for macroscopic objects is the empirical frontier — objective-collapse models predict a scale limit; interferometry keeps pushing it upward (see F-interp, F-decoher).

## Go deeper
- Dirac, *Principles of QM*, ch. 1 (the superposition principle stated as the axiom)
- Nielsen & Chuang, *Quantum Computation and Quantum Information*, §2.1
- Arndt & Hornberger, Nat. Phys. 10, 271 (2014) — testing the limits review

## Sources
- Fein et al., "Quantum superposition of molecules beyond 25 kDa," Nat. Phys. 15, 1242–1245 (2019). doi:10.1038/s41567-019-0663-9
- Arndt et al., "Wave–particle duality of C60 molecules," Nature 401, 680–682 (1999). doi:10.1038/44348
- Tonomura et al., Am. J. Phys. 57, 117 (1989). doi:10.1119/1.16104
