# Variational algorithms — VQE & QAOA · S-variational
**Layer:** L2 Stack & algorithms · **Chapter:** §03 · **Status:** depth

## What it is
Variational quantum algorithms (VQAs) pair a shallow parameterized circuit $U(\theta)$ with a classical optimizer in a feedback loop. **VQE** (Peruzzo et al., 2014) minimizes $\bra{\psi(\theta)}H\ket{\psi(\theta)}$ for a molecular Hamiltonian $H$ to estimate ground-state energy — the variational principle guarantees the estimate is an upper bound. **QAOA** (Farhi–Goldstone–Gutmann, 2014) encodes a combinatorial problem (MaxCut, etc.) in $p$ alternating layers of problem-phase and mixer unitaries $e^{-i\gamma C}e^{-i\beta B}$, interpolating toward the optimum as $p$ grows. They were designed for NISQ hardware (`S-nisq`): short circuits, hybrid by construction, partly noise-tolerant. Gradients are computed by the parameter-shift rule; the objective is estimated by repeated measurement (shots), so cost scales with the number of observables and the desired precision.

## Where it stands (2025–26)
The theory turned against the program on three fronts. **Barren plateaus** (McClean et al., 2018): for expressive random ansätze the gradient variance vanishes exponentially in qubit count, so training needs exponentially many shots to see a signal. **Soft dequantization** (Cerezo et al., Nat. Commun. 2025, arXiv:2312.09121): the known families of circuits that provably *avoid* barren plateaus turn out to be classically simulable in polynomial time — if a landscape is trainable it is likely also classically tractable, squeezing the useful regime from both sides. **Classical optimization competition**: fixed-depth QAOA is provably beaten by classical algorithms on broad instance classes (Bravyi et al. 2020; Farhi–Gamarnik–Gutmann obstruction bounds), and no VQE/QAOA run has beaten best-in-class classical chemistry (DMRG, coupled cluster CCSD(T)) or optimization (Gurobi-class solvers) on any real instance. Add measurement/optimization overhead (thousands of shots per energy evaluation, noisy gradients) and the near-term value proposition is thin. Community response: use variational circuits as *state-preparation subroutines* feeding fault-tolerant phase estimation, or move on.

## Key graded claims
- T2 VQE original demonstration — Peruzzo et al., Nat. Commun. 5, 4213 (2014) (demonstrated, toy scale)
- T2 Barren plateaus in random parameterized circuits — McClean et al., Nat. Commun. 9, 4812 (2018) (established)
- T2 Absence of barren plateaus implies classical simulability for known families — Cerezo et al., Nat. Commun. 16 (2025), arXiv:2312.09121 (established, with stated caveats)
- T2 Fixed-depth QAOA obstructed / classically matched on many instances — Bravyi et al., PRL 125, 260505 (2020) (established)

## Speedup / caveat
No proven speedup exists for VQE or QAOA — both are heuristics. Every empirical claim to date has been matched or beaten classically once a competent classical team responds. The training cost (barren plateaus) and measurement cost (shot budget) compound. The escape hatches — quantum-data inputs, initial-state prep for phase estimation, problem-tailored non-random ansätze — remain unproven at advantage scale.

## Conflicts / open questions
Whether *any* ansatz family is simultaneously trainable, classically hard, and noise-tolerant is the open question. Cerezo et al. conjecture essentially no for barren-plateau-free landscapes; parts of the field dispute how far the "simulable" argument generalizes to structured (non-random) circuits.

## Sources
Nat. Commun. 5, 4213 (2014); arXiv:1411.4028; Nat. Commun. 9, 4812 (2018); arXiv:2312.09121; PRL 125, 260505 (2020). Cross-links: `S-nisq`, `S-qsim`, `S-qml`, `S-qft`, `I-pharma`, `O-advantage`.
