# Teleportation & Entanglement Swapping · F-teleport
**Layer:** L0 Foundations · **Chapter:** §01 · **Status:** depth-complete

## What it is
Quantum teleportation transfers an unknown state from Alice to Bob using one shared entangled (EPR) pair and two classical bits — no quantum system travels between them, and the original is destroyed (consistent with no-cloning, see F-nocloning). Alice performs a joint Bell-state measurement on her qubit and her half of the pair, sends the two-bit outcome, and Bob applies one of four Pauli corrections to recover the exact state. Bennett, Brassard, Crépeau, Jozsa, Peres & Wootters proposed it in 1993. **Entanglement swapping** (Żukowski, Zeilinger, Horne & Ekert, 1993) is teleportation applied to a member of another entangled pair, so two particles that never interacted end up entangled — the primitive that lets a repeater stitch short entangled links into a long one.

## Core idea / key equation
The identity that makes it work is a rewriting of three qubits. Alice holds the unknown state $|\psi\rangle = \alpha|0\rangle + \beta|1\rangle$ and one half of a shared Bell pair; Bob holds the other half. Expand the joint three-qubit state in the **Bell basis** of Alice's two qubits and it factors exactly into four terms: $|\psi\rangle|\Phi^+\rangle_{AB} = \tfrac{1}{2}\sum_i (\text{Alice's Bell state})_i \otimes (U_i|\psi\rangle)_\text{Bob}$, where the four $U_i$ are the Pauli operators $I, X, Z, XZ$. Alice's Bell measurement collapses the sum to one term at random and tells her which $i$ occurred (two classical bits). Bob's qubit is then $U_i|\psi\rangle$, so applying $U_i^{-1}$ — one of $I, X, Z$, or $ZX$ — recovers $|\psi\rangle$ exactly. The two classical bits are mandatory: before Bob hears them his qubit is the maximally mixed state $I/2$, carrying no information, which is why teleportation transmits nothing faster than light and never clones ($\alpha$ and $\beta$ are never measured, only moved). Entanglement swapping is the same identity with $|\psi\rangle$ itself half of another Bell pair.

## Why it matters for quantum tech
Teleportation is the workhorse of quantum networking and modular computing. Entanglement swapping is how quantum repeaters beat photon loss to build a long-range quantum internet (see A-qinternet). Teleporting gates ("gate teleportation") moves logical information between error-correction blocks and is how magic states are consumed in fault-tolerant circuits — the T-gate that universalizes the Clifford group is applied by teleporting through a magic state (see S-logical, S-qec, F-contextuality). Chip-to-chip and fridge-to-fridge links in modular architectures rely on teleported entanglement (see H-intercon, O-interconnect-loss), and the same photonic Bell-measurement primitive is the fusion operation in measurement-based photonic computing (see H-photonic). Distributed multi-node quantum computing over ion or NV registers stitches processors together by teleporting logical qubits between them (see H-ion). First photonic demonstrations came in 1997 (Innsbruck; Rome).

## Key graded claims
- T1 An unknown state is teleported with one EPR pair + two classical bits — Bennett et al., PRL 70, 1895 (1993) (status: established)
- T1 Entanglement swapping entangles independent, never-interacting particles — Żukowski, Zeilinger, Horne & Ekert, PRL 71, 4287 (1993) (status: established)
- T2 Deterministic teleportation between distant nodes demonstrated — Pfaff et al., Science 345, 532 (2014, NV centers 3 m); ground-to-satellite, Ren et al., Nature 549, 70 (2017) (status: demonstrated)
- T2 Free-space teleportation over 143 km with active feed-forward, fidelity above the $2/3$ classical bound — Ma et al., Nature 489, 269 (2012), La Palma to Tenerife (status: demonstrated)
- T2 Teleportation between non-neighboring nodes of a three-node quantum network, using entanglement swapping on the middle node plus a memory qubit — Hermans et al., Nature 605, 663 (2022), NV-center registers in Delft (status: demonstrated)

## Conflicts / open questions
- None foundational. Engineering frontier is fidelity and rate over lossy links and quantum memories (see A-qmemory-hw, O-interconnect-loss).

## Go deeper
- Bennett & Wiesner dense coding, PRL 69, 2881 (1992) (dual protocol)
- Pirandola et al., "Advances in quantum teleportation," Nature Photonics 9, 641 (2015)

## Sources
- Bennett et al., PRL 70, 1895 (1993). doi:10.1103/PhysRevLett.70.1895
- Żukowski et al., PRL 71, 4287 (1993). doi:10.1103/PhysRevLett.71.4287
- Ma et al., Nature 489, 269 (2012). doi:10.1038/nature11472
- Hermans et al., Nature 605, 663 (2022). doi:10.1038/s41586-022-04697-y
