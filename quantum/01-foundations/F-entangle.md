# Entanglement & Nonlocality · F-entangle
**Layer:** L0 Foundations · **Chapter:** §01 · **Status:** depth-complete

## What it is
Two or more systems are entangled when their joint state cannot be written as a product of individual states — the whole carries information that no part carries alone. Measurement outcomes on separated entangled particles show correlations stronger than any local hidden-variable model allows (quantified by Bell inequalities, see F-bell). Einstein, Podolsky and Rosen flagged it as a paradox in 1935; Schrödinger named it *Verschränkung* the same year and called it *the* characteristic trait of quantum mechanics.

## Core idea / key equation
A pure two-party state is entangled when $|\Psi\rangle \ne |\varphi\rangle_A \otimes |\chi\rangle_B$ for any single-system states. The canonical example is the singlet Bell state $|\Psi^-\rangle = (|01\rangle - |10\rangle)/\sqrt{2}$: measure either qubit and you get 0 or 1 at random, but the two results are perfectly anti-correlated no matter how far apart. For mixed states, $\rho$ is separable only if $\rho = \sum_i p_i\, \rho_A^{(i)} \otimes \rho_B^{(i)}$; anything else is entangled. The amount of entanglement in a pure bipartite state is the entanglement entropy $S = -\mathrm{Tr}(\rho_A \log \rho_A)$, where $\rho_A = \mathrm{Tr}_B(|\Psi\rangle\langle\Psi|)$ is the reduced state of one side — $S = 0$ for a product state and $S = 1$ bit ("one ebit") for a maximally entangled qubit pair. Locally you see only the reduced state, which is why entanglement never lets you signal; the correlations only appear when the two measurement records are later compared.

## Why it matters for quantum tech
Entanglement is the workhorse resource. A two-qubit gate (S-gates) is the operation that *creates* it — a CZ or CNOT turns a product state into a Bell state, and multipartite entanglement across a register is what a quantum computer *is*. It powers teleportation (F-teleport), entanglement-based QKD (A-qkd, the E91 protocol), and the stabilizer entanglement that error-correcting codes (S-qec) distribute across physical qubits to protect one logical qubit. Every hardware modality is judged partly on how well it entangles: trapped ions (H-ion) via Mølmer-Sørensen gates, superconducting qubits (H-supercon) via tunable couplers, neutral atoms (H-neutral) via Rydberg blockade, photons (H-photonic) via measurement-induced fusion. Distributing entanglement between distant nodes is the physical layer of the quantum internet.

## Key graded claims
- [T1] Entangled states exist and violate local realism — EPR, Phys. Rev. 47, 777 (1935); Schrödinger, Proc. Camb. Phil. Soc. 31, 555 (1935); experimental record in F-bell (status: established)
- [T1] Entanglement cannot transmit signals — the no-communication theorem keeps quantum correlations consistent with relativity (status: established)
- [T2] Entanglement is a quantifiable, interconvertible resource (entanglement entropy, distillation, monogamy) — Horodecki ×4, Rev. Mod. Phys. 81, 865 (2009), arXiv:quant-ph/0702225 (status: established)
- [T1] Entanglement survives distribution over 1,200 km: the Micius satellite delivered polarization-entangled photon pairs (source ~5.9 million pairs/s) to two ground stations 1,203 km apart, violating a Bell inequality by $S = 2.37 \pm 0.09$ under Einstein locality — Yin et al., Science 356, 1140 (2017), doi:10.1126/science.aan3211 (status: established)
- [T2] Many-body entanglement at high fidelity: a 60-atom neutral-atom array ran parallel two-qubit gates at 99.5% fidelity and produced three-qubit GHZ states at 90.9(6)% raw fidelity, above the surface-code threshold — Evered, Bluvstein et al. (Lukin group), Nature 622, 268 (2023), doi:10.1038/s41586-023-06481-y (status: demonstrated)

## Conflicts / open questions
- Deciding whether an arbitrary mixed state is entangled (the separability problem) is NP-hard in general; multipartite entanglement classification is unfinished mathematics.

## Go deeper
- Horodecki et al., "Quantum entanglement," RMP 81, 865 (2009) — the canonical review
- Nielsen & Chuang §2.6; Preskill lecture notes ch. 4

## Sources
- Einstein, Podolsky, Rosen, Phys. Rev. 47, 777 (1935). doi:10.1103/PhysRev.47.777
- Schrödinger, Proc. Camb. Phil. Soc. 31, 555 (1935). doi:10.1017/S0305004100013554
- Horodecki, Horodecki, Horodecki, Horodecki, RMP 81, 865 (2009). arXiv:quant-ph/0702225
- Yin et al., "Satellite-based entanglement distribution over 1200 kilometers," Science 356, 1140 (2017). doi:10.1126/science.aan3211
- Evered, Bluvstein et al., "High-fidelity parallel entangling gates on a neutral-atom quantum computer," Nature 622, 268 (2023). doi:10.1038/s41586-023-06481-y
