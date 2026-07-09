# Bell Inequalities & Their Experimental Violation · F-bell
**Layer:** L0 Foundations · **Chapter:** §01 · **Status:** depth-complete

## What it is
Bell (1964) proved that any theory of local hidden variables puts a numerical ceiling on correlations between separated measurements; quantum mechanics predicts violations of that ceiling. The CHSH form (1969) made it testable. Six decades of experiments — Freedman–Clauser (1972), Aspect (1982), and the 2015 loophole-free trio — confirm the quantum prediction. Nature violates local realism.

## Core idea / key equation
CHSH builds one number from four correlation measurements: $S = E(a,b) - E(a,b') + E(a',b) + E(a',b')$, where $E(x,y)$ is the average product of the $\pm 1$ outcomes when Alice measures setting $x$ and Bob setting $y$. Any local hidden-variable theory obeys $|S| \le 2$ — the outcomes are fixed functions of a shared variable, so the four terms cannot all be large at once. Quantum mechanics, using a Bell state and measurement angles 45° apart, reaches $S = 2\sqrt{2} \approx 2.828$, the Tsirelson bound (the maximum quantum mechanics itself allows). The gap between 2 and 2.828 is the experimental target: measure $S > 2$ with the two stations space-like separated and no detection bias, and no local-realist theory can reproduce it. That gap is what six decades of increasingly airtight experiments have nailed down.

## Why it matters for quantum tech
Bell violation is the operational certificate that a device holds real entanglement (F-entangle) — the basis of device-independent QKD (A-qkd), where security follows from S > 2 alone without trusting the hardware, and of certified quantum randomness (A-sensing, related randomness-expansion protocols), where the violation guarantees the output bits are unpredictable to any adversary. The same self-testing logic lets you verify an untrusted quantum processor. The 2022 Nobel citation names Bell violation as the launch point of quantum information science, and the 2023 superconducting demonstration (below) shows the test now runs on the same chip technology (H-supercon) used to build quantum computers.

## Key graded claims
- [T1] Local hidden-variable theories obey $|S| \le 2$ (CHSH); quantum mechanics reaches $2\sqrt{2} \approx 2.828$ (Tsirelson bound) — Bell, Physics Physique Fizika 1, 195 (1964); Clauser–Horne–Shimony–Holt, PRL 23, 880 (1969) (status: established)
- [T1] Bell inequalities are violated experimentally with all major loopholes (locality, detection) closed simultaneously — Hensen et al., Nature 526, 682 (2015); Giustina et al., PRL 115, 250401 (2015); Shalm et al., PRL 115, 250402 (2015) (status: established)
- [T1] Loophole-free violation demonstrated with superconducting circuits: two qubits entangled across a 30 m cryogenic link, $S = 2.0747 \pm 0.0033$ over >1 million trials, $p < 10^{-108}$ — Storz et al. (Wallraff group, ETH Zurich), Nature 617, 265 (2023), doi:10.1038/s41586-023-05885-0 (status: established)
- [T1] 2022 Nobel Prize in Physics to Aspect, Clauser, Zeilinger "for experiments with entangled photons, establishing the violation of Bell inequalities and pioneering quantum information science" — nobelprize.org/prizes/physics/2022 (status: established)

## Conflicts / open questions
- Superdeterminism and retrocausality evade Bell's theorem by denying measurement independence; consistent but widely viewed as unfalsifiable. The freedom-of-choice loophole was pushed back by cosmic-photon and Big Bell Test (Nature 557, 212, 2018) experiments, never fully closable.

## Go deeper
- Aspect, Dalibard, Roger, PRL 49, 1804 (1982); Brunner et al., "Bell nonlocality," RMP 86, 419 (2014)

## Sources
- Bell (1964) doi:10.1103/PhysicsPhysiqueFizika.1.195 · CHSH (1969) doi:10.1103/PhysRevLett.23.880
- Hensen et al., Nature 526, 682 (2015). doi:10.1038/nature15759 · Giustina et al. doi:10.1103/PhysRevLett.115.250401 · Shalm et al. doi:10.1103/PhysRevLett.115.250402
- Storz et al., "Loophole-free Bell inequality violation with superconducting circuits," Nature 617, 265 (2023). doi:10.1038/s41586-023-05885-0
- Nobel press release: https://www.nobelprize.org/prizes/physics/2022/press-release/
