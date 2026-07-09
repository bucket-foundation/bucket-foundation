# QFT / Second-Quantization Bridge · F-qft
**Layer:** L0 Foundations · **Chapter:** §01 · **Status:** depth-complete

## What it is
Quantum field theory promotes fields, and the particles are their quanta: second quantization replaces "a wavefunction for N particles" with creation/annihilation operators acting on Fock space, letting particle number change and making quantum mechanics compatible with special relativity. Dirac quantized the electromagnetic field in 1927, giving the photon a rigorous home; QED, and later the Standard Model, followed. QFT is the deepest experimentally confirmed layer of physics.

## Core idea / key equation
Second quantization writes each field mode as a quantum harmonic oscillator and reads its excitations as particles. A free field expands as $\varphi(x) = \sum_k [a_k f_k(x) + a_k^\dagger f_k^*(x)]$, where $a_k^\dagger$ creates a quantum in mode $k$ and $a_k$ destroys one, obeying the commutator $[a_k, a_{k'}^\dagger] = \delta_{k,k'}$ for bosons (and anticommutators for fermions, which forces the Pauli exclusion principle). The number operator $N_k = a_k^\dagger a_k$ counts quanta in mode $k$, and states live in Fock space built by acting with creation operators on the vacuum $|0\rangle$: $|n\rangle = (a^\dagger)^n/\sqrt{n!}\, |0\rangle$. The whole point is that particle number is now a dynamical variable — an interaction term in the Hamiltonian can turn one quantum into three — which is what a fixed-$N$ wavefunction could never describe and what relativistic processes (pair creation, emission, decay) demand. The single-mode oscillator relation $E_n = \hbar\omega(n + \tfrac{1}{2})$ is the seed of everything, from the photon to the transmon.

## Why it matters for quantum tech
Photonic quantum computing *is* applied field quantization: the qubits and resources are Fock states, squeezed states, and coherent states of light modes, which is the native language of H-photonic and of the bosonic codes in H-bosonic. Circuit QED treats a microwave resonator as a quantized field mode coupled to an artificial atom, and it is the theoretical backbone of superconducting transmon processors (H-supercon), where the same $a/a^\dagger$ algebra sets qubit frequencies and dispersive readout in S-gates and S-bench. Simulating interacting field theories — scattering amplitudes, lattice gauge dynamics — is a headline target for fault-tolerant machines (S-qec), one of the few applications with a proven super-polynomial speedup argument.

## Key graded claims
- [T1] The quantized EM field: emission/absorption from field quanta — Dirac, Proc. R. Soc. A 114, 243 (1927) (status: established)
- [T1] QED is the most precisely verified physical theory: the electron g-2 measurement (0.13 ppt precision) agrees with QED prediction — Fan et al., PRL 130, 071801 (2023), doi:10.1103/PhysRevLett.130.071801 (status: established)
- [T1] The muon magnetic anomaly is now measured to 127 ppb, the most precise muon g-2 result and one of the sharpest QFT tests: the Fermilab Muon g-2 final result (Runs 1–6) agrees with the revised Standard Model prediction — Muon g-2 Collaboration, final result announced June 2025 (submitted to PRL), improving on the 2021/2023 measurements (status: established)
- [T2] Circuit QED — superconducting circuits realizing quantized field–atom physics — is the theoretical backbone of transmon processors: Blais et al., RMP 93, 025005 (2021), arXiv:2005.12667 (status: established)
- [T3] Efficient quantum algorithms exist for simulating scattering in interacting QFTs — Jordan, Lee & Preskill, Science 336, 1130 (2012), arXiv:1111.3633 (status: demonstrated in theory)

## Conflicts / open questions
- Rigorous mathematical construction of interacting 4D QFT (Yang–Mills mass gap) is an open Clay Millennium Problem; QFT + gravity remains unreconciled.
- The muon g-2 anomaly is unresolved rather than closed: the experimental value is now far more precise than theory, and the tension depends on which Standard Model hadronic-vacuum-polarization input (data-driven vs. lattice QCD) is used.

## Go deeper
- Peskin & Schroeder, *An Introduction to QFT* · Weinberg, *The Quantum Theory of Fields* vol. 1

## Sources
- Dirac (1927) doi:10.1098/rspa.1927.0039 · Fan et al. (2023) doi:10.1103/PhysRevLett.130.071801
- Blais et al., RMP 93, 025005 (2021). arXiv:2005.12667
- Fermilab Muon g-2 Collaboration, final result (127 ppb), June 2025 (submitted to PRL); prior: PRL 126, 141801 (2021) and PRL 131, 161802 (2023)
