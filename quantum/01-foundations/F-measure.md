# Measurement & the Born Rule · F-measure
**Layer:** L0 Foundations · **Chapter:** §01 · **Status:** depth-complete

## What it is
Measuring an observable returns one of its eigenvalues, with probability equal to the squared magnitude of the corresponding amplitude — the Born rule. After the measurement the state updates ("collapses") to the outcome's eigenstate (von Neumann's projection postulate), or more generally per the POVM/instrument formalism. The rule is where quantum mechanics touches experiment: everything the theory predicts is a Born-rule probability.

## Core idea / key equation
$P(a)=|\langle a|\psi\rangle|^2$, the probability of outcome $a$ when observable $A$ is measured on state $|\psi\rangle$, where $|a\rangle$ is the eigenstate with eigenvalue $a$. Equivalently the expectation value is $\langle A\rangle=\langle\psi|A|\psi\rangle$, and for a general (mixed) state $P(a)=\mathrm{Tr}(\rho P_a)$ with $P_a$ the projector onto the $a$-eigenspace. The rule is quadratic in the amplitude, which is why it kills the higher-order interference terms a linear or cubic rule would produce — three-path interference must vanish exactly. Gleason's theorem shows this squared-modulus form is forced: on any Hilbert space of dimension $\ge 3$, the only probability measure over projectors that is additive on orthogonal outcomes is $\mathrm{Tr}(\rho P)$. So the "why squared" question has a partial answer — given the Hilbert-space structure and non-contextuality, no other rule is consistent.

## Why it matters for quantum tech
Every quantum computation ends in measurement — the whole game of algorithm design is arranging interference so the Born-rule statistics concentrate on the answer, which is why Grover (S-grover) and Shor (S-shor) both end with a projective readout that samples the amplified peak. Readout fidelity is a first-class hardware metric: dispersive readout of a transmon (H-supercon) probes the cavity to infer $|0\rangle$ vs $|1\rangle$, and state-dependent fluorescence reads an ion (H-ion) at >99.9%. Error correction (S-qec) runs on repeated *non-destructive* stabilizer measurements — the POVM/instrument formalism, projecting only the syndrome and leaving the logical state intact. Measurement statistics also underwrite security: QKD (A-qkd) turns an eavesdropper's unavoidable measurement disturbance into a detectable error rate.

## Key graded claims
- T1 Outcome probabilities are $|\langle a|\psi\rangle|^2$ — Born, Z. Phys. 37, 863 (1926); confirmed in a century of experiments (status: established)
- T1 The Born rule is the only consistent probability assignment on Hilbert spaces of dimension $\ge 3$ given non-contextuality of the measure — Gleason's theorem, J. Math. Mech. 6, 885 (1957) (status: established)
- T1 Direct test of the rule's quadratic form: a three-slit photon experiment bounds genuine third-order (Sorkin) interference to below ~1% of the pairwise term, $\kappa = 0.0064 \pm 0.0119$, consistent with zero — Sinha, Couteau, Jennewein, Laflamme, Weihs, Science 329, 418 (2010), doi:10.1126/science.1190545 (status: established)
- T2 Weak measurements trade information gain against disturbance, allowing partial, non-projective readout — Aharonov, Albert & Vaidman, PRL 60, 1351 (1988); single quantum trajectories of a transmon reconstructed under continuous weak monitoring (readout cavity probed with ~1 photon, near-quantum-limited parametric amplifier) — Murch, Weber, Macklin, Siddiqi, Nature 502, 211 (2013), doi:10.1038/nature12539 (status: demonstrated)
- T2 Step-by-step ("progressive") collapse of a cavity field was watched via repeated QND photon-number measurement with non-absorbing atoms — Guerlin et al. (Haroche group), Nature 448, 889 (2007), doi:10.1038/nature06057; 2012 Nobel (status: demonstrated)

## Conflicts / open questions
- *Why* the Born rule, and what physically happens during collapse, is the measurement problem — unsolved; interpretations disagree (see F-interp). Derivations (decision-theoretic, envariance) remain contested.

## Go deeper
- von Neumann, *Mathematical Foundations of Quantum Mechanics* (1932), ch. VI
- Busch, Lahti & Mittelstaedt, *The Quantum Theory of Measurement* (1996)
- Wiseman & Milburn, *Quantum Measurement and Control* (2009)

## Sources
- Born, "Zur Quantenmechanik der Stoßvorgänge," Z. Phys. 37, 863 (1926). doi:10.1007/BF01397477
- Gleason, J. Math. Mech. 6, 885 (1957)
- Aharonov, Albert, Vaidman, PRL 60, 1351 (1988). doi:10.1103/PhysRevLett.60.1351
- Sinha et al., "Ruling out multi-order interference in quantum mechanics," Science 329, 418 (2010). doi:10.1126/science.1190545
- Murch, Weber, Macklin, Siddiqi, "Observing single quantum trajectories of a superconducting quantum bit," Nature 502, 211 (2013). doi:10.1038/nature12539
- Guerlin et al., "Progressive field-state collapse and quantum non-demolition photon counting," Nature 448, 889 (2007). doi:10.1038/nature06057
