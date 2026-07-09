# Grover's algorithm · S-grover
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
Grover (1996) finds a marked item among $N$ unstructured possibilities in $O(\sqrt{N})$ oracle queries, versus $O(N)$ classically. The mechanism is **amplitude amplification**: start in a uniform superposition, then repeat a two-reflection step (oracle phase-flip of the marked state, then reflection about the mean) $\sim(\pi/4)\sqrt{N}$ times, rotating amplitude toward the solution in the 2D subspace spanned by marked and unmarked states. The quadratic speedup is provably optimal for black-box search — the BBBV theorem (Bennett–Bernstein–Brassard–Vazirani, 1997) shows no quantum algorithm beats $\Omega(\sqrt{N})$ queries. Amplitude amplification generalizes Grover to boost the success probability of any subroutine that outputs a "good" flag with amplitude $a$ from $O(1/a^2)$ to $O(1/a)$ repetitions, making it a workhorse inside counting, quantum Monte Carlo / amplitude estimation (`S-qmc`), and optimization heuristics.

## Where it stands (2025–26)
Grover is textbook-established and has been demonstrated on a handful of qubits on every major platform. The 2020s reassessment is sobering. Careful architecture-level accounting (Babbush et al. 2021; Hoefler–Häner–Troyer, CACM 2023) shows quadratic speedups almost certainly deliver **no practical advantage** on foreseeable fault-tolerant hardware: the QEC overhead, the ~kHz–MHz logical clock speed, and the cost of implementing the oracle as a reversible circuit eat the √N gain unless the classical runtime is already astronomically large (roughly, the crossover sits beyond problem sizes any real workload reaches). The reason is structural — Grover needs $\sim\sqrt{N}$ *sequential* coherent iterations and admits no parallel speedup (Zalka 1999), so throwing more qubits at it does not help wall-clock time. The field now treats Grover as a building block and a lower-bound landmark; nobody credible pitches bare Grover search as a near-term product.

## Key graded claims
- [T1] $O(\sqrt{N})$ unstructured search, provably optimal — Grover, quant-ph/9605043; Bennett–Bernstein–Brassard–Vazirani, SIAM J. Comput. 26, 1510 (1997) (established)
- [T2] Quadratic speedups washed out by fault-tolerance overhead for practical sizes — Babbush et al., PRX Quantum 2, 010103 (2021); Hoefler et al., CACM 66(5), 82 (2023) (established analysis, some parameter dependence)
- [T1] No parallel advantage; $\sim\sqrt{N}$ iterations must be sequential — Zalka, PRA 60, 2746 (1999) (established)

## Speedup / caveat
Proven quadratic query speedup, optimal in the query model. Fine print: (1) query complexity only — a cheap classical oracle call versus an expensive reversible quantum circuit is an unfair comparison; (2) the sequential-iteration requirement kills wall-clock advantage at realistic N and logical clock rates; (3) the symmetric-key-crypto consequence is modest — simply double key lengths (AES-128 → AES-256), which is why NIST treats Grover as a minor concern next to Shor.

## Conflicts / open questions
Whether amplitude-amplification subroutines embedded in larger algorithms (Monte Carlo pricing in `S-qmc`, optimization) survive the same overhead accounting. Current evidence leans no for quadratic-only gains; near-quadratic amplitude estimation is the most likely survivor. The two-reflection structure is a special case of QSVT (`S-qsvt`), which is the modern lens for reasoning about its cost.

## Sources
quant-ph/9605043; SIAM J. Comput. 26, 1510 (1997); PRX Quantum 2, 010103 (2021); CACM 66(5), 82 (2023); PRA 60, 2746 (1999). Cross-links: `S-qmc`, `S-qsvt`, `S-walk`, `O-advantage`.
