# Error mitigation as a discipline · S-errmit
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
The technique taxonomy that `S-nisq` names in passing, treated as its own layer because it now sits *underneath* early fault tolerance, not only on bare NISQ. Error mitigation reduces bias in an estimated **expectation value** by spending extra circuit runs; it does not protect a quantum state (that is correction, `S-qec`). The main families (Cai et al., Rev. Mod. Phys. 95, 045005, 2023):
- **Zero-Noise Extrapolation (ZNE)** — run at amplified noise, extrapolate to zero.
- **Probabilistic Error Cancellation (PEC)** — learn the noise, invert it via a quasiprobability sum (unbiased, exponential sampling cost).
- **Symmetry verification / post-selection** — discard runs that violate a known conserved quantity.
- **Virtual distillation / ESD** — prepare $M$ copies and measure to suppress errors as the state's purity, cancelling incoherent noise to $O(1/M)$.
- **Probabilistic Error Amplification (PEA)** — the learned-noise-model backbone of IBM's 2023 utility experiment.
- **Learning-based / Clifford-data regression** — train the correction on classically simulable Clifford circuits.

## Where it stands (2025–26)
The defining theoretical result is a hard ceiling: the sampling overhead of *any* mitigation grows **exponentially** with circuit depth and fault rate (Takagi et al.; Quek et al., "exponentially tighter bounds," Nat. Phys. 2024). So mitigation is a constant-to-polynomial extension of reach, never an asymptotic fix — this is what separates it from correction as a matter of principle. The 2025 shift is that mitigation is being layered **on top of logical qubits**: demonstrations of error mitigation applied to already-error-corrected circuits (Nat. Commun. 2025) and "mitigation for early fault tolerance" show the discipline surviving into the FTQC transition rather than being abandoned with NISQ. PEC and PEA also power the standing (and contested) utility-scale expectation-value claims that tensor networks (`S-tensornet`) keep answering.

## Key graded claims
- T2 Comprehensive discipline review; ZNE/PEC/symmetry/virtual-distillation taxonomy — Cai et al., Rev. Mod. Phys. 95, 045005 (2023) (established)
- T2 Exponential sampling-overhead lower bound for generic mitigation — Quek et al., Nat. Phys. 20 (2024); Takagi et al., npj QI (2022) (established)
- T2 Virtual distillation suppresses errors as $O(1/M)$ in copy number — Huggins et al., PRX 11, 041036 (2021); Koczor, PRX 11, 031057 (2021) (established)
- T2 Mitigation demonstrated on logical qubits — Nat. Commun. (2025), s41467-025-67768-4 (peer-reviewed)

## Speedup / caveat
Never a speedup — a bias-reduction technique bought with exponentially many shots in the worst case. The rule follows directly (`evidence/SCHEMA.md`): any advantage claim resting on mitigation alone is exposed to classical counterattack, because a circuit shallow enough for mitigation to converge is usually shallow enough to simulate (`S-tensornet`). Mitigation's honest role is to buy accuracy on small logical devices during the early-FT window.

## Conflicts / open questions
Where the crossover sits — at what device quality does adding a logical layer beat spending the same resources on more mitigation shots? Whether learning-based mitigation generalizes beyond the Clifford-regression regime it is trained on.

## Sources
Rev. Mod. Phys. 95, 045005 (2023); Nat. Phys. 20 (2024); PRX 11, 041036 (2021); PRX 11, 031057 (2021); Nat. Commun. (2025). Cross-links: `S-nisq`, `S-qec`, `S-tensornet`, `S-bench`, `O-advantage`.
