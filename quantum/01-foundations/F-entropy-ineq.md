# Quantum Entropy Inequalities · F-entropy-ineq
**Layer:** L0 Foundations · **Chapter:** §01 · **Status:** depth-complete

## What it is
The structural laws that von Neumann entropy must obey across subsystems. The deepest is strong subadditivity (SSA), proved by Elliott Lieb and Mary Beth Ruskai in 1973 after being conjectured by Robinson, Ruelle, and Lanford in the late 1960s. From SSA follow the monotonicity of relative entropy, the data-processing inequality, the Araki-Lieb triangle bound, and — for entanglement — the Coffman-Kundu-Wootters monogamy inequality. Together they are the arithmetic of how quantum information distributes and degrades, and every capacity theorem and security proof leans on them.

## Core idea / key equation
Strong subadditivity, for any tripartite state $\rho_{ABC}$:

$$S(\rho_{ABC}) + S(\rho_B) \le S(\rho_{AB}) + S(\rho_{BC})$$

Equivalently, conditioning on more never increases conditional entropy, and the mutual information $I(A:C|B) \ge 0$. This one inequality is the workhorse; several key bounds are corollaries:
- **Data processing:** relative entropy is non-increasing under any CPTP channel, $D(\Lambda\rho \,\|\, \Lambda\sigma) \le D(\rho\|\sigma)$ — you cannot make two states more distinguishable by processing them, so quantum information cannot be increased by local operations. Equivalent in strength to SSA.
- **Araki-Lieb (triangle):** $|S(\rho_A) - S(\rho_B)| \le S(\rho_{AB}) \le S(\rho_A) + S(\rho_B)$. The lower bound has no classical analog; it forces a global pure state ($S(\rho_{AB})=0$) to have $S(\rho_A)=S(\rho_B)$, the entropy of entanglement.
- **CKW monogamy:** for three qubits, $C^2(A:B) + C^2(A:C) \le C^2(A:BC)$ in the concurrence (tangle). Entanglement cannot be freely shared — if A is maximally entangled with B, it has none left for C.

## Why it matters for quantum tech
Monogamy is the mathematical reason quantum key distribution is secure: an eavesdropper's correlation with the key is bounded by how much the legitimate parties share, so listening in is detectable (see A-qkd). Data processing sets the ceiling on every quantum channel capacity and underwrites the LSD coherent-information formula and Holevo-type bounds (see F-qinfo). Entropy inequalities gate entanglement distillation and the resource accounting of teleportation and state merging (see F-entangle). In many-body physics and holography, SSA constrains entanglement entropy and area laws (see S-qsim).

## Key graded claims
- T1 Strong subadditivity holds for von Neumann entropy — Lieb & Ruskai, J. Math. Phys. 14, 1938 (1973) (status: established)
- T1 Relative entropy is monotone under CPTP maps (data processing), equivalent to SSA — Lindblad, Commun. Math. Phys. 40, 147 (1975); Uhlmann (1977) (status: established)
- T2 Three-qubit entanglement obeys the CKW monogamy inequality; generalized to $n$ qubits by Osborne & Verstraete — Coffman, Kundu & Wootters, PRA 61, 052306 (2000), arXiv:quant-ph/9907047; Osborne & Verstraete, PRL 96, 220503 (2006) (status: established)
- T2 Equality in SSA characterizes quantum Markov chains (recoverable states) — Hayden, Jozsa, Petz & Winter, Commun. Math. Phys. 246, 359 (2004); strengthened by Fawzi & Renner, arXiv:1410.0664 (2015) (status: established)

## Conflicts / open questions
- The remainder-term / approximate-recovery refinements of SSA (how much information a recovery map can restore when SSA is nearly saturated) are still being sharpened.
- Beyond qubits, the exact form of monogamy for general entanglement measures and higher-dimensional systems is not fully settled; monogamy can fail for some correlation measures (e.g. discord is not always monogamous — see F-discord).

## Go deeper
- Nielsen & Chuang, ch. 11 · Wilde, *Quantum Information Theory* (2013), arXiv:1106.1445
- Lieb & Ruskai, J. Math. Phys. 14, 1938 (1973)

## Sources
- Lieb & Ruskai, J. Math. Phys. 14, 1938 (1973). doi:10.1063/1.1666274
- Coffman, Kundu & Wootters, PRA 61, 052306 (2000). arXiv:quant-ph/9907047
- Lindblad, Commun. Math. Phys. 40, 147 (1975). doi:10.1007/BF01609396
- Fawzi & Renner, Commun. Math. Phys. 340, 575 (2015). arXiv:1410.0664
