# The NISQ era (Preskill 2018) · T-nisq
**Layer:** L6 History · **Chapter:** §07 · **Status:** depth

## The arc
By 2017 the field needed a word for the machines it was actually building. They were no longer the handful-of-qubit demos of the 2000s, and they were nowhere near the fault-tolerant, error-corrected computers of theory. They were processors with roughly 50–100 physical qubits, imperfect gates, and no error correction — powerful enough to be hard to simulate classically, too noisy to run a deep useful circuit. John Preskill supplied the name in a December 2017 keynote (arXiv 2 January 2018, published in *Quantum* 6 August 2018): **NISQ — Noisy Intermediate-Scale Quantum**. "Intermediate-scale" for a qubit count beyond brute-force classical simulation yet far short of utility; "noisy" because uncorrected gate errors cap achievable circuit depth. The coinage stuck instantly and organized an entire research program — variational algorithms (VQE, QAOA), error mitigation (ZNE, PEC), and near-term "advantage" claims all live under it (see S-nisq, S-variational, O-advantage).

## Why the word mattered
Preskill's essay did two things at once, and both were acts of expectation-management. It gave hardware groups a realistic near-term target instead of a fault-tolerant fantasy that was still decades off — you could publish NISQ results now. And it sober-set expectations: his often-quoted line is that NISQ technology "will not change the world by itself" and should be regarded "as a step toward more powerful quantum technologies we will develop in the future." He explicitly named the gap between the NISQ present and the fault-tolerant future that the whole field is now trying to cross (see T-ecera, S-logical, O-scaling). The term became load-bearing in three registers at once: it frames vendor roadmaps, it frames funding pitches, and it frames the honest-skeptic critique — because if the NISQ era ends without a single unambiguous practical advantage, that is itself the verdict.

## The verdict, eight years on
The uncomfortable fact by mid-2026 is that no NISQ algorithm has produced a clear, durable practical advantage. Variational methods hit barren plateaus and optimization walls; every "utility" or "advantage" demo on a noisy device has drawn a classical counterattack within months (see T-race, T-ecera, O-advantage). The field's own answer has been to shift focus from NISQ to early fault tolerance — which is why "post-NISQ" and "the era of logical qubits" now appear in the same roadmaps that once sold NISQ. Preskill framed the practical-advantage question as open in 2018; the honest reading is that it is still open, and increasingly the bet is that the payoff waits on error correction, not on cleverer noisy circuits.

## Key graded claims
- claim: The 2018-onward regime of ~50–100 noisy, uncorrected qubits is the defining near-term phase, and it is named NISQ · tier: T2 · status: established (as terminology) — Preskill, *Quantum* 2, 79 (2018), arXiv:1801.00862
- claim: NISQ devices will yield near-term commercial advantage · tier: T4 · status: contested — Preskill himself framed it as open; eight years on, no unambiguous practical NISQ advantage has survived classical counterattack (see O-advantage, O-killerapp)
- claim: The field is transitioning from NISQ to early fault tolerance · tier: T3 · status: demonstrated in direction (below-threshold QEC, logical-qubit demos — see T-ecera), not yet in delivered applications

## Sources
- Preskill, "Quantum Computing in the NISQ era and beyond," *Quantum* 2, 79 (2018). arXiv:1801.00862, doi:10.22331/q-2018-08-06-79
- Preskill, Q2B keynote, Dec 2017 — the origin of the term
- **Go deeper:** S-nisq, S-variational (the algorithms of the era); O-advantage (the classical-counterattack pattern); T-ecera (the shift to logical qubits)
