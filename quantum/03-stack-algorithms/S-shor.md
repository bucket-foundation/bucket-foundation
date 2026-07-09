# Shor's algorithm · S-shor
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
Shor (1994) showed a quantum computer can factor integers and compute discrete logarithms in polynomial time. The engine is **period-finding**: factoring $N$ reduces to finding the period $r$ of $f(x)=a^x \bmod N$, and the period is read off by applying the quantum Fourier transform (QFT, see `S-qft`) to a superposition of function evaluations, then measuring and post-processing with continued fractions. Gate cost is $O((\log N)^2 \cdot \log\log N)$ with fast integer multiplication, i.e. polynomial in the bit-length. The best classical factoring algorithm, the general number field sieve, runs in sub-exponential $\exp\!\big(O((\log N)^{1/3}(\log\log N)^{2/3})\big)$ time — so Shor is a **superpolynomial** separation and breaks RSA, finite-field Diffie–Hellman, and elliptic-curve cryptography. That is the entire reason the world is migrating to post-quantum cryptography (`A-pqc`) and the source of the harvest-now-decrypt-later threat (`I-cyber`).

## Where it stands (2025–26)
No cryptographically relevant number has ever been factored quantumly. Honest records are tiny: 15 (NMR, Vandersypen 2001) and 21; larger published "factorings" used variational or annealing shortcuts that presuppose structure in the answer and do not scale (survey arXiv:2410.14397). The live action is **resource estimation**. Gidney (May 2025) cut the projected machine for RSA-2048 from his own 2019 estimate of ~20M noisy qubits over 8 hours to **<1M noisy qubits running under a week**, via approximate residue arithmetic, yoked surface codes, and magic-state cultivation (see `S-qec`). That ~20× drop in six years is why NIST/NSA migration deadlines (2030–2035) keep tightening rather than relaxing. The cost is dominated by modular exponentiation depth and by the T-gate / magic-state budget (`S-gates`), not by the QFT.

## Key graded claims
- [T1] Polynomial-time quantum factoring and discrete log — Shor, SIAM J. Comput. 26, 1484 (1997) (established)
- [T2] Largest honest quantum factorization remains trivial (15, 21) — Vandersypen et al., Nature 414, 883 (2001); survey arXiv:2410.14397 (established)
- [T3] RSA-2048 with <1M noisy qubits in <1 week — Gidney, arXiv:2505.15917 (claimed; widely cited, unrefuted)
- [T3] 2019 baseline: 20M qubits / 8 hours — Gidney–Ekerå, arXiv:1905.09749 (established as the prior estimate)
- [T5/T6] "Q-Day" dates (2030–2035) — NIST IR 8547 migration timeline + analyst punditry (roadmap/speculative)

## Speedup / caveat
Superpolynomial over the best *known* classical algorithm. Factoring has no proven classical lower bound, so a classical breakthrough is possible in principle and Shor is not a complexity-theoretic separation the way sampling tasks aim to be (`S-bench`, `O-advantage`). Practical fine print: it needs full fault tolerance — millions of physical qubits, deep coherent circuits — so Shor is a 2030s+ threat under every credible hardware roadmap. HNDL makes it a present-day data-security problem even though the machine does not exist yet.

## Conflicts / open questions
Resource estimates keep falling — is <100k qubits reachable with better codes and arithmetic? (See conflict `C-shor-timeline`.) Whether any state actor is ahead of public estimates is unknowable from open sources.

## Sources
SIAM J. Comput. 26, 1484 (1997); arXiv:2505.15917; arXiv:1905.09749; arXiv:2410.14397; NIST IR 8547. Cross-links: `S-qft`, `S-qec`, `S-gates`, `A-pqc`, `I-cyber`, `O-advantage`.
