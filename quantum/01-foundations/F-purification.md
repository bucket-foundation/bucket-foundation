# Purification & Stinespring Dilation · F-purification

**Layer:** L0 Foundations · **Chapter:** §01 · **Status:** depth-complete

## What it is
Purification says every mixed state is the shadow of a pure state living on a larger space: for any density matrix $\rho_A$ there is a pure state $|\psi\rangle_{AB}$ on a joint system such that $\rho_A = \mathrm{Tr}_B |\psi\rangle\langle\psi|$. Stinespring's dilation theorem (1955) is the channel-level version: every physical evolution — every completely positive trace-preserving (CPTP) map — is a unitary (isometry) into a bigger space followed by discarding the added part. Together they are the formal content of what John Smolin nicknamed the "church of the larger Hilbert space": mixedness and irreversibility are never fundamental; they are what remains after you throw away access to a purifying partner. Uhlmann (1976) sharpened purification into a formula for fidelity between mixed states.

## Core idea / key equation
Purification: given $\rho_A = \sum_i p_i |i\rangle\langle i|$, define $|\psi\rangle_{AB} = \sum_i \sqrt{p_i}\, |i\rangle_A |i\rangle_B$ on $\mathcal{H}_A \otimes \mathcal{H}_B$ with $\dim \mathcal{H}_B \ge \operatorname{rank} \rho_A$; then $\mathrm{Tr}_B |\psi\rangle\langle\psi| = \rho_A$. The purification is unique up to a unitary on $B$.

Stinespring: any CPTP map $\mathcal{E}$ on $\mathcal{H}_A$ can be written $\mathcal{E}(\rho) = \mathrm{Tr}_E[V \rho V^\dagger]$, where $V: \mathcal{H}_A \to \mathcal{H}_A \otimes \mathcal{H}_E$ is an isometry ($V^\dagger V = I$) into a system-plus-environment space. Equivalently $\mathcal{E}(\rho) = \sum_k K_k \rho K_k^\dagger$ with $\sum_k K_k^\dagger K_k = I$ (Kraus form); the $K_k$ are the isometry's components along an environment basis. Minimal dilation dimension is the Kraus rank, $\le (\dim \mathcal{H}_A)^2$.

Plain version: any noisy or lossy process you run in the lab is a clean reversible rotation on your system plus a hidden meter, with the meter then ignored. Noise is entanglement with something you stopped tracking.

## Why it matters for quantum tech
This is the backbone of quantum error correction and open-system engineering. Modeling decoherence as a CPTP channel (via Stinespring/Kraus) is how amplitude damping, dephasing, and depolarizing noise get simulated and how threshold theorems are proved (S-qec, F-decoher). Purification underlies entanglement measures, thermofield-double states, and the environment "monitoring" picture of einselection (F-decoher, F-qinfo). It is the channel twin of Naimark dilation for measurements (F-povm) and the engine behind teleportation-based error correction and remote state preparation (F-teleport). Randomized benchmarking and process tomography assume the Kraus/Stinespring structure (O-tomography). In quantum thermodynamics and black-hole information debates, "purify the environment" is the standard move (F-interp).

## Key graded claims
- [T1] Every CPTP map equals an isometry into a larger space followed by partial trace (Stinespring dilation) — Stinespring, Proc. Amer. Math. Soc. 6, 211 (1955) (status: established)
- [T1] Every mixed state has a pure purification on a doubled space, unique up to a unitary on the ancilla — standard corollary; textbook Nielsen & Chuang §2.5 (status: established)
- [T2] Fidelity between mixed states equals the maximal overlap over all purifications — Uhlmann, Rep. Math. Phys. 9, 273 (1976) (status: established)

## Conflicts / open questions
- None mathematically. The interpretive question is whether the purifying partner is a real physical system or a formal device; the "church of the larger Hilbert space" is a modeling stance, and Stinespring's non-uniqueness means many physical environments realize the same channel.

## Go deeper
- Nielsen & Chuang, §2.5 (purification) and §8.2 (quantum operations, Kraus/Stinespring)
- Paulsen, *Completely Bounded Maps and Operator Algebras* (2002), Ch. 4 (Stinespring, rigorous)

## Sources
- Stinespring, Proc. Amer. Math. Soc. 6, 211 (1955). doi:10.1090/S0002-9939-1955-0069403-4
- Uhlmann, Rep. Math. Phys. 9, 273 (1976). doi:10.1016/0034-4877(76)90060-4
- Choi, Linear Algebra Appl. 10, 285 (1975). doi:10.1016/0024-3795(75)90075-0
