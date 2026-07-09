# Certified randomness · S-certrand
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
Certified randomness is a protocol that produces bits *provably* random — not merely unpredictable to an observer, but backed by a mathematical certificate that no adversary (not even the device manufacturer) could have known or biased them. The construction (Aaronson, 2018–20) piggybacks on random circuit sampling, the same task used for quantum-advantage claims: a classical server sends hard random-circuit challenges to a remote quantum computer, times the responses, and later spot-checks them on a classical supercomputer via cross-entropy benchmarking. Because a genuine quantum device is the only thing that could answer fast enough, passing responses certify that fresh entropy was generated. It is the first delivered *application* of quantum advantage — a working product built on top of the sampling experiments that were previously only benchmarks. It bridges to `A-qrng` (physical randomness sources): certified randomness adds the remote, adversary-proof *certificate* that a local quantum RNG cannot give.

## Where it stands (2025–26)
The landmark is JPMorgan × Quantinuum × Argonne/Oak Ridge × UT Austin, published in Nature (26 Mar 2025). Running on Quantinuum's 56-qubit trapped-ion H2, the team generated 71,313 certified-random bits; verification consumed ~1.1 exaFLOPS across supercomputers — the classical check itself is what makes the quantum step meaningful (only a real quantum device answers in time, only a classical HPC cluster can verify). Provenance matters: JPMorgan (a customer with a cryptography use case) and Quantinuum (the hardware vendor) co-authored, but this cleared peer review in Nature, so it grades above a vendor PR. The honest caveat is that certified randomness is a niche, if real, first application — its commercial pull (lotteries, cryptographic key material, auditable fairness) is genuine but narrow, and the verification cost is enormous.

## Key graded claims
- [T2] Protocol: certified randomness expansion from random circuit sampling — Aaronson–Hung, STOC 2023 (arXiv:2303.01625) (established theory)
- [T2] First experimental certified randomness: 71,313 bits on 56-qubit H2, verified at ~1.1 exaFLOPS — Nature 640 (2025), s41586-025-08737-1 (peer-reviewed)
- [T4→T2] "First commercial application of quantum computing" framing is vendor-sourced (Quantinuum/JPMorgan), but the underlying result is peer-reviewed (claimed marketing / demonstrated result)

## Speedup / caveat
Advantage as a *product*, not a raw speedup. It exploits the fact that random circuit sampling is classically intractable to run but checkable, turning a supremacy benchmark into a service. Caveat: verification requires exaFLOPS-class classical compute per batch, and the application space (adversary-proof entropy) is narrow versus the general-purpose promise of quantum computing.

## Conflicts / open questions
Whether the RCS foundation stays classically hard (spoofing/classical-simulation counterattacks target the same experiments — see `O-advantage`, `S-bench`), and whether the verification cost can drop enough to make this a routine service rather than a showcase.

## Sources
Nature 640, s41586-025-08737-1 (2025); arXiv:2303.01625; JPMorganChase / UT Austin CNS / ORNL press (2025). Cross-links: `A-qrng`, `S-bench`, `O-advantage`, `I-finance`.
