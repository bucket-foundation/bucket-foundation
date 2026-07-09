# Noise, NISQ & error mitigation · S-nisq
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
NISQ — Noisy Intermediate-Scale Quantum, coined by Preskill (2018) — names the current era: 50–1,000+ physical qubits at error rates around $10^{-3}$, too noisy for deep circuits and too few for full error correction (`S-qec`). Error **mitigation** trades extra circuit runs for accuracy without encoding logical qubits. The two workhorses (Temme et al. 2017): **Zero-Noise Extrapolation (ZNE)** runs the circuit at deliberately amplified noise (gate folding or pulse stretching), then extrapolates the observable back to the zero-noise limit; **Probabilistic Error Cancellation (PEC)** learns a noise model and inverts it by sampling from a quasiprobability decomposition, which is unbiased but carries a sampling overhead that grows exponentially in circuit size. Mitigation is not correction — it reduces bias in an *estimated expectation value*, it does not protect a quantum state. It sits distinct enough from correction to deserve its own discipline card (`S-errmit`).

## Where it stands (2025–26)
IBM's 2023 "utility" experiment — a 127-qubit kicked-Ising circuit with ZNE (Nature) — was the high-water mark of the mitigation era, and was matched within weeks by classical tensor-network methods running on a laptop (`S-tensornet`). That exchange set the field's expectations: mitigation extends the reach of noisy hardware by a constant factor, while theory shows generic mitigation costs grow **exponentially** with circuit depth and fault rate (Takagi et al.; Quek et al., Nat. Phys. 2024, giving exponentially tighter lower bounds). The field's center of gravity moved to early fault tolerance (`S-qec`, `S-logical`); mitigation persists as a complement layered on top of small logical devices, and 2025 work demonstrates mitigation *on logical qubits* (Nat. Commun. 2025). The reference implementation names ZNE and readout calibration as its own natural next lever against the hardware-noise floor (`reference-impl/MATH.md` §7).

## Key graded claims
- [T2] Preskill's NISQ framing — arXiv:1801.00862, Quantum 2, 79 (2018) (established as terminology)
- [T2] 127-qubit kicked-Ising beyond brute-force simulation — Kim et al., Nature 618, 500 (2023) (demonstrated)
- [T2] Same observables reproduced classically with tensor networks — Tindall et al., PRX Quantum 5, 010308 (2024) (contested→resolved: classical matched it)
- [T2] Error mitigation has exponential sampling overhead in general — Quek et al., Nat. Phys. 20 (2024); Takagi et al. (established)
- [T2] ZNE/PEC origins — Temme–Bravyi–Gambetta, PRL 119, 180509 (2017) (established)

## Speedup / caveat
Mitigation buys accuracy at sampling cost and **never** creates asymptotic speedup. Any "utility" claim demonstrated with mitigation alone is exposed to classical counterattack by construction — if the hardware is shallow enough for mitigation to work, it is usually shallow enough for tensor networks to simulate (`S-tensornet`, `O-advantage`).

## Conflicts / open questions
Whether any mitigated-NISQ computation will ever beat the best classical method on a problem anyone cares about. The 2023–25 record is uniformly negative once a competent classical team responds (conflict `C-nisq-utility`).

## Sources
arXiv:1801.00862; Nature 618, 500 (2023); PRX Quantum 5, 010308 (2024); Nat. Phys. 20 (2024); PRL 119, 180509 (2017). Cross-links: `S-errmit`, `S-qec`, `S-tensornet`, `reference-impl/`, `O-advantage`.
