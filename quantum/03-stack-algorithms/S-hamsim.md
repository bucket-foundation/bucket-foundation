# Hamiltonian simulation methods — Trotter / qDRIFT / LCU / qubitization · S-hamsim
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
The *how* behind digital quantum simulation (`S-qsim`): concrete algorithms that implement the evolution operator $e^{-iHt}$ on a gate-based machine for a Hamiltonian $H=\sum_k h_k P_k$. Four method families, each with a different complexity profile.
- **Trotter–Suzuki product formulas.** Approximate $e^{-iHt}$ by interleaving $e^{-ih_k P_k t/r}$ short steps. Simple, ancilla-free, and it enjoys **commutator scaling** — error depends on how much the terms fail to commute, so it is often far better than worst-case bounds suggest (Childs–Su–Tran–Wiebe–Zhu 2021). A $p$-th order formula gives error $O((t/r)^{p+1})$ per step.
- **qDRIFT.** Randomly compose terms sampled with probability $\propto|h_k|$, so cost scales with the L1 norm $\lambda=\sum|h_k|$ and is **independent of the number of terms** — good for molecular Hamiltonians with many small terms. Trades a random-sampling error for term-count independence (Campbell 2019).
- **LCU (linear combination of unitaries).** Write the propagator (e.g. its Taylor series) as a weighted sum of unitaries and apply it with an ancilla "select/prepare" pair. Achieves $O(\log(1/\varepsilon))$ precision scaling — exponentially better in $\varepsilon$ than Trotter (Berry–Childs–Cleve–Kothari–Somma 2015).
- **Qubitization / quantum walk.** Block-encode $H$ and walk its eigenphases; **optimal** query complexity $O(\lambda t+\log(1/\varepsilon))$, the provable lower bound (Low–Chuang 2017/2019). This is the QSVT (`S-qsvt`) instance for time evolution.

## Where it stands (2025–26)
The methods are complementary, and the 2024–25 literature is about hybridizing them. For a fixed accuracy, **second-order Trotter** is often competitive with qubitization/LCU/qDRIFT on real molecular systems because commutator scaling beats the λ-scaling those methods pay, especially for geometrically local Hamiltonians; but LCU/qubitization win at high precision. Recent work compensates Trotter error with an LCU correction using one ancilla, getting both good system-size scaling and high accuracy (PRX Quantum 6, 010359, 2025), and Richardson-extrapolated qDRIFT (Watson 2024) reduces the standard qDRIFT step count. Fault-tolerant chemistry resource estimates (the FeMoco line in `S-qsim`) now overwhelmingly use qubitization for its optimal T-count. Everything here is a **fault-tolerant** primitive: the deep coherent evolution requires `S-qec`.

## Key graded claims
- [T1] Trotter with commutator error scaling — Childs–Su–Tran–Wiebe–Zhu, PRX 11, 011020 (2021); Lloyd, Science 273 (1996) (established)
- [T1] qDRIFT: cost $\propto\lambda$, independent of term count — Campbell, PRL 123, 070503 (2019) (established)
- [T1] LCU / Taylor-series simulation, $O(\log 1/\varepsilon)$ precision — Berry et al., PRL 114, 090502 (2015) (established)
- [T1] Qubitization: optimal $O(\lambda t+\log 1/\varepsilon)$ query complexity — Low–Chuang, Quantum 3, 163 (2019) (established, matches lower bound)
- [T2] Hybrid Trotter+LCU error compensation, one ancilla — PRX Quantum 6, 010359 (2025) (peer-reviewed)

## Speedup / caveat
The *enabling* engine for the best-founded quantum advantage (quantum simulation, `S-qsim`) — exponential over classical for generic dynamics. Caveats: (1) all four assume you can already load / block-encode H and prepare a useful initial state; (2) the constant factors and T-counts are large, keeping useful runs in the fault-tolerant era; (3) classical tensor-network methods (`S-tensornet`) absorb the low-entanglement / short-time instances, so the advantage lives in long-time, high-entanglement regimes.

## Conflicts / open questions
Which method wins for a given target is instance-dependent and actively contested (Trotter's commutator advantage versus qubitization's optimal asymptotics). Whether early-fault-tolerant machines favor the low-ancilla randomized methods (qDRIFT, single-ancilla LCU) over qubitization's block-encoding overhead.

## Sources
PRX 11, 011020 (2021); PRL 123, 070503 (2019); PRL 114, 090502 (2015); Quantum 3, 163 (2019); PRX Quantum 6, 010359 (2025). Cross-links: `S-qsim`, `S-qsvt`, `S-qft`, `S-tensornet`, `S-qec`, `I-chem`, `I-pharma`.
