# The PBR Theorem (Reality of the Quantum State) · F-pbr

**Layer:** L0 Foundations · **Chapter:** §01 · **Status:** depth-complete

## What it is
The PBR theorem (Pusey, Barrett & Rudolph, 2012) is a no-go result about what the wavefunction is. Foundations splits interpretations into ψ-ontic (the quantum state is a real property of an individual system) and ψ-epistemic (the state is only information about some deeper underlying "ontic" state $\lambda$, so two different states could correspond to the same reality). PBR proves that ψ-epistemic models are ruled out, given one natural assumption: systems prepared independently have independent physical states (preparation independence). Under that assumption, distinct pure quantum states must correspond to disjoint sets of ontic states — the state is real. The framework is the ontological-models formalism of Harrigan & Spekkens (2010).

## Core idea / key equation
Model each preparation of $|\psi\rangle$ as sampling a hidden ontic state $\lambda$ from a distribution $\mu_\psi(\lambda)$. "ψ-epistemic" means two non-orthogonal states can overlap: there exist $|\psi_0\rangle, |\psi_1\rangle$ with $\mu_0$ and $\mu_1$ sharing support. PBR take $n$ independent copies, each prepared in $|\psi_0\rangle$ or $|\psi_1\rangle$, so the joint ontic state factorizes (preparation independence). If the single-system distributions overlap with probability $q > 0$, then with probability $q^n$ all $n$ systems land in the shared region and the model cannot tell which product state was prepared. PBR construct an entangled measurement on the $n$ copies with an outcome that quantum mechanics assigns probability zero to every prepared product state. A model reproducing those zeros cannot have overlapping $\mu$'s — so distinct pure states are ontologically distinct.

Plain version: if the wavefunction were just our ignorance about a deeper reality, two different wavefunctions could secretly be the same underlying state. PBR show that a joint measurement on independently prepared copies would then sometimes give an outcome quantum theory forbids. Assuming independent preparations are independent, the wavefunction has to be a real feature of the system.

## Why it matters for quantum tech
PBR sets the terms for how we reason about the state as a resource (F-interp, F-qinfo). It joins Bell nonlocality (F-bell) and Kochen-Specker contextuality (F-contextuality) as the third pillar of quantum no-go theorems, together fencing off classical hidden-variable accounts. The ψ-ontic conclusion supports treating unknown states as carrying real, uncopyable information — the ground under no-cloning and the security proofs of QKD (F-nocloning, A-qkd), and under certified-randomness arguments where the state's reality constrains what an adversary can know (A-qrng, O-verification).

## Key graded claims
- [T2] Under preparation independence, no ψ-epistemic model reproduces quantum statistics; distinct pure states are ontologically distinct — Pusey, Barrett & Rudolph, Nat. Phys. 8, 475 (2012), arXiv:1111.3328 (status: established, given the assumption)
- [T2] Without preparation independence, ψ-epistemic models can still reproduce all of quantum theory in dimension $d \ge 2$ — Lewis, Jennings, Barrett & Rudolph, Phys. Rev. Lett. 109, 150404 (2012) (status: established)
- [T3] Experimental tests bound the extent of ontic overlap, constraining epistemic explanations of indistinguishability — Ringbauer et al., Nat. Phys. 11, 249 (2015), arXiv:1412.6213 (status: demonstrated, model-dependent)

## Conflicts / open questions
- The whole result hinges on preparation independence; drop it and epistemic models survive (Lewis et al. 2012), so critics argue PBR constrains a subclass of models rather than closing the question.
- The ontic/epistemic dichotomy assumes an underlying realist λ exists at all — interpretations that reject that framing (relational QM, QBism, Everett) sit outside PBR's target.

## Go deeper
- Harrigan & Spekkens, "Einstein, incompleteness, and the epistemic view of quantum states," Found. Phys. 40, 125 (2010), arXiv:0706.2661
- Leifer, "Is the quantum state real? An extended review of ψ-ontology theorems," Quanta 3, 67 (2014), arXiv:1409.1570

## Sources
- Pusey, Barrett & Rudolph, Nat. Phys. 8, 475 (2012). doi:10.1038/nphys2309, arXiv:1111.3328
- Lewis, Jennings, Barrett & Rudolph, Phys. Rev. Lett. 109, 150404 (2012). doi:10.1103/PhysRevLett.109.150404
- Ringbauer et al., Nat. Phys. 11, 249 (2015). doi:10.1038/nphys3233
