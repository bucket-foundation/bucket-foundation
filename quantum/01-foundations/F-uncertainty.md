# Uncertainty & Complementarity · F-uncertainty
**Layer:** L0 Foundations · **Chapter:** §01 · **Status:** depth-complete

## What it is
Conjugate observables (position/momentum, phase/number, orthogonal spin axes) cannot both have sharp values in the same state: $\Delta x\,\Delta p \ge \hbar/2$. Heisenberg found the physics in 1927; Kennard and Robertson made it a theorem about state preparation — the bound follows from the operators failing to commute, with no reference to measurement clumsiness. Bohr's complementarity is the companion idea: wave and particle descriptions are mutually exclusive but jointly necessary, and which one shows up depends on the experimental arrangement.

## Core idea / key equation
The sharp statement is Robertson's: for any two observables $A$ and $B$ in any state, $\Delta A\cdot\Delta B \ge \tfrac{1}{2}|\langle[A,B]\rangle|$, where $\Delta A$ is the standard deviation and $[A,B] = AB - BA$ is the commutator. For position and momentum $[x, p] = i\hbar$, so the right side is $\hbar/2$ and you recover $\Delta x\,\Delta p \ge \hbar/2$. The content is that the bound comes from the algebra — non-commuting operators cannot share a full set of eigenstates, so no state makes both spreads zero. This is a fact about how states are prepared, with no clumsy-measurement story attached; the Cauchy–Schwarz inequality applied to the two operators acting on the state is the whole proof. The entropic version replaces variances (which behave badly for periodic or discrete observables) with Shannon entropies of the measurement outcomes: $H(A) + H(B) \ge \log(1/c)$, where $c$ is the largest squared overlap between the two observables' eigenbases. The entropic form is state-independent and is the one QKD proofs actually use.

## Why it matters for quantum tech
Uncertainty relations set the noise floor of quantum sensing — the standard quantum limit — and they define what squeezing can and cannot buy: pushing noise below the limit in one quadrature by paying it back in the conjugate one. This is the physics LIGO's squeezed-light injection exploits, and the same trade governs bosonic sensing and error correction (H-bosonic). The entropic form underwrites the security proofs behind QKD (S-qkd → A-qkd), where an eavesdropper's information about one basis is bounded by their ignorance of the conjugate basis. Complementarity — the impossibility of reading which-path information without killing the interference — is the operational lever behind interferometric sensors and photonic protocols (H-photonic).

## Key graded claims
- [T1] Preparation uncertainty: $\Delta A\,\Delta B \ge \tfrac{1}{2}|\langle[A,B]\rangle|$ — Heisenberg, Z. Phys. 43, 172 (1927); Kennard, Z. Phys. 44, 326 (1927); Robertson, Phys. Rev. 34, 163 (1929) (status: established)
- [T1] Entropic form: $H(A) + H(B) \ge \log(1/c)$ — Maassen & Uffink, PRL 60, 1103 (1988); extended with quantum memory, Berta et al., Nat. Phys. 6, 659 (2010) (status: established)
- [T2/T3] Measurement error–disturbance versions of the relation are formalization-dependent: Ozawa's reformulation (PRA 67, 042105, 2003) was supported by neutron/photon experiments, while Busch–Lahti–Werner (PRL 111, 160405, 2013) prove a Heisenberg-type bound under different error definitions (status: contested)
- [T2] Squeezing beats the quantum noise floor in a working instrument: frequency-dependent squeezed vacuum injected into the LIGO detectors during observing run O4 cut quantum noise by 5.8 dB (a factor of 1.9) at Livingston and 4.0 dB at Hanford, surpassing the standard quantum limit by up to 3 dB in the 35–75 Hz band — LIGO O4 Detector Collaboration, "Broadband Quantum Enhancement of the LIGO Detectors with Frequency-Dependent Squeezing," PRX 13, 041021 (2023) (status: demonstrated)

## Conflicts / open questions
- The error–disturbance dispute is about which operational definition of "measurement error" is the right one — both camps' theorems are correct under their own definitions.

## Go deeper
- Coles et al., "Entropic uncertainty relations and their applications," RMP 89, 015002 (2017)

## Sources
- Heisenberg (1927) doi:10.1007/BF01397280 · Robertson (1929) doi:10.1103/PhysRev.34.163
- Ozawa, PRA 67, 042105 (2003) · Busch, Lahti, Werner, PRL 111, 160405 (2013). arXiv:1306.1565
- LIGO O4 Detector Collaboration, PRX 13, 041021 (2023). doi:10.1103/PhysRevX.13.041021
