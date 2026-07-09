# Contextuality (Kochen-Specker) · F-contextuality
**Layer:** L0 Foundations · **Chapter:** §01 · **Status:** depth-complete

## What it is
Quantum measurement outcomes cannot be assigned pre-existing values independent of which other compatible observables are measured alongside them. The Kochen-Specker theorem (1967) proves this: for a Hilbert space of dimension $\ge 3$, no assignment of definite values ($0/1$) to all projectors is consistent with the algebraic relations quantum mechanics requires. Contextuality generalizes Bell nonlocality — Bell inequalities are the special case where the "contexts" are spacelike-separated — and it is the sharper statement of what makes quantum theory non-classical. Spekkens later reformulated it operationally so it applies to noisy, real experiments.

## Core idea / key equation
The cleanest witness is the **Peres-Mermin square**: a $3\times 3$ grid of nine two-qubit observables, each $\pm 1$-valued and each commuting with its row-mates and column-mates. Quantum mechanics forces the product of the three observables along every row to be $+1$ and along two columns $+1$ but the third column $-1$. Multiply all six line-products together: quantum mechanics gives $-1$. Now try to pre-assign a definite value $\pm 1$ to each of the nine boxes independent of context. Each box sits in one row and one column, so it enters the grand product exactly twice, and any $\pm 1$ assigned to it contributes its square, $+1$ — the noncontextual product is forced to be $+1$. The contradiction, $-1 \ne +1$, is state-independent: it holds for every input state, needs no inequality and no entanglement, and no assignment of hidden values escapes it. That algebraic clash is the whole content of Kochen-Specker, compressed to nine boxes.

## Why it matters for quantum tech
Contextuality is a computational *resource*. Howard, Wallman, Veitch & Emerson (2014) proved that for qudits, contextuality is precisely what "magic states" supply in the leading fault-tolerant model: Clifford operations plus contextuality-free (stabilizer) states are efficiently classically simulable (the Gottesman-Knill theorem), and the onset of contextuality coincides exactly with the states that magic-state distillation must produce to reach universal quantum computation. This draws a direct line from a 1967 no-go theorem to the resource that error-corrected machines spend most of their overhead manufacturing — magic-state factories are the dominant space and time cost in surface-code architectures (see S-qec, S-logical). The classical-simulability boundary it draws also tells simulator designers exactly which subroutines a classical machine can shadow for free and which demand real quantum hardware (see S-qsim). Contextuality further underlies some certified-randomness and self-testing arguments, where a measured contextuality violation is the certificate that a device is behaving quantumly (see A-qrng, O-verification).

## Key graded claims
- T1 No non-contextual hidden-variable model reproduces QM in dimension $\ge 3$ — Kochen & Specker, J. Math. Mech. 17, 59 (1967) (status: established)
- T2 Contextuality is the resource enabling universal quantum computation via magic-state distillation (qudit model) — Howard, Wallman, Veitch & Emerson, Nature 510, 351 (2014), arXiv:1401.4174 (status: established)
- T2 State-independent contextuality demonstrated experimentally, violating a noncontextuality inequality with trapped ions and needing no special input state — Kirchmair et al., Nature 460, 494 (2009), arXiv:0904.1655 (status: demonstrated)

## Conflicts / open questions
- The qubit ($d=2$) case is subtler — Wigner-function negativity and contextuality diverge; the exact resource-theoretic statement for qubits is still refined.

## Go deeper
- Spekkens, "Contextuality for preparations, transformations, measurements," PRA 71, 052108 (2005)
- Bermejo-Vega et al., PRL 119, 120505 (2017) (contextuality + qubit magic)

## Sources
- Kochen & Specker (1967)
- Howard et al., Nature 510, 351 (2014). doi:10.1038/nature13460
- Kirchmair et al., Nature 460, 494 (2009). doi:10.1038/nature08172
- Mermin, "Hidden variables and the two theorems of John Bell," RMP 65, 803 (1993) (Peres-Mermin square)
