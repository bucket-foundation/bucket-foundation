# The Qubit & Bloch Sphere · F-qubit
**Layer:** L0 Foundations · **Chapter:** §01 · **Status:** depth-complete

## What it is
The qubit is the unit of quantum information: any two-level quantum system, whose pure states are $\alpha|0\rangle + \beta|1\rangle$ with $|\alpha|^2 + |\beta|^2 = 1$. Up to global phase, every pure qubit state maps to a point on the surface of a unit sphere — the Bloch sphere — with mixed states filling the interior. Single-qubit gates are rotations of this sphere. The term "qubit" was coined by Benjamin Schumacher in 1995; the geometric picture descends from Bloch's treatment of spin-½ and the Poincaré sphere for polarization.

## Core idea / key equation
A pure qubit state is $|\psi\rangle = \cos(\theta/2)|0\rangle + e^{i\varphi} \sin(\theta/2)|1\rangle$, with $0 \le \theta \le \pi$ and $0 \le \varphi < 2\pi$. The two angles $(\theta, \varphi)$ are the polar and azimuthal coordinates of a point on a unit sphere, so every pure state is one point on the surface. The general (possibly mixed) state is the density matrix $\rho = \tfrac{1}{2}(I + \mathbf{r}\cdot\boldsymbol{\sigma})$, where $\boldsymbol{\sigma} = (\sigma_x, \sigma_y, \sigma_z)$ are the Pauli matrices and $\mathbf{r}$ is the Bloch vector; $|\mathbf{r}| = 1$ is the pure-state surface and $|\mathbf{r}| < 1$ is the mixed interior, with $\mathbf{r} = 0$ the maximally mixed center. This works because a $2\times 2$ Hermitian, unit-trace, positive matrix has exactly three real free parameters, the components of $\mathbf{r}$. A unitary gate acts as $U \rho U^\dagger$ and rotates $\mathbf{r}$ rigidly about some axis — the group is SU(2), the double cover of the rotation group SO(3), which is why a $2\pi$ turn of the Bloch vector corresponds to a $4\pi$ turn in SU(2) and picks up a physical sign. Two real numbers describe the state; one global phase is unobservable and drops out.

## Why it matters for quantum tech
The qubit is the abstraction that makes hardware interchangeable: transmons (H-supercon), trapped ions (H-ion), photons (H-photonic), neutral atoms (H-neutral), and spins in silicon (H-silicon) all implement the same Bloch-sphere object, so algorithms and error correction are written once against it. Every single-qubit gate in S-gates is a named Bloch rotation (X, Y, Z, Hadamard, T), and a gate's fidelity is literally the accuracy of that rotation, extracted by randomized benchmarking in S-bench. Error correction (S-qec) is built on the same picture — a logical qubit is a Bloch sphere protected inside many physical ones. Continuous-variable hardware breaks the two-level frame and uses an infinite-dimensional mode instead (H-bosonic).

## Key graded claims
- T1 Any two-level system's pure states are parameterized by two real angles $(\theta, \varphi)$ on a sphere; unitaries are SU(2) rotations — Bloch, Phys. Rev. 70, 460 (1946); Feynman, Vernon & Hellwarth, J. Appl. Phys. 28, 49 (1957) (status: established)
- T1 "Qubit" and the qubit as the quantum information unit: Schumacher, "Quantum coding," PRA 51, 2738 (1995) (status: established)
- T2 What a physical system needs to serve as a qubit register is codified in the DiVincenzo criteria — DiVincenzo, Fortschr. Phys. 48, 771 (2000), arXiv:quant-ph/0002077 (status: established)
- T2 A single physical qubit can be controlled at the six-nines level: a ⁴³Ca⁺ trapped-ion hyperfine "clock" qubit reached average single-qubit gate fidelity 99.9999% (error $\approx 1\times 10^{-6}$), memory coherence $T_2^* = 50$ s, and combined prep+readout 99.93%, all in a room-temperature surface trap — Harty et al., PRL 113, 220501 (2014), arXiv:1403.1524 (status: demonstrated)
- T2 The record has since improved by an order of magnitude: single-qubit gate error $1.5(4)\times 10^{-7}$ in a trapped-ion qubit — Oxford group, arXiv:2412.04421 (2024) (status: demonstrated)

## Conflicts / open questions
- Qudits (d-level) and continuous-variable/bosonic encodings compete with the two-level abstraction in some hardware (see H-bosonic); which unit wins per modality is an engineering question, still open.

## Go deeper
- Nielsen & Chuang §1.2, §4.2; Preskill notes ch. 2

## Sources
- Schumacher, PRA 51, 2738 (1995). doi:10.1103/PhysRevA.51.2738
- DiVincenzo (2000). arXiv:quant-ph/0002077
- Bloch, Phys. Rev. 70, 460 (1946). doi:10.1103/PhysRev.70.460
- Harty et al., PRL 113, 220501 (2014). arXiv:1403.1524 · Oxford single-qubit $10^{-7}$ gate, arXiv:2412.04421 (2024)
